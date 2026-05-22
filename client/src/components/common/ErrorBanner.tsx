interface ErrorBannerProps {
  message: string | null
  onDismiss: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-red-50 text-red-700 text-sm border-b border-red-100">
      <span>{message}</span>
      <span
        className="ml-4 cursor-pointer font-medium hover:text-red-900 shrink-0"
        onClick={onDismiss}
      >
        关闭
      </span>
    </div>
  )
}
