import { logger } from "../logger/index.js"

export function errorHandler(err, req, res, _next) {
  const sessionId = req.params?.id || req.body?.sessionId
  logger.error(err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.clientIP,
    sessionId: sessionId || undefined,
    agent: req.body?.agent || undefined,
  })
  res.status(err.status || 500).json({ error: err.message || "服务器内部错误" })
}
