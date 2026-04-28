import React from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, BookOpen, MessageSquare, User, FolderOpen, Globe, ClipboardCheck, Star, FileSearch } from 'lucide-react'
import useChatUnreadBadge from '../../../../hooks/useChatUnreadBadge'
import useChatStore from '../../../../store/useChatStore'

export type MentorNavItem = {
  label: string
  path: string
  icon?: React.ReactNode
  badge?: number
}

export const getMentorSidebarConfig = (): MentorNavItem[] => {
  return [
    { label: 'Overview',      path: '/mentor',                icon: <LayoutDashboard size={18} /> },
    { label: 'Subjects',      path: '/mentor/subjects',       icon: <BookOpen size={18} /> },
    { label: 'Drafts',        path: '/mentor/drafts',         icon: <FolderOpen size={18} /> },
    { label: 'Published',     path: '/mentor/published',      icon: <Globe size={18} /> },
    { label: 'Chat',          path: '/mentor/chat',           icon: <MessageSquare size={18} /> },
    { label: 'Task Reviews',  path: '/mentor/task-reviews',   icon: <ClipboardCheck size={18} /> },
    { label: 'LP Reviews',    path: '/mentor/lp-reviews',     icon: <FileSearch size={18} /> },
    { label: 'My Reviews',    path: '/mentors/me/reviews',    icon: <Star size={18} /> },
    { label: 'Profile',       path: '/mentor/profile',        icon: <User size={18} /> },
  ]
}

export const useMentorSidebarConfig = (): MentorNavItem[] => {
  const { t } = useTranslation('common')
  useChatUnreadBadge()
  const globalUnreadCount = useChatStore((state) => state.globalUnreadCount)

  return [
    { label: t('sidebar.overview'),                                    path: '/mentor',              icon: <LayoutDashboard size={18} /> },
    { label: t('sidebar.subjects'),                                    path: '/mentor/subjects',     icon: <BookOpen size={18} /> },
    { label: t('sidebar.drafts'),                                      path: '/mentor/drafts',       icon: <FolderOpen size={18} /> },
    { label: t('sidebar.publishedPaths'),                              path: '/mentor/published',    icon: <Globe size={18} /> },
    { label: 'Chat',                                                   path: '/mentor/chat',         icon: <MessageSquare size={18} />, badge: globalUnreadCount },
    { label: t('sidebar.taskReviews', { defaultValue: 'Task Reviews' }), path: '/mentor/task-reviews', icon: <ClipboardCheck size={18} /> },
    { label: t('sidebar.lpReviews',   { defaultValue: 'LP Reviews' }),   path: '/mentor/lp-reviews',   icon: <FileSearch size={18} /> },
    { label: t('sidebar.myReviews',   { defaultValue: 'My Reviews' }),   path: '/mentors/me/reviews',  icon: <Star size={18} /> },
    { label: t('sidebar.profile'),                                     path: '/mentor/profile',      icon: <User size={18} /> },
  ]
}
