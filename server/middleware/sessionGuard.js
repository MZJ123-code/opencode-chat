import { validateOwnership } from "../services/sessionService.js"
import { recordBlockedAccess } from "../services/statsService.js"
import { saveStats } from "../services/statsService.js"
import { logger } from "../logger/index.js"

export function requireSessionOwnership(paramName = "id") {
  return (req, res, next) => {
    const ip = req.clientIP
    const sessionId = req.params[paramName] || req.body.sessionId

    if (!sessionId || !validateOwnership(ip, sessionId)) {
      recordBlockedAccess()
      logger.warn(`访问被拒绝: ${ip} -> ${sessionId}`)
      saveStats()
      return res.status(403).json({ error: "无权访问此会话" })
    }
    next()
  }
}
