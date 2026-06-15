import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
}

/**
 * 聊天输入框组件 — Sci-Fi 风格
 */
export const ChatInput = memo(function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isComposing, setIsComposing] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [value])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing && !disabled) {
      e.preventDefault()
      onSend()
    }
    if (e.key === 'Escape') {
      e.currentTarget.blur()
    }
  }, [isComposing, disabled, onSend])

  return (
    <div className="px-5 py-4" style={{
      background: 'var(--chat-bg)',
      borderTop: '1px solid rgba(0, 240, 255, 0.08)',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
    }}>
      <div
        className={`flex items-end gap-3 p-2 rounded-2xl transition-all duration-300 ${
          isFocused ? '' : ''
        }`}
        style={{
          background: 'var(--input-bg)',
          border: isFocused
            ? '1px solid rgba(0, 240, 255, 0.4)'
            : '1px solid var(--border)',
          boxShadow: isFocused
            ? '0 0 15px rgba(0, 240, 255, 0.1), 0 0 30px rgba(0, 240, 255, 0.04), inset 0 0 15px rgba(0, 240, 255, 0.03)'
            : 'none',
        }}
      >
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none disabled:opacity-50 placeholder:text-[var(--text-secondary)] text-[var(--text)] transition-all duration-300"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={'输入你的问题... (Enter 发送, Shift+Enter 换行)'}
          rows={1}
          disabled={disabled}
          style={{ maxHeight: 120 }}
        />
        <Button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          size="default"
          className="h-10 px-5 rounded-xl font-medium transition-all duration-300"
          style={
            value.trim() && !disabled
              ? {
                  background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 50%, #023e8a 100%)',
                  color: 'white',
                  boxShadow: '0 0 15px rgba(0, 240, 255, 0.25), 0 4px 12px rgba(0, 119, 182, 0.3)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                }
              : {
                  background: 'var(--secondary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }
          }
          onMouseEnter={(e) => {
            if (value.trim() && !disabled) {
              e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 240, 255, 0.35), 0 4px 16px rgba(0, 119, 182, 0.4)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }
          }}
          onMouseLeave={(e) => {
            if (value.trim() && !disabled) {
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.25), 0 4px 12px rgba(0, 119, 182, 0.3)'
              e.currentTarget.style.transform = 'translateY(0)'
            }
          }}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            发送
          </span>
        </Button>
      </div>
    </div>
  )
})
