import type { ReactNode } from 'react'

interface ChatAreaProps {
  children: ReactNode
}

export function ChatArea({ children }: ChatAreaProps) {
  return (
    <main className="flex flex-col flex-1 min-w-0 bg-mesh" style={{ background: 'var(--bg)' }}>
      <div className="relative z-10 flex flex-col flex-1 min-h-0" style={{ background: 'var(--chat-bg)' }}>
        {children}
      </div>
    </main>
  )
}
