import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Gift, LogOut, MessageSquare, Smile, Users } from 'lucide-react'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../../Student/components/StudentSideBar'
import useAuthStore from '../../../../store/useAuthStore'
import useChatStore from '../../../../store/useChatStore'
import { useNavigate } from 'react-router-dom'
import ROUTER from '../../../../router/ROUTER'
import { useChatHub } from '../../../../hooks/useChatHub'
import { getPendingShares, acceptShare, rejectShare } from '../../../../services/LearningPathShareService'
import { getContacts, getMessages } from '../../../../services/DirectChatService'
import MessageStatusIcon from '../../../../components/Chat/MessageStatusIcon'
import type { PendingLearningPathShareSummaryDto, DirectChatContactDto, DirectMessageDto } from '../../../../types/chat'
import { getMessageStatus } from '../../../../types/chat'
import { useTheme } from '../../../../contexts/ThemeContext'
import {
  MainContainer,
  Sidebar as ChatSidebar,
  ChatContainer,
  ConversationList as ChatConversationList,
  Conversation,
  ConversationHeader,
  MessageList,
  Message,
  MessageInput,
  InputToolbox,
  Avatar,
  Search,
} from '@chatscope/chat-ui-kit-react'
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react'

function formatConversationTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
}

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(-2)
    .map(w => w[0]?.toUpperCase())
    .join('')
}

function normalizeMessageContent(message: DirectMessageDto): string {
  const raw = message.content ?? ''
  if (!raw.includes('\n') && !raw.includes('\r')) return raw
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const parts = normalized.split('\n')
  const nonEmpty = parts.filter(p => p.length > 0)
  if (nonEmpty.length >= 2 && nonEmpty.every(p => p.length === 1)) {
    return nonEmpty.join('')
  }
  return raw
}

function getMessagePosition(messages: DirectMessageDto[], idx: number): 'single' | 'first' | 'normal' | 'last' {
  const current = messages[idx]
  const prev = messages[idx - 1]
  const next = messages[idx + 1]
  const samePrev = prev && prev.senderId === current.senderId
  const sameNext = next && next.senderId === current.senderId
  if (!samePrev && !sameNext) return 'single'
  if (!samePrev && sameNext) return 'first'
  if (samePrev && sameNext) return 'normal'
  return 'last'
}

