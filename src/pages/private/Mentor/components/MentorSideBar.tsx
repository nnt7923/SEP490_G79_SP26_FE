import React from 'react'
import { useTranslation } from 'react-i18next'
import ROUTER from '../../../../router/ROUTER'
import { LayoutDashboard, BookOpen, Users, GraduationCap, MessageSquare, User, Sparkles, FolderOpen } from 'lucide-react'

export type MentorNavItem = {
  label: string
  path: string
  icon?: React.ReactNode
}

export const getMentorSidebarConfig = (): MentorNavItem[] => {
  return [
    { label: 'Overview', path: ROUTER.MENTOR_DASHBOARD, icon: <LayoutDashboard size={18} /> },
    { label: 'Subjects', path: '/mentor/subjects', icon: <BookOpen size={18} /> },
    { label: 'Classes', path: '/mentor/classes', icon: <Users size={18} /> },
    { label: 'Students', path: '/mentor/students', icon: <GraduationCap size={18} /> },
    { label: 'AI Plans', path: ROUTER.MENTOR_AI_PLANS, icon: <Sparkles size={18} /> },
    { label: 'Drafts', path: ROUTER.MENTOR_DRAFTS, icon: <FolderOpen size={18} /> },
    { label: 'Chat', path: '/mentor/chat', icon: <MessageSquare size={18} /> },
    { label: 'Profile', path: ROUTER.MENTOR_PROFILE, icon: <User size={18} /> },
  ]
}

// Hook version for use in React components
export const useMentorSidebarConfig = (): MentorNavItem[] => {
  const { t } = useTranslation('common')
  return [
    { label: t('sidebar.overview'), path: ROUTER.MENTOR_DASHBOARD, icon: <LayoutDashboard size={18} /> },
    { label: t('sidebar.subjects'), path: '/mentor/subjects', icon: <BookOpen size={18} /> },
    { label: t('sidebar.classes'), path: '/mentor/classes', icon: <Users size={18} /> },
    { label: t('sidebar.students'), path: '/mentor/students', icon: <GraduationCap size={18} /> },
    { label: t('sidebar.aiPlans'), path: ROUTER.MENTOR_AI_PLANS, icon: <Sparkles size={18} /> },
    { label: t('sidebar.drafts'), path: ROUTER.MENTOR_DRAFTS, icon: <FolderOpen size={18} /> },
    { label: 'Chat', path: '/mentor/chat', icon: <MessageSquare size={18} /> },
    { label: t('sidebar.profile'), path: ROUTER.MENTOR_PROFILE, icon: <User size={18} /> },
  ]
}
