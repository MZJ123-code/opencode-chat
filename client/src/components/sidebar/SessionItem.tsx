import { memo } from 'react'
import { motion } from 'framer-motion'
import type { SessionListItem } from '../../types/api-responses'
import { formatDate } from '../../lib/utils'
import { cn } from '@/lib/utils'

interface SessionItemProps {
  session: SessionListItem
  isActive: boolean
  onClick: () => void
}

/**
 * 单个会话项组件 — Sci-Fi 风格
 */
export const SessionItem = memo(function SessionItem({ session, isActive, onClick }: SessionItemProps) {
  return (
    <motion.div
      className={cn(
        'px-4 py-3 mx-3 rounded-xl cursor-pointer transition-all duration-300 relative',
        isActive
          ? 'text-white'
          : 'text-slate-400 hover:text-white'
      )}
      onClick={onClick}
      whileHover={{ x: 4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      layout
      style={isActive ? {
        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(0, 119, 255, 0.08) 100%)',
        border: '1px solid rgba(0, 240, 255, 0.25)',
        boxShadow: '0 0 15px rgba(0, 240, 255, 0.08), inset 0 0 20px rgba(0, 240, 255, 0.04)',
      } : {
        background: 'transparent',
        border: '1px solid transparent',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300',
          )}
          style={isActive ? {
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(0, 119, 255, 0.3) 100%)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            boxShadow: '0 0 8px rgba(0, 240, 255, 0.2)',
          } : {
            background: 'rgba(0, 240, 255, 0.06)',
            border: '1px solid rgba(0, 240, 255, 0.08)',
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: isActive ? '#00f0ff' : 'rgba(0, 240, 255, 0.5)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn('text-sm font-medium truncate', isActive && 'neon-text-subtle')} style={{ color: isActive ? '#e0f0ff' : undefined }}>
            {session.title}
          </div>
          <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'rgba(0, 240, 255, 0.35)' }}>
            <span>{formatDate(session.createdAt)}</span>
            <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(0, 240, 255, 0.3)' }}></span>
            <span>{session.messageCount || 0} 条消息</span>
          </div>
        </div>
        {isActive && (
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
            background: '#00f0ff',
            boxShadow: '0 0 6px rgba(0, 240, 255, 0.5)',
            animation: 'neon-flicker 4s ease-in-out infinite',
          }} />
        )}
      </div>
    </motion.div>
  )
})
