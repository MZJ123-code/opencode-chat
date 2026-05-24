import { cn } from '@/lib/utils'

/**
 * 骨架屏加载占位组件
 * @param props - 组件属性
 * @param props.width - 宽度（默认 100%）
 * @param props.height - 高度（默认 60px）
 * @param props.count - 重复数量（默认 3）
 * @param props.className - 额外的 CSS 类名
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
          className={cn('rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse mb-2', className)}
          style={{ width, height, minHeight: height }}
        />
      ))}
    </>
  )
}
