import styles from './EmptyState.module.css'

interface EmptyStateProps {
  hasSession: boolean
}

export function EmptyState({ hasSession }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>💬</div>
      <div className={styles.primary}>
        {hasSession ? '开始提问吧' : '开始新的对话'}
      </div>
      {!hasSession && (
        <div className={styles.secondary}>点击左侧 "+ 新建对话" 开始咨询</div>
      )}
    </div>
  )
}
