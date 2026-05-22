import { ipUsers, ipSessions, sessionMeta, stats } from "../storage/store.js"
import { logger } from "../logger/index.js"
import { getClient } from "./opencode.js"
import { MODEL } from "../config.js"

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function createSession(ip, title, agent = null) {
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
