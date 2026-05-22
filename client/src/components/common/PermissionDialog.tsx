import { useState, useRef, useEffect } from 'react'
import { respondPermission, replyQuestion, rejectQuestion } from '../../api/permission'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface QuestionInfo {
  question: string
  header: string
  options: Array<{ label: string; description: string }>
  multiple?: boolean
  custom?: boolean
}

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
  const [textValue, setTextValue] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = useState(true)

  const isQuestion = request.permission === 'question' || request.permission === 'tool:question'
  const questions = request.metadata?.questions as QuestionInfo[] | undefined
  const question = questions?.[0]
  const questionText = question?.question || (request.metadata?.question as string) || (request.metadata?.text as string) || request.permission
  const isCustom = !question?.options?.length

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function toggleOption(label: string) {
    setSelected((prev) =>
      question?.multiple
        ? prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
        : prev.includes(label) ? [] : [label],
    )
  }

  async function handleSend() {
    setPending(true)
    try {
      const answers = isCustom ? [textValue] : selected
      await replyQuestion(request.id, answers)
      setOpen(false)
      onClose()
    } catch {
      setPending(false)
    }
  }

  async function handleSkip() {
    setPending(true)
    try {
      await rejectQuestion(request.id)
      setOpen(false)
      onClose()
    } catch {
      setPending(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setOpen(false)
      onClose()
      rejectQuestion(request.id).catch(() => {})
    }
  }

  const canSend = isCustom ? textValue.trim().length > 0 : selected.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{isQuestion ? '💬' : '🔒'}</span>
            {question?.header || (isQuestion ? 'AI 提问' : '权限请求')}
          </DialogTitle>
          <DialogDescription>
            {questionText}
          </DialogDescription>
        </DialogHeader>

        {isQuestion && question?.options?.map((opt) => (
          <button
            key={opt.label}
            className={`w-full text-left rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
              selected.includes(opt.label)
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-[var(--border)] bg-white hover:border-indigo-300'
            }`}
            disabled={pending}
            onClick={() => toggleOption(opt.label)}
          >
            <div className="font-medium">{opt.label}</div>
            {opt.description && (
              <div className="text-xs text-[var(--text-secondary)] mt-0.5">{opt.description}</div>
            )}
          </button>
        ))}

        {isQuestion && isCustom && (
          <textarea
            ref={inputRef}
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none disabled:opacity-50"
            placeholder="输入你的回答..."
            value={textValue}
            disabled={pending}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (canSend) handleSend()
              }
            }}
            rows={2}
          />
        )}

        <div className="text-xs text-[var(--text-secondary)]">
          {isQuestion
            ? question?.multiple
              ? '支持多选'
              : isCustom
                ? '按 Enter 发送 · Shift+Enter 换行'
                : '点击选项选择'
            : 'AI 需要你的授权才能继续'}
        </div>

        <DialogFooter>
          {isQuestion && (
            <Button disabled={!canSend || pending} onClick={handleSend}>
              {pending ? '发送中...' : '发送'}
            </Button>
          )}
          <Button variant="outline" disabled={pending} onClick={handleSkip}>
            {isQuestion ? '跳过' : '拒绝'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
