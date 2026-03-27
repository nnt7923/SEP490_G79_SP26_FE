import React from 'react'
import ChannelChatPage from '../../../../components/ChannelChat/ChannelChatPage'
import { useMentorSidebarConfig } from '../components/MentorSideBar'

const MentorChannelChatPage: React.FC = () => {
  const navItems = useMentorSidebarConfig()
  return <ChannelChatPage role="Mentor" sidebarNavItems={navItems} />
}

export default MentorChannelChatPage
