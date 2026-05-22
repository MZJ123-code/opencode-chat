import styles from './SidebarHeader.module.css'

interface SidebarHeaderProps {
  onCreateClick: () => void
  isCreating: boolean
}

export function SidebarHeader({ onCreateClick, isCreating }: SidebarHeaderProps) {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>
        AI 咨询平台
      </h2>
      <button
        className={styles.createBtn}
        onClick={onCreateClick}
        disabled={isCreating}
      >
        {isCreating ? '创建中...' : '+ 新建对话'}
      </button>
    </div>
  )
}
