import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { replyQuestion, rejectQuestion } from '../../api/permission'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface QuestionOption {
  label: string
  description: string
}

interface QuestionInfo {
  question: string
  header: string
  options: QuestionOption[]
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

/**
 * 权限询问对话框组件
 * @param props - 组件属性
 * @param props.request - 权限请求数据
 * @param props.onClose - 关闭回调
 */
export function PermissionDialog({ request, onClose }: PermissionDialogProps) {
  const questions: QuestionInfo[] = useMemo(() => {
    const q = request.metadata?.questions
    if (Array.isArray(q)) {
      return q.filter(
        (item): item is QuestionInfo =>
          typeof item === 'object' && item !== null && 'question' in item,
      )
    }
    return []
  }, [request.metadata?.questions])
  const isQuestion =
    request.permission === 'question' || request.permission === 'tool:question'
  const total = questions.length

  const [tab, setTab] = useState(0)
  const [answers, setAnswers] = useState<string[][]>(() => questions.map(() => []))
  const [customTexts, setCustomTexts] = useState<string[]>(() => questions.map(() => ''))
  const [customOn, setCustomOn] = useState<boolean[]>(() => questions.map(() => false))
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [open, setOpen] = useState(true)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const current = questions[tab]
  const last = tab >= total - 1
  const isCustom = !current?.options?.length
  const currentAnswers = answers[tab] ?? []

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing, tab])

  function toggleOption(label: string) {
    setAnswers((prev) => {
      const next = [...prev]
      const cur = next[tab] ?? []
      if (current?.multiple) {
        next[tab] = cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label]
      } else {
        next[tab] = cur.includes(label) ? [] : [label]
      }
      return next
    })
    setCustomOn((prev) => {
      const next = [...prev]
      next[tab] = false
      return next
    })
    setEditing(false)
  }

  function handleCustomChange(value: string) {
    setCustomTexts((prev) => {
      const next = [...prev]
      next[tab] = value
      return next
    })
  }

  function commitCustom() {
    setEditing(false)
    const value = customTexts[tab]?.trim()
    if (!value) return
    setAnswers((prev) => {
      const next = [...prev]
      const cur = next[tab] ?? []
      if (current?.multiple) {
        if (!cur.includes(value)) next[tab] = [...cur, value]
      } else {
        next[tab] = [value]
      }
      return next
    })
  }

  function next() {
    if (pending) return
    if (editing) commitCustom()
    if (last) {
      submit()
    } else {
      setTab((t) => t + 1)
      setEditing(false)
    }
  }

  const back = useCallback(() => {
    if (pending || tab <= 0) return
    setTab((t) => t - 1)
    setEditing(false)
  }, [pending, tab])

  async function submit() {
    setPending(true)
    try {
      await replyQuestion(request.id, answers.map((a) => a ?? []))
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

  const canSend =
    !isQuestion ||
    (isCustom
      ? customTexts[tab]?.trim().length > 0
      : (answers[tab]?.length ?? 0) > 0)

  const answeredCount = answers.filter((a) => (a?.length ?? 0) > 0).length

  if (!isQuestion) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>🔒</span>
              权限请求
            </DialogTitle>
            <DialogDescription>{request.permission}</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-[var(--text-secondary)]">AI 需要你的授权才能继续</div>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={handleSkip}>
              拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (total === 0) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          {total > 1 && (
            <div className="flex items-center gap-1.5 mb-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === tab
                      ? 'w-6 bg-indigo-500'
                      : (answers[i]?.length ?? 0) > 0 || customOn[i]
                        ? 'w-3 bg-indigo-300'
                        : 'w-3 bg-gray-300 dark:bg-gray-600'
                  }`}
                  disabled={pending}
                  onClick={() => {
                    setTab(i)
                    setEditing(false)
                  }}
                  aria-label={`问题 ${i + 1}`}
                />
              ))}
            </div>
          )}
          <DialogTitle className="flex items-center gap-2">
            <span>💬</span>
            {current?.header || (total > 1 ? `问题 ${tab + 1}` : 'AI 提问')}
            {total > 1 && (
              <span className="text-xs font-normal text-[var(--text-secondary)] ml-auto">
                {tab + 1} / {total}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>{current?.question}</DialogDescription>
        </DialogHeader>

        {current?.options?.map((opt) => {
          const picked = currentAnswers.includes(opt.label)
          return (
            <button
              key={opt.label}
              className={`w-full text-left rounded-lg border px-3 py-2 text-sm outline-none transition-colors dark:bg-[#1e2030] ${
                picked
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                  : 'border-[var(--border)] bg-white dark:bg-[#1e2030] hover:border-indigo-300'
              }`}
              disabled={pending}
              onClick={() => toggleOption(opt.label)}
            >
              <div className="font-medium">{opt.label}</div>
              {opt.description && (
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {opt.description}
                </div>
              )}
            </button>
          )
        })}

        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              commitCustom()
            }}
          >
            <textarea
              ref={inputRef}
              className="w-full rounded-lg border border-[var(--border)] bg-white dark:bg-[#1e2030] px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none disabled:opacity-50"
              placeholder="输入你的回答..."
              value={customTexts[tab] ?? ''}
              disabled={pending}
              onChange={(e) => handleCustomChange(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditing(false)
                  return
                }
                if (e.key !== 'Enter' || e.shiftKey) return
                e.preventDefault()
                commitCustom()
              }}
              rows={2}
            />
          </form>
        ) : (
          current?.custom !== false && (
            <button
              className={`w-full text-left rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                customOn[tab]
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                  : 'border-dashed border-[var(--border)] bg-white dark:bg-[#1e2030] hover:border-indigo-300'
              }`}
              disabled={pending}
              onClick={() => {
                setCustomOn((prev) => {
                  const next = [...prev]
                  next[tab] = true
                  return next
                })
                setEditing(true)
              }}
            >
              <div className="font-medium text-[var(--text-secondary)]">
                自定义回答
              </div>
              {customTexts[tab] && (
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {customTexts[tab]}
                </div>
              )}
            </button>
          )
        )}

        <div className="text-xs text-[var(--text-secondary)]">
          {current?.multiple ? '支持多选' : '点击选项选择'}
        </div>

        <DialogFooter>
          <div className="flex w-full justify-between">
            <Button variant="outline" disabled={pending} onClick={handleSkip}>
              跳过
            </Button>
            <div className="flex gap-2">
              {tab > 0 && (
                <Button variant="outline" disabled={pending} onClick={back}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  上一步
                </Button>
              )}
              <Button
                disabled={!canSend || pending}
                onClick={last ? submit : next}
              >
                {last
                  ? `提交 (${answeredCount}/${total})`
                  : '下一步'}
                {!last && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
