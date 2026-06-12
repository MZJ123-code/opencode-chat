import { Router } from "express"
import { getClient } from "../services/opencode.js"
import { AGENT_DIR_MAP } from "../config.js"
import { logger } from "../logger/index.js"
import { sessionMeta, userSessions } from "../storage/store.js"
import { validateOwnership } from "../services/sessionService.js"
import { pushEvent, getBufferedEvents, clearBuffer } from "../services/eventBuffer.js"

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
  const abortController = new AbortController()

  // 静默响应流错误，避免客户端断连导致进程崩溃
  res.on("error", () => {})

  /**
   * 安全写入 SSE 数据，客户端断开时不抛出异常
   * 处理背压：写入返回 false 时等待 drain 事件
   * @param {string} data - SSE 数据字符串
   * @returns {boolean} 是否成功写入
   */
  let drainPromise = null
  function safeWrite(data) {
    if (closed || !res.writable) return false
    try {
      const ok = res.write(data)
      if (!ok && !drainPromise) {
        drainPromise = new Promise((resolve) => res.once('drain', () => { drainPromise = null; resolve() }))
      }
      return true
    } catch {
      closed = true
      return false
    }
  }

  req.on("close", () => {
    closed = true
    abortController.abort()
    clearBuffer(userId)
    logger.info(`SSE 事件流关闭: ${userId.slice(0, 8)}`, {
      events_delivered: eventCount,
      event_types: Object.fromEntries(eventTypeCount),
    })
  })

  try {
    // 先回放断连期间缓冲的事件
    const { events: buffered } = getBufferedEvents(userId, sinceSeq)
    if (buffered.length > 0) {
      logger.info(`SSE 回放缓冲事件: ${userId.slice(0, 8)}`, { count: buffered.length })
      for (const ev of buffered) {
        if (closed) break
        eventCount++
        const etype = ev.type || "unknown"
        eventTypeCount.set(etype, (eventTypeCount.get(etype) || 0) + 1)
        if (!safeWrite(`event: message\ndata: ${JSON.stringify(ev)}\n\n`)) break
      }
    }

    /**
     * 事件分发映射表 — 各事件类型对应的处理函数
     * 新增事件类型只需要在此注册处理函数
     */
    const eventHandlers = {
      "session.created"(props) {
        if (!props.info) return
        const { id: childSid, parentID: parentSid, title } = props.info
        if (!childSid || !parentSid || sessionMeta.has(childSid)) return
        if (!validateOwnership(userId, parentSid)) return
        sessionMeta.set(childSid, {
          ip, createdAt: Date.now(),
          title: title || "子任务",
          messageCount: 0, agent: null,
        })
        logger.info(`子会话已注册: ${childSid}`, { parent: parentSid, userId: userId.slice(0, 8), title: title || "子任务" })
      },
      "session.deleted"(props) {
        if (!props.info?.id) return
        const deletedSid = props.info.id
        if (!sessionMeta.has(deletedSid)) return
        sessionMeta.delete(deletedSid)
        for (const [, sessions] of userSessions) sessions.delete(deletedSid)
        logger.info(`会话已清理: ${deletedSid}`)
      },
    }

    /** 需要记录日志的事件类型名前缀 */
    const LOGGED_EVENT_PREFIXES = ["session.", "message.", "permission.", "question."]
    /** 高频事件类型，跳过日志 */
    const SKIP_LOG_EVENTS = new Set(["message.part.delta", "message.part.updated"])

    /**
     * 处理单个 SSE 事件：记录 → 分发 → 转发给浏览器
     * @param {import("@opencode-ai/sdk/v2/types.gen.js").ServerSentEvent} event
     */
    function processEvent(event) {
      if (closed) return
      eventCount++

      // 写入环形缓冲区
      pushEvent(userId, event)

      // 事件类型统计
      const etype = event.type || "unknown"
      eventTypeCount.set(etype, (eventTypeCount.get(etype) || 0) + 1)

      // 关键事件日志
      const props = event.properties || {}
      if (LOGGED_EVENT_PREFIXES.some(p => etype.startsWith(p)) && !SKIP_LOG_EVENTS.has(etype)) {
        logger.info(`SSE: ${etype}`, {
          sessionID: props.sessionID || event.sessionID || "?",
          eventType: etype,
          seq: eventCount,
          partType: props.part?.type,
          tool: props.part?.tool || props.tool,
          parentID: props.info?.parentID,
        })
      }

      // 事件分发
      const handler = eventHandlers[etype]
      if (handler) handler(props)

      safeWrite(`event: message\ndata: ${JSON.stringify(event)}\n\n`)
    }

    // 订阅多个事件流：默认（无目录）+ 每个配置了独立目录的 Agent
    // 传入 AbortSignal 使 SDK 在客户端断开时自动释放底层资源
    const signal = abortController.signal
    const subscribeTasks = [client.event.subscribe({ signal })]
    for (const dir of AGENT_DIR_MAP.values()) {
      subscribeTasks.push(client.event.subscribe({ directory: dir, signal }))
    }

    const streams = await Promise.all(subscribeTasks)
    logger.info(`SSE 事件流已订阅: ${userId.slice(0, 8)}`, { stream_count: streams.length })

    // 并发消费所有事件流，断开时取消订阅
    await Promise.all(streams.map(s => (async () => {
      try {
        for await (const event of s.stream) {
          processEvent(event)
          if (closed || signal.aborted) break
        }
      } catch (err) {
        if (!closed && err.name !== "AbortError") {
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
      abortController.abort()
      res.end()
    }
  }
})

export default router
