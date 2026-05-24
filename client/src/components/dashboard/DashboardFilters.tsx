import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface FilterValues {
  dateFrom: string
  dateTo: string
  agents: string[]
  satisfaction: 'all' | 'liked' | 'disliked'
  ipSearch: string
}

interface DashboardFiltersProps {
  filters: FilterValues
  onChange: (filters: FilterValues) => void
  availableAgents: string[]
}

const AGENT_COLORS: Record<string, string> = {
  build: '#6366f1',
  plan: '#8b5cf6',
  explore: '#06b6d4',
}

export function DashboardFilters({ filters, onChange, availableAgents }: DashboardFiltersProps) {
  const [open, setOpen] = useState(true)

  const set = (patch: Partial<FilterValues>) => onChange({ ...filters, ...patch })

  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--chat-bg)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-[var(--text)] bg-transparent border-0 cursor-pointer"
      >
        <span>筛选条件</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-[var(--text-secondary)]">
          ▼
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 flex flex-wrap gap-4">
              {/* 日期范围 */}
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span>日期</span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => set({ dateFrom: e.target.value })}
                  className="px-2 py-1 rounded border text-xs bg-transparent text-[var(--text)]"
                  style={{ borderColor: 'var(--border)' }}
                />
                <span>—</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => set({ dateTo: e.target.value })}
                  className="px-2 py-1 rounded border text-xs bg-transparent text-[var(--text)]"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              {/* Agent */}
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <span>Agent</span>
                {availableAgents.map(agent => (
                  <button
                    key={agent}
                    onClick={() => {
                      const next = filters.agents.includes(agent)
                        ? filters.agents.filter(a => a !== agent)
                        : [...filters.agents, agent]
                      set({ agents: next.length === availableAgents.length ? [] : next })
                    }}
                    className="px-2 py-1 rounded text-xs border bg-transparent cursor-pointer transition-colors"
                    style={{
                      borderColor: filters.agents.includes(agent) ? AGENT_COLORS[agent] || 'var(--border)' : 'var(--border)',
                      color: filters.agents.includes(agent) ? '#fff' : 'var(--text-secondary)',
                      background: filters.agents.includes(agent) ? AGENT_COLORS[agent] || 'var(--accent)' : 'transparent',
                    }}
                  >
                    {agent}
                  </button>
                ))}
                {filters.agents.length > 0 && filters.agents.length < availableAgents.length && (
                  <button
                    onClick={() => set({ agents: [] })}
                    className="px-2 py-1 rounded text-xs text-[var(--muted-foreground)] bg-transparent border-0 cursor-pointer hover:text-[var(--text)]"
                  >
                    清除
                  </button>
                )}
              </div>

              {/* 满意度 */}
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <span>满意度</span>
                {(['all', 'liked', 'disliked'] as const).map(val => (
                  <button
                    key={val}
                    onClick={() => set({ satisfaction: val })}
                    className="px-2 py-1 rounded text-xs border bg-transparent cursor-pointer transition-colors"
                    style={{
                      borderColor: filters.satisfaction === val ? (val === 'liked' ? '#22c55e' : val === 'disliked' ? '#ef4444' : 'var(--border)') : 'var(--border)',
                      color: filters.satisfaction === val ? '#fff' : 'var(--text-secondary)',
                      background: filters.satisfaction === val ? (val === 'liked' ? '#22c55e' : val === 'disliked' ? '#ef4444' : 'var(--accent)') : 'transparent',
                    }}
                  >
                    {val === 'all' ? '全部' : val === 'liked' ? '👍 赞' : '👎 踩'}
                  </button>
                ))}
              </div>

              {/* IP 搜索 */}
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <span>IP</span>
                <input
                  type="text"
                  placeholder="搜索 IP..."
                  value={filters.ipSearch}
                  onChange={e => set({ ipSearch: e.target.value })}
                  className="px-2 py-1 rounded border text-xs bg-transparent text-[var(--text)] w-28"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
