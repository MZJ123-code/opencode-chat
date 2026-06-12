import { motion } from 'framer-motion'
import { TaiyiAvatar } from './TaiyiAvatar'
import type { TaiyiMood } from './TaiyiAvatar'

interface EmptyStateProps {
  hasSession: boolean
  isStreaming?: boolean
  mood?: TaiyiMood
}

/**
 * 空状态占位组件
 * @param props - 组件属性
 * @param props.hasSession - 当前是否存在会话
 * @param props.isStreaming - 是否正在流式输出
 * @param props.mood - 太乙真人表情状态
 */
export function EmptyState({ hasSession, isStreaming = false, mood }: EmptyStateProps) {
  const currentMood: TaiyiMood = mood ?? (isStreaming ? 'thinking' : 'idle')

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <TaiyiAvatar mood={currentMood} size={140} interactive />
      </motion.div>
      <motion.div
        className="text-xl font-bold text-[var(--text)] mb-3 mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {hasSession ? '开始提问吧' : '与太乙真人对话'}
      </motion.div>
      {!hasSession && (
        <motion.div
          className="text-sm text-[var(--text-secondary)] max-w-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          点击太乙真人可以和他互动哦～选择一个 AI 助手开始咨询
        </motion.div>
      )}
    </div>
  )
}
