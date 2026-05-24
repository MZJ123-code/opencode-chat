import { createContext, useContext, type Context } from 'react'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSS 类名合并工具
 * @param inputs - 类名或条件类名
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 创建类型安全的 Context + Hook，消除重复样板代码
 * @example
 * const [Ctx, useMyCtx] = createCtx<MyType>('useMyCtx must be used within MyProvider')
 */
export function createCtx<T>(errorMessage: string): [Context<T | null>, () => T] {
  const Ctx = createContext<T | null>(null)
  function useCtx(): T {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error(errorMessage)
    return ctx
  }
  return [Ctx, useCtx]
}

/**
 * 日期格式化
 */
export function formatDate(timestamp: number, locale = 'zh-CN'): string {
  return new Date(timestamp).toLocaleDateString(locale)
}

/**
 * HTML 转义
 */
export function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
