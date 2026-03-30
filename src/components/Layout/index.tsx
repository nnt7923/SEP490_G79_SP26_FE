import React, { useEffect, useRef, useState } from 'react'
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
  const headerRef = useRef<HTMLDivElement | null>(null)
  const footerRef = useRef<HTMLDivElement | null>(null)
  const [headerHeight, setHeaderHeight] = useState(49)
  const [footerHeight, setFooterHeight] = useState(0)
  const isChatRoute =
    location.pathname === ROUTER.CHAT ||
    location.pathname === ROUTER.MENTOR_CHAT

  useEffect(() => {
    const headerElement = headerRef.current
    const footerElement = footerRef.current

    const syncHeights = () => {
      setHeaderHeight(headerElement?.getBoundingClientRect().height ?? 0)
      setFooterHeight(isChatRoute ? 0 : (footerElement?.getBoundingClientRect().height ?? 0))
    }

    syncHeights()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncHeights)
      return () => window.removeEventListener('resize', syncHeights)
    }

    const observer = new ResizeObserver(() => {
      syncHeights()
    })

    if (headerElement) observer.observe(headerElement)
    if (footerElement && !isChatRoute) observer.observe(footerElement)

    window.addEventListener('resize', syncHeights)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncHeights)
    }
  }, [isChatRoute])

  const layoutVars = {
    '--layout-header-height': `${headerHeight}px`,
    '--layout-footer-height': `${footerHeight}px`,
  } as React.CSSProperties

  return (
    <div className="layout" style={layoutVars}>
      <div ref={headerRef}>
        <Header />
      </div>
      <div
        className="flex flex-1"
        style={{
          minHeight: 'calc(100vh - var(--layout-header-height, 0px) - var(--layout-footer-height, 0px))',
        }}
      >
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
      {!isChatRoute && (
        <div ref={footerRef}>
          <Footer />
        </div>
      )}
    </div>
  )
}

export default Layout
