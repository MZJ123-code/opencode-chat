import { logger } from "../logger/index.js"

export function errorHandler(err, req, res, _next) {
  const sessionId = req.params?.id || req.body?.sessionId
  logger.error(err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.clientIP,
    sessionId: sessionId || undefined,
  })
  const status = err.status || 500
  const message = status >= 500 ? "服务器内部错误" : err.message || "请求错误"
  res.status(status).json({ error: message })
}
