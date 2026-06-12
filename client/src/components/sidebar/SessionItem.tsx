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
 * 单个会话项组件（已记忆化）
 * @param props - 组件属性
 * @param props.session - 会话数据
 * @param props.isActive - 是否激活
 * @param props.onClick - 点击回调
 */
export const SessionItem = memo(function SessionItem({ session, isActive, onClick }: SessionItemProps) {
  return (
    <motion.div
      className={cn(
        'px-4 py-3 mx-3 rounded-xl cursor-pointer transition-all duration-200',
        isActive
          ? 'bg-white/10 text-white shadow-lg shadow-black/10'
          : 'text-slate-300 hover:bg-white/5 hover:text-white'
      )}
      onClick={onClick}
      whileHover={{ x: 4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
          isActive
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
            : 'bg-white/10'
        )}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{session.title}</div>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
            <span>{formatDate(session.createdAt)}</span>
            <span className="w-1 h-1 rounded-full bg-slate-500"></span>
            <span>{session.messageCount || 0} 条消息</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
})
