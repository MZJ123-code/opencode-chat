import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useTheme } from '../../contexts/ThemeContext'

interface SidebarHeaderProps {
  onCreateClick: () => void
  isCreating: boolean
}

export function SidebarHeader({ onCreateClick, isCreating }: SidebarHeaderProps) {
  const { theme, toggle } = useTheme()

  return (
    <div className="px-4 pt-5 pb-4 border-b border-[#2d2f4a]">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-100 m-0">
          AI 咨询平台
        </h2>
        <motion.button
          onClick={toggle}
          className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[#2d2f4a] bg-transparent text-slate-300 hover:bg-[var(--sidebar-hover)] hover:text-slate-100 transition-colors cursor-pointer"
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
      </div>
      <Button
        className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 text-white btn-shimmer"
        onClick={onCreateClick}
        disabled={isCreating}
      >
        {isCreating ? '创建中...' : '+ 新建对话'}
      </Button>
    </div>
  )
}
