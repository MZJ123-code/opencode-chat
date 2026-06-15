import type { ReactNode } from 'react'

interface ChatAreaProps {
  children: ReactNode
}

/**
 * 聊天区域主布局组件 — Sci-Fi 风格
 */
export function ChatArea({ children }: ChatAreaProps) {
  return (
    <main className="flex flex-col flex-1 min-w-0 relative bg-mesh grid-bg" style={{ background: 'var(--bg)' }}>
      <div className="relative z-10 flex flex-col flex-1 min-h-0" style={{
        background: 'var(--chat-bg)',
        margin: '0',
        boxShadow: 'inset 1px 0 0 0 rgba(0, 240, 255, 0.06)',
      }}>
        {children}
      </div>
    </main>
  )
}
