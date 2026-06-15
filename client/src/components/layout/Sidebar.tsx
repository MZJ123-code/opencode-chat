import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMediaQuery } from '../../hooks/useMediaQuery'

const MIN_WIDTH = 200
const MAX_WIDTH = 500
const DEFAULT_WIDTH = 280

interface SidebarProps {
  children: ReactNode
  isOpen: boolean
}

/**
 * 侧边栏布局组件 — Sci-Fi 风格
 */
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

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.aside
              className="flex flex-col h-screen fixed top-0 left-0 z-50 overflow-hidden scan-overlay"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                width: DEFAULT_WIDTH,
                background: 'var(--sidebar-bg)',
                color: '#c0d8f0',
                boxShadow: '4px 0 30px rgba(0, 240, 255, 0.06)',
              }}
            >
              {children}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    )
  }

  return (
    <motion.aside
      className="flex flex-col h-screen relative scan-overlay grid-bg"
      style={{
        width,
        minWidth: MIN_WIDTH,
        background: 'var(--sidebar-bg)',
        color: '#c0d8f0',
        boxShadow: '4px 0 30px rgba(0, 240, 255, 0.04)',
      }}
      animate={{ width }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
    >
      {children}
      {/* 拖拽手柄 — 霓虹线 */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize transition-all duration-300 z-10"
        style={{
          background: 'rgba(0, 240, 255, 0.1)',
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 240, 255, 0.3)'
          e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 240, 255, 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </motion.aside>
  )
}

/**
 * 移动端菜单按钮
 */
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mobile-menu-btn hidden max-sm:inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--chat-bg)] cursor-pointer text-base mr-2 transition-all duration-200"
      style={{
        border: '1px solid rgba(0, 240, 255, 0.2)',
        color: 'rgba(0, 240, 255, 0.8)',
      }}
    >
      ☰
    </button>
  )
}
