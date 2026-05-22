import { MobileMenuButton } from '../layout/Sidebar'

interface ChatHeaderProps {
  title: string
  onMenuClick?: () => void
}

export function ChatHeader({ title, onMenuClick }: ChatHeaderProps) {
  return (
    <div className="flex items-center px-4 h-14 border-b border-[var(--border)] bg-white shrink-0">
      {onMenuClick && <MobileMenuButton onClick={onMenuClick} />}
      <span className="text-sm font-medium text-[var(--text)] truncate">{title}</span>
    </div>
  )
}
