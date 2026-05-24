import { api } from './client'
import type { SessionListItem, SessionCreateResult } from '../types/session'
import type { ChatMessage } from '../types/message'

/**
 * 获取当前用户的会话列表
 * @returns 会话列表
 */
export function fetchSessions() {
  return api<SessionListItem[]>('GET', '/api/sessions')
}

/**
 * 创建新会话
 * @param title - 可选的会话标题
 * @param agent - 可选的 AI Agent 名称
 * @returns 创建结果
 */
export function createSession(title?: string, agent?: string) {
  const body: Record<string, string> = {}
  if (title) body.title = title
  if (agent) body.agent = agent
  return api<SessionCreateResult>('POST', '/api/sessions', body)
}

/**
 * 获取指定会话的消息历史
 * @param sessionId - 会话 ID
 * @returns 消息列表
 */
export function fetchMessages(sessionId: string) {
  return api<ChatMessage[]>('GET', `/api/sessions/${sessionId}/messages`)
}
