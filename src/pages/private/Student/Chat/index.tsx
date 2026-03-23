import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Gift, LogOut, MessageSquare, Smile, Users } from 'lucide-react'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../../Student/components/StudentSideBar'
import useAuthStore from '../../../../store/useAuthStore'
import useChatStore from '../../../../store/useChatStore'
import { useLocation, useNavigate } from 'react-router-dom'
import ROUTER from '../../../../router/ROUTER'
import { useChatHub } from '../../../../hooks/useChatHub'
import { getPendingShares } from '../../../../services/LearningPathShareService'
import { getContacts, getConversations, getMessages } from '../../../../services/DirectChatService'
import MessageStatusIcon from '../../../../components/Chat/MessageStatusIcon'
import type { DirectChatContactDto, DirectMessageDto, ShareStatus } from '../../../../types/chat'
import { getMessageStatus } from '../../../../types/chat'
import { useTheme } from '../../../../contexts/ThemeContext'
import Toast from '../../../../components/Toast'
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
import LearningPathShareCard from '../../../../components/Chat/LearningPathShareCard'
import { buildLearningPathShareCardData, isLearningPathShareMessage } from '../../../../components/Chat/learningPathShare'

type ToastState = { message: string; type: 'success' | 'error' | 'warning' | 'info' }
type ChatRouteState = { conversationId?: string; activeTab?: 'conversations' | 'invites' | 'contacts'; toast?: ToastState }

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
  const location = useLocation() as { state?: ChatRouteState }

  const {
    conversationsById,
    conversationOrder,
    messagesByConversationId,
    activeConversationId,
    setActiveConversation,
    setConversations,
    setMessages,
    pendingLearningPathShares,
    receivedLearningPathShares,
    setPendingShares,
    reconcilePendingShares,
    upsertReceivedShare,
  } = useChatStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'conversations' | 'invites' | 'contacts'>('conversations')
  const [inviteStatusFilter, setInviteStatusFilter] = useState<'' | ShareStatus>('')
  const [contacts, setContacts] = useState<DirectChatContactDto[]>([])
  const [showEmoji, setShowEmoji] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(location.state?.toast ?? null)
  const [requestedConversationId, setRequestedConversationId] = useState<string | null>(location.state?.conversationId ?? null)
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
      const name = (c.mentorId === currentUserId ? c.studentName : c.mentorName) ?? ''
      return name.toLowerCase().includes(q)
    })
  }, [conversations, currentUserId, searchQuery])

  const filteredReceivedShares = useMemo(() => {
    const items = inviteStatusFilter
      ? receivedLearningPathShares.filter((share) => share.status === inviteStatusFilter)
      : receivedLearningPathShares

    return [...items].sort((left, right) => {
      const rightTime = Date.parse(right.sentAt || '') || 0
      const leftTime = Date.parse(left.sentAt || '') || 0
      return rightTime - leftTime
    })
  }, [inviteStatusFilter, receivedLearningPathShares])

  const hub = useChatHub({
    onError: (code) => {
      if (code === 'UNAUTHORIZED') { logout(); navigate(ROUTER.LOGIN) }
    },
  })

  useEffect(() => {
    hub.requestConversations()
    getConversations().then(setConversations).catch(() => { })
    getPendingShares().then((shares) => {
      setPendingShares(shares)
      reconcilePendingShares(shares)
    }).catch(() => { })
    getContacts().then(c => setContacts(c.filter(u => u.roleName === 'Mentor'))).catch(() => { })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!location.state) return
    if (location.state.toast) setToast(location.state.toast)
    if (location.state.activeTab) setActiveTab(location.state.activeTab)
    if (location.state.conversationId) setRequestedConversationId(location.state.conversationId)
    if (location.state.toast || location.state.activeTab || location.state.conversationId) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (requestedConversationId && conversationsById[requestedConversationId]) {
      setActiveConversation(requestedConversationId)
      setRequestedConversationId(null)
      return
    }
    if (!activeConversationId && conversationOrder.length > 0) {
      setActiveConversation(conversationOrder[0])
    }
  }, [activeConversationId, conversationOrder, conversationsById, requestedConversationId, setActiveConversation])

  useEffect(() => {
    if (!activeConversationId) return
    hub.joinConversation(activeConversationId).catch(() => { })
    getMessages(activeConversationId)
      .then((res) => setMessages(activeConversationId, res?.items ?? []))
      .catch(() => { })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId])

  useEffect(() => {
    if (!activeConv?.mentorId) return

    activeMessages.forEach((message) => {
      const shareCardData = isLearningPathShareMessage(message)
        ? buildLearningPathShareCardData(message, pendingLearningPathShares)
        : null

      if (!shareCardData) return

      upsertReceivedShare({
        shareId: shareCardData.shareId,
        pathId: shareCardData.pathId ?? '',
        learningPathTitle: shareCardData.title,
        learningPathDescription: shareCardData.description ?? null,
        mentorId: activeConv.mentorId,
        mentorName: shareCardData.mentorName || activeConv.mentorName,
        status: shareCardData.status,
        sentAt: shareCardData.sentAt || message.sentAt,
        respondedAt: shareCardData.respondedAt ?? null,
      })
    })
  }, [activeConv?.mentorId, activeConv?.mentorName, activeMessages, pendingLearningPathShares, upsertReceivedShare])

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

  const openSharePreview = (shareId: string, from: 'chat' | 'invites') => {
    navigate(ROUTER.CHAT_SHARE_PREVIEW.replace(':shareId', shareId), {
      state: {
        from,
        conversationId: from === 'chat' ? activeConversationId ?? undefined : undefined,
      },
    })
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
  const shareCardLabels = {
    pending: t('chat.pendingInvite'),
    accepted: t('chat.inviteAcceptedStatus', { defaultValue: 'Accepted' }),
    rejected: t('chat.inviteRejectedStatus', { defaultValue: 'Rejected' }),
    accept: t('chat.accept'),
    reject: t('chat.reject'),
    accepting: t('chat.accepting'),
    rejecting: t('chat.rejecting'),
    preview: t('chat.previewCta', { defaultValue: 'Preview' }),
    viewPath: t('chat.viewPath', { defaultValue: 'View learning path' }),
    shareFrom: (mentorName?: string | null) => t('chat.inviteFrom', { mentorName: mentorName || otherName || t('chat.title') }),
  }

  const inviteStatusFilters: Array<{ value: '' | ShareStatus; label: string }> = [
    { value: '', label: t('chat.invitesAll', { defaultValue: 'Tất cả' }) },
    { value: 'Pending', label: t('chat.pendingInvite') },
    { value: 'Accepted', label: t('chat.inviteAcceptedStatus', { defaultValue: 'Đã chấp nhận' }) },
    { value: 'Rejected', label: t('chat.inviteRejectedStatus', { defaultValue: 'Đã từ chối' }) },
  ]

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
                  <div className="chat-kit-sent-shares-chips" style={{ marginBottom: 10 }}>
                    {inviteStatusFilters.map((filter) => (
                      <button
                        key={filter.value || 'all'}
                        type="button"
                        className={`chat-kit-sent-shares-chip ${inviteStatusFilter === filter.value ? 'is-active' : ''}`}
                        onClick={() => setInviteStatusFilter(filter.value)}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  {filteredReceivedShares.length === 0 ? (
                    <div className="chat-kit-empty">{t('chat.noInvites')}</div>
                  ) : (
                    filteredReceivedShares.map(share => (
                      <LearningPathShareCard
                        key={share.shareId}
                        data={{
                          shareId: share.shareId,
                          pathId: share.pathId,
                          title: share.learningPathTitle,
                          description: share.learningPathDescription,
                          mentorName: share.mentorName,
                          status: share.status,
                          sentAt: share.sentAt,
                          respondedAt: share.respondedAt,
                        }}
                        actionMode="invite"
                        onPreview={() => openSharePreview(share.shareId, 'invites')}
                        onViewPath={share.pathId && share.status === 'Accepted'
                          ? () => navigate('/my-plans/detail', { state: { pathId: share.pathId } })
                          : undefined}
                        labels={shareCardLabels}
                      />
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
                  const shareCardData = isLearningPathShareMessage(msg)
                    ? buildLearningPathShareCardData(msg, pendingLearningPathShares)
                    : null
                  if (shareCardData) {
                    return (
                      <div
                        key={msg.messageId}
                        className={`chat-kit-share-row chat-kit-share-row--${isMine ? 'outgoing' : 'incoming'}`}
                        data-chat-message-id={msg.messageId}
                        data-chat-share-id={shareCardData.shareId}
                      >
                        <div className="chat-kit-share-row__card">
                          <LearningPathShareCard
                            data={shareCardData}
                            onPreview={() => openSharePreview(shareCardData.shareId, 'chat')}
                            onViewPath={shareCardData.pathId && shareCardData.status === 'Accepted'
                              ? () => navigate('/my-plans/detail', { state: { pathId: shareCardData.pathId } })
                              : undefined}
                            labels={shareCardLabels}
                          />
                        </div>
                        <div className={`chat-kit-share-row__footer chat-kit-share-row__footer--${isMine ? 'outgoing' : 'incoming'}`}>
                          <span className="chat-kit-message-meta">
                            {formatMessageTime(msg.sentAt)}
                            {isMine && isLastMine && (
                              <MessageStatusIcon status={getMessageStatus(msg)} />
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  }
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
      {toast && <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 120 }}><Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /></div>}
    </Layout>
  )
}

export default StudentChatPage
