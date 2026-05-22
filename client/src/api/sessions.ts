import { api } from './client'
import type { SessionListItem, SessionCreateResult } from '../types/session'
import type { ChatMessage } from '../types/message'

export function fetchSessions() {
  return api<SessionListItem[]>('GET', '/api/sessions')
}

export function createSession(title?: string) {
  return api<SessionCreateResult>('POST', '/api/sessions', title ? { title } : {})
}

export function fetchMessages(sessionId: string) {
  return api<ChatMessage[]>('GET', `/api/sessions/${sessionId}/messages`)
}
