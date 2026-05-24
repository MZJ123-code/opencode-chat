import { getClientIP } from "../services/userService.js"

/**
 * 客户端 IP 识别中间件，将真实 IP 写入 req.clientIP
 * 中间件链位置：在 json() 之后，requestLogger 之前
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function clientIPMiddleware(req, res, next) {
  req.clientIP = getClientIP(req)
  next()
}
