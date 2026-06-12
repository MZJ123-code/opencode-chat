import { Router } from "express"
import { getClient } from "../services/opencode.js"
import { requireSessionOwnership } from "../middleware/sessionGuard.js"
import { getSessionMeta } from "../services/sessionService.js"
import { logger } from "../logger/index.js"

/**
 * 序列化消息 part 对象，按类型提取关键字段
 * @param {Record<string, unknown>} p - OpenCode 消息 part
 * @returns {Record<string, unknown>} 序列化后的 part 对象
 */
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
      return { ...base, snapshot: p.snapshot, model: p.model, agent: p.agent }
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

/**
 * 从消息列表中收集所有涉及的模型和 Agent 名称
 * @param {Array<Record<string, unknown>>} messages - 消息数组
 * @returns {{ models: string[], agents: string[] }} 模型和 Agent 列表
 */
function collectModelsAndAgents(messages) {
  const models = new Set()
  const agents = new Set()
  for (const m of messages) {
    if (m.info?.agent) agents.add(m.info.agent)
    if (m.info?.model) {
      const md = m.info.model
      models.add(typeof md === "object" ? `${md.providerID}/${md.modelID}` : md)
    }
    for (const p of m.parts || []) {
      if (p.type === "step-start" && p.agent) agents.add(p.agent)
      if (p.type === "step-start" && p.model) {
        const md = p.model
        models.add(typeof md === "object" ? `${md.providerID}/${md.modelID}` : md)
      }
      if (p.type === "subtask" && p.agent) agents.add(p.agent)
      if (p.type === "subtask" && p.model) {
        models.add(`${p.model.providerID}/${p.model.modelID}`)
      }
      if (p.type === "agent" && p.name) agents.add(p.name)
    }
  }
  return {
    models: [...models],
    agents: [...agents],
  }
}

/** @type {import("express").Router} 消息历史路由：GET /api/sessions/:id/messages */
const router = Router()

/**
 * GET /api/sessions/:id/messages — 获取指定会话的消息历史
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
router.get("/:id/messages", requireSessionOwnership("id"), async (req, res, next) => {
  const userId = req.userId?.slice(0, 8)
  const sessionId = req.params.id
  const meta = getSessionMeta(sessionId)

  try {
    logger.info(`查询消息历史: ${userId} -> ${sessionId}`, {
      session_agent: meta?.agent || null,
      session_title: meta?.title,
    })
    const client = getClient()
    const result = await client.session.messages({ sessionID: sessionId })

    if (!result.data || !Array.isArray(result.data)) {
      logger.warn(`消息历史为空或无效: ${sessionId}`)
      return res.json([])
    }

    const messages = result.data.map((m) => ({
      role: m.info.role,
      parts: (m.parts || []).map((p) => serializePart(p)),
      time: m.info.time,
    }))

    const { models, agents } = collectModelsAndAgents(result.data)

    logger.info(`返回消息历史: ${sessionId}`, {
      message_count: messages.length,
      models_in_use: models.length > 0 ? models : undefined,
      agents_in_use: agents.length > 0 ? agents : undefined,
    })
    res.json(messages)
  } catch (err) {
    next(err)
  }
})

export default router
