import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogOut, Send as SendIcon, Share2, X, MessageSquare, Users } from 'lucide-react'
import Layout from '../../../../components/Layout'
import { useMentorSidebarConfig } from '../components/MentorSideBar'
import useAuthStore from '../../../../store/useAuthStore'
import useChatStore from '../../../../store/useChatStore'
import { useNavigate } from 'react-router-dom'
import ROUTER from '../../../../router/ROUTER'
import { useChatHub } from '../../../../hooks/useChatHub'
import ConversationList from '../../../../components/Chat/ConversationList'
import ChatHeader from '../../../../components/Chat/ChatHeader'
import MessageBubble from '../../../../components/Chat/MessageBubble'
import ChatComposer from '../../../../components/Chat/ChatComposer'
import { getContacts, getMessages } from '../../../../services/DirectChatService'
import { shareToStudent } from '../../../../services/LearningPathShareService'
import type { DirectChatContactDto } from '../../../../types/chat'

interface ShareModalState {
  pathId: string
  pathTitle: string
}

const MentorChatPage: React.FC = () => {
  const { t } = useTranslation('mentor')
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
  } = useChatStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'conversations' | 'contacts'>('conversations')
  const [contacts, setContacts] = useState<DirectChatContactDto[]>([])
  const [shareModal, setShareModal] = useState<ShareModalState | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
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

  // ── SignalR Hub ─────────────────────────────────────────────────
  const hub = useChatHub({
    onError: (code) => {
      if (code === 'UNAUTHORIZED') { logout(); navigate(ROUTER.LOGIN) }
    },
  })

  useEffect(() => {
    hub.requestConversations()
    getContacts().then(setContacts).catch(() => { })
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

  const handleShare = async () => {
    if (!shareModal || !selectedStudentId) return
    setSharing(true)
    setShareError(null)
    try {
      await shareToStudent(shareModal.pathId, selectedStudentId)
      setShareModal(null)
      setSelectedStudentId('')
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

  // ── Sidebar ─────────────────────────────────────────────────────
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

  // ── Derived state ────────────────────────────────────────────────
  // Students from contacts (students who have chatted with this mentor)
  const studentContacts = contacts.filter(c => c.roleName === 'Student')

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
                  { key: 'contacts', icon: <Users size={14} />, label: t('chat.contacts', { defaultValue: 'Students' }) },
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
                  </button>
                )
              })}
            </div>
          </div>

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
          ) : (
            /* Contacts List */
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {studentContacts.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-disabled)',
                    fontSize: '13px',
                    paddingTop: '40px',
                  }}
                >
                  {t('chat.noStudentsYet')}
                </div>
              ) : (
                studentContacts.map(contact => (
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
                        {t('chat.student', { defaultValue: 'Student' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Chat Panel ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
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
              {/* Chat Header with Share button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <ChatHeader name={otherName || '...'} />
                </div>
                {/* Share learning path shortcut — opens modal */}
                <button
                  title={t('chat.shareTitle')}
                  onClick={() => {
                    // Trigger by pathId from elsewhere; here just show a placeholder trigger
                    setShareModal({ pathId: '', pathTitle: t('chat.shareTitle') })
                    setShareError(null)
                    setSelectedStudentId(activeConv?.studentId ?? '')
                  }}
                  style={{
                    margin: '0 12px 0 0',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-base)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    color: 'var(--accent-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Share2 size={14} />
                  {t('chat.sharePathBtn')}
                </button>
              </div>

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
                    const isLastMine =
                      isMine &&
                      !activeMessages.slice(idx + 1).some(m => m.senderId === currentUserId)
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

      {/* ── Share Learning Path Modal ── */}
      {shareModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShareModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-base)',
              borderRadius: '16px',
              padding: '24px',
              width: '340px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {t('chat.shareTitle')}
              </h3>
              <button
                onClick={() => setShareModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <label
              style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}
            >
              {t('chat.selectStudent')}
            </label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              style={{
                width: '100%',
                border: '1px solid var(--border-base)',
                borderRadius: '8px',
                padding: '8px 10px',
                fontSize: '13px',
                color: 'var(--text-primary)',
                background: 'var(--bg-main)',
                outline: 'none',
                marginBottom: '16px',
              }}
            >
              <option value="">{t('chat.selectStudent')}</option>
              {studentContacts.map(c => (
                <option key={c.userId} value={c.userId}>{c.username}</option>
              ))}
            </select>

            {shareError && (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '8px 12px',
                  background: 'rgba(207,34,46,0.08)',
                  border: '1px solid var(--danger-primary)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--danger-primary)',
                }}
              >
                {shareError}
              </div>
            )}

            <button
              onClick={handleShare}
              disabled={sharing || !selectedStudentId || !shareModal.pathId}
              style={{
                width: '100%',
                background: sharing || !selectedStudentId || !shareModal.pathId
                  ? 'var(--border-base)'
                  : 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 0',
                fontSize: '14px',
                fontWeight: 600,
                cursor: sharing || !selectedStudentId || !shareModal.pathId ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <SendIcon size={14} />
              {sharing ? t('chat.sharing') : t('chat.sharePath')}
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default MentorChatPage
