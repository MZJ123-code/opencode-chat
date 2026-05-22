import { getClientIP } from "../services/userService.js"

export function clientIPMiddleware(req, res, next) {
  req.clientIP = getClientIP(req)
  next()
}
