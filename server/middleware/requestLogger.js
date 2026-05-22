import { logger } from "../logger/index.js"

export function requestLogger(req, res, next) {
  const start = Date.now()
  res.on("finish", () => {
    logger.access(req.method, req.path, res.statusCode, Date.now() - start, req.clientIP)
  })
  next()
}
