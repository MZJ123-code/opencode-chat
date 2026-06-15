import { Button } from '@/components/ui/button'
import { ThemeToggle } from '../common/ThemeToggle'

interface SidebarHeaderProps {
  onCreateClick: () => void
  isCreating: boolean
}

/**
 * 侧边栏头部组件 — Sci-Fi 风格
 */
export function SidebarHeader({ onCreateClick, isCreating }: SidebarHeaderProps) {
  return (
    <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.1)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 119, 255, 0.3) 100%)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              boxShadow: '0 0 12px rgba(0, 240, 255, 0.15), inset 0 0 8px rgba(0, 240, 255, 0.1)',
            }}
          >
            <span className="text-lg" style={{ color: '#00f0ff' }}>✦</span>
          </div>
          <div>
            <h2 className="text-sm font-bold m-0 tracking-wide neon-text-subtle" style={{ color: '#00f0ff' }}>
              AI 咨询平台
            </h2>
            <div className="text-[10px] mt-0.5 tracking-widest uppercase" style={{ color: 'rgba(0, 240, 255, 0.4)' }}>
              NEURAL INTERFACE
            </div>
          </div>
        </div>
        <ThemeToggle />
      </div>
      <Button
        className="w-full font-medium py-2.5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 btn-shimmer"
        onClick={onCreateClick}
        disabled={isCreating}
        style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 119, 255, 0.2) 100%)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          color: '#00f0ff',
          boxShadow: '0 0 15px rgba(0, 240, 255, 0.1), inset 0 1px 0 rgba(0, 240, 255, 0.1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(0, 119, 255, 0.35) 100%)'
          e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 240, 255, 0.2), inset 0 1px 0 rgba(0, 240, 255, 0.15)'
          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 119, 255, 0.2) 100%)'
          e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.1), inset 0 1px 0 rgba(0, 240, 255, 0.1)'
          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)'
        }}
      >
        {isCreating ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            初始化中...
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
