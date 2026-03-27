import React from 'react'
import ChannelChatPage from '../../../../components/ChannelChat/ChannelChatPage'
import { useStudentSidebarConfig } from '../components/StudentSideBar'

const StudentChannelChatPage: React.FC = () => {
  const navItems = useStudentSidebarConfig()
  return <ChannelChatPage role="Student" sidebarNavItems={navItems} />
}

export default StudentChannelChatPage
