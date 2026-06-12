import { ipUsers, ipSessions, userSessions, stats } from "../storage/store.js"
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
 * 确保 IP 已注册，首次访问时初始化（兼容旧版）
 * @param {string} ip - 客户端 IP
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

/**
 * 确保 userId 已注册，首次访问时初始化
 * @param {string} userId - 用户 Token
 */
export function ensureUser(userId) {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, new Set())
    logger.info(`新用户: ${userId.slice(0, 8)}...`)
  }
}
