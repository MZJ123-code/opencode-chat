import { useState, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ToolPart } from '../../types/message'
import { escapeHtml } from '../../lib/utils'
import { JsonView } from './JsonView'
import { useChatContext } from '../../contexts/ChatContext'

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
      className={
        copied
          ? 'absolute top-[6px] right-[6px] px-[10px] py-[3px] text-[11px] font-[var(--mono)] border border-[var(--border)] rounded-[5px] bg-[#dcfce7] text-[#16a34a] opacity-100 cursor-pointer transition-all duration-150 leading-[1.5] dark:bg-[rgba(34,197,94,0.15)] dark:text-[#86efac]'
          : 'absolute top-[6px] right-[6px] px-[10px] py-[3px] text-[11px] font-[var(--mono)] border border-[var(--border)] rounded-[5px] bg-[var(--card)] text-[var(--muted-foreground)] cursor-pointer opacity-0 transition-all duration-150 leading-[1.5] group-hover:opacity-100'
      }
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
      className="mb-2 border border-[var(--border)] rounded-[10px] text-[15px] bg-[var(--card)] shrink-0 min-w-0"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="flex items-center gap-[6px] px-3 py-2 cursor-pointer bg-[var(--muted)] rounded-[8px] select-none text-[var(--foreground)]"
        onClick={handleToggle}
        style={{ cursor: canOpen ? 'pointer' : 'default' }}
      >
        <motion.span
          className="shrink-0 text-[10px] text-[var(--muted-foreground)]"
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          ▶
        </motion.span>
        <span className="text-[14px]" style={{ color: cfg.color }}>{cfg.icon}</span>
        <span className="font-semibold text-[var(--foreground)] font-[var(--mono)] text-xs">{part.tool}</span>
        <span className="text-[10px] font-semibold px-2 py-[2px] rounded-full" style={{ color: cfg.color, background: `${cfg.color}15` }}>
          {cfg.label}
        </span>
        {part.state.title && (
          <span className="text-[var(--muted-foreground)] text-[11px] overflow-hidden text-ellipsis whitespace-nowrap">{part.state.title.slice(0, 50)}</span>
        )}
        {part.state.time?.end && (
          <span className="text-[var(--muted-foreground)] text-[11px] ml-auto shrink-0 font-[var(--mono)]">
            {((part.state.time.end - part.state.time.start) / 1000).toFixed(1)}s
          </span>
        )}
        {childSessionId && (
          <span className="text-[10px] px-[6px] py-[2px] rounded-full bg-[#eef2ff] text-[#6366f1] font-medium shrink-0 ml-[4px] dark:bg-[rgba(99,102,241,0.15)] dark:text-[#a5b4fc]">
            {childMessages.length > 0 ? `${childMessages.length}条消息` : '子会话'}
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="px-3 py-2 flex flex-col gap-2 border-t border-[var(--border)]"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {inputText && (
              <JsonView data={part.state.input!} />
            )}

            {childToolSummary && childToolSummary.length > 0 && (
              <div className="py-[4px]">
                <div className="text-[11px] text-[var(--muted-foreground)] mb-[4px] font-medium">
                  子会话执行过程
                </div>
                <div className="flex flex-col gap-[3px] max-h-[200px] overflow-y-auto">
                  {childToolSummary.map((t, i) => (
                    <div key={i} className="text-[11px] font-[var(--mono)] px-2 py-[3px] bg-[var(--muted)] rounded-[4px] text-[var(--muted-foreground)] border border-[var(--border)]">{t}</div>
                  ))}
                </div>
              </div>
            )}

            {childSessionId && (
              <div className="py-[4px]">
                <motion.button className="flex items-center gap-2 w-full px-3 py-2 border border-dashed border-[#818cf8] rounded-[6px] bg-[#eef2ff] text-[#4338ca] text-xs cursor-pointer transition-colors duration-150 hover:bg-[#e0e7ff] dark:bg-[rgba(99,102,241,0.1)] dark:text-[#a5b4fc] dark:border-[rgba(99,102,241,0.3)] dark:hover:bg-[rgba(99,102,241,0.15)]" onClick={handleNavigateToChild} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <span className="font-medium overflow-hidden text-ellipsis whitespace-nowrap flex-1 text-left">
                    {childMeta?.title || childSessionId.slice(0, 12) + '...'}
                  </span>
                  {childMessages.length > 0 && (
                    <span className="text-[10px] px-[6px] py-[2px] rounded-full bg-[#c7d2fe] text-[#4338ca] font-medium shrink-0 dark:bg-[rgba(99,102,241,0.2)] dark:text-[#a5b4fc]">{childMessages.length} 条消息</span>
                  )}
                  <span className="font-semibold shrink-0">查看 →</span>
                </motion.button>
              </div>
            )}

            {outputText && (
              <div>
                <div className="text-[11px] text-[var(--muted-foreground)] mb-[4px] font-medium">输出结果</div>
                <pre className="m-0 px-[10px] py-2 bg-[#f0fdf4] text-[#166534] rounded-[6px] text-xs font-[var(--mono)] leading-[1.5] overflow-x-auto whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto relative dark:bg-[rgba(34,197,94,0.1)] dark:text-[#86efac] group">
                  {escapeHtml(outputText)}
                  <CopyButton text={outputText} />
                </pre>
              </div>
            )}

            {part.state.error && (
              <div className="text-[#dc2626] text-xs px-[10px] py-2 bg-[#fef2f2] rounded-[6px] font-[var(--mono)] dark:bg-[rgba(239,68,68,0.1)] dark:text-[#fca5a5]">{part.state.error}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})
