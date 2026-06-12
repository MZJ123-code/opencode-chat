import { motion } from 'framer-motion'

interface EmptyStateProps {
  hasSession: boolean
}

/**
 * 空状态占位组件
 * @param props - 组件属性
 * @param props.hasSession - 当前是否存在会话
 */
export function EmptyState({ hasSession }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-6"
        animate={{ 
          scale: [1, 1.05, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-5xl">💬</span>
      </motion.div>
      <motion.div
        className="text-xl font-bold text-[var(--text)] mb-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {hasSession ? '开始提问吧' : '开始新的对话'}
      </motion.div>
      {!hasSession && (
        <motion.div
          className="text-sm text-[var(--text-secondary)] max-w-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          点击左侧「新建对话」按钮，选择一个 AI 助手开始咨询
        </motion.div>
      )}
    </div>
  )
}
