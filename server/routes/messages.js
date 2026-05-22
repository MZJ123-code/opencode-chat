import { Router } from "express"
import { getClient } from "../services/opencode.js"
import { requireSessionOwnership } from "../middleware/sessionGuard.js"
import { logger } from "../logger/index.js"

function serializePart(p) {
  const base = { id: p.id, type: p.type, time: p.time, metadata: p.metadata }
  switch (p.type) {
    case "text":
      return { ...base, text: p.text }
    case "reasoning":
      return { ...base, text: p.text }
    case "tool":
      return { ...base, callID: p.callID, tool: p.tool, state: p.state }
    case "step-start":
      return { ...base, snapshot: p.snapshot }
    case "step-finish":
      return { ...base, reason: p.reason, cost: p.cost, tokens: p.tokens }
    case "subtask":
      return { ...base, prompt: p.prompt, description: p.description, agent: p.agent, model: p.model, command: p.command }
    case "patch":
      return { ...base, hash: p.hash, files: p.files }
    case "agent":
      return { ...base, name: p.name }
    case "snapshot":
      return { ...base, snapshot: p.snapshot }
    case "compaction":
      return { ...base, auto: p.auto, overflow: p.overflow, tail_start_id: p.tail_start_id }
    default:
      return base
  }
}

const router = Router()

router.get("/:id/messages", requireSessionOwnership("id"), async (req, res, next) => {
  const ip = req.clientIP
  const sessionId = req.params.id

  try {
    logger.info(`查询消息历史: ${ip} -> ${sessionId}`)
    const client = getClient()
    const result = await client.session.messages({ path: { id: sessionId } })

    const messages = result.data.map((m) => ({
      role: m.info.role,
      parts: m.parts.map((p) => serializePart(p)),
      time: m.info.time,
    }))

    logger.info(`返回消息历史: ${sessionId}`, { message_count: messages.length })
    res.json(messages)
  } catch (err) {
    next(err)
  }
})

export default router
