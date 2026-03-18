import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogOut, MessageSquare, Share2, Smile, Users } from 'lucide-react'
import Layout from '../../../../components/Layout'
import { useMentorSidebarConfig } from '../components/MentorSideBar'
import useAuthStore from '../../../../store/useAuthStore'
import useChatStore from '../../../../store/useChatStore'
import { useLocation, useNavigate } from 'react-router-dom'
import ROUTER from '../../../../router/ROUTER'
import { useChatHub } from '../../../../hooks/useChatHub'
import { createOrGetConversation, getContacts, getConversations, getMessages } from '../../../../services/DirectChatService'
import { shareToStudent } from '../../../../services/LearningPathShareService'
import MessageStatusIcon from '../../../../components/Chat/MessageStatusIcon'
import type { DirectChatContactDto, DirectMessageDto } from '../../../../types/chat'
import { getMessageStatus } from '../../../../types/chat'
import { useTheme } from '../../../../contexts/ThemeContext'
import LearningPathService, { type SkeletonResponse } from '../../../../services/LearningPathService'
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
import ShareLearningPathModal from '../../../../components/Chat/ShareLearningPathModal'
import LearningPathShareCard from '../../../../components/Chat/LearningPathShareCard'
import { buildLearningPathShareCardData, isLearningPathShareMessage } from '../../../../components/Chat/learningPathShare'

type ToastState = { message: string; type: 'success' | 'error' | 'warning' | 'info' }
type ShareOption = { id: string; label: string }

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
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

