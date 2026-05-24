import { useState, useCallback } from 'react'
import * as feedbackApi from '../api/feedback'

/** 满意度反馈状态 */
export type FeedbackState = 'none' | 'submitted'

/**
 * 满意度反馈 Hook
 * @returns 反馈状态和提交方法
 */
export function useFeedback() {
  const [feedbackStates, setFeedbackStates] = useState<Map<number, FeedbackState>>(new Map())

  const submitFeedback = useCallback(async (sessionId: string, satisfied: boolean, msgIdx: number) => {
    try {
      await feedbackApi.submitFeedback(sessionId, satisfied)
      setFeedbackStates((prev) => {
        const next = new Map(prev)
        next.set(msgIdx, 'submitted')
        return next
      })
    } catch {
      // Silent fail for feedback
    }
  }, [])

  return { feedbackStates, submitFeedback }
}
