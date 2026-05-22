import { useState, useRef, useEffect } from 'react'
import { respondPermission } from '../../api/permission'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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
  const [open, setOpen] = useState(true)

  const isQuestion = request.permission === 'question' || request.permission === 'tool:question'
  const questionText = (request.metadata?.question as string) || (request.metadata?.text as string) || request.permission

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleReply(reply: 'once' | 'reject') {
    setPending(true)
    try {
      await respondPermission(request.id, reply, reply === 'once' ? value : undefined)
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
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{isQuestion ? '💬' : '🔒'}</span>
            {isQuestion ? 'AI 提问' : '权限请求'}
          </DialogTitle>
          <DialogDescription>
            {questionText}
          </DialogDescription>
        </DialogHeader>

        {isQuestion && (
          <textarea
            ref={inputRef}
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none disabled:opacity-50"
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

        <div className="text-xs text-[var(--text-secondary)]">
          {isQuestion ? '按 Enter 发送 · Shift+Enter 换行' : 'AI 需要你的授权才能继续'}
        </div>

        <DialogFooter>
          {isQuestion && (
            <Button
              disabled={!value.trim() || pending}
              onClick={() => handleReply('once')}
            >
              {pending ? '发送中...' : '发送'}
            </Button>
          )}
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => handleReply('reject')}
          >
            {isQuestion ? '跳过' : '拒绝'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
