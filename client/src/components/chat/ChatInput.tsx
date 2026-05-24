import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isComposing, setIsComposing] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [value])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing && !disabled) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="flex items-end gap-2 px-4 py-3 border-t border-[var(--border)]" style={{ background: 'var(--chat-bg)' }}>
      <motion.div
        className="flex-1 relative"
        animate={{
          boxShadow: isFocused
            ? '0 0 0 2px rgba(99, 102, 241, 0.3), 0 0 16px rgba(99, 102, 241, 0.15)'
            : '0 0 0 1px rgba(99, 102, 241, 0)',
        }}
        transition={{ duration: 0.3 }}
        style={{ borderRadius: 'var(--radius)' }}
      >
        <textarea
          ref={textareaRef}
          className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none disabled:opacity-50 placeholder:text-[var(--text-secondary)] text-[var(--text)]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={'输入你的问题...'}
          rows={1}
          disabled={disabled}
          style={{
            maxHeight: 120,
            background: 'var(--input-bg)',
            borderColor: isFocused ? 'transparent' : 'var(--border)',
          }}
        />
      </motion.div>
      <Button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        size="default"
        className="bg-indigo-600 hover:bg-indigo-500 text-white btn-shimmer"
      >
        发送
      </Button>
    </div>
  )
}
