import { Router } from "express"
import { requireSessionOwnership } from "../middleware/sessionGuard.js"
import { getSessionMeta } from "../services/sessionService.js"
import { getClient } from "../services/opencode.js"
import { logger } from "../logger/index.js"

/** @type {import("express").Router} 中断路由：POST /api/sessions/:id/abort */
const router = Router()

/**
 * POST /api/sessions/:id/abort — 中断指定会话的 AI 回复
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
router.post("/:id/abort", requireSessionOwnership("id"), async (req, res, next) => {
  try {
    const { id } = req.params
    const meta = getSessionMeta(id)
    logger.info(`中断会话请求: ${id}`, {
      message_count: meta?.messageCount,
    })
    const client = getClient()
    await client.session.abort({ sessionID: id })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
