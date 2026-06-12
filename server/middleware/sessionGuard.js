import { validateOwnership, getSessionMeta, tryRegisterSession } from "../services/sessionService.js"
import { recordBlockedAccess } from "../services/statsService.js"
import { logger } from "../logger/index.js"

/**
 * 会话归属守卫中间件工厂，验证请求对指定会话的访问权限
 * 先本地检查，再尝试懒注册，最终拒绝则记录拦截统计
 * @param {string} [paramName="id"] - URL 路径参数名（或从 req.body.sessionId 读取）
 * @returns {import("express").RequestHandler} Express 中间件
 */
export function requireSessionOwnership(paramName = "id") {
  return (req, res, next) => {
    const userId = req.userId
    const sessionId = req.params[paramName] || req.body.sessionId

    if (!sessionId) {
      logger.warn(`会话守卫: 会话 ID 为空`, { userId: userId?.slice(0, 8), path: req.path, method: req.method })
      recordBlockedAccess()
      return res.status(403).json({ error: "无权访问此会话" })
    }

    // 先本地检查
    if (validateOwnership(userId, sessionId)) return next()

    // 本地未找到，尝试从 OpenCode SDK 懒注册
    tryRegisterSession(userId, sessionId)
      .then((registered) => {
        if (registered) return next()

        recordBlockedAccess()
        logger.warn(`访问被拒绝: ${userId?.slice(0, 8)} -> ${sessionId}`, {
          session_exists: !!getSessionMeta(sessionId),
        })
        return res.status(403).json({ error: "无权访问此会话" })
      })
      .catch((err) => {
        logger.error(`会话守卫异常: ${err.message}`, { userId: userId?.slice(0, 8), sessionId, stack: err.stack })
        return next(err)
      })
  }
}
