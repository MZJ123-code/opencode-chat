import { Router } from "express"
import { ensureIP } from "../services/userService.js"
import { createSession, listSessions } from "../services/sessionService.js"
import { saveStats } from "../services/statsService.js"
import { logger } from "../logger/index.js"

const router = Router()

router.post("/", async (req, res, next) => {
  try {
    const ip = req.clientIP
    ensureIP(ip)
    const title = req.body.title || `咨询 ${new Date().toLocaleTimeString("zh-CN")}`
    logger.info(`创建会话请求: ${ip}`, { title })

    const result = await createSession(ip, title)
    saveStats()
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.get("/", (req, res) => {
  const ip = req.clientIP
  const list = listSessions(ip)
  logger.info(`查询会话列表: ${ip}`, { count: list.length })
  res.json(list)
})

export default router
