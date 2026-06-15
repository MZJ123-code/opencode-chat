import type { ReactNode } from 'react'
import { MarkdownRenderer } from './MarkdownRenderer'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  parts: string[]
  children?: ReactNode
}

/**
 * 消息气泡组件 — Sci-Fi 风格
 */
export function MessageBubble({ role, parts, children }: MessageBubbleProps) {
  const text = parts.join('\n')
  const isUser = role === 'user'

  return (
    <div className={isUser ? 'max-w-[75%] shrink-0 self-end' : 'max-w-[75%] shrink-0 self-start'}>
      <div className={
        isUser
          ? 'px-[18px] py-3 rounded-[var(--bubble-radius)] text-[15px] leading-[1.6] break-words transition-all duration-200 text-white border-none rounded-br-[6px] user-bubble-md'
          : 'px-[18px] py-3 rounded-[var(--bubble-radius)] text-[15px] leading-[1.6] break-words transition-all duration-200 text-[var(--text)] border-none rounded-bl-[6px]'
      } style={isUser ? {
        background: 'var(--user-bubble-gradient)',
        boxShadow: '0 4px 20px rgba(0, 180, 216, 0.3), 0 0 30px rgba(0, 119, 182, 0.1)',
      } : {
        background: 'var(--ai-bubble)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), 0 0 20px rgba(0, 240, 255, 0.03)',
        border: '1px solid rgba(0, 240, 255, 0.06)',
      }}>
        <MarkdownRenderer content={text} />
      </div>
      {children}
    </div>
  )
}
