import type { ReactNode } from 'react'
import styles from './ChatArea.module.css'

interface ChatAreaProps {
  children: ReactNode
}

export function ChatArea({ children }: ChatAreaProps) {
  return (
    <main className={styles.main}>
      {children}
    </main>
  )
}
