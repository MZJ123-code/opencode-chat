import { Skeleton } from '../common/Skeleton'
import type { AgentOption } from '../../api/agents'

interface AgentSelectorProps {
  agents: AgentOption[]
  loading: boolean
  onSelect: (agent: string) => void
  creating: boolean
}

const agentColors: Record<string, string> = {
  build: 'from-indigo-600 to-indigo-500',
  plan: 'from-emerald-600 to-emerald-500',
  explore: 'from-amber-600 to-amber-500',
}

const agentIcons: Record<string, string> = {
  build: '⚡',
  plan: '📐',
  explore: '🔍',
}

export function AgentSelector({ agents, loading, onSelect, creating }: AgentSelectorProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-base font-medium text-[var(--text-secondary)]">加载中...</div>
        <div className="mt-6 flex gap-4">
          <Skeleton count={3} width={200} height={140} />
        </div>
      </div>
    )
  }

  if (agents.length === 0) return null

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-lg font-semibold text-[var(--text)] mb-2">
        选择对话模式
      </div>
      <div className="text-sm text-[var(--text-secondary)] mb-8">
        选择一个 AI 助手来开始新的对话
      </div>
      <div className="flex flex-wrap justify-center gap-4 px-4">
        {agents.map((opt) => {
          const gradient = agentColors[opt.agent] || 'from-indigo-600 to-indigo-500'
          const icon = agentIcons[opt.agent] || '🤖'
          return (
            <button
              key={opt.agent}
              onClick={() => onSelect(opt.agent)}
              disabled={creating}
              className="group relative flex flex-col items-start p-5 w-[220px] rounded-xl border border-[var(--border)] bg-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer text-left hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} text-white text-lg mb-3`}>
                {icon}
              </div>
              <div className="text-sm font-semibold text-[var(--text)] mb-1">
                {opt.label}
              </div>
              <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {opt.description}
              </div>
              <div className="mt-3 text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                开始对话 →
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
