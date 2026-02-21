import { LayoutDashboard, Users, Clipboard, BarChart2, Settings, KeyRound } from 'lucide-react'
import type { SidebarNavItem } from '../../../../components/Sidebar'
import ROUTER from '../../../../router/ROUTER'

export const getAdminSidebarConfig = (): SidebarNavItem[] => {
  return [
    {
      label: 'Overview',
      path: ROUTER.ADMIN_DASHBOARD,
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: 'Users',
      path: ROUTER.ADMIN_USERS,
      icon: <Users className="w-5 h-5" />,
      // badge: 0,
    },
    {
      label: 'Reports',
      path: '/admin/reports',
      icon: <BarChart2 className="w-5 h-5" />,
    },
    {
      label: 'API Key',
      path: ROUTER.ADMIN_API_KEY,
      icon: <KeyRound className="w-5 h-5" />,
    },
    {
      label: 'Settings',
      path: '/admin/settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ]
}
