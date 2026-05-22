import { cn } from '@/lib/utils'

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
          className={cn('rounded-lg bg-slate-200 animate-pulse mb-2', className)}
          style={{ width, height, minHeight: height }}
        />
      ))}
    </>
  )
}
