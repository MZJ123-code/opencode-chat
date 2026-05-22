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
      className="sidebar"
      data-open={isOpen}
      style={{
        width: 'var(--sidebar-width)',
        minWidth: 'var(--sidebar-width)',
        background: 'var(--sidebar-bg)',
        color: '#cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
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
      className="mobile-menu-btn"
      style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: '#fff',
        cursor: 'pointer',
        fontSize: 18,
        marginRight: 8,
      }}
    >
      ☰
    </button>
  )
}
