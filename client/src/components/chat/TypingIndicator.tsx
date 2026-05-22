export function TypingIndicator() {
  return (
    <div className="flex items-center py-2">
      <div className="flex items-center gap-1 bg-[var(--ai-bubble)] px-4 py-3 rounded-2xl rounded-bl-md">
        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
