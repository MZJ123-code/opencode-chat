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

const agentColors: Record<string, string> = {
  knowledge: 'from-emerald-500 to-teal-600',
  build: 'from-indigo-500 to-violet-600',
  plan: 'from-amber-500 to-orange-600',
  explore: 'from-rose-500 to-pink-600',
}

const agentIcons: Record<string, string> = {
  knowledge: '📚',
  build: '⚡',
  plan: '📐',
  explore: '🔍',
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
 * AI Agent 选择器组件（已记忆化）
 * @param props - 组件属性
 * @param props.agents - Agent 选项列表
 * @param props.loading - 是否加载中
 * @param props.onSelect - 选择 Agent 回调
 * @param props.creating - 是否正在创建会话
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
        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-6"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <span className="text-4xl">✨</span>
      </motion.div>
      <motion.div
        className="text-2xl font-bold text-[var(--text)] mb-2"
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
          const gradient = agentColors[opt.agent] || 'from-indigo-500 to-violet-600'
          const icon = agentIcons[opt.agent] || '🤖'
          return (
            <SpotlightCard
              key={opt.agent}
              index={i}
              gradient={gradient}
              icon={icon}
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

function SpotlightCard({
  index,
  gradient,
  icon,
  label,
  description,
  disabled,
  onClick,
}: {
  index: number
  gradient: string
  icon: string
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
      className="card-spotlight group relative flex flex-col items-start p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] cursor-pointer text-left transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:border-transparent"
      style={{
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      }}
    >
      <motion.div
        className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} text-white text-2xl mb-4 shadow-lg`}
        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
        transition={{ duration: 0.4 }}
      >
        {icon}
      </motion.div>
      <div className="text-base font-bold text-[var(--text)] mb-2 relative z-10">
        {label}
      </div>
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed relative z-10">
        {description}
      </div>
      <motion.div
        className="mt-4 text-sm font-semibold relative z-10 flex items-center gap-1.5"
        style={{ color: 'var(--primary)' }}
        initial={{ opacity: 0, x: -10 }}
        whileHover={{ opacity: 1, x: 0 }}
      >
        开始对话
        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </motion.div>
    </motion.button>
  )
}
