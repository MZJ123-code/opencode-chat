import { memo } from 'react'
import { motion } from 'framer-motion'
import type { SessionListItem } from '../../types/session'
import { formatDate } from '../../utils/formatDate'
import { cn } from '@/lib/utils'

interface SessionItemProps {
  session: SessionListItem
  isActive: boolean
  onClick: () => void
}

export const SessionItem = memo(function SessionItem({ session, isActive, onClick }: SessionItemProps) {
  return (
    <motion.div
      className={cn(
        'px-3 py-2.5 mx-2 rounded-lg cursor-pointer transition-colors',
        isActive
          ? 'bg-[var(--sidebar-active)] text-slate-100'
          : 'text-slate-300 hover:bg-[var(--sidebar-hover)]'
      )}
      onClick={onClick}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="text-sm font-medium truncate">{session.title}</div>
      <div className="text-xs text-slate-400 mt-0.5">
        {formatDate(session.createdAt)} · {session.messageCount || 0} 条消息
      </div>
    </motion.div>
  )
})
