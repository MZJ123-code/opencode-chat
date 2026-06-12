import { motion } from 'framer-motion'
import { MobileMenuButton } from '../layout/Sidebar'
import { useChatContext } from '../../contexts/ChatContext'
import { ThemeToggle } from '../common/ThemeToggle'

interface ChatHeaderProps {
  title: string
  onMenuClick?: () => void
}

/**
 * 聊天区域头部组件
 * @param props - 组件属性
 * @param props.title - 标题文字
 * @param props.onMenuClick - 可选的菜单按钮点击回调
 */
const connectionStatusConfig: Record<string, { color: string; title: string }> = {
  connected: { color: '#22c55e', title: '已连接' },
  connecting: { color: '#eab308', title: '正在重连…' },
  disconnected: { color: '#ef4444', title: '连接断开' },
}

export function ChatHeader({ title, onMenuClick }: ChatHeaderProps) {
  const { parentSessionId, sessionMeta, navigateToParent, navigationStack, navigateBack, connectionStatus } = useChatContext()

  const parentTitle = parentSessionId ? (sessionMeta.get(parentSessionId)?.title || '父会话') : null
  const showBack = navigationStack.length > 0 || parentSessionId

  return (
    <div className="flex items-center px-5 h-16 shrink-0 gap-3 border-b border-[var(--border)]" style={{ 
      background: 'var(--chat-bg)',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
    }}>
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
          className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--text)] transition-colors shrink-0 px-2 py-1 rounded-lg hover:bg-[var(--accent)]"
          title={parentTitle ? `返回 ${parentTitle}` : '返回'}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {parentTitle && (
            <span className="max-w-[120px] truncate hidden sm:inline">{parentTitle}</span>
          )}
        </motion.button>
      )}

      {showBack && (
        <span className="text-[var(--muted-foreground)] text-xs shrink-0">/</span>
      )}

      <span className="text-sm font-semibold text-[var(--text)] truncate flex-1">{title}</span>

      <div className="flex items-center gap-2">
        <div className="relative">
          <motion.span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: connectionStatusConfig[connectionStatus]?.color }}
            title={connectionStatusConfig[connectionStatus]?.title || connectionStatus}
            animate={{ opacity: connectionStatus === 'connecting' ? [0.4, 1, 0.4] : 1 }}
            transition={connectionStatus === 'connecting' ? { repeat: Infinity, duration: 1.5 } : undefined}
          />
          {connectionStatus === 'connected' && (
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: connectionStatusConfig[connectionStatus]?.color }}
              animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
        </div>
        <ThemeToggle className="text-[var(--muted-foreground)] hover:text-[var(--text)] border-[var(--border)] hover:bg-[var(--accent)]" />
      </div>
    </div>
  )
}