function normalizeMessageContent(message: DirectMessageDto): string {
  const raw = message.content ?? ''
  if (!raw.includes('\n') && !raw.includes('\r')) return raw
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const parts = normalized.split('\n')
  const nonEmpty = parts.filter((p) => p.length > 0)
  if (nonEmpty.length >= 2 && nonEmpty.every((p) => p.length === 1)) {
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

const MentorChatPage: React.FC = () => {
  const { t } = useTranslation('mentor')
  const { t: tc } = useTranslation('common')
  const { theme } = useTheme()
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { conversationId?: string; sharePath?: { pathId: string; title?: string }; toast?: ToastState } }

  const {
    conversationsById,
    conversationOrder,
    messagesByConversationId,
    activeConversationId,
    setActiveConversation,
    setConversations,
    setMessages,
  } = useChatStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'conversations' | 'contacts'>('conversations')
  const [contacts, setContacts] = useState<DirectChatContactDto[]>([])
  const [sharePaths, setSharePaths] = useState<ShareOption[]>([])
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedPathId, setSelectedPathId] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(location.state?.toast ?? null)
  const deliveredRef = useRef<Set<string>>(new Set())
  const seenRef = useRef<Set<string>>(new Set())
  const messageListId = 'mentor-chat-message-list'
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

  const hub = useChatHub({
    onError: (code) => {
      if (code === 'UNAUTHORIZED') { logout(); navigate(ROUTER.LOGIN) }
    },
  })

  useEffect(() => {
    hub.requestConversations()
    getConversations().then(setConversations).catch(() => { })
    getContacts().then(setContacts).catch(() => { })
    LearningPathService.getMyDrafts({ pageNumber: 1, pageSize: 100, sortDescending: true })
      .then((response) => setSharePaths(response.items.map((item: SkeletonResponse) => ({
        id: String(item.pathId ?? item.id),
        label: item.title || t('chat.untitledPath', { defaultValue: 'Untitled learning path' }),
      }))))
      .catch(() => setSharePaths([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (location.state?.conversationId && conversationsById[location.state.conversationId]) {
      setActiveConversation(location.state.conversationId)
      return
    }
    if (!activeConversationId && conversationOrder.length > 0) {
      setActiveConversation(conversationOrder[0])
    }
  }, [activeConversationId, conversationOrder, conversationsById, location.state?.conversationId, setActiveConversation])

  useEffect(() => {
    if (!location.state) return
    if (location.state.toast || location.state.sharePath) {
      if (location.state.sharePath) {
        setSelectedPathId(location.state.sharePath.pathId)
        setSelectedStudentId(activeConv?.studentId ?? '')
        setIsShareModalOpen(true)
      }
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [activeConv?.studentId, location.pathname, location.state, navigate])

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

  const openShareModal = () => {
    setShareError(null)
    setSelectedStudentId(activeConv?.studentId ?? '')
    setSelectedPathId((prev) => prev || sharePaths[0]?.id || '')
    setIsShareModalOpen(true)
  }

  const handleShare = async () => {
    if (!selectedStudentId || !selectedPathId) return
    setSharing(true)
    setShareError(null)
    try {
      await shareToStudent(selectedPathId, selectedStudentId)
      setIsShareModalOpen(false)
      setToast({ message: t('chat.shareSuccess'), type: 'success' })
      if (activeConversationId) {
        const res = await getMessages(activeConversationId)
        setMessages(activeConversationId, res.items)
      }
      hub.requestConversations().catch(() => { })
    } catch (err: any) {
      const code = err?.response?.data?.errorCode
      setShareError(
        code === 'SHARE_ALREADY_PENDING'
          ? t('chat.shareAlreadyPending')
          : t('chat.shareError')
      )
    } finally {
      setSharing(false)
    }
  }

  const handleLogout = async () => { await logout(); navigate(ROUTER.LOGIN) }

  const navItems = useMentorSidebarConfig()
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
    brand: { name: t('chat.title'), subtitle: 'Mentor' },
  }

  const pickerTheme = theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT

  const studentContacts = contacts.filter(c => c.roleName === 'Student')
  const shareCardLabels = {
    pending: t('chat.pendingInvite', { defaultValue: 'Pending' }),
    accepted: t('chat.inviteAccepted', { defaultValue: 'Accepted' }),
    rejected: t('chat.inviteRejected', { defaultValue: 'Rejected' }),
    accept: '',
    reject: '',
    accepting: '',
    rejecting: '',
    viewPath: t('chat.viewPath', { defaultValue: 'View learning path' }),
    shareFrom: (mentorName?: string | null) => t('chat.shareCardFrom', { mentorName: mentorName || otherName || t('chat.title') }),
  }

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
                    { key: 'contacts', icon: <Users size={14} />, label: t('chat.contacts', { defaultValue: 'Students' }) },
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
              ) : (
                <div className="chat-kit-contact-list">
                  {studentContacts.length === 0 ? (
                    <div className="chat-kit-empty">{t('chat.noStudentsYet')}</div>
                  ) : (
                    studentContacts.map(contact => (
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
                            {t('chat.student', { defaultValue: 'Student' })}
                          </div>
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
              <ConversationHeader.Actions>
                <div className="chat-kit-header-actions">
                  <button
                    title={t('chat.shareTitle')}
                    onClick={openShareModal}
                    className="chat-kit-share-btn"
                    disabled={!activeConversationId || sharePaths.length === 0}
                  >
                    <Share2 size={14} />
                    {t('chat.sharePathBtn')}
                  </button>
                </div>
              </ConversationHeader.Actions>
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
                  const shareCardData = isLearningPathShareMessage(msg) ? buildLearningPathShareCardData(msg) : null
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
                      {shareCardData ? (
                        <Message.CustomContent>
                          <div className={`chat-kit-share-message-body ${isMine ? 'chat-kit-share-message-body--outgoing' : 'chat-kit-share-message-body--incoming'}`}>
                            <LearningPathShareCard
                              data={shareCardData}
                              labels={shareCardLabels}
                            />
                          </div>
                        </Message.CustomContent>
                      ) : (
                        <Message.TextContent text={displayContent} />
                      )}
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

      <ShareLearningPathModal
        isOpen={isShareModalOpen}
        title={t('chat.shareTitle')}
        studentLabel={t('chat.selectStudent')}
        pathLabel={t('chat.selectPath', { defaultValue: 'Select learning path' })}
        selectStudentPlaceholder={t('chat.selectStudent')}
        selectPathPlaceholder={t('chat.selectPath', { defaultValue: 'Select learning path' })}
        submitLabel={t('chat.sharePath')}
        submittingLabel={t('chat.sharing')}
        closeLabel={tc('actions.close', { defaultValue: 'Close' })}
        students={studentContacts
          .filter((contact) => !activeConv || contact.userId === activeConv.studentId)
          .map((contact) => ({ id: contact.userId, label: contact.username }))}
        paths={sharePaths}
        selectedStudentId={selectedStudentId}
        selectedPathId={selectedPathId}
        onSelectStudent={setSelectedStudentId}
        onSelectPath={setSelectedPathId}
        onClose={() => setIsShareModalOpen(false)}
        onSubmit={handleShare}
        error={shareError}
        submitting={sharing}
        lockStudent
      />
      {toast && <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 120 }}><Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /></div>}
    </Layout>
  )
}

export default MentorChatPage
