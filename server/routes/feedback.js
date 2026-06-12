import { Router } from "express"
import { requireSessionOwnership } from "../middleware/sessionGuard.js"
import { recordFeedback as recordAnalyticsFeedback, getLatestQuestion } from "../services/analyticsService.js"
import { getSessionMeta } from "../services/sessionService.js"
import { getClient } from "../services/opencode.js"
import { logger } from "../logger/index.js"

/** @type {import("express").Router} 反馈路由：POST /api/sessions/:id/feedback */
const router = Router()

/**
 * 从 SDK 会话消息中提取最后一条 assistant 消息的文本
 * @param {string} sessionId
 * @returns {Promise<string>}
 */
async function getLastAssistantReply(sessionId) {
  try {
    const client = getClient()
    const result = await client.session.messages({ sessionID: sessionId })
    const msgs = result.data || []
    logger.info(`getLastAssistantReply: 共获取到 ${msgs.length} 条消息`, {
      sessionId,
      msgMeta: msgs.map(m => ({ role: m.info?.role, id: m.id, partsCount: (m.parts || []).length })),
    })

    // 记录每条消息的完整结构用于排查
    msgs.forEach((m, idx) => {
      const parts = m.parts || []
      logger.info(`getLastAssistantReply: 消息[${idx}] 详情`, {
        sessionId,
        role: m.info?.role,
        id: m.id,
        parts: parts.map(p => ({ type: p.type, textLen: (p.text || "").length })),
        topFields: Object.keys(m).filter(k => !["parts"].includes(k)),
      })
    })

    for (let i = msgs.length - 1; i >= 0; i--) {
      const msg = msgs[i]
      if (msg.info?.role === "assistant") {
        const parts = msg.parts || []
        const textParts = parts.filter(p => p.type === "text")
        logger.info(`getLastAssistantReply: 找到 assistant 消息`, {
          sessionId,
          index: i,
          partsCount: parts.length,
          textPartsCount: textParts.length,
          partTypes: parts.map(p => p.type),
        })
        const text = textParts.map(p => p.text).join("").slice(0, 2000)
        logger.info(`getLastAssistantReply: 提取内容长度 ${text.length}`, {
          sessionId,
          preview: text.slice(0, 200),
        })
        return text
      }
    }
    logger.warn(`getLastAssistantReply: 未找到 assistant 消息`, { sessionId })
  } catch (err) {
    logger.error(`getLastAssistantReply: SDK 查询失败`, {
      sessionId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
  }
  return ""
}

/**
 * POST /api/sessions/:id/feedback — 提交会话满意度反馈
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
router.post("/:id/feedback", requireSessionOwnership("id"), async (req, res, next) => {
  try {
    const userId = req.userId?.slice(0, 8)
    const ip = req.clientIP
    const sessionId = req.params.id
    const { satisfied } = req.body

    if (typeof satisfied !== "boolean" && satisfied !== undefined) {
      return res.status(400).json({ error: "satisfied 必须为布尔值" })
    }

    const meta = getSessionMeta(sessionId)
    const latestQuestion = getLatestQuestion(sessionId)

    const answerContent = await getLastAssistantReply(sessionId)

    recordAnalyticsFeedback(sessionId, ip, !!satisfied, latestQuestion?.content || "", answerContent)

    logger.info(`满意度反馈: ${sessionId}`, {
      userId,
      satisfied: !!satisfied,
      message_count: meta?.messageCount,
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
