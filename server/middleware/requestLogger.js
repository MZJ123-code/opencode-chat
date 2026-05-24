import { logger } from "../logger/index.js"

/**
 * 请求日志中间件，在响应完成时记录访问日志
 * 中间件链位置：在 clientIP 之后，rateLimiter 之前
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function requestLogger(req, res, next) {
  const start = Date.now()
  res.on("finish", () => {
    logger.access(req.method, req.path, res.statusCode, Date.now() - start, req.clientIP)
  })
  next()
}
