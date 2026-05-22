import type { ChatPart } from '../../types/message'
import { MessageBubble } from './MessageBubble'
import { ReasoningBlock } from './ReasoningBlock'
import { ToolCallBlock } from './ToolCallBlock'
import styles from './PartRenderer.module.css'

interface PartRendererProps {
  part: ChatPart
  role: 'user' | 'assistant'
}

export function PartRenderer({ part, role }: PartRendererProps) {
  switch (part.type) {
    case 'text': {
      const text = 'text' in part ? (part as unknown as { text: string }).text : ''
      if (!text) return null
      return (
        <MessageBubble role={role} parts={[text]} />
      )
    }

    case 'reasoning':
      return <ReasoningBlock part={part as unknown as import('../../types/message').ReasoningPart} />

    case 'tool':
      return <ToolCallBlock part={part as import('../../types/message').ToolPart} />

    case 'step-start':
    case 'step-finish':
      return null

    case 'subtask': {
      const st = part as import('../../types/message').SubtaskPart
      return (
        <div className={styles.subtaskBlock}>
          <div className={styles.subtaskAgent}>subtask: {st.agent}</div>
          <div className={styles.subtaskDesc}>{st.description}</div>
        </div>
      )
    }

    default:
      return null
  }
}
