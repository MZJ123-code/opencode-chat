import { Button } from '@/components/ui/button'
import { ThemeToggle } from '../common/ThemeToggle'

interface SidebarHeaderProps {
  onCreateClick: () => void
  isCreating: boolean
}

/**
 * 侧边栏头部组件
 * @param props - 组件属性
 * @param props.onCreateClick - 创建新对话回调
 * @param props.isCreating - 是否正在创建中
 */
export function SidebarHeader({ onCreateClick, isCreating }: SidebarHeaderProps) {
  return (
    <div className="px-5 pt-6 pb-5 border-b border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-white text-lg">✦</span>
          </div>
          <h2 className="text-base font-semibold text-white m-0 tracking-tight">
            AI 咨询平台
          </h2>
        </div>
        <ThemeToggle />
      </div>
      <Button
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 btn-shimmer"
        onClick={onCreateClick}
        disabled={isCreating}
      >
        {isCreating ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            创建中...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建对话
          </span>
        )}
      </Button>
    </div>
  )
}
