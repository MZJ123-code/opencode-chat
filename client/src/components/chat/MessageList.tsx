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
 * 消息列表组件 — Sci-Fi 风格
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
      return <EmptyState hasSession={!!sessionId} isStreaming={isStreaming} />
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
            className="self-end max-w-[72%] shrink-0 mb-[2px]"
            custom={msgIdx}
            variants={messageVariants}
            initial="hidden"
            animate="visible"
          >
            <div
              className="px-4 py-[10px] rounded-[var(--bubble-radius)] text-[15px] leading-[1.5] whitespace-pre-wrap break-words text-white rounded-br-[5px] user-bubble-md"
              style={{
                background: 'var(--user-bubble-gradient)',
                boxShadow: '0 4px 18px rgba(0, 180, 216, 0.3), 0 0 25px rgba(0, 119, 182, 0.1)',
              }}
            >
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
                style={{ alignSelf: 'flex-start', width: '100%', maxWidth: '85%', marginBottom: 8 }}
              >
                <details
                  className="block w-full text-[15px]"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid rgba(0, 240, 255, 0.1)',
                    borderRadius: '10px',
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), 0 0 15px rgba(0, 240, 255, 0.03)',
                  }}
                >
                  <summary
                    className="flex items-center gap-2 px-[14px] py-[10px] cursor-pointer select-none rounded-[10px] [&::-webkit-details-marker]:hidden open:rounded-[10px_10px_0_0]"
                    style={{
                      background: 'var(--muted)',
                      color: 'var(--foreground)',
                    }}
                  >
                    <span className="text-xs transition-transform duration-[150ms] open:rotate-90" style={{ color: 'rgba(0, 240, 255, 0.5)' }}>▶</span>
                    <span className="text-base">🛠</span>
                    <span className="text-xs font-semibold px-[10px] py-[2px] rounded-full" style={{
                      background: 'rgba(0, 240, 255, 0.1)',
                      color: '#00d4ff',
                      border: '1px solid rgba(0, 240, 255, 0.2)',
                    }}>
                      调用 {count} 次
                    </span>
                    <span className="font-semibold text-[var(--accent-foreground)] font-[var(--font)] text-sm">{toolName}</span>
                  </summary>
                  <div className="flex flex-col">
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
    <div className="relative flex-1 flex flex-col min-h-0">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-6 flex flex-col gap-[4px]"
        onScroll={handleScroll}
      >
        {content()}
        {isStreaming && <TypingIndicator />}
      </div>

      <AnimatePresence>
        {isStreaming && (
          <motion.button
            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 px-[22px] py-2 border-none rounded-full text-white text-[13px] font-semibold cursor-pointer transition-all duration-150 leading-[1.4]"
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35), 0 0 20px rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
            }}
            onClick={onStop}
            variants={stopBtnVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            whileHover={{
              boxShadow: '0 6px 20px rgba(239, 68, 68, 0.5), 0 0 30px rgba(239, 68, 68, 0.2)',
              y: -1,
            }}
          >
            停止
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            className="absolute bottom-4 right-6 w-9 h-9 rounded-full text-base leading-none flex items-center justify-center z-10 transition-all duration-150"
            style={{
              background: 'var(--chat-bg)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              color: 'rgba(0, 240, 255, 0.6)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12), 0 0 10px rgba(0, 240, 255, 0.06)',
            }}
            onClick={scrollToBottom}
            title="滚动到底部"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{
              scale: 1.1,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18), 0 0 15px rgba(0, 240, 255, 0.12)',
            }}
            whileTap={{ scale: 0.9 }}
          >
            ↓
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
