import { useRef, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import type { ChatMessage, ChatPart } from '../../types/message'
import { PartRenderer } from './PartRenderer'
import { ToolCallBlock } from './ToolCallBlock'
import { FeedbackRow } from './FeedbackRow'
import { TypingIndicator } from './TypingIndicator'
import { EmptyState } from './EmptyState'
import { Skeleton } from '../common/Skeleton'
import { MarkdownRenderer } from './MarkdownRenderer'
import { escapeHtml } from '../../utils/escapeHtml'
import type { FeedbackState } from '../../hooks/useFeedback'
import styles from './MessageList.module.css'

interface MessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  sessionId: string | null
  feedbackStates: Map<number, FeedbackState>
  onSubmitFeedback: (sessionId: string, satisfied: boolean, msgIdx: number) => Promise<void>
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
      const text = (part as unknown as { text: string }).text || ''
      if (!text) return null
      return (
        <div
          key={part.id}
          className={styles.thinkingPart}
          dangerouslySetInnerHTML={{ __html: escapeHtml(text) }}
        />
      )
    }
    case 'tool':
      return <ToolCallBlock key={part.id} part={part as import('../../types/message').ToolPart} />
    case 'subtask': {
      const st = part as import('../../types/message').SubtaskPart
      return (
        <div key={part.id} className={styles.subtaskBlock}>
          <div className={styles.subtaskAgent}>subtask: {st.agent}</div>
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
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const nearBottomRef = useRef(true)
  const prevScrollHeightRef = useRef(0)

  // Auto-scroll after every DOM commit — only if user hasn't scrolled away AND content actually grew
  // This avoids the old bug where `messages` reference changes (from requestAnimationFrame batching)
  // triggered scroll resets even after streaming ended.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || !nearBottomRef.current) return
    const sh = el.scrollHeight
    if (sh > prevScrollHeightRef.current) {
      prevScrollHeightRef.current = sh
      el.scrollTop = sh
    } else {
      // Still track even if no growth (handles initial render)
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
          .map((p) => ('text' in p ? (p as { text: string }).text : ''))
          .join('\n')

        elements.push(
          <div key={`user-${msgIdx}`} className={styles.userMsg}>
            <div className={styles.userBubble}>
              <MarkdownRenderer content={userText} />
            </div>
          </div>
        )
        return
      }

      const currentAiIdx = aiMsgIndex++
      const thinkingParts = msg.parts.filter(isThinkingPart)
      const textParts = msg.parts.filter((p) => p.type === 'text')

      if (thinkingParts.length > 0) {
        const label = `思考过程 (${thinkingParts.length})`
        elements.push(
          <div key={`thinking-${msgIdx}`} className={styles.thinkingBlock}>
            <details open style={{ fontSize: 13 }}>
              <summary className={styles.thinkingSummary}>
                <span className={styles.thinkingArrow}>▶</span>
                🧠 {label}
              </summary>
              <div className={styles.thinkingBody}>
                {thinkingParts.map((p) => renderThinkingPart(p))}
              </div>
            </details>
          </div>
        )
      }

      textParts.forEach((part, partIdx) => {
        const text = 'text' in part ? (part as unknown as { text: string }).text : ''
        if (!text) return
        elements.push(
          <PartRenderer key={`ai-${msgIdx}-${partIdx}`} part={part} role="assistant" />
        )
      })

      const hasTextParts = textParts.length > 0
      const nextMsg = messages[msgIdx + 1]
      const isLastInTurn = !nextMsg || nextMsg.role === 'user'
      const isLastMsgOverall = msgIdx === messages.length - 1
      if (hasTextParts && sessionId && isLastInTurn && !(isLastMsgOverall && isStreaming)) {
        elements.push(
          <FeedbackRow
            key={`feedback-${msgIdx}`}
            sessionId={sessionId}
            messageIndex={currentAiIdx}
            feedbackState={feedbackStates.get(currentAiIdx) || 'none'}
            onSubmit={onSubmitFeedback}
          />
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

      {showScrollBtn && (
        <button
          className={styles.scrollBtn}
          onClick={scrollToBottom}
          title="滚动到底部"
        >
          ↓
        </button>
      )}
    </div>
  )
}
