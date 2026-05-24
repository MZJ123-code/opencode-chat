/** 会话列表项 */
export interface SessionListItem {
  /** 会话 ID */
  sessionId: string
  /** 会话标题 */
  title: string
  /** 创建时间戳 */
  createdAt: number
  /** 消息数量 */
  messageCount: number
  /** Agent 名称 */
  agent: string | null
}

/** 会话创建结果 */
export interface SessionCreateResult {
  /** 会话 ID */
  sessionId: string
  /** 会话标题 */
  title: string
  /** Agent 名称 */
  agent: string | null
}
