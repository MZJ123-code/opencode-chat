import rateLimit from "express-rate-limit"

/** @type {number} 限流窗口时长（15 分钟） */
const windowMs = 15 * 60 * 1000
/** @type {number} 每窗口最大请求数 */
const maxRequests = 200

/**
 * API 限流中间件，每个 IP 每 15 分钟最多 200 次请求
 * 中间件链位置：在 requestLogger 之后，路由之前
 * SSE /api/events 不限流
 */
export const rateLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.clientIP,
  validate: { keyGeneratorIpFallback: false },
  skip: (req) => req.path === "/events" && req.headers.accept === "text/event-stream",
  message: { error: "请求过于频繁，请稍后再试" },
})
