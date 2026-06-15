import { motion } from 'framer-motion'

const dotVariants = {
  animate: (i: number) => ({
    y: [0, -8, 0],
    scale: [1, 1.3, 1],
    opacity: [0.3, 1, 0.3],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      delay: i * 0.2,
      ease: 'easeInOut' as const,
    },
  }),
}

/** AI 输入指示器 — Sci-Fi 风格 */
export function TypingIndicator() {
  return (
    <div className="flex items-center py-2">
      <div
        className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-md"
        style={{
          background: 'var(--ai-bubble)',
          boxShadow: '0 0 12px var(--ai-glow), 0 0 24px rgba(0, 240, 255, 0.04)',
          border: '1px solid rgba(0, 240, 255, 0.1)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            custom={i}
            variants={dotVariants}
            animate="animate"
            className="inline-block w-2 h-2 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #00f0ff, #0077ff)',
              boxShadow: '0 0 8px rgba(0, 240, 255, 0.5), 0 0 16px rgba(0, 240, 255, 0.2)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
