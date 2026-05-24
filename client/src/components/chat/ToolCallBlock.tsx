import { useState, useCallback, useMemo } from 'react'
import type { ToolPart } from '../../types/message'
import { escapeHtml } from '../../utils/escapeHtml'
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

export function ToolCallBlock({ part }: { part: ToolPart }) {
  const cfg = stateConfig[part.state.status] || stateConfig.pending
  const hasBody = (part.state.input && Object.keys(part.state.input).length > 0) || !!part.state.output || !!part.state.error

  const inputText = part.state.input ? JSON.stringify(part.state.input, null, 2) : ''
  const outputText = part.state.output?.slice(0, 2000) || ''

  // Check if this is a task tool with a child session (following opencode web pattern)
  const partMeta = (part as unknown as { metadata?: Record<string, unknown> }).metadata
  // Primary: metadata.sessionId from message.part.updated; Fallback: callID → childID mapping
  const { navigateToSession, allMessages, sessionMeta, taskCallToChild } = useChatContext()
  const childSessionId = (partMeta?.sessionId as string | undefined) ?? taskCallToChild.get(part.callID)

  // Get child session info
  const childMeta = childSessionId ? sessionMeta.get(childSessionId) : undefined
  const childMessages = childSessionId ? (allMessages.get(childSessionId) ?? []) : []

  // Extract child tool call summary for inline preview
  const childToolSummary = useMemo(() => {
    if (!childSessionId || childMessages.length === 0) return null
    const tools: string[] = []
    for (const msg of childMessages) {
      for (const p of msg.parts) {
        if (p.type === 'tool' && 'tool' in p) {
          const tp = p as unknown as ToolPart
          tools.push(`${tp.tool}: ${tp.state.status}`)
        }
      }
    }
    return tools.length > 0 ? tools : null
  }, [childSessionId, childMessages])

  const handleNavigateToChild = () => {
    if (childSessionId) navigateToSession(childSessionId)
  }

  return (
    <details className={styles.container}>
      <summary className={styles.summary}
        onClick={(e) => {
          if (!hasBody && !childSessionId) e.preventDefault()
        }}
      >
        <span className={styles.summaryArrow}>▶</span>
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
        {/* Show child session indicator on the summary line */}
        {childSessionId && (
          <span className={styles.childIndicator}>
            {childMessages.length > 0 ? `${childMessages.length}条消息` : '子会话'}
          </span>
        )}
      </summary>

      <div className={styles.body}>
        {inputText && (
          <JsonView data={part.state.input!} />
        )}

        {/* Inline child session tool preview */}
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

        {/* Child session link — like opencode web's task tool rendering */}
        {childSessionId && (
          <div className={styles.childLink}>
            <button className={styles.childLinkBtn} onClick={handleNavigateToChild}>
              <span className={styles.childLinkTitle}>
                {childMeta?.title || childSessionId.slice(0, 12) + '...'}
              </span>
              {childMessages.length > 0 && (
                <span className={styles.childLinkBadge}>{childMessages.length} 条消息</span>
              )}
              <span className={styles.childLinkArrow}>查看 →</span>
            </button>
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
      </div>
    </details>
  )
}
