import React, { useEffect, useState } from 'react'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
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
  collapsible = true,
  className = '',
}) => {
  const location = useLocation()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false

    try {
      return window.localStorage.getItem('layout:sidebar:collapsed') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem('layout:sidebar:collapsed', String(isCollapsed))
    } catch {
      // Ignore persistence errors for private/incognito contexts.
    }
  }, [isCollapsed])

  const isActive = (path: string) => location.pathname === path
  const closeMobileSidebar = () => setIsMobileOpen(false)
  const sidebarWidth = isMobileOpen ? 256 : isCollapsed ? 64 : 256

  return (
    <>


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
        className={`fixed md:sticky top-0 md:top-[49px] left-0 h-screen md:h-[calc(100vh-49px)] z-30 transition-all duration-300 ease-out overflow-hidden flex flex-col ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${className}`}
        style={{
          width: sidebarWidth,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-base)',
          minWidth: sidebarWidth
        }}
      >
        <div
          style={{
            padding: isCollapsed ? '12px 8px' : '20px 16px 16px',
            borderBottom: '1px solid var(--border-base)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              gap: 12,
            }}
          >
            {(brand?.icon || brand?.name || brand?.subtitle) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  minWidth: 0,
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                }}
              >
                {brand?.icon && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {brand.icon}
                  </span>
                )}
                {!isCollapsed && (brand?.name || brand?.subtitle) && (
                  <div style={{ minWidth: 0 }}>
                    {brand?.name && <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{brand.name}</p>}
                    {brand?.subtitle && <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{brand.subtitle}</p>}
                  </div>
                )}
              </div>
            )}

            {collapsible && (
              <button
                type="button"
                onClick={() => setIsCollapsed((prev) => !prev)}
                className="hidden md:inline-flex"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                style={{
                  width: 34,
                  height: 34,
                  padding: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  border: '1px solid var(--border-base)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginLeft: 'auto',
                }}
              >
                {isCollapsed ? <ChevronsRight size={18} strokeWidth={2.5} /> : <ChevronsLeft size={18} strokeWidth={2.5} />}
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: isCollapsed ? '12px 6px' : '20px 16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menuLabel && !isCollapsed && (
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
                aria-label={item.label}
                title={isCollapsed ? item.label : undefined}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 12, padding: isCollapsed ? '10px 8px' : '10px 12px',
                  borderRadius: 2, textDecoration: 'none', transition: 'all 0.2s',
                  background: active ? 'var(--bg-blue-hover)' : 'transparent',
                  border: `1px solid ${active ? 'var(--accent-primary)' : 'transparent'}`,
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 400,
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}
                onMouseEnter={(e) => {
                  if (!active) { e.currentTarget.style.background = 'var(--bg-main)'; e.currentTarget.style.color = 'var(--text-primary)' }
                }}
                onMouseLeave={(e) => {
                  if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }
                }}
              >
                <span
                  style={{
                    position: 'relative',
                    fontSize: 12,
                    opacity: active ? 1 : 0.7,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 18,
                  }}
                >
                  {item.icon}
                  {item.badge ? (
                    <span
                      style={{
                        minWidth: 16,
                        height: 16,
                        padding: '0 4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'absolute',
                        top: -8,
                        right: -10,
                        background: 'var(--danger-primary)',
                        color: '#fff',
                        borderRadius: 999,
                        fontSize: 9,
                        lineHeight: 1,
                        fontWeight: 700,
                        boxShadow: `0 0 0 2px ${active ? 'var(--bg-blue-hover)' : 'var(--bg-surface)'}`,
                      }}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </span>
                {!isCollapsed && <span style={{ fontSize: 13, flex: 1 }}>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Actions Section */}
        {actions.length > 0 && (
          <div style={{ padding: isCollapsed ? 6 : 16, borderTop: '1px solid var(--border-base)', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => action.onClick?.()}
                  aria-label={action.label}
                  title={isCollapsed ? action.label : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: isCollapsed ? '10px 8px' : '10px 12px',
                    width: '100%', border: '1px solid transparent', borderRadius: 2,
                    background: 'transparent', cursor: 'pointer', transition: 'all 0.2s',
                    color: action.variant === 'danger' ? 'var(--danger-primary)' : 'var(--text-secondary)',
                    fontWeight: 600, textAlign: 'left',
                    justifyContent: isCollapsed ? 'center' : 'flex-start'
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
                  {!isCollapsed && <span style={{ fontSize: 13 }}>{action.label}</span>}
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
