import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
}

/**
 * 聊天输入框组件（已记忆化）
 * @param props - 组件属性
 * @param props.value - 输入框值
 * @param props.onChange - 值变化回调
 * @param props.onSend - 发送消息回调
 * @param props.disabled - 是否禁用
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
    <div className="px-5 py-4 border-t border-[var(--border)]" style={{ 
      background: 'var(--chat-bg)',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
    }}>
      <div className={`flex items-end gap-3 p-2 rounded-2xl border transition-all duration-300 ${
        isFocused 
          ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' 
          : 'border-[var(--border)]'
      }`} style={{ background: 'var(--input-bg)' }}>
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
          className={`h-10 px-5 rounded-xl font-medium transition-all duration-300 ${
            value.trim() && !disabled
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5'
              : 'bg-[var(--secondary)] text-[var(--text-secondary)]'
          }`}
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
