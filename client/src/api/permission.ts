import { api } from './client'

export interface PermissionRequest {
  id: string
  sessionID: string
  permission: string
  patterns: string[]
  metadata: Record<string, unknown>
  always: string[]
  tool?: { messageID: string; callID: string }
}

export async function respondPermission(requestID: string, reply: 'once' | 'always' | 'reject', message?: string): Promise<void> {
  await api('POST', '/api/permission/respond', { requestID, reply, message })
}

export async function replyQuestion(requestID: string, answers: string[][]): Promise<void> {
  await api('POST', '/api/permission/question/reply', { requestID, answers })
}

export async function rejectQuestion(requestID: string): Promise<void> {
  await api('POST', '/api/permission/question/reject', { requestID })
}
