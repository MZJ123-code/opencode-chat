import { motion, AnimatePresence } from 'framer-motion'

interface ErrorBannerProps {
  message: string | null
  onDismiss: () => void
}

/**
 * 错误提示横幅组件 — Sci-Fi 风格
 */
export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="flex items-center justify-between px-4 py-2 text-sm"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.08) 100%)',
            color: '#ef4444',
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
            boxShadow: '0 0 15px rgba(239, 68, 68, 0.05)',
          }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <span className="flex items-center gap-2">
            <span style={{ textShadow: '0 0 8px rgba(239, 68, 68, 0.5)' }}>⚠</span>
            {message}
          </span>
          <motion.span
            className="ml-4 cursor-pointer font-medium shrink-0 transition-colors"
            style={{ color: 'rgba(239, 68, 68, 0.7)' }}
            onClick={onDismiss}
            whileHover={{ scale: 1.05, color: '#ef4444' }}
            whileTap={{ scale: 0.95 }}
          >
            关闭
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
