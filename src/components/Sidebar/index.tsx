import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export interface SidebarNavItem {
  label: string
  path: string
  icon?: React.ReactNode
  badge?: number
}

export interface SidebarAction {
  label: string
  icon: React.ReactNode
  onClick?: () => void | Promise<void>
  variant?: 'default' | 'danger'
}

interface SidebarProps {
  navItems: SidebarNavItem[]
  actions?: SidebarAction[]
  brand?: {
    icon?: React.ReactNode
    name?: string
    subtitle?: string
  }
  menuLabel?: string
  collapsible?: boolean
  className?: string
}

const Sidebar: React.FC<SidebarProps> = ({
  navItems,
  actions = [],
  brand,
  menuLabel = 'Main Menu',
  className = '',
}) => {
  const location = useLocation()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const isActive = (path: string) => location.pathname === path
  const closeMobileSidebar = () => setIsMobileOpen(false)

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 40, padding: '10px 14px',
          background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2,
          cursor: 'pointer', fontFamily: 'monospace', fontSize: 13,
          boxShadow: '0 4px 6px var(--shadow-base)'
        }}
        className="md:hidden"
        aria-label="Toggle sidebar"
      >
        {isMobileOpen ? 'Close Menu' : 'Open Menu'}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden"
          style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', zIndex: 30 }}
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative top-0 left-0 h-screen z-30 transition-all duration-300 ease-out overflow-hidden flex flex-col ${className}`}
        style={{
          width: isMobileOpen ? 256 : 'inherit',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-base)',
          minWidth: 256
        }}
      >
        {/* Brand Section */}
        {brand && (
          <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-base)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {(brand.name || brand.subtitle) && (
                <div>
                  {brand.name && <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{brand.name}</p>}
                  {brand.subtitle && <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{brand.subtitle}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ padding: '20px 16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menuLabel && (
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              {menuLabel}
            </p>
          )}

          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileSidebar}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  borderRadius: 2, textDecoration: 'none', transition: 'all 0.2s',
                  background: active ? 'var(--bg-blue-hover)' : 'transparent',
                  border: `1px solid ${active ? 'var(--accent-primary)' : 'transparent'}`,
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 400
                }}
                onMouseEnter={(e) => {
                  if (!active) { e.currentTarget.style.background = 'var(--bg-main)'; e.currentTarget.style.color = 'var(--text-primary)' }
                }}
                onMouseLeave={(e) => {
                  if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }
                }}
              >
                <span style={{ fontSize: 12, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                <span style={{ fontSize: 13, flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{
                    minWidth: 18,
                    height: 18,
                    padding: '0 5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--danger-primary)',
                    color: '#fff',
                    borderRadius: 999,
                    fontSize: 10,
                    lineHeight: 1,
                    fontWeight: 700,
                    boxShadow: '0 0 0 2px var(--bg-surface)',
                  }}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Actions Section */}
        {actions.length > 0 && (
          <div style={{ padding: 16, borderTop: '1px solid var(--border-base)', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => action.onClick?.()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    width: '100%', border: '1px solid transparent', borderRadius: 2,
                    background: 'transparent', cursor: 'pointer', transition: 'all 0.2s',
                    color: action.variant === 'danger' ? 'var(--danger-primary)' : 'var(--text-secondary)',
                    fontWeight: 600, textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = action.variant === 'danger' ? 'var(--bg-red-tint)' : 'var(--bg-main)'
                    e.currentTarget.style.borderColor = action.variant === 'danger' ? 'var(--danger-primary)' : 'var(--border-base)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'transparent'
                  }}
                >
                  <span style={{ fontSize: 13 }}>{action.icon}</span>
                  <span style={{ fontSize: 13 }}>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

export default Sidebar
