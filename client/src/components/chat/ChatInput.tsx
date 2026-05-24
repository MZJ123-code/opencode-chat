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
    <div className="flex items-end gap-2 px-4 py-3 border-t border-[var(--border)]" style={{ background: 'var(--chat-bg)' }}>
      <textarea
        ref={textareaRef}
        className="flex-1 resize-none rounded-lg border bg-[var(--input-bg)] px-3 py-2 text-sm outline-none disabled:opacity-50 placeholder:text-[var(--text-secondary)] text-[var(--text)] transition-shadow duration-300 border-[var(--border)] focus:border-transparent focus:ring-2 focus:ring-indigo-400/30 focus:shadow-[0_0_16px_rgba(99,102,241,0.15)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder={'输入你的问题... (Enter 发送, Shift+Enter 换行, Esc 退出)'}
        rows={1}
        disabled={disabled}
        style={{ maxHeight: 120 }}
      />
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
})
