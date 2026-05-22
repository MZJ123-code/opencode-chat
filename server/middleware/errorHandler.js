import { logger } from "../logger/index.js"

export function errorHandler(err, req, res, _next) {
  logger.error(err.message, { stack: err.stack, path: req.path, ip: req.clientIP })
  res.status(err.status || 500).json({ error: err.message || "服务器内部错误" })
}
