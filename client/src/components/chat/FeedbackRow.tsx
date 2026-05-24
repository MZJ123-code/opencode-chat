import { useState } from 'react'
import { motion } from 'framer-motion'
import type { FeedbackState } from '../../hooks/useFeedback'

interface FeedbackRowProps {
  sessionId: string
  messageIndex: number
  feedbackState: FeedbackState
  onSubmit: (sessionId: string, satisfied: boolean, msgIdx: number) => Promise<void>
}

export function FeedbackRow({ sessionId, messageIndex, feedbackState, onSubmit }: FeedbackRowProps) {
  const [submitting, setSubmitting] = useState(false)

  if (feedbackState === 'submitted') {
    return (
      <motion.div
        className="text-xs text-[var(--text-secondary)] mt-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
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
        className="inline-flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent cursor-pointer text-sm text-[var(--text-secondary)] hover:bg-[var(--ai-bubble)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
        onClick={() => handleFeedback(true)}
        disabled={submitting}
        title="满意"
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
      >
        👍
      </motion.button>
      <motion.button
        className="inline-flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent cursor-pointer text-sm text-[var(--text-secondary)] hover:bg-[var(--ai-bubble)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
        onClick={() => handleFeedback(false)}
        disabled={submitting}
        title="不满意"
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
      >
        👎
      </motion.button>
    </div>
  )
}
