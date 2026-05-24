import { ipUsers, ipSessions, sessionMeta, stats } from "../storage/store.js"
import { logger } from "../logger/index.js"
import { getClient } from "./opencode.js"
import { MODEL } from "../config.js"

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days
const MAX_SESSIONS_PER_IP = 100
const MAX_TOTAL_SESSIONS = 5000

function evictOldestSession(ip) {
  const ids = ipSessions.get(ip)
  if (!ids || ids.length === 0) return
  const oldestId = ids[0]
  ids.shift()
  ipUsers.get(ip)?.sessionIds.delete(oldestId)
  sessionMeta.delete(oldestId)
  logger.warn(`超限淘汰会话: ${oldestId}`, { ip })
}

export async function createSession(ip, title, agent = null) {
  // 超过单 IP 上限时淘汰最旧会话
  const existing = ipSessions.get(ip) || []
  if (existing.length >= MAX_SESSIONS_PER_IP) {
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
        const ownerIds = ipSessions.get(ownerIp)
        if (ownerIds) {
          const idx = ownerIds.indexOf(oldestId)
          if (idx !== -1) ownerIds.splice(idx, 1)
        }
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
  ipSessions.get(ip).push(sessionId)
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
  if (meta) meta.messageCount++
}

export function validateOwnership(ip, sessionId) {
  const user = ipUsers.get(ip)
  return user && user.sessionIds.has(sessionId)
}