const StudentChatPage: React.FC = () => {
  const { t } = useTranslation('student')
  const { t: tc } = useTranslation('common')
  const { theme } = useTheme()
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  const {
    conversationsById,
    conversationOrder,
    messagesByConversationId,
    activeConversationId,
    setActiveConversation,
    setMessages,
    pendingLearningPathShares,
    setPendingShares,
    removePendingShare,
  } = useChatStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'conversations' | 'invites' | 'contacts'>('conversations')
  const [contacts, setContacts] = useState<DirectChatContactDto[]>([])
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [showEmoji, setShowEmoji] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isAtBottom, setIsAtBottom] = useState(true)
  const deliveredRef = useRef<Set<string>>(new Set())
  const seenRef = useRef<Set<string>>(new Set())
  const messageListId = 'student-chat-message-list'
  const messageInputRef = useRef<any>(null)

  const currentUserId = String(user?.id ?? '')

  const conversations = conversationOrder.map(id => conversationsById[id]).filter(Boolean)
  const activeMessages = activeConversationId
    ? (messagesByConversationId[activeConversationId] ?? [])
    : []
  const activeConv = activeConversationId ? conversationsById[activeConversationId] : null
  const otherName = activeConv
    ? (activeConv.mentorId === currentUserId ? activeConv.studentName : activeConv.mentorName)
    : ''

  const filteredConversations = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return conversations.filter((c) => {
      const name = c.mentorId === currentUserId ? c.studentName : c.mentorName
      return name.toLowerCase().includes(q)
    })
  }, [conversations, currentUserId, searchQuery])

  const hub = useChatHub({
    onError: (code) => {
      if (code === 'UNAUTHORIZED') { logout(); navigate(ROUTER.LOGIN) }
    },
  })

  useEffect(() => {
    hub.requestConversations()
    getPendingShares().then(setPendingShares).catch(() => { })
    getContacts().then(c => setContacts(c.filter(u => u.roleName === 'Mentor'))).catch(() => { })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeConversationId) return
    hub.joinConversation(activeConversationId).catch(() => { })
    getMessages(activeConversationId)
      .then((res) => setMessages(activeConversationId, res?.items ?? []))
      .catch(() => { })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId])

  useEffect(() => {
    deliveredRef.current.clear()
    seenRef.current.clear()
    setShowEmoji(false)
    setInputValue('')
  }, [activeConversationId])

  useEffect(() => {
    const root = document.getElementById(messageListId)
    if (!root) return
    const container = root.querySelector('.cs-message-list__scroll-wrapper') as HTMLDivElement | null
    if (!container) return

    const handleScroll = () => {
      const atBottom = Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 4
      setIsAtBottom(atBottom)
    }

    handleScroll()
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [activeConversationId, activeMessages.length, messageListId])

  useEffect(() => {
    if (!activeConversationId || activeMessages.length === 0) return
    const canMarkSeen = isAtBottom && (typeof document === 'undefined' || document.hasFocus())
    for (const msg of activeMessages) {
      if (msg.senderId === currentUserId) continue
      if (!msg.deliveredAt && !deliveredRef.current.has(msg.messageId)) {
        deliveredRef.current.add(msg.messageId)
        hub.markDelivered(activeConversationId, msg.messageId).catch(() => {
          deliveredRef.current.delete(msg.messageId)
        })
      }
      if (canMarkSeen && !msg.seenAt && !seenRef.current.has(msg.messageId)) {
        seenRef.current.add(msg.messageId)
        hub.markSeen(activeConversationId, msg.messageId).catch(() => {
          seenRef.current.delete(msg.messageId)
        })
      }
    }
  }, [activeConversationId, activeMessages, isAtBottom, currentUserId])

  const handleSelectConversation = (id: string) => {
    if (activeConversationId && activeConversationId !== id) {
      hub.leaveConversation(activeConversationId).catch(() => { })
    }
    setActiveConversation(id)
  }

  const handleStartConversation = async (participantId: string) => {
    try {
      await hub.startConversation(participantId)
      setActiveTab('conversations')
      setSearchQuery('')
    } catch { }
  }

  const handleSend = (content: string, type: 'Text' | 'Emoji') => {
    if (!activeConversationId) return
    hub.sendMessage(activeConversationId, content, type).catch(() => { })
  }

  const handleSendText = (_innerHtml: string, textContent: string) => {
    if (!activeConversationId) return
    const trimmed = textContent.trim()
    if (!trimmed) return
    handleSend(trimmed, 'Text')
    setInputValue('')
  }

  const handleAccept = async (share: PendingLearningPathShareSummaryDto) => {
    setActionLoading(prev => ({ ...prev, [share.shareId]: true }))
    try {
      await acceptShare(share.shareId)
      removePendingShare(share.shareId)
    } catch { } finally {
      setActionLoading(prev => ({ ...prev, [share.shareId]: false }))
    }
  }

  const handleReject = async (share: PendingLearningPathShareSummaryDto) => {
    setActionLoading(prev => ({ ...prev, [share.shareId]: true }))
    try {
      await rejectShare(share.shareId)
      removePendingShare(share.shareId)
    } catch { } finally {
      setActionLoading(prev => ({ ...prev, [share.shareId]: false }))
    }
  }

  const handleLogout = async () => { await logout(); navigate(ROUTER.LOGIN) }

  const navItems = useStudentSidebarConfig()
  const sidebarConfig = {
    navItems,
    actions: [
      {
        label: tc('sidebar.logout'),
        icon: <LogOut className="w-5 h-5" />,
        onClick: handleLogout,
        variant: 'danger' as const,
      },
    ],
    brand: { name: t('chat.title'), subtitle: 'Mentor Chat' },
  }

  const pickerTheme = theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="chat-kit-page">
        <MainContainer responsive className="chat-kit-container">
          <ChatSidebar position="left" scrollable={false} className="chat-kit-sidebar">
            <div className="chat-kit-sidebar-header">
              <div className="chat-kit-tabs">
                {(
                  [
                    { key: 'conversations', icon: <MessageSquare size={14} />, label: t('chat.conversations') },
                    { key: 'contacts', icon: <Users size={14} />, label: t('chat.contacts', { defaultValue: 'Mentors' }) },
                    {
                      key: 'invites',
                      icon: <Gift size={14} />,
                      label: t('chat.invites'),
                      badge: pendingLearningPathShares.length,
                    },
                  ] as const
                ).map(tab => {
                  const isActive = activeTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      aria-pressed={isActive}
                      className="chat-kit-tab"
                    >
                      {tab.icon}
                      {tab.label}
                      {'badge' in tab && tab.badge > 0 && (
                        <span className="chat-kit-badge">{tab.badge}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="chat-kit-sidebar-body">
              {activeTab === 'conversations' ? (
                <>
                  <div className="chat-kit-search">
                    <Search
                      value={searchQuery}
                      onChange={setSearchQuery}
                      onClearClick={() => setSearchQuery('')}
                      placeholder={t('chat.searchPlaceholder')}
                    />
                  </div>
                  {filteredConversations.length === 0 ? (
                    <div className="chat-kit-empty chat-kit-empty--fill">{t('chat.noConversation')}</div>
                  ) : (
                    <ChatConversationList>
                      {filteredConversations.map((conv) => {
                        const name = conv.mentorId === currentUserId ? conv.studentName : conv.mentorName
                        const initials = getInitials(name)
                        return (
                          <Conversation
                            key={conv.conversationId}
                            name={name}
                            info={conv.lastMessagePreview ?? ''}
                            lastActivityTime={formatConversationTime(conv.lastMessageAt)}
                            unreadCnt={conv.unreadCount}
                            active={conv.conversationId === activeConversationId}
                            onClick={() => handleSelectConversation(conv.conversationId)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleSelectConversation(conv.conversationId)
                              }
                            }}
                          >
                            <Avatar>
                              <span className="chat-kit-avatar">{initials}</span>
                            </Avatar>
                          </Conversation>
                        )
                      })}
                    </ChatConversationList>
                  )}
                </>
              ) : activeTab === 'contacts' ? (
                <div className="chat-kit-contact-list">
                  {contacts.length === 0 ? (
                    <div className="chat-kit-empty">
                      {t('chat.noContacts', { defaultValue: 'No mentors found' })}
                    </div>
                  ) : (
                    contacts.map(contact => (
                      <div
                        key={contact.userId}
                        onClick={() => handleStartConversation(contact.userId)}
                        className="chat-kit-contact-item"
                      >
                        <div className="chat-kit-contact-avatar">
                          {contact.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="chat-kit-contact-name">{contact.username}</div>
                          <div className="chat-kit-contact-role">
                            {t('chat.mentor', { defaultValue: 'Mentor' })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="chat-kit-invite-list">
                  {pendingLearningPathShares.length === 0 ? (
                    <div className="chat-kit-empty">{t('chat.noInvites')}</div>
                  ) : (
                    pendingLearningPathShares.map(share => (
                      <div key={share.shareId} className="chat-kit-invite-card">
                        <div className="chat-kit-invite-title">{share.learningPathTitle}</div>
                        <div className="chat-kit-invite-meta">
                          {t('chat.inviteFrom', { mentorName: share.mentorName })}
                        </div>
                        {share.learningPathDescription && (
                          <div className="chat-kit-invite-desc">{share.learningPathDescription}</div>
                        )}
                        <div className="chat-kit-invite-actions">
                          <button
                            onClick={() => handleAccept(share)}
                            disabled={actionLoading[share.shareId]}
                            className="chat-kit-invite-btn chat-kit-invite-btn--accept"
                          >
                            {actionLoading[share.shareId]
                              ? t('chat.accepting')
                              : t('chat.accept')}
                          </button>
                          <button
                            onClick={() => handleReject(share)}
                            disabled={actionLoading[share.shareId]}
                            className="chat-kit-invite-btn chat-kit-invite-btn--reject"
                          >
                            {actionLoading[share.shareId]
                              ? t('chat.rejecting')
                              : t('chat.reject')}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </ChatSidebar>

          <ChatContainer className="chat-kit-panel">
            <ConversationHeader>
              <Avatar>
                <span className="chat-kit-avatar chat-kit-avatar--header">
                  {getInitials(otherName || t('chat.title'))}
                </span>
              </Avatar>
              <ConversationHeader.Content userName={activeConversationId ? (otherName || '...') : t('chat.title')} />
            </ConversationHeader>

            <MessageList
              id={messageListId}
              className="chat-kit-message-list"
              autoScrollToBottom
              scrollBehavior="smooth"
            >
              {!activeConversationId ? (
                <MessageList.Content>
                  <div className="chat-kit-empty">{t('chat.noConversation')}</div>
                </MessageList.Content>
              ) : activeMessages.length === 0 ? (
                <MessageList.Content>
                  <div className="chat-kit-empty">{t('chat.noMessages')}</div>
                </MessageList.Content>
              ) : (
                activeMessages.map((msg, idx) => {
                  const isMine = msg.senderId === currentUserId
                  const position = getMessagePosition(activeMessages, idx)
                  const isLastMine =
                    isMine && !activeMessages.slice(idx + 1).some(m => m.senderId === currentUserId)
                  const displayContent = normalizeMessageContent(msg)
                  return (
                    <Message
                      key={msg.messageId}
                      model={{
                        message: displayContent,
                        direction: isMine ? 'outgoing' : 'incoming',
                        position,
                      }}
                      type="text"
                    >
                      <Message.TextContent text={displayContent} />
                      <Message.Footer>
                        <span className="chat-kit-message-meta">
                          {formatMessageTime(msg.sentAt)}
                          {isMine && isLastMine && (
                            <MessageStatusIcon status={getMessageStatus(msg)} />
                          )}
                        </span>
                      </Message.Footer>
                    </Message>
                  )
                })
              )}
            </MessageList>

            <MessageInput
              placeholder={t('chat.typePlaceholder')}
              onSend={handleSendText}
              onChange={(_html, textContent) => setInputValue(textContent)}
              value={inputValue}
              activateAfterChange
              attachButton={false}
              disabled={!activeConversationId}
              sendDisabled={!activeConversationId}
              ref={messageInputRef}
            />

            <InputToolbox className="chat-kit-input-toolbox">
              <button
                onClick={() => activeConversationId && setShowEmoji(!showEmoji)}
                className={`chat-kit-emoji-toggle ${showEmoji ? 'is-active' : ''}`}
                aria-label="Toggle emoji"
                disabled={!activeConversationId}
              >
                <Smile size={20} />
              </button>
              {showEmoji && activeConversationId && (
                <div className="chat-kit-emoji-picker">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      setInputValue((prev) => `${prev}${emojiData.emoji}`)
                      messageInputRef.current?.focus?.()
                    }}
                    theme={pickerTheme}
                    height={360}
                    width={360}
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
            </InputToolbox>
          </ChatContainer>
        </MainContainer>
      </div>
    </Layout>
  )
}

export default StudentChatPage
