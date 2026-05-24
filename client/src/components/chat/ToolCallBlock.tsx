import { useState, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ToolPart } from '../../types/message'
import { escapeHtml } from '../../lib/utils'
import { JsonView } from './JsonView'
import { useChatContext } from '../../contexts/ChatContext'
import styles from './ToolCallBlock.module.css'

const stateConfig: Record<string, { icon: string; label: string; color: string }> = {
  pending: { icon: '⏳', label: '等待中', color: '#9ca3af' },
  running: { icon: '🔄', label: '执行中', color: '#3b82f6' },
  completed: { icon: '✅', label: '完成', color: '#22c55e' },
  error: { icon: '❌', label: '错误', color: '#ef4444' },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  return (
    <button
      className={copied ? styles.copyBtnCopied : styles.copyBtn}
      onClick={handleCopy}
    >
      {copied ? '已复制' : '复制'}
    </button>
  )
}

/**
 * 工具调用展示组件（已记忆化）
 * @param props - 组件属性
 * @param props.part - 工具片段数据
 */
export const ToolCallBlock = memo(function ToolCallBlock({ part }: { part: ToolPart }) {
  const [open, setOpen] = useState(false)
  const cfg = stateConfig[part.state.status] || stateConfig.pending
  const hasBody = (part.state.input && Object.keys(part.state.input).length > 0) || !!part.state.output || !!part.state.error

  const inputText = part.state.input ? JSON.stringify(part.state.input, null, 2) : ''
  const outputText = part.state.output?.slice(0, 2000) || ''

  const partMeta = part.metadata
  const { navigateToSession, allMessages, sessionMeta, taskCallToChild } = useChatContext()
  const childSessionId = typeof partMeta?.sessionId === 'string' ? partMeta.sessionId : taskCallToChild.get(part.callID)

  const childMeta = childSessionId ? sessionMeta.get(childSessionId) : undefined
  const childMessages = childSessionId ? (allMessages.get(childSessionId) ?? []) : []

  const childToolSummary = useMemo(() => {
    if (!childSessionId || childMessages.length === 0) return null
    const tools: string[] = []
    for (const msg of childMessages) {
      for (const p of msg.parts) {
        if (p.type === 'tool') {
          const tp = p as ToolPart
          tools.push(`${tp.tool}: ${tp.state.status}`)
        }
      }
    }
    return tools.length > 0 ? tools : null
  }, [childSessionId, childMessages])

  const handleNavigateToChild = () => {
    if (childSessionId) navigateToSession(childSessionId)
  }

  const canOpen = hasBody || !!childSessionId

  const handleToggle = useCallback(() => {
    if (canOpen) setOpen((v) => !v)
  }, [canOpen])

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={styles.summary}
        onClick={handleToggle}
        style={{ cursor: canOpen ? 'pointer' : 'default' }}
      >
        <motion.span
          className={styles.summaryArrow}
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          ▶
        </motion.span>
        <span className={styles.toolIcon} style={{ color: cfg.color }}>{cfg.icon}</span>
        <span className={styles.toolName}>{part.tool}</span>
        <span className={styles.badge} style={{ color: cfg.color, background: `${cfg.color}15` }}>
          {cfg.label}
        </span>
        {part.state.title && (
          <span className={styles.title}>{part.state.title.slice(0, 50)}</span>
        )}
        {part.state.time?.end && (
          <span className={styles.duration}>
            {((part.state.time.end - part.state.time.start) / 1000).toFixed(1)}s
          </span>
        )}
        {childSessionId && (
          <span className={styles.childIndicator}>
            {childMessages.length > 0 ? `${childMessages.length}条消息` : '子会话'}
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className={styles.body}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {inputText && (
              <JsonView data={part.state.input!} />
            )}

            {childToolSummary && childToolSummary.length > 0 && (
              <div className={styles.childPreview}>
                <div className={styles.sectionLabel}>
                  子会话执行过程
                </div>
                <div className={styles.childToolList}>
                  {childToolSummary.map((t, i) => (
                    <div key={i} className={styles.childToolItem}>{t}</div>
                  ))}
                </div>
              </div>
            )}

            {childSessionId && (
              <div className={styles.childLink}>
                <motion.button className={styles.childLinkBtn} onClick={handleNavigateToChild} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <span className={styles.childLinkTitle}>
                    {childMeta?.title || childSessionId.slice(0, 12) + '...'}
                  </span>
                  {childMessages.length > 0 && (
                    <span className={styles.childLinkBadge}>{childMessages.length} 条消息</span>
                  )}
                  <span className={styles.childLinkArrow}>查看 →</span>
                </motion.button>
              </div>
            )}

            {outputText && (
              <div>
                <div className={styles.sectionLabel}>输出结果</div>
                <pre className={styles.outputBlock}>
                  {escapeHtml(outputText)}
                  <CopyButton text={outputText} />
                </pre>
              </div>
            )}

            {part.state.error && (
              <div className={styles.errorBlock}>{part.state.error}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})
