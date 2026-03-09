import React from 'react'
import { useTranslation } from 'react-i18next'
import type { SidebarNavItem } from '../../../../components/Sidebar'
import ROUTER from '../../../../router/ROUTER'

// We omit 'icon' since the terminal sidebar doesn't use it anymore
type AdminNavItem = Omit<SidebarNavItem, 'icon'> & { icon?: React.ReactNode }

export const getAdminSidebarConfig = (): AdminNavItem[] => {
  return [
    { label: '[ovw] Overview', path: ROUTER.ADMIN_DASHBOARD },
    { label: '[usr] Users', path: ROUTER.ADMIN_USERS },
    { label: '[rpt] Reports', path: '/admin/reports' },
    { label: '[api] API Key', path: ROUTER.ADMIN_API_KEY },
  ]
}

// Hook version for use in React components
export const useAdminSidebarConfig = (): AdminNavItem[] => {
  const { t } = useTranslation('common')
  return [
    { label: `[ovw] ${t('sidebar.overview')}`, path: ROUTER.ADMIN_DASHBOARD },
    { label: `[usr] ${t('sidebar.users')}`, path: ROUTER.ADMIN_USERS },
    { label: `[rpt] ${t('sidebar.reports')}`, path: '/admin/reports' },
    { label: `[api] ${t('sidebar.apiKey')}`, path: ROUTER.ADMIN_API_KEY },
  ]
}
