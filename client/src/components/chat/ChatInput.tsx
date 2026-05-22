import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import styles from './ChatInput.module.css'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
  isStreaming?: boolean
}

export function ChatInput({ value, onChange, onSend, disabled, isStreaming }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isComposing, setIsComposing] = useState(false)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [value])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing && !isStreaming) {
      e.preventDefault()
      onSend()
    }
  }

  const inputDisabled = disabled || isStreaming

  return (
    <div className={styles.container}>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder={isStreaming ? 'AI 回复中...' : '输入你的问题...'}
        rows={1}
        disabled={inputDisabled}
      />
      <button
        className={styles.sendBtn}
        onClick={onSend}
        disabled={inputDisabled || !value.trim()}
      >
        {isStreaming ? '...' : '发送'}
      </button>
    </div>
  )
}
