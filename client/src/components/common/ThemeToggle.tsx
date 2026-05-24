import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggle } = useTheme()

  return (
    <motion.button
      onClick={toggle}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[#2d2f4a] dark:border-[var(--border)] bg-transparent cursor-pointer shrink-0 transition-colors hover:bg-[var(--sidebar-hover)] dark:hover:bg-[var(--accent)] ${className}`}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      title={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}
    >
      <motion.span
        initial={false}
        animate={{ rotate: theme === 'dark' ? 180 : 0, scale: [0.6, 1] }}
        transition={{ duration: 0.35, type: 'spring' }}
        className="text-sm"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </motion.span>
    </motion.button>
  )
}
