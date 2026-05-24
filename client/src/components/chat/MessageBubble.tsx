import type { ReactNode } from 'react'
import { MarkdownRenderer } from './MarkdownRenderer'
import styles from './MessageBubble.module.css'

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
    <div className={isUser ? styles.userWrapper : styles.aiWrapper}>
      <div className={`${isUser ? styles.userBubble : styles.aiBubble}${isUser ? ' user-bubble-md' : ''}`}>
        <MarkdownRenderer content={text} />
      </div>
      {children}
    </div>
  )
}
