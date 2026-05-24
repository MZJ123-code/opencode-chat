import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { MarkdownRenderer } from '../chat/MarkdownRenderer'

interface ContentModalProps {
  open: boolean
  onClose: () => void
  title: string
  content: string
}

export function ContentModal({ open, onClose, title, content }: ContentModalProps) {
  const [tab, setTab] = useState<'render' | 'source'>('render')

  useEffect(() => {
    if (open) setTab('render')
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/50"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        />
        <Dialog.Content
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-3xl max-h-[85vh] flex flex-col rounded-xl border shadow-xl"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
        >
          <div
            className="flex items-center justify-between px-5 py-3 border-b shrink-0 rounded-t-xl"
            style={{ borderColor: 'var(--border)', background: 'var(--chat-bg)' }}
          >
            <Dialog.Title className="text-sm font-semibold text-[var(--text)]">
              {title}
            </Dialog.Title>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab('render')}
                className="px-2.5 py-1 text-xs rounded border bg-transparent cursor-pointer transition-colors"
                style={{
                  borderColor: tab === 'render' ? 'var(--accent)' : 'var(--border)',
                  color: tab === 'render' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                渲染
              </button>
              <button
                onClick={() => setTab('source')}
                className="px-2.5 py-1 text-xs rounded border bg-transparent cursor-pointer transition-colors"
                style={{
                  borderColor: tab === 'source' ? 'var(--accent)' : 'var(--border)',
                  color: tab === 'source' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                源码
              </button>
              <Dialog.Close className="ml-2 text-[var(--muted-foreground)] hover:text-[var(--text)] bg-transparent border-0 cursor-pointer text-lg leading-none">
                ✕
              </Dialog.Close>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
            {tab === 'render' ? (
              <div className="prose prose-sm max-w-none" style={{ color: 'var(--text)' }}>
                <MarkdownRenderer content={content} />
              </div>
            ) : (
              <pre
                className="text-xs leading-relaxed whitespace-pre-wrap break-all rounded-lg p-4 overflow-x-auto max-h-[60vh]"
                style={{ background: 'var(--secondary)', color: 'var(--text)' }}
              >
                {content}
              </pre>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
