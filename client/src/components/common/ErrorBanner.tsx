import styles from './ErrorBanner.module.css'

interface ErrorBannerProps {
  message: string | null
  onDismiss: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null

  return (
    <div className={styles.banner}>
      {message}
      <span className={styles.dismiss} onClick={onDismiss}>
        关闭
      </span>
    </div>
  )
}
