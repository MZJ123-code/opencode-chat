import type { ReactNode } from 'react'
import { MarkdownRenderer } from './MarkdownRenderer'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  parts: string[]
  children?: ReactNode
}

/**
 * 消息气泡组件
 * @param props - 组件属性
 * @param props.role - 消息角色（用户/AI）
 * @param props.parts - 消息文本片段列表
 * @param props.children - 可选的附加内容（如反馈按钮）
 */
export function MessageBubble({ role, parts, children }: MessageBubbleProps) {
  const text = parts.join('\n')
  const isUser = role === 'user'

  return (
    <div className={isUser ? 'max-w-[75%] shrink-0 self-end' : 'max-w-[75%] shrink-0 self-start'}>
      <div className={
        isUser
          ? 'px-[18px] py-3 rounded-[var(--bubble-radius)] text-[15px] leading-[1.6] break-words transition-all duration-200 bg-[var(--user-bubble-gradient)] text-white border-none rounded-br-[6px] shadow-[0_4px_20px_rgba(99,102,241,0.35)] user-bubble-md'
          : 'px-[18px] py-3 rounded-[var(--bubble-radius)] text-[15px] leading-[1.6] break-words transition-all duration-200 bg-[var(--ai-bubble)] text-[var(--text)] border-none rounded-bl-[6px] shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
      }>
        <MarkdownRenderer content={text} />
      </div>
      {children}
    </div>
  )
}
