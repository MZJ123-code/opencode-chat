import { api } from './client'
import type { ChatSendResult } from '../types/message'

/**
 * 同步发送消息
 * @param sessionId - 会话 ID
 * @param message - 消息内容
 * @param agent - 可选的 AI Agent 名称
 * @returns 聊天发送结果
 */
export function sendMessage(sessionId: string, message: string, agent?: string) {
  return api<ChatSendResult>('POST', '/api/chat', { sessionId, message, agent })
}

/**
 * 异步发送消息（通过 SSE 接收回复）
 * @param sessionId - 会话 ID
 * @param message - 消息内容
 * @param agent - 可选的 AI Agent 名称
 * @returns 发送确认结果
 */
export function sendMessageAsync(sessionId: string, message: string, agent?: string) {
  return api<{ ok: boolean; sessionId: string }>('POST', '/api/chat/async', { sessionId, message, agent })
}

/**
 * 中止指定会话的 AI 响应
 * @param sessionId - 会话 ID
 * @returns 操作结果
 */
export function abortSession(sessionId: string) {
  return api<{ ok: boolean }>('POST', `/api/sessions/${sessionId}/abort`)
}
