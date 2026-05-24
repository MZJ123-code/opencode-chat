import { validateOwnership, getSessionMeta, tryRegisterSession } from "../services/sessionService.js"
import { ensureIP } from "../services/userService.js"
import { recordBlockedAccess } from "../services/statsService.js"
import { saveStats } from "../services/statsService.js"
import { logger } from "../logger/index.js"

/**
 * 会话归属守卫中间件工厂，验证请求对指定会话的访问权限
 * 先本地检查，再尝试懒注册，最终拒绝则记录拦截统计
 * @param {string} [paramName="id"] - URL 路径参数名（或从 req.body.sessionId 读取）
 * @returns {import("express").RequestHandler} Express 中间件
 */
export function requireSessionOwnership(paramName = "id") {
  return (req, res, next) => {
    const ip = req.clientIP
    const sessionId = req.params[paramName] || req.body.sessionId

    if (!sessionId) {
      logger.warn(`会话守卫: 会话 ID 为空`, { ip, path: req.path, method: req.method })
      recordBlockedAccess()
      saveStats()
      return res.status(403).json({ error: "无权访问此会话" })
    }

    // 确保 IP 已注册（服务重启后旧用户可恢复访问）
    ensureIP(ip)

    // 先本地检查
    if (validateOwnership(ip, sessionId)) return next()

    // 本地未找到，尝试从 OpenCode SDK 懒注册
    tryRegisterSession(ip, sessionId)
      .then((registered) => {
        if (registered) return next()

        // 最终失败
        recordBlockedAccess()
        logger.warn(`访问被拒绝: ${ip} -> ${sessionId}`, {
          session_exists: !!getSessionMeta(sessionId),
        })
        saveStats()
        return res.status(403).json({ error: "无权访问此会话" })
      })
      .catch((err) => {
        logger.error(`会话守卫异常: ${err.message}`, { ip, sessionId, stack: err.stack })
        return res.status(500).json({ error: "会话验证失败" })
      })
  }
}
