import { useTranslation } from 'react-i18next'
import type { SidebarNavItem } from '../../../../components/Sidebar'

export const getStudentSidebarConfig = (): SidebarNavItem[] => {
  // Note: We can't use hooks directly in non-component functions,
  // so we keep the labels as translation keys and translate in the component
  return [
    {
      label: 'Overview',
      path: '/dashboard',
      icon: '[ovw]',
    },
    {
      label: 'My Plans',
      path: '/my-plans',
      icon: '[pln]',
    },
    {
      label: 'Goals',
      path: '/goals',
      icon: '[gol]',
    },
    {
      label: 'Progress',
      path: '/plans',
      icon: '[prg]',
    },
    {
      label: 'Resources',
      path: '/my-resources',
      icon: '[res]',
    },
    {
      label: 'Profile',
      path: '/profile',
      icon: '[usr]',
    },
  ]
}

// Hook version for use in React components
export const useStudentSidebarConfig = (): SidebarNavItem[] => {
  const { t } = useTranslation('common')
  return [
    { label: t('sidebar.overview'), path: '/dashboard', icon: '[ovw]' },
    { label: t('sidebar.myPlans'), path: '/my-plans', icon: '[pln]' },
    { label: t('sidebar.goals'), path: '/goals', icon: '[gol]' },
    { label: t('sidebar.progress'), path: '/plans', icon: '[prg]' },
    { label: t('sidebar.resources'), path: '/my-resources', icon: '[res]' },
    { label: t('sidebar.profile'), path: '/profile', icon: '[usr]' },
  ]
}