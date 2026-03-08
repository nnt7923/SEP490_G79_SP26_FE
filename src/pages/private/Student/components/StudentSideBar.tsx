import type { SidebarNavItem } from '../../../../components/Sidebar'

export const getStudentSidebarConfig = (): SidebarNavItem[] => {
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