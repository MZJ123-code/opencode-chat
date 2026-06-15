import { cn } from '@/lib/utils'

/**
 * 骨架屏加载占位组件 — Sci-Fi 风格
 */
export function Skeleton({ width = '100%', height = 60, count = 3, className }: {
  width?: string | number
  height?: number
  count?: number
  className?: string
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn('rounded-lg animate-pulse mb-2', className)}
          style={{
            width,
            height,
            minHeight: height,
            background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.04) 25%, rgba(0, 240, 255, 0.08) 50%, rgba(0, 240, 255, 0.04) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s ease-in-out infinite',
            border: '1px solid rgba(0, 240, 255, 0.06)',
          }}
        />
      ))}
    </>
  )
}
