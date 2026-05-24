import type { ChatPart } from '../../types/message'
import { MessageBubble } from './MessageBubble'
import { ToolCallBlock } from './ToolCallBlock'
import styles from './PartRenderer.module.css'

interface PartRendererProps {
  part: ChatPart
  role: 'user' | 'assistant'
}

/**
 * 消息片段渲染组件
 * @param props - 组件属性
 * @param props.part - 聊天片段数据
 * @param props.role - 消息角色
 */
export function PartRenderer({ part, role }: PartRendererProps) {
  switch (part.type) {
    case 'text': {
      const text = 'text' in part ? (part as unknown as { text: string }).text : ''
      if (!text) return null
      return (
        <MessageBubble role={role} parts={[text]} />
      )
    }

    case 'tool':
      return <ToolCallBlock part={part as import('../../types/message').ToolPart} />

    case 'step-start':
    case 'step-finish':
      return null

    case 'subtask': {
      const st = part as import('../../types/message').SubtaskPart
      return (
        <div className={styles.subtaskBlock}>
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
