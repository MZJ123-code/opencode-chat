import { Router } from "express"
import { getClient } from "../services/opencode.js"
import { recordMessage } from "../services/sessionService.js"
import { incrementQuestions, saveStats } from "../services/statsService.js"
import { logger } from "../logger/index.js"
import { requireBody } from "../middleware/validate.js"
import { requireSessionOwnership } from "../middleware/sessionGuard.js"

const router = Router()

// Sync prompt (waits for full response, returns complete data)
router.post("/", requireBody("sessionId", "message"), requireSessionOwnership(), async (req, res, next) => {
  const ip = req.clientIP
  const { sessionId, message } = req.body
  const requestStart = Date.now()

  try {
    logger.info(`收到消息: ${ip} -> ${sessionId}`, {
      message_length: message.length,
      message_preview: message.slice(0, 100),
    })

    recordMessage(sessionId)
    incrementQuestions()

    const client = getClient()
    const promptStart = Date.now()
    const result = await client.session.prompt({
      path: { id: sessionId },
      body: { parts: [{ type: "text", text: message }] },
    })
    const promptMs = Date.now() - promptStart

    const parts = result.data.parts || []
    const reply = parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("")

    logger.info(`回复完成: ${sessionId}`, {
      part_count: parts.length,
      part_types: parts.map((p) => p.type),
      opencode_ms: promptMs,
      total_ms: Date.now() - requestStart,
    })
    saveStats()

    res.json({ sessionId, reply, parts, tokens: result.data.info?.tokens })
  } catch (err) {
    next(err)
  }
})

// Async prompt (non-blocking, response comes via /api/events SSE stream)
router.post("/async", requireBody("sessionId", "message"), requireSessionOwnership(), async (req, res, next) => {
  const ip = req.clientIP
  const { sessionId, message } = req.body

  try {
    const preview = message.slice(0, 80)
    logger.info(`异步消息: ${ip} -> ${sessionId}: "${preview}"`)

    recordMessage(sessionId)
    incrementQuestions()
    saveStats()

    const client = getClient()
    await client.session.promptAsync({
      path: { id: sessionId },
      body: { parts: [{ type: "text", text: message }] },
    })

    res.json({ ok: true, sessionId })
  } catch (err) {
    next(err)
  }
})

export default router
