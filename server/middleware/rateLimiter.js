const windowMs = 15 * 60 * 1000 // 15 minutes
const maxRequests = 200 // per window per IP

const hits = new Map()

// cleanup expired entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - windowMs
  for (const [key, entry] of hits) {
    if (entry.resetAt < cutoff) hits.delete(key)
  }
}, 5 * 60 * 1000).unref()

export function rateLimiter(req, res, next) {
  // SSE streams should not be rate-limited (they produce many events per second)
  if (req.path === '/events' && req.headers.accept === 'text/event-stream') {
    return next()
  }

  const ip = req.clientIP || req.ip || "unknown"
  const now = Date.now()

  let entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs }
    hits.set(ip, entry)
  }

  entry.count++
  res.set("X-RateLimit-Limit", maxRequests)
  res.set("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count))
  res.set("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000))

  if (entry.count > maxRequests) {
    return res.status(429).json({ error: "请求过于频繁，请稍后再试" })
  }

  next()
}
