import { Router } from "express"
import { ensureIP } from "../services/userService.js"
import { createSession, listSessions } from "../services/sessionService.js"
import { saveStats } from "../services/statsService.js"
import { MODEL, SMALL_MODEL, AGENT_OPTIONS } from "../config.js"
import { logger } from "../logger/index.js"

/** @type {import("express").Router} 会话管理路由：POST / 创建会话，GET / 列出会话 */
const router = Router()

/**
 * POST /api/sessions — 创建新会话
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
router.post("/", async (req, res, next) => {
  try {
    const ip = req.clientIP
    ensureIP(ip)
    const title = req.body.title || `咨询 ${new Date().toLocaleTimeString("zh-CN")}`
    const agent = req.body.agent || null
    logger.info(`创建会话请求: ${ip}`, {
      title,
      agent,
      available_agents: AGENT_OPTIONS.map(a => a.agent),
      model: MODEL,
      small_model: SMALL_MODEL,
    })

    const result = await createSession(ip, title, agent)
    saveStats()
    res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/sessions — 获取用户会话列表
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
router.get("/", (req, res) => {
  const ip = req.clientIP
  ensureIP(ip)
  const list = listSessions(ip)
  const agentStats = {}
  for (const s of list) {
    const a = s.agent || "default"
    agentStats[a] = (agentStats[a] || 0) + 1
  }
  logger.info(`查询会话列表: ${ip}`, {
    count: list.length,
    agents: agentStats,
  })
  res.json(list)
})

export default router
