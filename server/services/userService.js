import { ipUsers, ipSessions, stats } from "../storage/store.js"
import { logger } from "../logger/index.js"

export function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket.remoteAddress?.replace("::ffff:", "") ||
    "unknown"
  )
}

export function ensureIP(ip) {
  if (!ipUsers.has(ip)) {
    ipUsers.set(ip, { sessionIds: new Set() })
    ipSessions.set(ip, [])
    stats.visitors.add(ip)
    logger.info(`新访客: ${ip}`, {
      visitor_count: stats.visitors.size,
      total_sessions: stats.totalSessions,
    })
  }
}

export function getVisitorInfo() {
  return {
    total_visitors: stats.visitors.size,
    active_visitors: ipUsers.size,
  }
}
