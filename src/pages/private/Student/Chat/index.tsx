import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogOut, MessageSquare, Gift, Users } from 'lucide-react'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../../Student/components/StudentSideBar'
import useAuthStore from '../../../../store/useAuthStore'
import useChatStore from '../../../../store/useChatStore'
import { useNavigate } from 'react-router-dom'
import ROUTER from '../../../../router/ROUTER'
import { useChatHub } from '../../../../hooks/useChatHub'
import ConversationList from '../../../../components/Chat/ConversationList'
import ChatHeader from '../../../../components/Chat/ChatHeader'
import MessageBubble from '../../../../components/Chat/MessageBubble'
import ChatComposer from '../../../../components/Chat/ChatComposer'
import { getPendingShares } from '../../../../services/LearningPathShareService'
import { acceptShare, rejectShare } from '../../../../services/LearningPathShareService'
import { getContacts, getMessages } from '../../../../services/DirectChatService'
import type { PendingLearningPathShareSummaryDto, DirectChatContactDto } from '../../../../types/chat'

const StudentChatPage: React.FC = () => {
  const { t } = useTranslation('student')
  const { t: tc } = useTranslation('common')
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesWrapRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const deliveredRef = useRef<Set<string>>(new Set())
  const seenRef = useRef<Set<string>>(new Set())

  const currentUserId = String(user?.id ?? '')

  // Derived state
  const conversations = conversationOrder.map(id => conversationsById[id]).filter(Boolean)
  const activeMessages = activeConversationId
    ? (messagesByConversationId[activeConversationId] ?? [])
    : []
  const activeConv = activeConversationId ? conversationsById[activeConversationId] : null
  const otherName = activeConv
    ? (activeConv.mentorId === currentUserId ? activeConv.studentName : activeConv.mentorName)
    : ''

  // ── SignalR Hub ──────────────────────────────────────────────────
  const hub = useChatHub({
    onError: (code) => {
      if (code === 'UNAUTHORIZED') { logout(); navigate(ROUTER.LOGIN) }
    },
  })

  // Load conversations + pending shares on mount
  useEffect(() => {
    hub.requestConversations()
    getPendingShares().then(setPendingShares).catch(() => { })
    getContacts().then(c => setContacts(c.filter(u => u.roleName === 'Mentor'))).catch(() => { })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Join conversation & mark messages when active changes
  useEffect(() => {
    if (!activeConversationId) return
    hub.joinConversation(activeConversationId).catch(() => { })
    getMessages(activeConversationId)
      .then((res) => setMessages(activeConversationId, res?.items ?? []))
      .catch(() => { })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId])

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesByConversationId, activeConversationId])

  useEffect(() => {
    deliveredRef.current.clear()
    seenRef.current.clear()
  }, [activeConversationId])

  useEffect(() => {
    const root = messagesWrapRef.current
    const target = messagesEndRef.current
    if (!root || !target || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry) setIsAtBottom(entry.isIntersecting)
      },
      { root, threshold: 0.98 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [activeConversationId])

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

  // ── Handlers ────────────────────────────────────────────────────
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

  // ── Sidebar ──────────────────────────────────────────────────────
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

  // ── Derived state ────────────────────────────────────────────────
  return (
    <Layout sidebar={sidebarConfig}>
      <div
        style={{
          display: 'flex',
          height: 'calc(100vh - 64px)',
          background: 'var(--bg-main)',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* ── LEFT: Sidebar ── */}
        <div
          style={{
            width: '280px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--border-base)',
            background: 'var(--bg-surface)',
          }}
        >
          {/* Tabs */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border-base)',
              background: 'var(--bg-surface)',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '6px',
                padding: '6px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-base)',
                borderRadius: '12px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
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
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 10px',
                      border: '1px solid transparent',
                      background: isActive ? 'var(--accent-primary)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      borderRadius: '10px',
                      transition: 'all 0.18s ease',
                      boxShadow: isActive ? '0 6px 16px rgba(0,0,0,0.18)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (isActive) return
                      e.currentTarget.style.background = 'var(--bg-surface)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                      e.currentTarget.style.borderColor = 'var(--border-base)'
                    }}
                    onMouseLeave={(e) => {
                      if (isActive) return
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                      e.currentTarget.style.borderColor = 'transparent'
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                    {'badge' in tab && tab.badge > 0 && (
                      <span
                        style={{
                          background: 'var(--danger-primary)',
                          color: '#fff',
                          borderRadius: '999px',
                          fontSize: '10px',
                          fontWeight: 700,
                          minWidth: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px',
                        }}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab content */}
          {activeTab === 'conversations' ? (
            <ConversationList
              conversations={conversations}
              currentUserId={currentUserId}
              activeConversationId={activeConversationId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelect={handleSelectConversation}
              searchPlaceholder={t('chat.searchPlaceholder')}
              emptyLabel={t('chat.noConversation')}
            />
          ) : activeTab === 'contacts' ? (
            /* Contacts List */
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {contacts.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-disabled)',
                    fontSize: '13px',
                    paddingTop: '40px',
                  }}
                >
                  {t('chat.noContacts', { defaultValue: 'No mentors found' })}
                </div>
              ) : (
                contacts.map(contact => (
                  <div
                    key={contact.userId}
                    onClick={() => handleStartConversation(contact.userId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-base)',
                      borderRadius: '12px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-main)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface)';
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--bg-neutral)',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                        border: '1px solid var(--border-base)'
                      }}
                    >
                      {contact.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {contact.username}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {t('chat.mentor', { defaultValue: 'Mentor' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Learning Path Invites */
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {pendingLearningPathShares.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-disabled)',
                    fontSize: '13px',
                    paddingTop: '40px',
                  }}
                >
                  {t('chat.noInvites')}
                </div>
              ) : (
                pendingLearningPathShares.map(share => (
                  <div
                    key={share.shareId}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-base)',
                      borderRadius: '12px',
                      padding: '14px',
                      marginBottom: '10px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: '4px',
                      }}
                    >
                      {share.learningPathTitle}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        marginBottom: '10px',
                      }}
                    >
                      {t('chat.inviteFrom', { mentorName: share.mentorName })}
                    </div>
                    {share.learningPathDescription && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-disabled)',
                          marginBottom: '10px',
                        }}
                      >
                        {share.learningPathDescription}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleAccept(share)}
                        disabled={actionLoading[share.shareId]}
                        style={{
                          flex: 1,
                          background: 'var(--success-primary)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '7px 0',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: actionLoading[share.shareId] ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {actionLoading[share.shareId]
                          ? t('chat.accepting')
                          : t('chat.accept')}
                      </button>
                      <button
                        onClick={() => handleReject(share)}
                        disabled={actionLoading[share.shareId]}
                        style={{
                          flex: 1,
                          background: 'transparent',
                          color: 'var(--danger-primary)',
                          border: '1px solid var(--danger-primary)',
                          borderRadius: '8px',
                          padding: '7px 0',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: actionLoading[share.shareId] ? 'not-allowed' : 'pointer',
                        }}
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

        {/* ── RIGHT: Chat Panel ── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {!activeConversationId ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-disabled)',
                fontSize: '14px',
              }}
            >
              {t('chat.noConversation')}
            </div>
          ) : (
            <>
              <ChatHeader name={otherName || '...'} />

              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  minHeight: 0,
                }}
                ref={messagesWrapRef}
              >
                {activeMessages.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'var(--text-disabled)',
                      fontSize: '13px',
                      marginTop: '40px',
                    }}
                  >
                    {t('chat.noMessages')}
                  </div>
                ) : (
                  activeMessages.map((msg, idx) => {
                    const isMine = msg.senderId === currentUserId
                    const isLast = idx === activeMessages.length - 1
                    const isLastMine =
                      isLast ||
                      (isMine &&
                        !activeMessages.slice(idx + 1).some(m => m.senderId === currentUserId))
                    return (
                      <div
                        key={msg.messageId}
                        style={{
                          display: 'flex',
                          justifyContent: isMine ? 'flex-end' : 'flex-start',
                          width: '100%',
                        }}
                      >
                        <MessageBubble
                          message={msg}
                          isMine={isMine}
                          showStatus={isMine && isLastMine}
                        />
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <ChatComposer
                onSend={handleSend}
                placeholder={t('chat.typePlaceholder')}
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default StudentChatPage
