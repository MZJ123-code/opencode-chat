import { userSessions, sessionMeta, stats } from "../storage/store.js"
import { getDatabase } from "../storage/database.js"
import { logger } from "../logger/index.js"
import { getClient } from "./opencode.js"
import { MODEL, AGENT_DIR_MAP } from "../config.js"
import { ensureUser } from "./userService.js"

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000
const MAX_SESSIONS_PER_USER = 100
const MAX_TOTAL_SESSIONS = 5000
const MAX_MESSAGES_PER_SESSION = 10_000

/**
 * 从 SQLite 恢复会话元数据到内存
 */
export function restoreSessions() {
  try {
    const db = getDatabase()
    const rows = db.prepare("SELECT * FROM sessions").all()
    for (const row of rows) {
      sessionMeta.set(row.id, {
        ip: row.ip,
        createdAt: row.created_at,
        title: row.title,
        messageCount: row.message_count,
        agent: row.agent,
      })
      const sessions = userSessions.get(row.user_id)
      if (sessions) sessions.add(row.id)
    }
    logger.info(`从 SQLite 恢复 ${rows.length} 个会话`)
  } catch (err) {
    logger.error("恢复会话失败", { error: err.message })
  }
}

/**
 * 写入会话元数据到 SQLite
 * @param {string} sessionId
 * @param {string} userId
 * @param {{ ip: string, title: string, agent: string|null, createdAt: number, messageCount: number }} meta
 */
function persistSessionMeta(sessionId, userId, meta) {
  try {
    const db = getDatabase()
    db.run(
      "INSERT OR REPLACE INTO sessions (id, user_id, title, agent, message_count, created_at, ip) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [sessionId, userId, meta.title, meta.agent, meta.messageCount, meta.createdAt, meta.ip]
    )
  } catch (err) {
    logger.error("持久化会话失败", { sessionId, error: err.message })
  }
}

/**
 * 从 SQLite 删除会话
 * @param {string} sessionId
 */
function deleteSessionFromDB(sessionId) {
  try {
    const db = getDatabase()
    db.run("DELETE FROM sessions WHERE id = ?", [sessionId])
  } catch (err) {
    logger.error("删除会话记录失败", { sessionId, error: err.message })
  }
}

/**
 * 淘汰用户最旧的会话
 * @param {string} userId
 */
function evictOldestSession(userId) {
  const ids = userSessions.get(userId)
  if (!ids || ids.size === 0) return
  const oldestId = ids.values().next().value
  ids.delete(oldestId)
  const meta = sessionMeta.get(oldestId)
  if (meta) deleteSessionFromDB(oldestId)
  sessionMeta.delete(oldestId)
  logger.warn(`超限淘汰会话: ${oldestId}`, { userId: userId.slice(0, 8) })
}

/**
 * 创建新会话：调用 OpenCode SDK 创建，本地记录元数据并持久化
 * @param {string} userId - 用户 Token
 * @param {string} ip - 客户端 IP（仅用于日志和统计）
 * @param {string} title - 会话标题
 * @param {string | null} [agent=null] - 指定 Agent
 * @returns {Promise<{sessionId: string, title: string, agent: string | null}>} 会话信息
 */
export async function createSession(userId, ip, title, agent = null) {
  ensureUser(userId)

  const ids = userSessions.get(userId)
  if (ids && ids.size >= MAX_SESSIONS_PER_USER) {
    evictOldestSession(userId)
  }

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
      for (const [, sessions] of userSessions) {
        sessions.delete(oldestId)
      }
      deleteSessionFromDB(oldestId)
      sessionMeta.delete(oldestId)
      logger.warn(`全局超限淘汰会话: ${oldestId}`)
    }
  }

  const client = getClient()
  const createParams = { title }
  const sdkOpts = {}
  if (agent) {
    createParams.agent = agent
    const dir = AGENT_DIR_MAP.get(agent)
    if (dir) sdkOpts.headers = { "x-opencode-directory": encodeURIComponent(dir) }
  }
  const result = await client.session.create(createParams, sdkOpts)
  const sessionId = result.data.id

  const meta = { ip, createdAt: Date.now(), title, messageCount: 0, agent }
  userSessions.get(userId).add(sessionId)
  sessionMeta.set(sessionId, meta)
  persistSessionMeta(sessionId, userId, meta)
  stats.totalSessions++

  logger.info(`会话创建成功: ${sessionId}`, {
    userId: userId.slice(0, 8),
    ip,
    title,
    agent,
    model: MODEL,
    session_count: stats.totalSessions,
    session_agent: agent || "default",
  })
  return { sessionId, title, agent }
}

