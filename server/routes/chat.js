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

/** 提取请求公共前置信息并记录基本日志 */
function getPromptContext(req) {
  const ip = req.clientIP
  const { sessionId, message, agent: bodyAgent } = req.body
  const meta = getSessionMeta(sessionId)
  const agent = extractAgentInfo(meta, bodyAgent)
  return { ip, sessionId, message, meta, agent }
}

function logPromptStart(ip, sessionId, message, agent, meta) {
  logger.info(`收到消息: ${ip} -> ${sessionId}`, {
    message_length: message.length,
    message_preview: message.slice(0, 100),
    agent,
    model: MODEL,
    small_model: SMALL_MODEL,
    session_agent: meta?.agent || null,
  })
}

function logPromptAsync(ip, sessionId, preview, agent, meta) {
  logger.info(`异步消息: ${ip} -> ${sessionId}: "${preview}"`, {
    agent,
    model: MODEL,
    small_model: SMALL_MODEL,
    session_agent: meta?.agent || null,
  })
}

// Sync prompt (waits for full response, returns complete data)
router.post("/", requireBody("sessionId", "message"), requireSessionOwnership(), async (req, res, next) => {
  const requestStart = Date.now()
  const ctx = getPromptContext(req)

  try {
    logPromptStart(ctx.ip, ctx.sessionId, ctx.message, ctx.agent, ctx.meta)

    recordMessage(ctx.sessionId)
    incrementQuestions()

    const client = getClient()
    const promptStart = Date.now()
    const promptParams = { sessionID: ctx.sessionId, parts: [{ type: "text", text: ctx.message }] }
    if (ctx.agent) promptParams.agent = ctx.agent
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

    logger.info(`回复完成: ${ctx.sessionId}`, {
      part_count: parts.length,
      part_types: parts.map((p) => p.type),
      agent_used: ctx.agent,
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

    res.json({ sessionId: ctx.sessionId, reply, parts, tokens })
  } catch (err) {
    next(err)
  }
})

// Async prompt (non-blocking, response comes via /api/events SSE stream)
router.post("/async", requireBody("sessionId", "message"), requireSessionOwnership(), async (req, res, next) => {
  const ctx = getPromptContext(req)

  try {
    logPromptAsync(ctx.ip, ctx.sessionId, ctx.message.slice(0, 80), ctx.agent, ctx.meta)

    recordMessage(ctx.sessionId)
    incrementQuestions()
    saveStats()

    const client = getClient()
    const promptAsyncParams = { sessionID: ctx.sessionId, parts: [{ type: "text", text: ctx.message }] }
    if (ctx.agent) promptAsyncParams.agent = ctx.agent
    await client.session.promptAsync(promptAsyncParams)

    res.json({ ok: true, sessionId: ctx.sessionId })
  } catch (err) {
    next(err)
  }
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

/**
 * POST /api/chat/async — 异步发送消息，回复通过 SSE /api/events 推送
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
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
