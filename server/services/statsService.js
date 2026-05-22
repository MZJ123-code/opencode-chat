import fsp from "fs/promises"
import path from "path"
import { LOG_DIR } from "../config.js"
import { stats, sessionMeta } from "../storage/store.js"

export function recordVisit(ip) {
  stats.visitors.add(ip)
}

export function incrementSessions() {
  stats.totalSessions++
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
  for (const [, meta] of sessionMeta) {
    if (meta.messageCount > 0) activeSessions++
  }
  return {
    visitors: stats.visitors.size,
    totalSessions: stats.totalSessions,
    activeSessions,
    totalQuestions: stats.totalQuestions,
    satisfied: stats.satisfied,
    unsatisfied: stats.unsatisfied,
  }
}

let pending = false
const statsPath = path.join(LOG_DIR, "_stats.json")

export function saveStats() {
  if (pending) return
  pending = true
  setImmediate(async () => {
    try {
      await fsp.writeFile(
        statsPath,
        JSON.stringify(
          {
            updated: new Date().toISOString().replace("T", " ").slice(0, 23),
            visitors: stats.visitors.size,
            totalSessions: stats.totalSessions,
            totalQuestions: stats.totalQuestions,
            satisfied: stats.satisfied,
            unsatisfied: stats.unsatisfied,
            blockedAccess: stats.blockedAccess,
            activeIPs: [...stats.visitors],
          },
          null,
          2
        )
      )
    } catch {} finally {
      pending = false
    }
  })
}
