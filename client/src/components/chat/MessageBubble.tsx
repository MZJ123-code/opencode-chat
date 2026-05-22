import type { ReactNode } from 'react'
import { renderMarkdown } from '../../utils/renderMarkdown'
import styles from './MessageBubble.module.css'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  parts: string[]
  children?: ReactNode
}

export function MessageBubble({ role, parts, children }: MessageBubbleProps) {
  const text = parts.join('\n')
  const isUser = role === 'user'

  return (
    <div className={isUser ? styles.userWrapper : styles.aiWrapper}>
      <div
        className={`markdown-body ${isUser ? styles.userBubble : styles.aiBubble}`}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
      />
      {children}
    </div>
  )
}
