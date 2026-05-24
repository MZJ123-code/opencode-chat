import { Router } from "express"
import { getClient } from "../services/opencode.js"
import { logger } from "../logger/index.js"
import { ipUsers, ipSessions, sessionMeta } from "../storage/store.js"
import { validateOwnership } from "../services/sessionService.js"
import { pushEvent, getBufferedEvents } from "../services/eventBuffer.js"

const router = Router()

router.get("/", async (req, res) => {
  const client = getClient()
  const ip = req.clientIP

  // 客户端可携带 lastSeq 参数增量回放（浏览器 EventSource 不支持自定义参数，预留扩展）
  const sinceSeq = parseInt(req.query.since || "0", 10) || 0

  logger.info(`SSE 事件流连接: ${ip}`, { sinceSeq: sinceSeq || "全部" })

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  })

  let closed = false
  let eventCount = 0
  const eventTypeCount = new Map()

  // 静默响应流错误，避免客户端断连导致进程崩溃
  res.on("error", () => {})

  function safeWrite(data) {
    if (closed || !res.writable) return false
    try {
      res.write(data)
      return true
    } catch {
      closed = true
      return false
    }
  }

  req.on("close", () => {
    closed = true
    logger.info(`SSE 事件流关闭: ${ip}`, {
      events_delivered: eventCount,
      event_types: Object.fromEntries(eventTypeCount),
    })
  })

  try {
    // 先回放断连期间缓冲的事件
    const { events: buffered } = getBufferedEvents(ip, sinceSeq)
    if (buffered.length > 0) {
      logger.info(`SSE 回放缓冲事件: ${ip}`, { count: buffered.length })
      for (const ev of buffered) {
        if (closed) break
        eventCount++
        const etype = ev.type || "unknown"
        eventTypeCount.set(etype, (eventTypeCount.get(etype) || 0) + 1)
        if (!safeWrite(`event: message\ndata: ${JSON.stringify(ev)}\n\n`)) break
      }
    }

    const events = await client.event.subscribe()

    for await (const event of events.stream) {
      if (closed) break
      eventCount++

      // 写入环形缓冲区
      pushEvent(ip, event)

      // Track all event types
      const etype = event.type || "unknown"
      eventTypeCount.set(etype, (eventTypeCount.get(etype) || 0) + 1)

      // Log all events for debugging (especially child session events)
      const props = event.properties || {}
      const sessionID = props.sessionID || event.sessionID || "?"
      const partType = props.part?.type
      const toolName = props.part?.tool || props.tool
      const hasParentID = props.info?.parentID

      // Log key event types with details
      if (
        event.type?.startsWith("session.") ||
        event.type?.startsWith("message.") ||
        event.type?.startsWith("permission.") ||
        event.type?.startsWith("question.")
      ) {
        const logData = {
          sessionID,
          eventType: event.type,
          seq: eventCount,
          ...(partType ? { partType } : {}),
          ...(toolName ? { tool: toolName } : {}),
          ...(hasParentID ? { parentID: hasParentID } : {}),
        }
        logger.info(`SSE: ${event.type}`, logData)
      }

      // 自动注册 OpenCode task 工具创建的子会话
      if (event.type === "session.created" && props.info) {
        const info = props.info
        const childSid = info.id
        const parentSid = info.parentID
        if (childSid && parentSid && !sessionMeta.has(childSid)) {
          if (validateOwnership(ip, parentSid)) {
            const title = info.title || "子任务"
            sessionMeta.set(childSid, {
              ip,
              createdAt: Date.now(),
              title,
              messageCount: 0,
              agent: null,
            })
            ipUsers.get(ip)?.sessionIds.add(childSid)
            const arr = ipSessions.get(ip)
            if (arr) arr.push(childSid)
            logger.info(`子会话已注册: ${childSid}`, { parent: parentSid, ip, title })
          }
        }
      }

      // 会话删除时清理本地记录
      if (event.type === "session.deleted" && props.info?.id) {
        const deletedSid = props.info.id
        if (sessionMeta.has(deletedSid)) {
          const meta = sessionMeta.get(deletedSid)
          sessionMeta.delete(deletedSid)
          const ownerIp = meta?.ip
          if (ownerIp) {
            ipUsers.get(ownerIp)?.sessionIds.delete(deletedSid)
            const arr = ipSessions.get(ownerIp)
            if (arr) {
              const idx = arr.indexOf(deletedSid)
              if (idx !== -1) arr.splice(idx, 1)
            }
          }
          logger.info(`会话已清理: ${deletedSid}`, { ip: ownerIp })
        }
      }

      if (!safeWrite(`event: message\ndata: ${JSON.stringify(event)}\n\n`)) break
    }
  } catch (err) {
    if (!closed) {
      logger.warn(`SSE stream error: ${err.message}`, { ip, events_delivered: eventCount })
    }
  } finally {
    if (!closed) {
      res.end()
    }
  }
})

export default router
