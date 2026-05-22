import type { ReactNode } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'

interface SidebarProps {
  children: ReactNode
  isOpen: boolean
}

export function Sidebar({ children, isOpen }: SidebarProps) {
  const isMobile = useMediaQuery('(max-width: 640px)')

  return (
    <aside
      className="flex flex-col h-screen"
      data-open={isOpen}
      style={{
        width: 'var(--sidebar-width)',
        minWidth: 'var(--sidebar-width)',
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
