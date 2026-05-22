import { api } from './client'
import type { SessionListItem, SessionCreateResult } from '../types/session'
import type { ChatMessage } from '../types/message'

export function fetchSessions() {
  return api<SessionListItem[]>('GET', '/api/sessions')
}

export function createSession(title?: string, agent?: string) {
  const body: Record<string, string> = {}
  if (title) body.title = title
  if (agent) body.agent = agent
  return api<SessionCreateResult>('POST', '/api/sessions', body)
}

export function fetchMessages(sessionId: string) {
  return api<ChatMessage[]>('GET', `/api/sessions/${sessionId}/messages`)
}
