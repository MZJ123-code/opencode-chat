import { useRef, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChatMessage, ChatPart } from '../../types/message'
import { PartRenderer } from './PartRenderer'
import { ToolCallBlock } from './ToolCallBlock'
import { FeedbackRow } from './FeedbackRow'
import { TypingIndicator } from './TypingIndicator'
import { EmptyState } from './EmptyState'
import { Skeleton } from '../common/Skeleton'
import { MarkdownRenderer } from './MarkdownRenderer'

import type { FeedbackState } from '../../hooks/useFeedback'
import styles from './MessageList.module.css'

interface MessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  sessionId: string | null
  feedbackStates: Map<number, FeedbackState>
  onSubmitFeedback: (sessionId: string, satisfied: boolean, msgIdx: number) => Promise<void>
  onStop: () => void
}

const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 30,
      delay: i * 0.03,
    },
  }),
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
}

const stopBtnVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 500, damping: 30 } },
  exit: { opacity: 0, y: 10, scale: 0.9, transition: { duration: 0.15 } },
}

function isNearBottom(el: HTMLElement, threshold = 30): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
}

function isThinkingPart(part: ChatPart): boolean {
  return part.type === 'reasoning' || part.type === 'tool' || part.type === 'subtask'
}

function renderThinkingPart(part: ChatPart): ReactNode {
  switch (part.type) {
    case 'reasoning': {
      const text = 'text' in part ? part.text : ''
      if (!text) return null
      return (
        <div key={part.id} className={styles.thinkingPart}>{text}</div>
      )
    }
    case 'tool':
      return <ToolCallBlock key={part.id} part={part as import('../../types/message').ToolPart} />
    case 'subtask': {
      const st = part as import('../../types/message').SubtaskPart
      return (
        <div key={part.id} className={styles.subtaskBlock}>
          <div className={styles.subtaskAgent}>
            {st.agent ? `subtask: ${st.agent}` : '子任务'}
          </div>
          <div className={styles.subtaskDesc}>{st.description}</div>
        </div>
      )
    }
    default:
      return null
  }
}

export function MessageList({
  messages,
  isLoading,
  isStreaming,
  sessionId,
  feedbackStates,
  onSubmitFeedback,
  onStop,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const nearBottomRef = useRef(true)
  const prevScrollHeightRef = useRef(0)
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || !nearBottomRef.current) return
    const sh = el.scrollHeight
    if (sh > prevScrollHeightRef.current) {
      prevScrollHeightRef.current = sh
      el.scrollTop = sh
    } else {
      prevScrollHeightRef.current = sh
    }
  })

  useEffect(() => {
    if (isStreaming) {
      nearBottomRef.current = true
      prevScrollHeightRef.current = 0
    }
  }, [isStreaming])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const near = isNearBottom(el)
    nearBottomRef.current = near
    setShowScrollBtn(!near)
  }

  const scrollToBottom = () => {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    nearBottomRef.current = true
    setShowScrollBtn(false)
  }

  const content = (): ReactNode => {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}>
          <Skeleton count={4} height={56} />
        </div>
      )
    }

    if (messages.length === 0) {
      return <EmptyState hasSession={!!sessionId} />
    }

    const elements: ReactNode[] = []
    let aiMsgIndex = 0

    messages.forEach((msg, msgIdx) => {
      if (msg.role === 'user') {
        const userText = msg.parts
          .filter((p) => p.type === 'text')
          .map((p) => ('text' in p ? p.text : ''))
          .join('\n')

        elements.push(
          <motion.div
            key={`user-${msgIdx}`}
            className={styles.userMsg}
            custom={msgIdx}
            variants={messageVariants}
            initial="hidden"
            animate="visible"
          >
            <div className={`${styles.userBubble} user-bubble-md`}>
              <MarkdownRenderer content={userText} />
            </div>
          </motion.div>
        )
        return
      }

      const currentAiIdx = aiMsgIndex++
      const thinkingParts = msg.parts.filter(isThinkingPart)
      const textParts = msg.parts.filter((p) => p.type === 'text')

      if (thinkingParts.length > 0) {
        const label = `思考过程 (${thinkingParts.length})`
        elements.push(
          <motion.div
            key={`thinking-${msgIdx}`}
            className={styles.thinkingBlock}
            custom={msgIdx}
            variants={messageVariants}
            initial="hidden"
            animate="visible"
          >
            <details open style={{ fontSize: 13 }}>
              <summary className={styles.thinkingSummary}>
                <span className={styles.thinkingArrow}>▶</span>
                🧠 {label}
              </summary>
              <div className={styles.thinkingBody}>
                {thinkingParts.map((p) => renderThinkingPart(p))}
              </div>
            </details>
          </motion.div>
        )
      }

      textParts.forEach((part, partIdx) => {
        const text = 'text' in part ? part.text : ''
        if (!text) return
        elements.push(
          <motion.div
            key={`ai-${msgIdx}-${partIdx}`}
            custom={msgIdx}
            variants={messageVariants}
            initial="hidden"
            animate="visible"
          >
            <PartRenderer part={part} role="assistant" />
          </motion.div>
        )
      })

      const hasTextParts = textParts.length > 0
      const nextMsg = messages[msgIdx + 1]
      const isLastInTurn = !nextMsg || nextMsg.role === 'user'
      const isLastMsgOverall = msgIdx === messages.length - 1
      if (hasTextParts && sessionId && isLastInTurn && !(isLastMsgOverall && isStreaming)) {
        elements.push(
          <motion.div
            key={`feedback-${msgIdx}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <FeedbackRow
              sessionId={sessionId}
              messageIndex={currentAiIdx}
              feedbackState={feedbackStates.get(currentAiIdx) || 'none'}
              onSubmit={onSubmitFeedback}
            />
          </motion.div>
        )
      }
    })

    return elements
  }

  return (
    <div className={styles.container}>
      <div
        ref={containerRef}
        className={styles.scrollArea}
        onScroll={handleScroll}
      >
        {content()}
        {isStreaming && <TypingIndicator />}
      </div>

      <AnimatePresence>
        {isStreaming && (
          <motion.button
            className={styles.stopBtn}
            onClick={onStop}
            variants={stopBtnVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            停止
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            className={styles.scrollBtn}
            onClick={scrollToBottom}
            title="滚动到底部"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            ↓
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
