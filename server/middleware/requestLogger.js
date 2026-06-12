import { logger } from "../logger/index.js"

/** 不记录 access 日志的路径前缀 */
const SKIP_PATHS = ["/api/events", "/api/health"]

/**
 * 请求日志中间件，在响应完成时记录访问日志
 * 高频路径（SSE/健康检查）跳过，减少磁盘 I/O
 * 中间件链位置：在 userToken 之后，rateLimiter 之前
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function requestLogger(req, res, next) {
  if (SKIP_PATHS.some(p => req.path.startsWith(p))) return next()
  const start = Date.now()
  res.on("finish", () => {
    logger.access(req.method, req.path, res.statusCode, Date.now() - start, req.clientIP)
  })
  next()
}
