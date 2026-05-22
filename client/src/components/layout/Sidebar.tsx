import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'

const MIN_WIDTH = 200
const MAX_WIDTH = 500
const DEFAULT_WIDTH = 280

interface SidebarProps {
  children: ReactNode
  isOpen: boolean
}

export function Sidebar({ children, isOpen }: SidebarProps) {
  const isMobile = useMediaQuery('(max-width: 640px)')
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return
    const delta = e.clientX - startX.current
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
    setWidth(newWidth)
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  return (
    <aside
      className="flex flex-col h-screen relative"
      data-open={isOpen}
      style={{
        width,
        minWidth: MIN_WIDTH,
        background: 'var(--sidebar-bg)',
        color: '#cbd5e1',
        ...(isMobile
          ? {
              display: isOpen ? 'flex' : 'none',
              position: 'fixed' as const,
              zIndex: 50,
              top: 0,
              left: 0,
              height: '100vh',
            }
          : {}),
      }}
    >
      {children}
      {!isMobile && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-500/50 transition-colors"
          onMouseDown={handleMouseDown}
        />
      )}
    </aside>
  )
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mobile-menu-btn hidden max-sm:inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-white cursor-pointer text-lg mr-2"
    >
      ☰
    </button>
  )
}
