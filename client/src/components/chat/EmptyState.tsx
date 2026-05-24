import { motion } from 'framer-motion'

interface EmptyStateProps {
  hasSession: boolean
}

export function EmptyState({ hasSession }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        className="text-5xl mb-4"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        💬
      </motion.div>
      <motion.div
        className="text-base font-medium text-[var(--text)]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {hasSession ? '开始提问吧' : '开始新的对话'}
      </motion.div>
      {!hasSession && (
        <motion.div
          className="text-sm text-[var(--text-secondary)] mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          点击左侧 "+ 新建对话" 开始咨询
        </motion.div>
      )}
    </div>
  )
}
