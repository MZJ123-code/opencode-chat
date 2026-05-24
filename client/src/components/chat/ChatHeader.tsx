import { motion } from 'framer-motion'
import { MobileMenuButton } from '../layout/Sidebar'
import { useChatContext } from '../../contexts/ChatContext'
import { ThemeToggle } from '../common/ThemeToggle'

interface ChatHeaderProps {
  title: string
  onMenuClick?: () => void
}

const statusColors: Record<string, string> = {
  connected: '#22c55e',
  connecting: '#eab308',
  disconnected: '#ef4444',
}

const statusTitles: Record<string, string> = {
  connected: '已连接',
  connecting: '正在重连…',
  disconnected: '连接断开',
}

export function ChatHeader({ title, onMenuClick }: ChatHeaderProps) {
  const { parentSessionId, sessionMeta, navigateToParent, navigationStack, navigateBack, connectionStatus } = useChatContext()

  const parentTitle = parentSessionId ? (sessionMeta.get(parentSessionId)?.title || '父会话') : null
  const showBack = navigationStack.length > 0 || parentSessionId

  return (
    <div className="flex items-center px-4 h-14 shrink-0 gap-2 border-b border-[var(--border)]" style={{ background: 'var(--chat-bg)' }}>
      {onMenuClick && <MobileMenuButton onClick={onMenuClick} />}

      {showBack && (
        <motion.button
          onClick={() => {
            if (navigationStack.length > 0) {
              navigateBack()
            } else if (parentSessionId) {
              navigateToParent()
            }
          }}
          className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--text)] transition-colors shrink-0"
          title={parentTitle ? `返回 ${parentTitle}` : '返回'}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-base leading-none">←</span>
          {parentTitle && (
            <span className="max-w-[120px] truncate hidden sm:inline">{parentTitle}</span>
          )}
        </motion.button>
      )}

      {showBack && (
        <span className="text-[var(--muted-foreground)] text-xs shrink-0">/</span>
      )}

      <span className="text-sm font-medium text-[var(--text)] truncate flex-1">{title}</span>

      <motion.span
        className="inline-block w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: statusColors[connectionStatus] }}
        title={statusTitles[connectionStatus]}
        animate={{ opacity: connectionStatus === 'connecting' ? [0.4, 1, 0.4] : 1 }}
        transition={connectionStatus === 'connecting' ? { repeat: Infinity, duration: 1.5 } : undefined}
      />

      <ThemeToggle className="text-[var(--muted-foreground)] hover:text-[var(--text)] border-[var(--border)]" />
    </div>
  )
}
