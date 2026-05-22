import type { ReactNode } from 'react'

interface ChatAreaProps {
  children: ReactNode
}

export function ChatArea({ children }: ChatAreaProps) {
  return (
    <main className="flex flex-col flex-1 min-w-0 bg-white">
      {children}
    </main>
  )
}
