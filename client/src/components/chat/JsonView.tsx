import { useState, useCallback, memo } from 'react'
import { cn } from '@/lib/utils'

function formatJson(raw: unknown, indent = 2): string {
  try {
    return JSON.stringify(raw, null, indent)
  } catch {
    return String(raw)
  }
}

function highlightJson(text: string): string {
  return text
    .replace(/(&)/g, '&amp;')
    .replace(/(<)/g, '&lt;')
    .replace(/(>)/g, '&gt;')
    .replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="json-key">$1</span>:')
    .replace(/:(\s*)("(?:[^"\\]|\\.)*")/g, ':<span class="json-str">$1$2</span>')
    .replace(/:\s*(-?\d+\.?\d*(?:e[+-]?\d+)?)/gi, ': <span class="json-num">$1</span>')
    .replace(/:\s*(true|false)/gi, ': <span class="json-bool">$1</span>')
    .replace(/:\s*(null)/gi, ': <span class="json-null">$1</span>')
}

interface JsonViewProps {
  data: Record<string, unknown> | string
  collapsible?: boolean
  maxHeight?: number
}

/**
 * JSON 查看器组件（已记忆化）
 * @param props - 组件属性
 * @param props.data - JSON 数据对象或字符串
 * @param props.collapsible - 是否可折叠（未使用，保留向后兼容）
 * @param props.maxHeight - 最大高度（默认 200px）
 */
export const JsonView = memo(function JsonView({ data, maxHeight = 200 }: JsonViewProps) {
  const [collapsed, setCollapsed] = useState(false)
  const raw = typeof data === 'string' ? data : formatJson(data)
  const html = highlightJson(raw)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(raw)
  }, [raw])

  return (
    <div className="relative group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[var(--muted-foreground)] font-medium">输入参数</span>
        <div className="flex gap-1">
          {maxHeight > 0 && raw.length > 200 && (
            <button
              className="text-[11px] px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] cursor-pointer hover:bg-[var(--accent)] leading-normal"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? '展开' : '折叠'}
            </button>
          )}
          <button
            className="text-[11px] px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] cursor-pointer hover:bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity leading-normal"
            onClick={handleCopy}
          >
            复制
          </button>
        </div>
      </div>
      <pre
        className={cn(
          'm-0 p-2 bg-[var(--muted)] rounded-md text-xs font-mono leading-relaxed overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all border border-[var(--border)]',
          collapsed ? 'max-h-10 overflow-hidden' : '',
        )}
        style={!collapsed && maxHeight ? { maxHeight } : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
})
