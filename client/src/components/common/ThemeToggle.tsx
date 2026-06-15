import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface ThemeToggleProps {
  className?: string
}

/**
 * 主题切换按钮组件 — Sci-Fi 风格
 */
export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggle } = useTheme()

  return (
    <motion.button
      onClick={toggle}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer shrink-0 transition-all duration-300 ${className}`}
      style={{
        background: 'rgba(0, 240, 255, 0.06)',
        border: '1px solid rgba(0, 240, 255, 0.15)',
      }}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      title={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0, 240, 255, 0.12)'
        e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)'
        e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(0, 240, 255, 0.06)'
        e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.15)'
        e.currentTarget.style.boxShadow = 'none'
      }}
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
