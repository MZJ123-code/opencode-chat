import { useState, useRef, useEffect } from 'react'
import { respondPermission } from '../../api/permission'
import styles from './PermissionDialog.module.css'

interface PermissionDialogProps {
  request: {
    id: string
    sessionID: string
    permission: string
    metadata: Record<string, unknown>
  }
  onClose: () => void
}

export function PermissionDialog({ request, onClose }: PermissionDialogProps) {
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isQuestion = request.permission === 'question' || request.permission === 'tool:question'
  const questionText = (request.metadata?.question as string) || (request.metadata?.text as string) || request.permission

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleReply(reply: 'once' | 'reject') {
    setPending(true)
    try {
      await respondPermission(request.id, reply, reply === 'once' ? value : undefined)
      onClose()
    } catch {
      setPending(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>
            {isQuestion ? '💬' : '🔒'}
          </span>
          {isQuestion ? 'AI 提问' : '权限请求'}
        </div>

        <div className={styles.question}>{questionText}</div>

        {isQuestion && (
          <textarea
            ref={inputRef}
            className={styles.input}
            placeholder="输入你的回答..."
            value={value}
            disabled={pending}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (value.trim()) handleReply('once')
              }
            }}
            rows={2}
          />
        )}

        <div className={styles.hint}>
          {isQuestion ? '按 Enter 发送 · Shift+Enter 换行' : 'AI 需要你的授权才能继续'}
        </div>

        <div className={styles.actions}>
          {isQuestion && (
            <button
              className={styles.btnPrimary}
              disabled={!value.trim() || pending}
              onClick={() => handleReply('once')}
            >
              {pending ? '发送中...' : '发送'}
            </button>
          )}
          <button
            className={styles.btnSecondary}
            disabled={pending}
            onClick={() => handleReply('reject')}
          >
            {isQuestion ? '跳过' : '拒绝'}
          </button>
        </div>
      </div>
    </div>
  )
}
