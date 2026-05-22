import { useState } from 'react'
import type { FeedbackState } from '../../hooks/useFeedback'
import styles from './FeedbackRow.module.css'

interface FeedbackRowProps {
  sessionId: string
  messageIndex: number
  feedbackState: FeedbackState
  onSubmit: (sessionId: string, satisfied: boolean, msgIdx: number) => Promise<void>
}

export function FeedbackRow({ sessionId, messageIndex, feedbackState, onSubmit }: FeedbackRowProps) {
  const [submitting, setSubmitting] = useState(false)

  if (feedbackState === 'submitted') {
    return <div className={styles.submitted}>感谢反馈</div>
  }

  const handleFeedback = async (satisfied: boolean) => {
    setSubmitting(true)
    await onSubmit(sessionId, satisfied, messageIndex)
    setSubmitting(false)
  }

  return (
    <div className={styles.container}>
      <button
        className={styles.btn}
        onClick={() => handleFeedback(true)}
        disabled={submitting}
        title="满意"
      >
        👍
      </button>
      <button
        className={styles.btn}
        onClick={() => handleFeedback(false)}
        disabled={submitting}
        title="不满意"
      >
        👎
      </button>
    </div>
  )
}
