import { Router } from "express"
import { getClient } from "../services/opencode.js"
import { getSessionMeta, recordMessage } from "../services/sessionService.js"
import { recordQuestion } from "../services/analyticsService.js"
import { MODEL, AGENT_DIR_MAP } from "../config.js"
import { logger } from "../logger/index.js"
import { requireBody } from "../middleware/validate.js"
import { requireSessionOwnership } from "../middleware/sessionGuard.js"

const router = Router()

/**
 * 为指定 Agent 构建携带 x-opencode-directory 请求头的 SDK options
 * 仅当 Agent 在 AGENT_DIR_MAP 中配置了独立目录时生效
 * @param {string|null|undefined} agent
 * @returns {{ headers?: Record<string, string> }}
 */
function directoryOpts(agent) {
  if (agent && AGENT_DIR_MAP.has(agent)) {
    return { headers: { "x-opencode-directory": encodeURIComponent(AGENT_DIR_MAP.get(agent)) } }
  }
  return {}
}

/** 提取请求公共前置信息 */
function getPromptContext(req) {
  const userId = req.userId
  const ip = req.clientIP
  const { sessionId, message, agent: bodyAgent } = req.body
  const meta = getSessionMeta(sessionId)
  const agent = meta?.agent || bodyAgent || null
  return { userId: userId?.slice(0, 8), ip, sessionId, message, meta, agent }
}

// Async prompt (non-blocking, response comes via /api/events SSE stream)
router.post("/async", requireBody("sessionId", "message"), requireSessionOwnership(), async (req, res, next) => {
  const requestStart = Date.now()
  const ctx = getPromptContext(req)

  try {
    const client = getClient()
    logger.info(`异步消息: ${ctx.userId} -> ${ctx.sessionId}`, {
      message_preview: ctx.message.slice(0, 80),
      agent: ctx.agent,
      model: MODEL,
    })
    const promptAsyncParams = { sessionID: ctx.sessionId, parts: [{ type: "text", text: ctx.message }] }
    if (ctx.agent) promptAsyncParams.agent = ctx.agent
    await client.session.promptAsync(promptAsyncParams, directoryOpts(ctx.agent))

    // SDK 调用成功后再记录分析数据，避免失败时产生脏数据
    recordMessage(ctx.sessionId)
    recordQuestion(ctx.sessionId, ctx.ip, ctx.message, ctx.agent)

    logger.info(`异步 prompt 已提交: ${ctx.sessionId}`, { duration_ms: Date.now() - requestStart })
    res.json({ ok: true, sessionId: ctx.sessionId })
  } catch (err) {
    logger.error(`异步 prompt 提交失败: ${ctx.sessionId}`, {
      error: err.message,
      duration_ms: Date.now() - requestStart,
      agent: ctx.agent,
    })
    next(err)
  }
})

export default router
