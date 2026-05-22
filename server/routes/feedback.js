import { Router } from "express"
import { requireSessionOwnership } from "../middleware/sessionGuard.js"
import { recordFeedback, saveStats } from "../services/statsService.js"
import { getSessionMeta } from "../services/sessionService.js"
import { logger } from "../logger/index.js"

const router = Router()

router.post("/:id/feedback", requireSessionOwnership("id"), (req, res) => {
  const ip = req.clientIP
  const sessionId = req.params.id
  const { satisfied } = req.body
  const meta = getSessionMeta(sessionId)

  recordFeedback(satisfied)

  logger.info(`满意度反馈: ${sessionId}`, {
    ip,
    satisfied,
    agent: meta?.agent || null,
    title: meta?.title,
    message_count: meta?.messageCount,
  })
  saveStats()
  res.json({ ok: true })
})

export default router
