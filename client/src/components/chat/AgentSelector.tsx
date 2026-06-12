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
  build: 'from-indigo-600 to-indigo-500',
  plan: 'from-emerald-600 to-emerald-500',
  explore: 'from-amber-600 to-amber-500',
}

const agentIcons: Record<string, string> = {
  build: '⚡',
  plan: '📐',
  explore: '🔍',
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
      delay: i * 0.1,
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
        className="text-lg font-semibold text-[var(--text)] mb-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        选择对话模式
      </motion.div>
      <motion.div
        className="text-sm text-[var(--text-secondary)] mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        选择一个 AI 助手来开始新的对话
      </motion.div>
      <div className="flex flex-wrap justify-center gap-4 px-4">
        {agents.map((opt, i) => {
          const gradient = agentColors[opt.agent] || 'from-indigo-600 to-indigo-500'
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
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="card-spotlight group relative flex flex-col items-start p-5 w-[220px] rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm cursor-pointer text-left transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <motion.div
        className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} text-white text-lg mb-3`}
        whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.4 } }}
      >
        {icon}
      </motion.div>
      <div className="text-sm font-semibold text-[var(--text)] mb-1 relative z-10">
        {label}
      </div>
      <div className="text-xs text-[var(--text-secondary)] leading-relaxed relative z-10">
        {description}
      </div>
      <motion.div
        className="mt-3 text-xs font-medium relative z-10"
        style={{ color: 'var(--primary)' }}
        initial={{ opacity: 0, x: -5 }}
        whileHover={{ opacity: 1, x: 0 }}
      >
        开始对话 →
      </motion.div>
    </motion.button>
  )
}
