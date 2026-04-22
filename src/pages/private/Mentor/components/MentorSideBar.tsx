import React from 'react'
import { useTranslation } from 'react-i18next'
import ROUTER from '../../../../router/ROUTER'
import { LayoutDashboard, BookOpen, MessageSquare, User, FolderOpen, Globe } from 'lucide-react'
import useChatUnreadBadge from '../../../../hooks/useChatUnreadBadge'
import useChatStore from '../../../../store/useChatStore'

export type MentorNavItem = {
  label: string
  path: string
  icon?: React.ReactNode
}

export const getMentorSidebarConfig = (): MentorNavItem[] => {
  return [
    { label: 'Overview', path: ROUTER.MENTOR_DASHBOARD, icon: <LayoutDashboard size={18} /> },
    { label: 'Subjects', path: '/mentor/subjects', icon: <BookOpen size={18} /> },
    { label: 'Drafts', path: ROUTER.MENTOR_DRAFTS, icon: <FolderOpen size={18} /> },
    { label: 'Published', path: ROUTER.MENTOR_PUBLISHED_PATHS, icon: <Globe size={18} /> },
    { label: 'Chat', path: '/mentor/chat', icon: <MessageSquare size={18} /> },
    { label: 'Profile', path: ROUTER.MENTOR_PROFILE, icon: <User size={18} /> },
  ]
}

// Hook version for use in React components
export const useMentorSidebarConfig = (): MentorNavItem[] => {
  const { t } = useTranslation('common')
  useChatUnreadBadge()
  const globalUnreadCount = useChatStore((state) => state.globalUnreadCount)

  return [
    { label: t('sidebar.overview'), path: ROUTER.MENTOR_DASHBOARD, icon: <LayoutDashboard size={18} /> },
    { label: t('sidebar.subjects'), path: '/mentor/subjects', icon: <BookOpen size={18} /> },
    { label: t('sidebar.drafts'), path: ROUTER.MENTOR_DRAFTS, icon: <FolderOpen size={18} /> },
    { label: t('sidebar.publishedPaths'), path: ROUTER.MENTOR_PUBLISHED_PATHS, icon: <Globe size={18} /> },
    { label: 'Chat', path: '/mentor/chat', icon: <MessageSquare size={18} />, badge: globalUnreadCount },
    { label: t('sidebar.profile'), path: ROUTER.MENTOR_PROFILE, icon: <User size={18} /> },
  ]
}
