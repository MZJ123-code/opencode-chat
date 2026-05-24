import { Router } from "express"
import { requireSessionOwnership } from "../middleware/sessionGuard.js"
import { recordFeedback, saveStats } from "../services/statsService.js"
import { getSessionMeta } from "../services/sessionService.js"
import { logger } from "../logger/index.js"

/** @type {import("express").Router} 反馈路由：POST /api/sessions/:id/feedback */
const router = Router()

/**
 * POST /api/sessions/:id/feedback — 提交会话满意度反馈
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
router.post("/:id/feedback", requireSessionOwnership("id"), (req, res, next) => {
  try {
    const ip = req.clientIP
    const sessionId = req.params.id
    const { satisfied } = req.body

    if (typeof satisfied !== "boolean" && satisfied !== undefined) {
      return res.status(400).json({ error: "satisfied 必须为布尔值" })
    }

    const meta = getSessionMeta(sessionId)

    recordFeedback(!!satisfied)

    logger.info(`满意度反馈: ${sessionId}`, {
      ip,
      satisfied: !!satisfied,
      message_count: meta?.messageCount,
    })
    saveStats()
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
