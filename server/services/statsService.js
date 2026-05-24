import fs from "fs"
import path from "path"
import { LOG_DIR } from "../config.js"
import { stats, sessionMeta } from "../storage/store.js"

const statsPath = path.join(LOG_DIR, "_stats.json")

// 启动时从文件恢复统计
export function restoreStats() {
  try {
    const raw = fs.readFileSync(statsPath, "utf-8")
    const data = JSON.parse(raw)
    if (data.visitors) stats.visitors = new Set(data.activeIPs || [])
    if (data.totalSessions) stats.totalSessions = data.totalSessions
    if (data.totalQuestions) stats.totalQuestions = data.totalQuestions
    if (data.satisfied) stats.satisfied = data.satisfied
    if (data.unsatisfied) stats.unsatisfied = data.unsatisfied
    if (data.blockedAccess) stats.blockedAccess = data.blockedAccess
  } catch {
    // 首次运行或无文件，使用默认值
  }
}

export function incrementQuestions() {
  stats.totalQuestions++
}

export function recordFeedback(satisfied) {
  if (satisfied) stats.satisfied++
  else stats.unsatisfied++
}

export function recordBlockedAccess() {
  stats.blockedAccess++
}

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

// 同步写入 — 用于进程退出时保证落盘
export function saveStatsSync() {
  try {
    fs.writeFileSync(statsPath, JSON.stringify(buildSnapshot(), null, 2), "utf-8")
  } catch {
    // 静默失败，不阻塞退出
  }
}

// 异步 debounce 写入 — 运行时定时落盘
let writeTimer = null
const WRITE_INTERVAL = 10_000 // 最多每 10 秒写一次

export function saveStats() {
  if (writeTimer) return
  writeTimer = setTimeout(() => {
    writeTimer = null
    try {
      fs.writeFileSync(statsPath, JSON.stringify(buildSnapshot(), null, 2), "utf-8")
    } catch {
      // 静默失败
    }
  }, WRITE_INTERVAL).unref()
}

// 立即强制写入（供手动触发使用，当前未导出）
export function flushStats() {
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = null
  }
  saveStatsSync()
}
