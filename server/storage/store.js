/**
 * @typedef {Object} SessionMeta
 * @property {string} ip - 会话所属 IP
 * @property {number} createdAt - 创建时间戳
 * @property {string} title - 会话标题
 * @property {number} messageCount - 消息数
 * @property {string | null} agent - 使用的 Agent 名称
 */

/** @type {Map<string, Set<string>>} userId → 会话 ID 集合 */
export const userSessions = new Map()

/** @type {Map<string, SessionMeta>} 会话 ID → 会话元数据 */
export const sessionMeta = new Map()

/**
 * @typedef {Object} AppStats
 * @property {Set<string>} visitors - 访客 IP 集合
 * @property {number} totalSessions - 总会话数
 * @property {number} totalQuestions - 总提问数
 * @property {number} satisfied - 满意数
 * @property {number} unsatisfied - 不满意数
 * @property {number} blockedAccess - 被拦截的访问数
 */

/** @type {AppStats} 平台运行统计 */
export const stats = {
  visitors: new Set(),
  totalSessions: 0,
  totalQuestions: 0,
  satisfied: 0,
  unsatisfied: 0,
  blockedAccess: 0,
}
