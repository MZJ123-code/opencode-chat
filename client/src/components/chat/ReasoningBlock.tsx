import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReasoningPart } from '../../types/message'
import { escapeHtml } from '../../lib/utils'
import styles from './ReasoningBlock.module.css'

/**
 * AI 思考过程展示组件（可折叠）
 * @param props - 组件属性
 * @param props.part - 推理片段数据
 */
export function ReasoningBlock({ part }: { part: ReasoningPart }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div
        className={collapsed ? styles.header : styles.headerOpen}
        onClick={() => setCollapsed((v) => !v)}
      >
        <motion.span
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.2 }}
          className={styles.arrow}
        >
          ▼
        </motion.span>
        🧠 思考过程
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            className={styles.body}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            dangerouslySetInnerHTML={{ __html: escapeHtml(part.text) }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
