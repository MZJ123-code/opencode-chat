import { useState } from 'react'
import type { ReasoningPart } from '../../types/message'
import { escapeHtml } from '../../utils/escapeHtml'
import styles from './ReasoningBlock.module.css'

export function ReasoningBlock({ part }: { part: ReasoningPart }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={styles.container}>
      <div
        className={collapsed ? styles.header : styles.headerOpen}
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className={collapsed ? styles.arrowCollapsed : styles.arrow}>
          ▼
        </span>
        🧠 思考过程
      </div>
      {!collapsed && (
        <div
          className={styles.body}
          dangerouslySetInnerHTML={{ __html: escapeHtml(part.text) }}
        />
      )}
    </div>
  )
}
