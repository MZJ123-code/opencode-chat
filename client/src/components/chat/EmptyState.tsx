import { motion } from 'framer-motion'
import { TaiyiAvatar } from './TaiyiAvatar'
import type { TaiyiMood } from './TaiyiAvatar'

interface EmptyStateProps {
  hasSession: boolean
  isStreaming?: boolean
  mood?: TaiyiMood
}

/**
 * 空状态占位组件 — Sci-Fi 风格
 */
export function EmptyState({ hasSession, isStreaming = false, mood }: EmptyStateProps) {
  const currentMood: TaiyiMood = mood ?? (isStreaming ? 'thinking' : 'idle')

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* 光圈效果 */}
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 240, 255, 0.08) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <TaiyiAvatar mood={currentMood} size={140} interactive />
        </motion.div>
      </div>
      <motion.div
        className="text-xl font-bold text-[var(--text)] mb-3 mt-6 neon-text-subtle"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {hasSession ? '开始提问吧' : '与 AI 助手对话'}
      </motion.div>
      {!hasSession && (
        <motion.div
          className="text-sm text-[var(--text-secondary)] max-w-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          点击机器人可以和他互动哦～选择一个 AI 助手开始咨询
        </motion.div>
      )}
    </div>
  )
}
