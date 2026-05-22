import { Router } from "express"
import { getClient } from "../services/opencode.js"
import { getSessionMeta, recordMessage } from "../services/sessionService.js"
import { incrementQuestions, saveStats } from "../services/statsService.js"
import { MODEL, SMALL_MODEL } from "../config.js"
import { logger } from "../logger/index.js"
import { requireBody } from "../middleware/validate.js"
import { requireSessionOwnership } from "../middleware/sessionGuard.js"

const router = Router()

function extractAgentInfo(meta, bodyAgent) {
  return meta?.agent || bodyAgent || null
}

function extractModelFromParts(parts) {
  for (const p of parts || []) {
    if (p.type === "step-start" && p.model) return p.model
    if (p.type === "subtask" && p.model) return p.model
  }
  return null
}

function extractSubtasks(parts) {
  return (parts || [])
    .filter(p => p.type === "subtask")
    .map(p => ({ agent: p.agent, description: p.description, model: p.model, command: p.command }))
}

function extractToolCalls(parts) {
  return (parts || [])
    .filter(p => p.type === "tool")
    .map(p => ({ tool: p.tool, state: p.state, callID: p.callID }))
}

// Sync prompt (waits for full response, returns complete data)
router.post("/", requireBody("sessionId", "message"), requireSessionOwnership(), async (req, res, next) => {
  const ip = req.clientIP
  const { sessionId, message, agent: bodyAgent } = req.body
  const requestStart = Date.now()
  const meta = getSessionMeta(sessionId)
  const agent = extractAgentInfo(meta, bodyAgent)

  try {
    logger.info(`收到消息: ${ip} -> ${sessionId}`, {
      message_length: message.length,
      message_preview: message.slice(0, 100),
      agent,
      model: MODEL,
      small_model: SMALL_MODEL,
      session_agent: meta?.agent || null,
    })

    recordMessage(sessionId)
    incrementQuestions()

    const client = getClient()
    const promptStart = Date.now()
    const promptParams = { sessionID: sessionId, parts: [{ type: "text", text: message }] }
    if (agent) promptParams.agent = agent
    const result = await client.session.prompt(promptParams)
    const promptMs = Date.now() - promptStart

    const parts = result.data.parts || []
    const tokens = result.data.info?.tokens
    const reply = parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("")

    const actualModel = extractModelFromParts(parts)
    const subtasks = extractSubtasks(parts)
    const toolCalls = extractToolCalls(parts)

    logger.info(`回复完成: ${sessionId}`, {
      part_count: parts.length,
      part_types: parts.map((p) => p.type),
      agent_used: agent,
      model_used: actualModel || MODEL,
      tokens_input: tokens?.input,
      tokens_output: tokens?.output,
      tokens_reasoning: tokens?.reasoning,
      subtask_count: subtasks.length,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      tool_call_count: toolCalls.length,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      opencode_ms: promptMs,
      total_ms: Date.now() - requestStart,
    })
    saveStats()

    res.json({ sessionId, reply, parts, tokens })
  } catch (err) {
    next(err)
  }
})

// Async prompt (non-blocking, response comes via /api/events SSE stream)
router.post("/async", requireBody("sessionId", "message"), requireSessionOwnership(), async (req, res, next) => {
  const ip = req.clientIP
  const { sessionId, message, agent: bodyAgent } = req.body
  const meta = getSessionMeta(sessionId)
  const agent = extractAgentInfo(meta, bodyAgent)

  try {
    const preview = message.slice(0, 80)
    logger.info(`异步消息: ${ip} -> ${sessionId}: "${preview}"`, {
      agent,
      model: MODEL,
      small_model: SMALL_MODEL,
      session_agent: meta?.agent || null,
    })

    recordMessage(sessionId)
    incrementQuestions()
    saveStats()

    const client = getClient()
    const promptAsyncParams = { sessionID: sessionId, parts: [{ type: "text", text: message }] }
    if (agent) promptAsyncParams.agent = agent
    await client.session.promptAsync(promptAsyncParams)

    res.json({ ok: true, sessionId })
  } catch (err) {
    next(err)
  }
})

export default router
