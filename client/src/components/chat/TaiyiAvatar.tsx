import { useState, useCallback, useMemo, useEffect } from 'react'
import Lottie from 'lottie-react'

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
  /** 自定义动画数据 */
  animationData?: Record<string, unknown>
}

/** 每种情绪的背景光晕颜色 */
const moodColors: Record<TaiyiMood, string> = {
  idle: 'rgba(99, 102, 241, 0.2)',
  thinking: 'rgba(245, 158, 11, 0.2)',
  talking: 'rgba(16, 185, 129, 0.2)',
  happy: 'rgba(236, 72, 153, 0.2)',
  surprised: 'rgba(139, 92, 246, 0.2)',
  sleeping: 'rgba(107, 114, 128, 0.2)',
}

/** 动画文件路径映射 */
const ANIMATION_PATHS: Record<TaiyiMood, string> = {
  idle: '/animations/taiyi-idle.json',
  thinking: '/animations/taiyi-thinking.json',
  talking: '/animations/taiyi-idle.json',
  happy: '/animations/taiyi-happy.json',
  surprised: '/animations/taiyi-idle.json',
  sleeping: '/animations/taiyi-idle.json',
}

/**
 * 太乙真人头像组件
 * @param props - 组件属性
 * @param props.mood - 表情状态
 * @param props.size - 尺寸
 * @param props.interactive - 是否启用交互
 * @param props.onClick - 点击回调
 * @param props.animationData - 自定义 Lottie 动画数据
 */
export function TaiyiAvatar({
  mood = 'idle',
  size = 120,
  interactive = true,
  onClick,
  animationData,
}: TaiyiAvatarProps) {
  const [hovered, setHovered] = useState(false)
  const [currentMood, setCurrentMood] = useState(mood)

  const glowColor = moodColors[currentMood]

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

  // 内置的简单 SVG 动画（当没有 Lottie 动画时使用）
  const fallbackSvg = useMemo(() => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="taiyi-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {/* 身体 */}
      <ellipse cx="50" cy="70" rx="25" ry="18" fill="url(#taiyi-gradient)" />
      {/* 头 */}
      <circle cx="50" cy="40" r="20" fill="#fef3c7" />
      {/* 发髻 */}
      <ellipse cx="50" cy="22" rx="12" ry="8" fill="#374151" />
      <circle cx="50" cy="16" r="5" fill="#374151" />
      {/* 眼睛 */}
      <ellipse cx="42" cy="38" rx="3" ry={currentMood === 'happy' ? 1 : 4} fill="#1f2937" />
      <ellipse cx="58" cy="38" rx="3" ry={currentMood === 'happy' ? 1 : 4} fill="#1f2937" />
      {/* 嘴 */}
      {currentMood === 'happy' ? (
        <path d="M 42 50 Q 50 58 58 50" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
      ) : currentMood === 'surprised' ? (
        <circle cx="50" cy="52" r="3" fill="#dc2626" />
      ) : (
        <path d="M 45 50 Q 50 54 55 50" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
      )}
      {/* 腮红 */}
      <circle cx="35" cy="45" r="4" fill="#fca5a5" opacity={currentMood === 'happy' ? 0.6 : 0.3} />
      <circle cx="65" cy="45" r="4" fill="#fca5a5" opacity={currentMood === 'happy' ? 0.6 : 0.3} />
    </svg>
  ), [currentMood])

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

      {/* 动画内容 */}
      <div className="relative z-10 w-full h-full transition-transform duration-200"
        style={{ transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
      >
        {animationData ? (
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={true}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          fallbackSvg
        )}
      </div>

      {/* 悬停提示 */}
      {hovered && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
          style={{ backgroundColor: '#6366f1' }}
        >
          点击互动
        </div>
      )}
    </div>
  )
}
