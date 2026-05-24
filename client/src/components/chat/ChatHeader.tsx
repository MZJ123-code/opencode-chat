import { motion } from 'framer-motion'
import { MobileMenuButton } from '../layout/Sidebar'
import { useChatContext } from '../../contexts/ChatContext'
import { useTheme } from '../../contexts/ThemeContext'

interface ChatHeaderProps {
  title: string
  onMenuClick?: () => void
}

export function ChatHeader({ title, onMenuClick }: ChatHeaderProps) {
  const { parentSessionId, sessionMeta, navigateToParent, navigationStack, navigateBack } = useChatContext()
  const { theme, toggle } = useTheme()

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

      <motion.button
        onClick={toggle}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--text)] transition-colors cursor-pointer shrink-0"
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        title={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}
      >
        <motion.span
          initial={false}
          animate={{ rotate: theme === 'dark' ? 180 : 0, scale: [0.6, 1] }}
          transition={{ duration: 0.35, type: 'spring' }}
          className="text-sm"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </motion.span>
      </motion.button>
    </div>
  )
}
