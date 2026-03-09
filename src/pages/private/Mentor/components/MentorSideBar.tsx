import React from 'react'
import { useTranslation } from 'react-i18next'
import ROUTER from '../../../../router/ROUTER'

export type MentorNavItem = {
  label: string
  path: string
  icon?: React.ReactNode
}

export const getMentorSidebarConfig = (): MentorNavItem[] => {
  return [
    { label: '[ovw] Overview', path: ROUTER.MENTOR_DASHBOARD },
    { label: '[sub] Subjects', path: '/mentor/subjects' },
    { label: '[cls] Classes', path: '/mentor/classes' },
    { label: '[std] Students', path: '/mentor/students' },
    { label: '[msg] Messages', path: '/mentor/messages' },
    { label: '[prf] Profile', path: ROUTER.MENTOR_PROFILE },
  ]
}

// Hook version for use in React components
export const useMentorSidebarConfig = (): MentorNavItem[] => {
  const { t } = useTranslation('common')
  return [
    { label: `[ovw] ${t('sidebar.overview')}`, path: ROUTER.MENTOR_DASHBOARD },
    { label: `[sub] ${t('sidebar.subjects')}`, path: '/mentor/subjects' },
    { label: `[cls] ${t('sidebar.classes')}`, path: '/mentor/classes' },
    { label: `[std] ${t('sidebar.students')}`, path: '/mentor/students' },
    { label: `[msg] ${t('sidebar.messages')}`, path: '/mentor/messages' },
    { label: `[prf] ${t('sidebar.profile')}`, path: ROUTER.MENTOR_PROFILE },
  ]
}
