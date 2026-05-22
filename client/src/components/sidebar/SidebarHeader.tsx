import { Button } from '@/components/ui/button'

interface SidebarHeaderProps {
  onCreateClick: () => void
  isCreating: boolean
}

export function SidebarHeader({ onCreateClick, isCreating }: SidebarHeaderProps) {
  return (
    <div className="px-4 pt-5 pb-4 border-b border-[#2d2f4a]">
      <h2 className="text-base font-semibold text-slate-100 m-0">
        AI 咨询平台
      </h2>
      <Button
        className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 text-white"
        onClick={onCreateClick}
        disabled={isCreating}
      >
        {isCreating ? '创建中...' : '+ 新建对话'}
      </Button>
    </div>
  )
}
