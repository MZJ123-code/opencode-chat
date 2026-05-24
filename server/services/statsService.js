import fs from "fs"
import path from "path"
import { STATS_FILE } from "../config.js"
import { logger } from "../logger/index.js"

/** 内存统计 */
export const stats = {
  questions: 0,
  sessions: 0,
  blockedAccess: 0,
  dailyStats: {},
}

/**
 * 记录一次提问（消息计数递增）
 */
export function incrementQuestions() {
  stats.totalQuestions++
}

/**
 * 记录用户满意度反馈
 * @param {boolean} satisfied - 是否满意
 */
export function recordFeedback(satisfied) {
  if (satisfied) stats.satisfied++
  else stats.unsatisfied++
}

/**
 * 记录一次被限流拦截的访问
 */
export function recordBlockedAccess() {
  stats.blockedAccess++
}

/**
 * 获取当前平台统计快照
 * @returns {{ visitors: number, totalSessions: number, activeSessions: number, totalQuestions: number, satisfied: number, unsatisfied: number, agentDistribution: Record<string, number> }}
 */
export function getStats() {
  let activeSessions = 0
  const agentDistribution = {}
  for (const [, meta] of sessionMeta) {
    if (meta.messageCount > 0) activeSessions++
    const a = meta.agent || "default"
    agentDistribution[a] = (agentDistribution[a] || 0) + 1
  }
  return {
    visitors: stats.visitors.size,
    totalSessions: stats.totalSessions,
    activeSessions,
    totalQuestions: stats.totalQuestions,
    satisfied: stats.satisfied,
    unsatisfied: stats.unsatisfied,
    agentDistribution,
  }
}

/**
 * 构建完整的统计快照对象，包含所有会话详情
 * @returns {Record<string, unknown>} 统计快照
 */
function buildSnapshot() {
  const sessionAgents = {}
  for (const [id, meta] of sessionMeta) {
    sessionAgents[id] = {
      agent: meta.agent || null,
      title: meta.title,
      messageCount: meta.messageCount,
      createdAt: new Date(meta.createdAt).toISOString().replace("T", " ").slice(0, 23),
    }
  }
  return {
    updated: new Date().toISOString().replace("T", " ").slice(0, 23),
    visitors: stats.visitors.size,
    totalSessions: stats.totalSessions,
    totalQuestions: stats.totalQuestions,
    satisfied: stats.satisfied,
    unsatisfied: stats.unsatisfied,
    blockedAccess: stats.blockedAccess,
    activeIPs: [...stats.visitors],
    sessions: sessionAgents,
  }
}

/**
 * 将统计快照写入磁盘文件
 */
function writeStatsSnapshot() {
  fs.writeFileSync(statsPath, JSON.stringify(buildSnapshot(), null, 2), "utf-8")
}

/**
 * 同步写入统计到磁盘（进程退出时保证落盘）
 */
export function saveStatsSync() {
  try {
    writeStatsSnapshot()
    logger.info("统计数据已同步保存到磁盘")
  } catch (err) {
    logger.error(`统计数据同步保存失败: ${err.message}`)
  }
}

/**
 * 异步 debounce 写入统计到磁盘（运行时定时落盘，最多每 10 秒一次）
 */
let writeTimer = null
const WRITE_INTERVAL = 10_000

export function saveStats() {
  if (writeTimer) return
  writeTimer = setTimeout(() => {
    writeTimer = null
    try {
      writeStatsSnapshot()
    } catch (err) {
      logger.error(`统计数据定时保存失败: ${err.message}`)
    }
  }, WRITE_INTERVAL).unref()
}
