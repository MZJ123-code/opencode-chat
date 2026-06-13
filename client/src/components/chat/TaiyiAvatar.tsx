import { useState, useCallback, useEffect } from 'react'
import { motion, type Variants } from 'framer-motion'

/** 太乙真人表情状态 */
export type TaiyiMood = 'idle' | 'thinking' | 'talking' | 'happy' | 'surprised' | 'sleeping'

interface TaiyiAvatarProps {
  /** 当前表情状态 */
  mood?: TaiyiMood
  /** 尺寸（默认 120） */
  size?: number
  /** 是否启用交互效果 */
  interactive?: boolean
  /** 点击回调 */
  onClick?: () => void
}

/** 每种情绪的背景光晕颜色 */
const moodColors: Record<TaiyiMood, string> = {
  idle: 'rgba(99, 102, 241, 0.25)',
  thinking: 'rgba(245, 158, 11, 0.25)',
  talking: 'rgba(16, 185, 129, 0.25)',
  happy: 'rgba(236, 72, 153, 0.25)',
  surprised: 'rgba(139, 92, 246, 0.25)',
  sleeping: 'rgba(107, 114, 128, 0.25)',
}

/** 头部晃动动画 */
const headVariants: Variants = {
  idle: { y: [0, -3, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
  thinking: { rotate: [-5, 5, -5], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
  talking: { y: [0, -2, 0], transition: { duration: 1.5, repeat: Infinity } },
  happy: { y: [0, -6, 0], transition: { duration: 0.6, repeat: Infinity } },
  surprised: { y: -5 },
  sleeping: { rotate: 10, y: 3 },
}

/** 拂尘动画 */
const whiskVariants: Variants = {
  idle: { rotate: 0 },
  thinking: { rotate: [-5, 5, -5], transition: { duration: 2, repeat: Infinity } },
  talking: { rotate: [-10, 10, -10], transition: { duration: 0.8, repeat: Infinity } },
  happy: { rotate: [-15, 15, -15], transition: { duration: 0.5, repeat: Infinity } },
  surprised: { rotate: 10 },
  sleeping: { rotate: 15 },
}

/**
 * 太乙真人头像组件
 * @param props - 组件属性
 * @param props.mood - 表情状态
 * @param props.size - 尺寸
 * @param props.interactive - 是否启用交互
 * @param props.onClick - 点击回调
 */
export function TaiyiAvatar({
  mood = 'idle',
  size = 120,
  interactive = true,
  onClick,
}: TaiyiAvatarProps) {
  const [hovered, setHovered] = useState(false)
  const [currentMood, setCurrentMood] = useState(mood)

  const glowColor = moodColors[currentMood]

  useEffect(() => {
    setCurrentMood(mood)
  }, [mood])

  const handleMouseEnter = useCallback(() => {
    if (!interactive) return
    setHovered(true)
    if (currentMood === 'idle') {
      setCurrentMood('happy')
    }
  }, [interactive, currentMood])

  const handleMouseLeave = useCallback(() => {
    if (!interactive) return
    setHovered(false)
    if (currentMood === 'happy') {
      setCurrentMood('idle')
    }
  }, [interactive, currentMood])

  const handleClick = useCallback(() => {
    if (!interactive) return
    const moods: TaiyiMood[] = ['thinking', 'surprised', 'happy']
    const randomMood = moods[Math.floor(Math.random() * moods.length)]
    setCurrentMood(randomMood)
    setTimeout(() => setCurrentMood('idle'), 2000)
    onClick?.()
  }, [interactive, onClick])

  const isHappy = currentMood === 'happy'
  const isSleeping = currentMood === 'sleeping'

  return (
    <div
      className="relative inline-flex items-center justify-center cursor-pointer select-none"
      style={{ width: size, height: size }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* 背景光晕 */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-300"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          transform: hovered ? 'scale(1.2)' : 'scale(1)',
          opacity: hovered ? 0.8 : 0.5,
        }}
      />

      {/* SVG 角色 */}
      <motion.svg
        viewBox="0 0 120 130"
        className="relative z-10 w-full h-full"
        animate={hovered ? { scale: 1.05 } : { scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
        </defs>

        {/* 拂尘 */}
        <motion.g
          style={{ transformOrigin: '20px 70px' }}
          variants={whiskVariants}
          animate={currentMood}
        >
          <line x1="20" y1="70" x2="5" y2="40" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="5" cy="38" r="3" fill="#e5e7eb" />
          <path d="M 2 35 Q 5 30 8 35" stroke="#d1d5db" strokeWidth="1" fill="none" />
        </motion.g>

        {/* 身体（道袍） */}
        <ellipse cx="60" cy="105" rx="32" ry="22" fill="url(#bodyGrad)" />
        <circle cx="60" cy="100" r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

        {/* 头部 */}
        <motion.g
          variants={headVariants}
          animate={currentMood}
          style={{ transformOrigin: '60px 55px' }}
        >
          <ellipse cx="60" cy="55" rx="26" ry="28" fill="url(#faceGrad)" />

          {/* 头发/发髻 */}
          <ellipse cx="60" cy="32" rx="18" ry="12" fill="url(#hairGrad)" />
          <circle cx="60" cy="22" r="7" fill="url(#hairGrad)" />

          {/* 发簪 */}
          <rect x="52" y="18" width="16" height="2.5" rx="1" fill="#d97706" />
          <circle cx="52" cy="19.25" r="1.5" fill="#fbbf24" />
          <circle cx="68" cy="19.25" r="1.5" fill="#fbbf24" />

          {/* 眉毛 */}
          <ellipse cx="48" cy="48" rx="4" ry="1.5" fill="#374151" />
          <ellipse cx="72" cy="48" rx="4" ry="1.5" fill="#374151" />

          {/* 眼睛 */}
          <ellipse cx="48" cy="53" rx="3.5" ry={isHappy ? 1.5 : 4.5} fill="#1f2937" />
          <ellipse cx="72" cy="53" rx="3.5" ry={isHappy ? 1.5 : 4.5} fill="#1f2937" />
          {/* 眼睛高光 */}
          {!isSleeping && (
            <>
              <circle cx="50" cy="51" r="1.2" fill="white" />
              <circle cx="74" cy="51" r="1.2" fill="white" />
            </>
          )}

          {/* 鼻子 */}
          <ellipse cx="60" cy="60" rx="2.5" ry="3" fill="#f59e0b" opacity="0.5" />

          {/* 嘴巴 */}
          <motion.path
            d={isHappy ? 'M 50 70 Q 60 80 70 70' : 'M 52 70 Q 60 75 68 70'}
            fill="none"
            stroke="#dc2626"
            strokeWidth="2"
            strokeLinecap="round"
            animate={currentMood === 'talking' ? {
              d: ['M 52 70 Q 60 75 68 70', 'M 52 70 Q 60 72 68 70', 'M 52 70 Q 60 75 68 70']
            } : undefined}
            transition={{ duration: 0.6, repeat: currentMood === 'talking' ? Infinity : 0 }}
          />

          {/* 胡须 */}
          <motion.g
            animate={currentMood === 'talking' ? { y: [0, 2, 0] } : { y: 0 }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            <path d="M 46 68 Q 40 75 35 72" stroke="#9ca3af" strokeWidth="1.2" fill="none" />
            <path d="M 74 68 Q 80 75 85 72" stroke="#9ca3af" strokeWidth="1.2" fill="none" />
          </motion.g>

          {/* 腮红 */}
          <circle cx="38" cy="62" r="4" fill="#fca5a5" opacity={isHappy ? 0.6 : 0.3} />
          <circle cx="82" cy="62" r="4" fill="#fca5a5" opacity={isHappy ? 0.6 : 0.3} />

          {/* 睡眠 Zzz */}
          {isSleeping && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0], y: -15 }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <text x="75" y="40" fontSize="10" fill="#6b7280" fontWeight="bold">Z</text>
              <text x="82" y="32" fontSize="8" fill="#9ca3af" fontWeight="bold">z</text>
              <text x="87" y="25" fontSize="6" fill="#d1d5db" fontWeight="bold">z</text>
            </motion.g>
          )}
        </motion.g>
      </motion.svg>

      {/* 悬停提示 */}
      {hovered && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
          style={{ backgroundColor: '#6366f1' }}
        >
          点击互动
        </div>
      )}
    </div>
  )
}
