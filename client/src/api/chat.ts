import { api } from './client'
import type { ChatSendResult } from '../types/message'

export function sendMessage(sessionId: string, message: string) {
  return api<ChatSendResult>('POST', '/api/chat', { sessionId, message })
}

export function sendMessageAsync(sessionId: string, message: string) {
  return api<{ ok: boolean; sessionId: string }>('POST', '/api/chat/async', { sessionId, message })
}
