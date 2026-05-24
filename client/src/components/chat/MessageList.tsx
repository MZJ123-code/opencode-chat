import { useRef, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChatMessage, ToolPart } from '../../types/message'
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

/**
 * 消息列表组件
 * @param props - 组件属性
 * @param props.messages - 消息列表
 * @param props.isLoading - 是否加载中
 * @param props.isStreaming - 是否正在流式输出
 * @param props.sessionId - 当前会话 ID
 * @param props.feedbackStates - 反馈状态映射
 * @param props.onSubmitFeedback - 提交反馈回调
 * @param props.onStop - 停止生成回调
 */
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
      const visibleParts = msg.parts.filter((p) => p.type !== 'reasoning')

      let partIdx = 0
      while (partIdx < visibleParts.length) {
        const part = visibleParts[partIdx]

        if (part.type === 'text') {
          const text = 'text' in part ? part.text : ''
          if (!text) { partIdx++; continue }
        }

        if (part.type === 'tool') {
          const toolName = (part as ToolPart).tool
          const groupStart = partIdx
          while (
            partIdx + 1 < visibleParts.length &&
            visibleParts[partIdx + 1].type === 'tool' &&
            (visibleParts[partIdx + 1] as ToolPart).tool === toolName
          ) {
            partIdx++
          }
          const count = partIdx - groupStart + 1

          if (count > 1) {
            const groupParts = visibleParts.slice(groupStart, partIdx + 1) as ToolPart[]
            elements.push(
              <motion.div
                key={`ai-${msgIdx}-toolgroup-${partIdx}`}
                custom={msgIdx}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                className={styles.toolGroup}
              >
                <details>
                  <summary className={styles.toolGroupSummary}>
                    <span className={styles.toolGroupArrow}>▶</span>
                    <span className={styles.toolGroupIcon}>🛠</span>
                    <span className={styles.toolGroupBadge}>调用 {count} 次</span>
                    <span className={styles.toolGroupName}>{toolName}</span>
                  </summary>
                  <div className={styles.toolGroupBody}>
                    {groupParts.map((gp) => (
                      <ToolCallBlock key={gp.id} part={gp} />
                    ))}
                  </div>
                </details>
              </motion.div>
            )
          } else {
            elements.push(
              <motion.div
                key={`ai-${msgIdx}-tool-${partIdx}`}
                custom={msgIdx}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
              >
                <ToolCallBlock part={part as ToolPart} />
              </motion.div>
            )
          }
        } else {
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
        }

        partIdx++
      }

      const hasTextParts = visibleParts.some((p) => p.type === 'text')
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
