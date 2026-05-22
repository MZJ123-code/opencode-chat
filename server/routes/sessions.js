import { Router } from "express"
import { ensureIP } from "../services/userService.js"
import { createSession, listSessions, getSessionMeta } from "../services/sessionService.js"
import { saveStats } from "../services/statsService.js"
import { getClient } from "../services/opencode.js"
import { MODEL, SMALL_MODEL, AGENT_OPTIONS } from "../config.js"
import { logger } from "../logger/index.js"

const router = Router()

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

router.get("/", (req, res) => {
  const ip = req.clientIP
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

// Abort an active session
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
