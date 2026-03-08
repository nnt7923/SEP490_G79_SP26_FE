import React from 'react'
import ROUTER from '../../../../router/ROUTER'

export type MentorNavItem = {
  label: string
  path: string
  icon?: React.ReactNode
}

export const getMentorSidebarConfig = (): MentorNavItem[] => {
  return [
    {
      label: '[ovw] Overview',
      path: ROUTER.MENTOR_DASHBOARD,
    },
    {
      label: '[sub] Subjects',
      path: '/mentor/subjects',
    },
    {
      label: '[cls] Classes',
      path: '/mentor/classes',
    },
    {
      label: '[std] Students',
      path: '/mentor/students',
    },
    {
      label: '[msg] Messages',
      path: '/mentor/messages',
    },
    {
      label: '[prf] Profile',
      path: ROUTER.MENTOR_PROFILE,
    },
  ]
}
