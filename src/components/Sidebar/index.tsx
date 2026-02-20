'use client'

import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

export interface SidebarNavItem {
  label: string
  path: string
  icon: React.ReactNode
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
  actionsLabel?: string
  collapsible?: boolean
  className?: string
}

const Sidebar: React.FC<SidebarProps> = ({
  navItems,
  actions = [],
  brand,
  menuLabel = 'Main Menu',
  actionsLabel = 'More',
  collapsible = true,
  className = '',
}) => {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const isActive = (path: string) => location.pathname === path
  const toggleSidebar = () => setIsOpen(!isOpen)
  const closeMobileSidebar = () => setIsMobileOpen(false)

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed md:hidden top-4 left-4 z-40 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
        aria-label="Toggle sidebar"
        aria-expanded={isMobileOpen}
      >
        {isMobileOpen ? (
          <X className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        ) : (
          <Menu className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative
          top-0 left-0 h-screen
          bg-white dark:bg-slate-900
          border-r border-gray-200 dark:border-slate-700
          transition-all duration-300 ease-out
          z-30
          ${isOpen && !isMobileOpen ? 'w-64' : 'w-0 md:w-20'}
          ${isMobileOpen ? 'w-64' : ''}
          overflow-hidden
          ${className}
        `}
      >
        {/* Brand Section */}
        {brand && (
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div className={`flex items-center gap-3 transition-opacity duration-300 ${(isOpen || isMobileOpen) ? 'opacity-100' : 'md:opacity-0 md:hidden'}`}>
                {brand.icon && <div className="flex-shrink-0">{brand.icon}</div>}
                {(brand.name || brand.subtitle) && (
                  <div>
                    {brand.name && <p className="font-semibold text-gray-900 dark:text-white text-sm">{brand.name}</p>}
                    {brand.subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{brand.subtitle}</p>}
                  </div>
                )}
              </div>

              {collapsible && (
                <button
                  onClick={toggleSidebar}
                  className="hidden md:flex p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
                  aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                  <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1">
          {menuLabel && (
            <p className={`text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 transition-opacity duration-300 ${(isOpen || isMobileOpen) ? 'opacity-100' : 'md:opacity-0 md:hidden'}`}>
              {menuLabel}
            </p>
          )}

          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeMobileSidebar}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                dark:focus:ring-offset-slate-900
                min-h-12
                ${isActive(item.path)
                  ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }
              `}
              aria-label={item.label}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className={`flex-1 transition-opacity duration-300 ${(isOpen || isMobileOpen) ? 'opacity-100' : 'md:opacity-0 md:hidden'}`}>
                {item.label}
              </span>
              {item.badge && (isOpen || isMobileOpen) && (
                <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full flex-shrink-0">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Actions Section */}
        {actions.length > 0 && (
          <div className="px-4 py-4 border-t border-gray-200 dark:border-slate-700">
            {actionsLabel && (
              <p className={`text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 transition-opacity duration-300 ${(isOpen || isMobileOpen) ? 'opacity-100' : 'md:opacity-0 md:hidden'}`}>
                {actionsLabel}
              </p>
            )}

            <div className="space-y-2">
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={ () => action.onClick?.()}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-2
                    dark:focus:ring-offset-slate-900
                    min-h-12
                    ${action.variant === 'danger'
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-red-500 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 focus:ring-blue-500'
                    }
                  `}
                  aria-label={action.label}
                >
                  <span className="flex-shrink-0">{action.icon}</span>
                  <span className={`transition-opacity duration-300 ${(isOpen || isMobileOpen) ? 'opacity-100' : 'md:opacity-0 md:hidden'}`}>
                    {action.label}
                  </span>
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
