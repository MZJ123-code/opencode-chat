import { useState, useCallback } from 'react'
import type { ToolPart } from '../../types/message'
import { escapeHtml } from '../../utils/escapeHtml'
import { JsonView } from './JsonView'
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

  return (
    <details className={styles.container}>
      <summary className={styles.summary}
        onClick={(e) => {
          if (!hasBody) e.preventDefault()
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
            {(part.state.time.end - part.state.time.start).toFixed(1)}s
          </span>
        )}
      </summary>

      {hasBody && (
        <div className={styles.body}>
          {inputText && (
            <JsonView data={part.state.input!} />
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
      )}
    </details>
  )
}
