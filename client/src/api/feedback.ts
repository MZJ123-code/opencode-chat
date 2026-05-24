import { api } from './client'

/**
 * 提交会话满意度反馈
 * @param sessionId - 会话 ID
 * @param satisfied - 是否满意
 * @returns 操作结果
 */
export function submitFeedback(sessionId: string, satisfied: boolean) {
  return api<{ ok: boolean }>('POST', `/api/sessions/${sessionId}/feedback`, { satisfied })
}
