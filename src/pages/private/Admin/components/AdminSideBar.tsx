import { useTranslation } from 'react-i18next'
import type { SidebarNavItem } from '../../../../components/Sidebar'
import ROUTER from '../../../../router/ROUTER'
import { LayoutDashboard, Users, FileText, Key, Activity, CreditCard, ReceiptText, Bot, Wallet, Settings } from 'lucide-react'

export const getAdminSidebarConfig = (): SidebarNavItem[] => {
  return [
    { label: 'Overview', path: ROUTER.ADMIN_DASHBOARD, icon: <LayoutDashboard size={18} /> },
    { label: 'Users', path: ROUTER.ADMIN_USERS, icon: <Users size={18} /> },
    { label: 'API Key', path: ROUTER.ADMIN_API_KEY, icon: <Key size={18} /> },
    { label: 'Pricing', path: ROUTER.ADMIN_SHOP, icon: <CreditCard size={18} /> },
    { label: 'Billing', path: ROUTER.ADMIN_BILLING_TRANSACTIONS, icon: <ReceiptText size={18} /> },
    { label: 'AI Spending', path: ROUTER.ADMIN_AI_SPENDING, icon: <Wallet size={18} /> },
    { label: 'Mentor AI Usage', path: ROUTER.ADMIN_MENTOR_AI_USAGE, icon: <Bot size={18} /> },
    { label: 'Audit Logs', path: ROUTER.ADMIN_AUDIT_LOGS, icon: <Activity size={18} /> },
    { label: 'System Runtime Policy', path: ROUTER.ADMIN_SYSTEM_RUNTIME_POLICY, icon: <Settings size={18} /> },
  ]
}

// Hook version for use in React components
export const useAdminSidebarConfig = (): SidebarNavItem[] => {
  const { t } = useTranslation('common')
  return [
    { label: t('sidebar.overview'), path: ROUTER.ADMIN_DASHBOARD, icon: <LayoutDashboard size={18} /> },
    { label: t('sidebar.users'), path: ROUTER.ADMIN_USERS, icon: <Users size={18} /> },
    { label: t('sidebar.apiKey'), path: ROUTER.ADMIN_API_KEY, icon: <Key size={18} /> },
    { label: t('sidebar.shop', { defaultValue: 'Pricing' }), path: ROUTER.ADMIN_SHOP, icon: <CreditCard size={18} /> },
    { label: t('sidebar.billing', { defaultValue: 'Billing' }), path: ROUTER.ADMIN_BILLING_TRANSACTIONS, icon: <ReceiptText size={18} /> },
    { label: t('sidebar.aiSpending', { defaultValue: 'AI Spending' }), path: ROUTER.ADMIN_AI_SPENDING, icon: <Wallet size={18} /> },
    { label: t('sidebar.mentorAiUsage', { defaultValue: 'Mentor AI Usage' }), path: ROUTER.ADMIN_MENTOR_AI_USAGE, icon: <Bot size={18} /> },
    { label: t('sidebar.auditLogs'), path: ROUTER.ADMIN_AUDIT_LOGS, icon: <Activity size={18} /> },
    { label: 'System Runtime Policy', path: ROUTER.ADMIN_SYSTEM_RUNTIME_POLICY, icon: <Settings size={18} /> },
  ]
}
