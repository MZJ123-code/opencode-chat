import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { createCtx } from '../lib/utils'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const [ThemeContext, useTheme] = createCtx<ThemeContextValue>('useTheme must be used within ThemeProvider')
export { useTheme }

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem('opencode-theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch { /* noop */ }
  return null
}

/**
 * 主题提供者
 * @param props - 组件属性
 * @param props.children - 子组件
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme() || getSystemTheme())

  const toggle = useCallback(() => {
    setTheme((prev: Theme) => {
      const next = prev === 'light' ? 'dark' : 'light'
      try { localStorage.setItem('opencode-theme', next) } catch { /* noop */ }
      return next
    })
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (!getStoredTheme()) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}
