interface EmptyStateProps {
  hasSession: boolean
}

export function EmptyState({ hasSession }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4">💬</div>
      <div className="text-base font-medium text-[var(--text)]">
        {hasSession ? '开始提问吧' : '开始新的对话'}
      </div>
      {!hasSession && (
        <div className="text-sm text-[var(--text-secondary)] mt-2">
          点击左侧 "+ 新建对话" 开始咨询
        </div>
      )}
    </div>
  )
}
