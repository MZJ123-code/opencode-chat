import { Router } from "express"
import { getClient } from "../services/opencode.js"
import { AGENT_DIR_MAP } from "../config.js"
import { logger } from "../logger/index.js"
import { sessionMeta, userSessions } from "../storage/store.js"
import { validateOwnership } from "../services/sessionService.js"
import { pushEvent, getBufferedEvents } from "../services/eventBuffer.js"

/** @type {import("express").Router} SSE 事件流路由：GET /api/events */
const router = Router()

/**
 * GET /api/events — SSE 事件流，推送聊天回复和系统事件
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
router.get("/", async (req, res) => {
  const client = getClient()
  const userId = req.userId
  const ip = req.clientIP

  const sinceSeq = parseInt(req.query.since || "0", 10) || 0

  logger.info(`SSE 事件流连接: ${userId.slice(0, 8)}`, { sinceSeq: sinceSeq || "全部" })

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

  /**
   * 安全写入 SSE 数据，客户端断开时不抛出异常
   * @param {string} data - SSE 数据字符串
   * @returns {boolean} 是否成功写入
   */
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
    logger.info(`SSE 事件流关闭: ${userId.slice(0, 8)}`, {
      events_delivered: eventCount,
      event_types: Object.fromEntries(eventTypeCount),
    })
  })

  try {
    // 先回放断连期间缓冲的事件
    const { events: buffered } = getBufferedEvents(userId, sinceSeq)
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

    /**
     * 处理单个 SSE 事件：记录、回放缓冲区、子会话注册、转发给浏览器
     * @param {import("@opencode-ai/sdk/v2/types.gen.js").ServerSentEvent} event
     */
    function processEvent(event) {
      if (closed) return
      eventCount++

      // 写入环形缓冲区
      pushEvent(userId, event)

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
        if (event.type !== "message.part.delta" && event.type !== "message.part.updated") {
          logger.info(`SSE: ${event.type}`, logData)
        }
      }

      // 自动注册 OpenCode task 工具创建的子会话
      if (event.type === "session.created" && props.info) {
        const info = props.info
        const childSid = info.id
        const parentSid = info.parentID
        if (childSid && parentSid && !sessionMeta.has(childSid)) {
          if (validateOwnership(userId, parentSid)) {
            const title = info.title || "子任务"
            sessionMeta.set(childSid, {
              ip,
              createdAt: Date.now(),
              title,
              messageCount: 0,
              agent: null,
            })
            logger.info(`子会话已注册: ${childSid}`, { parent: parentSid, userId: userId.slice(0, 8), title })
          }
        }
      }

      // 会话删除时清理本地记录
      if (event.type === "session.deleted" && props.info?.id) {
        const deletedSid = props.info.id
        if (sessionMeta.has(deletedSid)) {
          sessionMeta.delete(deletedSid)
          for (const [, sessions] of userSessions) {
            sessions.delete(deletedSid)
          }
          logger.info(`会话已清理: ${deletedSid}`)
        }
      }

      safeWrite(`event: message\ndata: ${JSON.stringify(event)}\n\n`)
    }

    // 订阅多个事件流：默认（无目录）+ 每个配置了独立目录的 Agent
    const subscribeTasks = [client.event.subscribe()]
    for (const dir of AGENT_DIR_MAP.values()) {
      subscribeTasks.push(client.event.subscribe({ directory: dir }))
    }

    const streams = await Promise.all(subscribeTasks)
    logger.info(`SSE 事件流已订阅: ${userId.slice(0, 8)}`, { stream_count: streams.length })

    // 并发消费所有事件流，等待全部结束（连接关闭时自动结束）
    await Promise.all(streams.map(s => (async () => {
      try {
        for await (const event of s.stream) {
          processEvent(event)
          if (closed) break
        }
      } catch (err) {
        if (!closed) {
          logger.warn(`SSE 子流错误: ${userId.slice(0, 8)}`, { error: err.message })
        }
      }
    })()))
  } catch (err) {
    if (!closed) {
      const isSubscribeFailure = eventCount === 0
      logger.warn(`SSE ${isSubscribeFailure ? "订阅" : "流"}错误: ${userId.slice(0, 8)}`, {
        error: err.message,
        events_delivered: eventCount,
        is_subscribe_failure: isSubscribeFailure,
      })
    }
  } finally {
    if (!closed) {
      res.end()
    }
  }
})

export default router
