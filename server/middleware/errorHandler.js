import { logger } from "../logger/index.js"

/**
 * 自定义应用错误类
 * 支持错误码、HTTP 状态码、操作标记（operational vs programmer error）
 */
export class AppError extends Error {
  /**
   * @param {string} message - 错误描述
   * @param {string} [code='INTERNAL_ERROR'] - 机器可读错误码
   * @param {number} [statusCode=500] - HTTP 状态码
   * @param {boolean} [isOperational=true] - true=可预见的操作错误，false=程序缺陷
   */
  constructor(message, code = 'INTERNAL_ERROR', statusCode = 500, isOperational = true) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
  }
}

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
  const status = err.statusCode || err.status || 500
  const code = err.code || 'INTERNAL_ERROR'
  // SDK 错误或其他未知错误默认视为可操作错误（非程序缺陷）
  const isOperational = err.isOperational !== undefined ? err.isOperational : true

  if (!isOperational) {
    logger.error(`[${code}] ${err.message}`, {
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.clientIP,
      sessionId: sessionId || undefined,
    })
  } else {
    logger.warn(`[${code}] ${err.message}`, {
      path: req.path,
      method: req.method,
      ip: req.clientIP,
      sessionId: sessionId || undefined,
    })
  }

  const message = status >= 500 ? "服务器内部错误" : err.message || "请求错误"
  res.status(status).json({ error: message, code })
}
