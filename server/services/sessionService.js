import { ipUsers, ipSessions, sessionMeta, stats } from "../storage/store.js"
import { logger } from "../logger/index.js"
import { getClient } from "./opencode.js"
import { MODEL } from "../config.js"

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days
const MAX_SESSIONS_PER_IP = 100
const MAX_TOTAL_SESSIONS = 5000
const MAX_MESSAGES_PER_SESSION = 10_000

function evictOldestSession(ip) {
  const ids = ipSessions.get(ip)
  if (!ids || ids.size === 0) return
  const oldestId = ids.values().next().value
  ids.delete(oldestId)
  ipUsers.get(ip)?.sessionIds.delete(oldestId)
  sessionMeta.delete(oldestId)
  logger.warn(`超限淘汰会话: ${oldestId}`, { ip })
}

export async function createSession(ip, title, agent = null) {
  // 超过单 IP 上限时淘汰最旧会话
  const existing = ipSessions.get(ip)
  if (existing && existing.size >= MAX_SESSIONS_PER_IP) {
    evictOldestSession(ip)
  }

  // 超过全局上限时淘汰最旧会话
  if (sessionMeta.size >= MAX_TOTAL_SESSIONS) {
    let oldestId = null
    let oldestTime = Infinity
    for (const [id, meta] of sessionMeta) {
      if (meta.createdAt < oldestTime) {
        oldestTime = meta.createdAt
        oldestId = id
      }
    }
    if (oldestId) {
      const oldestMeta = sessionMeta.get(oldestId)
      const ownerIp = oldestMeta?.ip
      if (ownerIp) {
        ipSessions.get(ownerIp)?.delete(oldestId)
        ipUsers.get(ownerIp)?.sessionIds.delete(oldestId)
      }
      sessionMeta.delete(oldestId)
      logger.warn(`全局超限淘汰会话: ${oldestId}`)
    }
  }

  const client = getClient()
  const createParams = { title }
  if (agent) createParams.agent = agent
  const result = await client.session.create(createParams)
  const sessionId = result.data.id

  ipUsers.get(ip).sessionIds.add(sessionId)
  ipSessions.get(ip).add(sessionId)
  sessionMeta.set(sessionId, { ip, createdAt: Date.now(), title, messageCount: 0, agent })
  stats.totalSessions++

  logger.info(`会话创建成功: ${sessionId}`, {
    ip,
    title,
    agent,
    model: MODEL,
    session_count: stats.totalSessions,
    session_agent: agent || "default",
  })
  return { sessionId, title, agent }
}

function cleanupExpiredSessions() {
  const cutoff = Date.now() - SESSION_TTL
  let removed = 0
  for (const [id, meta] of sessionMeta) {
    if (meta.createdAt < cutoff) {
      sessionMeta.delete(id)
      const user = ipUsers.get(meta.ip)
      if (user) {
        user.sessionIds.delete(id)
        const arr = ipSessions.get(meta.ip)
        if (arr) {
          const idx = arr.indexOf(id)
          if (idx !== -1) arr.splice(idx, 1)
        }
      }
      removed++
    }
  }
  if (removed > 0) logger.info(`清理过期会话: ${removed} 个`)
}

setInterval(cleanupExpiredSessions, 60 * 60 * 1000).unref()

export function listSessions(ip) {
  const ids = ipSessions.get(ip) || []
  return ids
    .map((id) => {
      const meta = sessionMeta.get(id)
      return meta
        ? { sessionId: id, title: meta.title, createdAt: meta.createdAt, messageCount: meta.messageCount, agent: meta.agent || null }
        : null
    })
    .filter(Boolean)
}

export function getSessionMeta(sessionId) {
  return sessionMeta.get(sessionId)
}

export function recordMessage(sessionId) {
  const meta = sessionMeta.get(sessionId)
  if (!meta) return
  if (meta.messageCount >= MAX_MESSAGES_PER_SESSION) {
    logger.warn(`会话消息数已达上限: ${sessionId}`, {
      messageCount: meta.messageCount,
      title: meta.title,
      ip: meta.ip,
    })
    return
  }
  meta.messageCount++
}

export function validateOwnership(ip, sessionId) {
  const user = ipUsers.get(ip)
  return user && user.sessionIds.has(sessionId)
}

// 懒注册：本地未找到会话时，从 OpenCode 验证并自动注册
export async function tryRegisterSession(ip, sessionId) {
  if (sessionMeta.has(sessionId)) return true
  // 仅当用户已有本地会话时才尝试懒注册（降低越权风险）
  const user = ipUsers.get(ip)
  if (!user || user.sessionIds.size === 0) return false

  try {
    const client = getClient()
    await client.session.messages({ sessionID: sessionId })
    sessionMeta.set(sessionId, { ip, createdAt: Date.now(), title: "子任务", messageCount: 0, agent: null })
    user.sessionIds.add(sessionId)
    ipSessions.get(ip)?.push(sessionId)
    logger.info(`懒注册会话: ${sessionId}`, { ip })
    return true
  } catch {
    return false
  }
}
