import { stats, sessionMeta, userSessions } from "../storage/store.js"
import { getDatabase } from "../storage/database.js"

/**
 * 从 SQLite 恢复仅有内存的统计计数器
 * SQLite 的 sessions 表提供总会话数，question/feedback 表提供对应计数
 */
export function restoreStats() {
  try {
    const db = getDatabase()
    const s = db.prepare("SELECT COUNT(*) AS c FROM sessions").get()
    stats.totalSessions = s.c
  } catch {}
}

/**
 * 记录一次提问（保留向后兼容，计数查询走 SQLite）
 */
export function incrementQuestions() {}

/**
 * 记录用户满意度反馈（保留向后兼容，计数查询走 SQLite）
 * @param {boolean} satisfied
 */
export function recordFeedback(satisfied) {}

/**
 * 记录一次被限流拦截的访问
 */
export function recordBlockedAccess() {
  stats.blockedAccess++
}

/**
 * 获取当前平台统计快照
 * 提问/反馈数据从 SQLite 聚合查询，确保与看板数据一致
 * @returns {{ visitors: number, totalSessions: number, activeSessions: number, totalQuestions: number, satisfied: number, unsatisfied: number, blockedAccess: number, agentDistribution: Record<string, number> }}
 */
export function getStats() {
  let activeSessions = 0
  const agentDistribution = {}
  for (const [, meta] of sessionMeta) {
    if (meta.messageCount > 0) activeSessions++
    const a = meta.agent || "default"
    agentDistribution[a] = (agentDistribution[a] || 0) + 1
  }

  let totalQuestions = 0
  let satisfied = 0
  let unsatisfied = 0
  try {
    const db = getDatabase()
    const q = db.prepare("SELECT COUNT(*) AS c FROM questions").get()
    totalQuestions = q.c
    const f = db.prepare(
      "SELECT SUM(CASE WHEN satisfied = 1 THEN 1 ELSE 0 END) AS likes, SUM(CASE WHEN satisfied = 0 THEN 1 ELSE 0 END) AS dislikes FROM feedback"
    ).get()
    satisfied = f.likes || 0
    unsatisfied = f.dislikes || 0
  } catch {}

  return {
    visitors: userSessions.size,
    totalSessions: stats.totalSessions,
    activeSessions,
    totalQuestions,
    satisfied,
    unsatisfied,
    blockedAccess: stats.blockedAccess,
    agentDistribution,
  }
}

/**
 * 持久化统计（保留向后兼容，现为无操作——SQLite 负责持久化）
 */
export function saveStatsSync() {}

/**
 * 异步写入统计（保留向后兼容，现为无操作）
 */
export function saveStats() {}
