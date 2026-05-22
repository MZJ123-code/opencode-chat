import { api } from './client'

export function submitFeedback(sessionId: string, satisfied: boolean) {
  return api<{ ok: boolean }>('POST', `/api/sessions/${sessionId}/feedback`, { satisfied })
}