/**
 * 清理超过 TTL（7 天）的过期会话
 */
function cleanupExpiredSessions() {
  const cutoff = Date.now() - SESSION_TTL
  let removed = 0
  for (const [id, meta] of sessionMeta) {
    if (meta.createdAt < cutoff) {
      sessionMeta.delete(id)
      for (const [, sessions] of userSessions) {
        sessions.delete(id)
      }
      deleteSessionFromDB(id)
      removed++
    }
  }
  if (removed > 0) logger.info(`清理过期会话: ${removed} 个`)
}

setInterval(cleanupExpiredSessions, 60 * 60 * 1000).unref()

/**
 * 列出指定用户的会话列表
 * @param {string} userId - 用户 Token
 * @returns {Array<{sessionId: string, title: string, createdAt: number, messageCount: number, agent: string | null}>} 会话列表
 */
export function listSessions(userId) {
  const ids = userSessions.get(userId)
  if (!ids) return []
  return [...ids]
    .map((id) => {
      const meta = sessionMeta.get(id)
      return meta
        ? { sessionId: id, title: meta.title, createdAt: meta.createdAt, messageCount: meta.messageCount, agent: meta.agent || null }
        : null
    })
    .filter(Boolean)
    .sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * 获取会话元数据
 * @param {string} sessionId - 会话 ID
 * @returns {import("../storage/store.js").SessionMeta | undefined} 会话元数据
 */
export function getSessionMeta(sessionId) {
  return sessionMeta.get(sessionId)
}

/**
 * 记录会话消息数递增，超过上限时告警
 * 同步更新内存和 SQLite
 * @param {string} sessionId - 会话 ID
 */
export function recordMessage(sessionId) {
  const meta = sessionMeta.get(sessionId)
  if (!meta) return
  if (meta.messageCount >= MAX_MESSAGES_PER_SESSION) {
    logger.warn(`会话消息数已达上限: ${sessionId}`, {
      messageCount: meta.messageCount,
      title: meta.title,
    })
    return
  }
  meta.messageCount++
  try {
    const db = getDatabase()
    // 使用原子 UPDATE 防止并发写入导致计数丢失
    db.run("UPDATE sessions SET message_count = message_count + 1 WHERE id = ?", [sessionId])
  } catch (e) {
    logger.warn(`消息计数写入失败: ${sessionId}`, { error: e.message })
  }
}

/**
 * 验证指定 userId 是否拥有该会话
 * @param {string} userId - 用户 Token
 * @param {string} sessionId - 会话 ID
 * @returns {boolean} 是否拥有权限
 */
export function validateOwnership(userId, sessionId) {
  const sessions = userSessions.get(userId)
  return sessions ? sessions.has(sessionId) : false
}

/**
 * 懒注册：本地未找到会话时，从 OpenCode 验证并自动注册
 * @param {string} userId - 用户 Token
 * @param {string} sessionId - 会话 ID
 * @returns {Promise<boolean>} 是否注册成功
 */
export async function tryRegisterSession(userId, sessionId) {
  if (sessionMeta.has(sessionId)) return true
  const sessions = userSessions.get(userId)
  if (!sessions || sessions.size === 0) return false

  try {
    const client = getClient()
    await client.session.messages({ sessionID: sessionId })
    const meta = { ip: "", createdAt: Date.now(), title: "子任务", messageCount: 0, agent: null }
    sessionMeta.set(sessionId, meta)
    sessions.add(sessionId)
    persistSessionMeta(sessionId, userId, meta)
    logger.info(`懒注册会话: ${sessionId}`, { userId: userId.slice(0, 8) })
    return true
  } catch {
    return false
  }
}
