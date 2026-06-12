import type { ChatPart } from '../../types/message'
import { MessageBubble } from './MessageBubble'
import { ToolCallBlock } from './ToolCallBlock'

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

    case 'reasoning':
    case 'step-start':
    case 'step-finish':
      return null

    case 'subtask': {
      const st = part as import('../../types/message').SubtaskPart
      return (
        <div className="mb-2 px-3 py-2 border border-dashed border-[#c4b5fd] rounded-lg text-[13px] bg-[#faf5ff] text-[#7c3aed] dark:bg-[rgba(124,58,237,0.1)] dark:text-[#c4b5fd] dark:border-[rgba(124,58,237,0.3)]">
          <div className="font-semibold">
            {st.agent ? `subtask: ${st.agent}` : '子任务'}
          </div>
          <div className="text-xs opacity-80">{st.description}</div>
        </div>
      )
    }

    default:
      return null
  }
}
