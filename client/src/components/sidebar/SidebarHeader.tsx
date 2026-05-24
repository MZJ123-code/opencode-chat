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
    <div className="px-4 pt-5 pb-4 border-b border-[#2d2f4a]">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-100 m-0">
          AI 咨询平台
        </h2>
        <ThemeToggle />
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
