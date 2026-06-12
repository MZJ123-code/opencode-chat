import { logger } from "../logger/index.js"

/**
 * 性能监控中间件
 * 记录请求响应时间，标记慢请求（>1000ms）
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function performanceLogger(req, res, next) {
  // 仅监控 API 请求，跳过高频路径和静态文件
  if (!req.path.startsWith('/api') || req.path === '/api/events' || req.path === '/api/health') return next()
  const start = req._startTime || Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const log = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.clientIP,
    }

    if (duration > 1000) {
      logger.warn('慢请求', log)
    } else if (duration > 500) {
      logger.info('较慢请求', log)
    }
  })

  next()
}
