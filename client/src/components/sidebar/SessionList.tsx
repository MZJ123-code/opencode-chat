import type { SessionListItem } from '../../types/api-responses'
import { SessionItem } from './SessionItem'
import { Skeleton } from '../common/Skeleton'

interface SessionListProps {
  sessions: SessionListItem[]
  activeId: string | null
  onSelect: (sessionId: string) => void
  isLoading: boolean
}

/**
 * 会话列表组件
 * @param props - 组件属性
 * @param props.sessions - 会话列表数据
 * @param props.activeId - 当前激活的会话 ID
 * @param props.onSelect - 选择会话回调
 * @param props.isLoading - 是否加载中
 */
export function SessionList({ sessions, activeId, onSelect, isLoading }: SessionListProps) {
  if (isLoading) {
    return (
      <div className="px-4 py-3">
        <Skeleton count={5} height={56} />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-slate-400 text-sm text-center">暂无对话</p>
        <p className="text-slate-500 text-xs text-center mt-1">点击上方按钮开始新对话</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 py-3 overflow-y-auto flex-1 px-2">
      {sessions.map((s) => (
        <SessionItem
          key={s.sessionId}
          session={s}
          isActive={s.sessionId === activeId}
          onClick={() => onSelect(s.sessionId)}
        />
      ))}
    </div>
  )
}
