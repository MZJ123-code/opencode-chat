import type { SessionListItem } from '../../types/session'
import { formatDate } from '../../utils/formatDate'
import styles from './SessionItem.module.css'

interface SessionItemProps {
  session: SessionListItem
  isActive: boolean
  onClick: () => void
}

export function SessionItem({ session, isActive, onClick }: SessionItemProps) {
  return (
    <div
      className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
      onClick={onClick}
    >
      <div className={styles.title}>{session.title}</div>
      <div className={styles.meta}>
        {formatDate(session.createdAt)} · {session.messageCount || 0} 条消息
      </div>
    </div>
  )
}
