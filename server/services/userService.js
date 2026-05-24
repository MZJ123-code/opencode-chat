import { ipUsers, ipSessions, stats } from "../storage/store.js"
import { logger } from "../logger/index.js"

/**
 * 从请求头中提取客户端真实 IP
 * @param {import("express").Request} req - Express 请求对象
 * @returns {string} 客户端 IP 地址
 */
export function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket.remoteAddress?.replace("::ffff:", "") ||
    "unknown"
  )
}

/**
 * 确保 IP 已注册，首次访问时初始化用户数据
 * @param {string} ip - 客户端 IP
 * @returns {void}
 */
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

