import { LayoutDashboard, BookOpen, TrendingUp, User } from 'lucide-react'
import ROUTER from '../../../../router/ROUTER'
import type { SidebarNavItem } from '../../../../components/Sidebar'

export const getStudentSidebarConfig = (): SidebarNavItem[] => {
  return [
    {
      label: 'Overview',
      path: ROUTER.STUDENT_DASHBOARD,
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: 'Classes',
      path: ROUTER.CLASSES,
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      label: 'Progress',
      path: ROUTER.PLANS,
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      label: 'Profile',
      path: ROUTER.PROFILE,
      icon: <User className="w-5 h-5" />,
    },
  ]
}