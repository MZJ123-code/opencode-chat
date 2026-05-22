import type { SessionListItem } from '../../types/session'
import { SessionItem } from './SessionItem'
import { Skeleton } from '../common/Skeleton'
import styles from './SessionList.module.css'

interface SessionListProps {
  sessions: SessionListItem[]
  activeId: string | null
  onSelect: (sessionId: string) => void
  isLoading: boolean
}

export function SessionList({ sessions, activeId, onSelect, isLoading }: SessionListProps) {
  if (isLoading) {
    return (
      <div className={styles.skeleton}>
        <Skeleton count={5} height={56} />
      </div>
    )
  }

  if (sessions.length === 0) {
    return <div className={styles.empty}>暂无对话</div>
  }

  return (
    <div className={styles.list}>
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
