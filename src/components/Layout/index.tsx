import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './Header'
import Footer from './Footer'
import Sidebar from '../Sidebar'
import type { SidebarNavItem, SidebarAction } from '../Sidebar'
import ROUTER from '../../router/ROUTER'

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
  const location = useLocation()
  const isChatRoute =
    location.pathname === ROUTER.CHAT ||
    location.pathname === ROUTER.MENTOR_CHAT

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
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            className="layout__main flex-1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {children ?? <Outlet />}
          </motion.main>
        </AnimatePresence>
      </div>
      {!isChatRoute && <Footer />}
    </div>
  )
}

export default Layout
