import { motion, AnimatePresence } from 'framer-motion'

interface ErrorBannerProps {
  message: string | null
  onDismiss: () => void
}

/**
 * 错误提示横幅组件
 * @param props - 组件属性
 * @param props.message - 错误消息（null 时不显示）
 * @param props.onDismiss - 关闭回调
 */
export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="flex items-center justify-between px-4 py-2 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-sm border-b border-red-100 dark:border-red-900/50"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <span>{message}</span>
          <motion.span
            className="ml-4 cursor-pointer font-medium hover:text-red-900 dark:hover:text-red-200 shrink-0"
            onClick={onDismiss}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            关闭
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
