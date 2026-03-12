import { useTranslation } from 'react-i18next'
import type { SidebarNavItem } from '../../../../components/Sidebar'
import ROUTER from '../../../../router/ROUTER'
import { LayoutDashboard, Users, FileText, Key, Activity } from 'lucide-react'

export const getAdminSidebarConfig = (): SidebarNavItem[] => {
  return [
    { label: 'Overview', path: ROUTER.ADMIN_DASHBOARD, icon: <LayoutDashboard size={18} /> },
    { label: 'Users', path: ROUTER.ADMIN_USERS, icon: <Users size={18} /> },
    { label: 'Reports', path: '/admin/reports', icon: <FileText size={18} /> },
    { label: 'API Key', path: ROUTER.ADMIN_API_KEY, icon: <Key size={18} /> },
    { label: 'Audit Logs', path: ROUTER.ADMIN_AUDIT_LOGS, icon: <Activity size={18} /> },
  ]
}

// Hook version for use in React components
export const useAdminSidebarConfig = (): SidebarNavItem[] => {
  const { t } = useTranslation('common')
  return [
    { label: t('sidebar.overview'), path: ROUTER.ADMIN_DASHBOARD, icon: <LayoutDashboard size={18} /> },
    { label: t('sidebar.users'), path: ROUTER.ADMIN_USERS, icon: <Users size={18} /> },
    { label: t('sidebar.reports'), path: '/admin/reports', icon: <FileText size={18} /> },
    { label: t('sidebar.apiKey'), path: ROUTER.ADMIN_API_KEY, icon: <Key size={18} /> },
    { label: t('sidebar.auditLogs'), path: ROUTER.ADMIN_AUDIT_LOGS, icon: <Activity size={18} /> },
  ]
}
