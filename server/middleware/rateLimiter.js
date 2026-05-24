import rateLimit from "express-rate-limit"

const windowMs = 15 * 60 * 1000 // 15 分钟
const maxRequests = 200 // 每个 IP 每窗口最多 200 次

export const rateLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.clientIP || req.ip || "unknown",
  skip: (req) => req.path === "/events" && req.headers.accept === "text/event-stream",
  message: { error: "请求过于频繁，请稍后再试" },
})
