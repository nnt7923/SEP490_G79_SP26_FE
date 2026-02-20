import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import Sidebar from '../Sidebar'
import type { SidebarNavItem, SidebarAction } from '../Sidebar'

interface LayoutProps {
  children?: React.ReactNode
  sidebar?: {
    navItems: SidebarNavItem[]
    actions?: SidebarAction[]
    brand?: {
      icon?: React.ReactNode
      name?: string
      subtitle?: string
    }
  }
}

const Layout: React.FC<LayoutProps> = ({ children, sidebar }) => {
  return (
    <div className="layout">
      <Header />
      <div className="flex min-h-[calc(100vh-64px)]">
        {sidebar && (
          <Sidebar
            navItems={sidebar.navItems}
            actions={sidebar.actions}
            brand={sidebar.brand}
          />
        )}
        <main className="layout__main flex-1">
          {children ?? <Outlet />}
        </main>
      </div>
      <Footer />
    </div>
  )
}

export default Layout