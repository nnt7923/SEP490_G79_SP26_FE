import React from 'react'
import type { SidebarNavItem } from '../../../../components/Sidebar'
import ROUTER from '../../../../router/ROUTER'

// We omit 'icon' since the terminal sidebar doesn't use it anymore
type AdminNavItem = Omit<SidebarNavItem, 'icon'> & { icon?: React.ReactNode }

export const getAdminSidebarConfig = (): AdminNavItem[] => {
  return [
    {
      label: '[ovw] Overview',
      path: ROUTER.ADMIN_DASHBOARD,
    },
    {
      label: '[usr] Users',
      path: ROUTER.ADMIN_USERS,
    },
    {
      label: '[rpt] Reports',
      path: '/admin/reports',
    },
    {
      label: '[api] API Key',
      path: ROUTER.ADMIN_API_KEY,
    },
  ]
}
