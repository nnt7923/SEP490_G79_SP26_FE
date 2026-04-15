import { useTranslation } from 'react-i18next'
import type { SidebarNavItem } from '../../../../components/Sidebar'
import { LayoutDashboard, Map, Target, TrendingUp, Library, User, MessageSquare, Crown, Trophy, History } from 'lucide-react'
import useChatUnreadBadge from '../../../../hooks/useChatUnreadBadge'
import useChatStore from '../../../../store/useChatStore'

export const getStudentSidebarConfig = (): SidebarNavItem[] => {
  // Note: We can't use hooks directly in non-component functions,
  // so we keep the labels as translation keys and translate in the component
  return [
    {
      label: 'Overview',
      path: '/dashboard',
      icon: <LayoutDashboard size={18} />,
    },
    {
      label: 'My Plans',
      path: '/my-plans',
      icon: <Map size={18} />,
    },
    {
      label: 'Goals',
      path: '/goals',
      icon: <Target size={18} />,
    },
    {
      label: 'Generate Path',
      path: '/plans',
      icon: <TrendingUp size={18} />,
    },
    {
      label: 'Resources',
      path: '/my-resources',
      icon: <Library size={18} />,
    },
    {
      label: 'Achievements',
      path: '/achievements',
      icon: <Trophy size={18} />,
    },
    {
      label: 'Profile',
      path: '/profile',
      icon: <User size={18} />,
    },
    {
      label: 'Focus Session History',
      path: '/focus-session/history',
      icon: <History size={18} />,
    },
    {
      label: 'Chat',
      path: '/chat',
      icon: <MessageSquare size={18} />,
    },
    {
      label: 'Upgrade',
      path: '/subscription',
      icon: <Crown size={18} className="text-yellow-500" />,
    },
  ]
}

// Hook version for use in React components
export const useStudentSidebarConfig = (): SidebarNavItem[] => {
  const { t } = useTranslation('common')
  useChatUnreadBadge()
  const globalUnreadCount = useChatStore((state) => state.globalUnreadCount)

  return [
    { label: t('sidebar.overview'), path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: t('sidebar.myPlans'), path: '/my-plans', icon: <Map size={18} /> },
    { label: t('sidebar.goals'), path: '/goals', icon: <Target size={18} /> },
    { label: t('sidebar.progress'), path: '/plans', icon: <TrendingUp size={18} /> },
    { label: t('sidebar.resources'), path: '/my-resources', icon: <Library size={18} /> },
    { label: t('sidebar.achievements', { defaultValue: 'Achievements' }), path: '/achievements', icon: <Trophy size={18} /> },
    { label: t('sidebar.profile'), path: '/profile', icon: <User size={18} /> },
    { label: t('sidebar.focusSessionHistory', { defaultValue: 'Focus Session History' }), path: '/focus-session/history', icon: <History size={18} /> },
    { label: 'Chat', path: '/chat', icon: <MessageSquare size={18} />, badge: globalUnreadCount },
    { label: t('sidebar.upgrade'), path: '/subscription', icon: <Crown size={18} className="text-yellow-500" /> },
  ]
}
