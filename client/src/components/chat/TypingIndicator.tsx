import styles from './TypingIndicator.module.css'

export function TypingIndicator() {
  return (
    <div className={styles.container}>
      <div className={styles.bubble}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  )
}
