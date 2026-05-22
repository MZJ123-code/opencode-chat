import type { SessionListItem } from '../../types/session'
import { SessionItem } from './SessionItem'
import { Skeleton } from '../common/Skeleton'

interface SessionListProps {
  sessions: SessionListItem[]
  activeId: string | null
  onSelect: (sessionId: string) => void
  isLoading: boolean
}

export function SessionList({ sessions, activeId, onSelect, isLoading }: SessionListProps) {
  if (isLoading) {
    return (
      <div className="px-4 py-2">
        <Skeleton count={5} height={56} />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center text-slate-400 text-sm py-8">
        暂无对话
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 py-2 overflow-y-auto flex-1">
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
