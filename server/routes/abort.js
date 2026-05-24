import { Router } from "express"
import { getSessionMeta } from "../services/sessionService.js"
import { getClient } from "../services/opencode.js"
import { logger } from "../logger/index.js"

const router = Router()

router.post("/:id/abort", async (req, res, next) => {
  try {
    const { id } = req.params
    const meta = getSessionMeta(id)
    logger.info(`中断会话请求: ${id}`, {
      agent: meta?.agent || null,
      title: meta?.title,
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
