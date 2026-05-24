export const ipUsers = new Map()
// ipSessions: Map<ip, Set<sessionId>> — Set 保证并发安全，无重复条目
export const ipSessions = new Map()
export const sessionMeta = new Map()

export const stats = {
  visitors: new Set(),
  totalSessions: 0,
  totalQuestions: 0,
  satisfied: 0,
  unsatisfied: 0,
  blockedAccess: 0,
}
