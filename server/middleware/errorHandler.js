import { logger } from "../logger/index.js"

/**
 * 全局错误处理中间件，统一记录错误日志并返回 JSON 响应
 * 中间件链位置：路由最后，所有 next(err) 最终汇聚至此
 * @param {Error} err - 错误对象
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */
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
