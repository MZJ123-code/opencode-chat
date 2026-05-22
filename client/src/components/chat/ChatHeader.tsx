import { MobileMenuButton } from '../layout/Sidebar'
import styles from './ChatHeader.module.css'

interface ChatHeaderProps {
  title: string
  onMenuClick?: () => void
}

export function ChatHeader({ title, onMenuClick }: ChatHeaderProps) {
  return (
    <div className={styles.header}>
      {onMenuClick && <MobileMenuButton onClick={onMenuClick} />}
      <span className={styles.title}>{title}</span>
    </div>
  )
}
