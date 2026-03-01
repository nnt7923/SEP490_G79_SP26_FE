import React from 'react'
import { LayoutDashboard, BookOpen, TrendingUp, User, Bookmark, Target, FileText } from 'lucide-react'
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
      label: 'My Plans',
      path: ROUTER.MY_PLANS,
      icon: <Bookmark className="w-5 h-5" />,
    },
    {
      label: 'Goals',
      path: ROUTER.GOALS,
      icon: <Target className="w-5 h-5" />,
    },

    {
      label: 'Progress',
      path: ROUTER.PLANS,
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      label: 'My Resources',
      path: ROUTER.MY_RESOURCES,
      icon: <FileText className="w-5 h-5" />,
    },
    {
      label: 'Profile',
      path: ROUTER.PROFILE,
      icon: <User className="w-5 h-5" />,
    },
  ]
}