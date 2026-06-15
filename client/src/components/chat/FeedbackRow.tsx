import { useState } from 'react'
import { motion } from 'framer-motion'
import type { FeedbackState } from '../../hooks/useFeedback'

interface FeedbackRowProps {
  sessionId: string
  messageIndex: number
  feedbackState: FeedbackState
  onSubmit: (sessionId: string, satisfied: boolean, msgIdx: number) => Promise<void>
}

/**
 * 满意度反馈行组件 — Sci-Fi 风格
 */
export function FeedbackRow({ sessionId, messageIndex, feedbackState, onSubmit }: FeedbackRowProps) {
  const [submitting, setSubmitting] = useState(false)

  if (feedbackState === 'submitted') {
    return (
      <motion.div
        className="text-xs mt-1 flex items-center gap-1.5"
        style={{ color: 'rgba(0, 229, 160, 0.7)' }}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        感谢反馈
      </motion.div>
    )
  }

  const handleFeedback = async (satisfied: boolean) => {
    setSubmitting(true)
    await onSubmit(sessionId, satisfied, messageIndex)
    setSubmitting(false)
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      <motion.button
        className="inline-flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent cursor-pointer text-sm transition-all duration-200 disabled:opacity-50"
        style={{ color: 'rgba(0, 240, 255, 0.4)' }}
        onClick={() => handleFeedback(true)}
        disabled={submitting}
        title="满意"
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#00e5a0'
          e.currentTarget.style.background = 'rgba(0, 229, 160, 0.1)'
          e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 229, 160, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(0, 240, 255, 0.4)'
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        👍
      </motion.button>
      <motion.button
        className="inline-flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent cursor-pointer text-sm transition-all duration-200 disabled:opacity-50"
        style={{ color: 'rgba(0, 240, 255, 0.4)' }}
        onClick={() => handleFeedback(false)}
        disabled={submitting}
        title="不满意"
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#f59e0b'
          e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'
          e.currentTarget.style.boxShadow = '0 0 8px rgba(245, 158, 11, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(0, 240, 255, 0.4)'
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        👎
      </motion.button>
    </div>
  )
}
