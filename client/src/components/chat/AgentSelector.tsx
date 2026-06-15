import { useRef, useCallback, type MouseEvent, memo } from 'react'
import { motion } from 'framer-motion'
import { Skeleton } from '../common/Skeleton'
import type { AgentOption } from '../../types/api-responses'

interface AgentSelectorProps {
  agents: AgentOption[]
  loading: boolean
  onSelect: (agent: string) => void
  creating: boolean
}

const agentColors: Record<string, { gradient: string; border: string; glow: string; text: string }> = {
  knowledge: { gradient: 'from-cyan-400 to-blue-500', border: 'rgba(0, 240, 255, 0.3)', glow: 'rgba(0, 240, 255, 0.15)', text: '#00f0ff' },
  build: { gradient: 'from-blue-500 to-violet-600', border: 'rgba(0, 119, 255, 0.3)', glow: 'rgba(0, 119, 255, 0.15)', text: '#0077ff' },
  plan: { gradient: 'from-amber-400 to-orange-500', border: 'rgba(245, 158, 11, 0.3)', glow: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
  explore: { gradient: 'from-pink-400 to-rose-500', border: 'rgba(236, 72, 153, 0.3)', glow: 'rgba(236, 72, 153, 0.15)', text: '#ec4899' },
}

/** Agent SVG 图标组件 */
function AgentIcon({ agent, className }: { agent: string; className?: string }) {
  switch (agent) {
    case 'knowledge':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      )
    case 'build':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    case 'plan':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      )
    case 'explore':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <circle cx="11" cy="11" r="3" />
        </svg>
      )
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      )
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 20,
      delay: i * 0.12,
    },
  }),
}

/**
 * AI Agent 选择器组件 — Sci-Fi 全息卡片风格
 */
export const AgentSelector = memo(function AgentSelector({ agents, loading, onSelect, creating }: AgentSelectorProps) {
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
      <motion.div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(0, 119, 255, 0.15) 100%)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          boxShadow: '0 0 25px rgba(0, 240, 255, 0.1), inset 0 0 15px rgba(0, 240, 255, 0.05)',
        }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <span className="text-4xl">✦</span>
      </motion.div>
      <motion.div
        className="text-2xl font-bold text-[var(--text)] mb-2 neon-text-subtle"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        选择对话模式
      </motion.div>
      <motion.div
        className="text-sm text-[var(--text-secondary)] mb-10 max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        选择一个 AI 助手来开始新的对话，每个助手都有独特的专长
      </motion.div>
      <div className="grid grid-cols-2 gap-5 px-6 max-w-2xl w-full">
        {agents.map((opt, i) => {
          const colors = agentColors[opt.agent] || agentColors.build
          return (
              <HolographicCard
                key={opt.agent}
                index={i}
                colors={colors}
                agent={opt.agent}
                label={opt.label}
                description={opt.description}
                disabled={creating}
                onClick={() => onSelect(opt.agent)}
              />
          )
        })}
      </div>
    </div>
  )
})

function HolographicCard({
  index,
  colors,
  agent,
  label,
  description,
  disabled,
  onClick,
}: {
  index: number
  colors: { gradient: string; border: string; glow: string; text: string }
  agent: string
  label: string
  description: string
  disabled: boolean
  onClick: () => void
}) {
  const cardRef = useRef<HTMLButtonElement>(null)

  const handleMouseMove = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    e.currentTarget.style.setProperty('--mouse-x', `${x}%`)
    e.currentTarget.style.setProperty('--mouse-y', `${y}%`)
  }, [])

  return (
    <motion.button
      ref={cardRef}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="card-spotlight group relative flex flex-col items-start p-6 rounded-2xl cursor-pointer text-left transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: 'var(--card)',
        border: `1px solid ${colors.border}`,
        boxShadow: `0 4px 20px rgba(0, 0, 0, 0.08), 0 0 20px ${colors.glow}`,
      }}
    >
      {/* 扫描线装饰 */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0" style={{
          background: `linear-gradient(180deg, transparent 0%, ${colors.glow} 45%, ${colors.glow} 55%, transparent 100%)`,
          animation: 'scan-line 6s linear infinite',
        }} />
      </div>

      <motion.div
        className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.gradient} text-white mb-4`}
        style={{
          boxShadow: `0 4px 15px ${colors.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.15)`,
        }}
        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
        transition={{ duration: 0.4 }}
      >
        <AgentIcon agent={agent} className="w-7 h-7" />
      </motion.div>
      <div className="text-base font-bold text-[var(--text)] mb-2 relative z-10">
        {label}
      </div>
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed relative z-10">
        {description}
      </div>
      <motion.div
        className="mt-4 text-sm font-semibold relative z-10 flex items-center gap-1.5"
        style={{ color: colors.text }}
        initial={{ opacity: 0, x: -10 }}
        whileHover={{ opacity: 1, x: 0 }}
      >
        开始对话
        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </motion.div>

      {/* 底部装饰线 */}
      <div className="absolute bottom-0 left-4 right-4 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
        background: `linear-gradient(90deg, transparent, ${colors.text}, transparent)`,
      }} />
    </motion.button>
  )
}
