import { MobileMenuButton } from '../layout/Sidebar'
import { useChatContext } from '../../contexts/ChatContext'

interface ChatHeaderProps {
  title: string
  onMenuClick?: () => void
}

export function ChatHeader({ title, onMenuClick }: ChatHeaderProps) {
  const { parentSessionId, sessionMeta, navigateToParent, navigationStack, navigateBack } = useChatContext()

  const parentTitle = parentSessionId ? (sessionMeta.get(parentSessionId)?.title || '父会话') : null
  const showBack = navigationStack.length > 0 || parentSessionId

  return (
    <div className="flex items-center px-4 h-14 border-b border-[var(--border)] bg-white shrink-0 gap-2">
      {onMenuClick && <MobileMenuButton onClick={onMenuClick} />}

      {showBack && (
        <button
          onClick={() => {
            if (navigationStack.length > 0) {
              navigateBack()
            } else if (parentSessionId) {
              navigateToParent()
            }
          }}
          className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors shrink-0"
          title={parentTitle ? `返回 ${parentTitle}` : '返回'}
        >
          <span className="text-base leading-none">←</span>
          {parentTitle && (
            <span className="max-w-[120px] truncate hidden sm:inline">{parentTitle}</span>
          )}
        </button>
      )}

      {showBack && (
        <span className="text-[var(--muted)] text-xs shrink-0">/</span>
      )}

      <span className="text-sm font-medium text-[var(--text)] truncate">{title}</span>
    </div>
  )
}
