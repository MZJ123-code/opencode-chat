import { motion } from 'framer-motion'

const dotVariants = {
  animate: (i: number) => ({
    y: [0, -8, 0],
    scale: [1, 1.2, 1],
    opacity: [0.4, 1, 0.4],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      delay: i * 0.2,
      ease: 'easeInOut' as const,
    },
  }),
}

/** AI 输入指示器（打字动画） */
export function TypingIndicator() {
  return (
    <div className="flex items-center py-2">
      <div
        className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-md"
        style={{
          background: 'var(--ai-bubble)',
          boxShadow: '0 0 12px var(--ai-glow)',
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
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 0 6px rgba(99, 102, 241, 0.5)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
