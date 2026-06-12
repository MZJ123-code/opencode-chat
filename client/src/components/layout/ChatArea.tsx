import type { ReactNode } from 'react'

interface ChatAreaProps {
  children: ReactNode
}

/**
 * 聊天区域主布局组件
 * @param props - 组件属性
 * @param props.children - 子组件
 */
export function ChatArea({ children }: ChatAreaProps) {
  return (
    <main className="flex flex-col flex-1 min-w-0 relative bg-mesh" style={{ background: 'var(--bg)' }}>
      <div className="relative z-10 flex flex-col flex-1 min-h-0" style={{
        background: 'var(--chat-bg)',
        margin: '0',
        boxShadow: 'inset 1px 0 0 0 var(--border)',
      }}>
        {children}
      </div>
    </main>
  )
}
