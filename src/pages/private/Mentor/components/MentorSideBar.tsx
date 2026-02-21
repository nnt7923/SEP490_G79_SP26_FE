import { LayoutDashboard, BookOpen, ClipboardList, MessageSquare, User } from 'lucide-react'
import ROUTER from '../../../../router/ROUTER'
import type { SidebarNavItem } from '../../../../components/Sidebar'

export const getMentorSidebarConfig = (): SidebarNavItem[] => {
  return [
    {
      label: 'Overview',
      path: ROUTER.MENTOR_DASHBOARD,
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: 'Classes',
      path: '/mentor/classes',
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      label: 'Assignments',
      path: '/mentor/assignments',
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      label: 'Messages',
      path: '/mentor/messages',
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      label: 'Profile',
      path: ROUTER.MENTOR_PROFILE,
      icon: <User className="w-5 h-5" />,
    },
  ]
}
