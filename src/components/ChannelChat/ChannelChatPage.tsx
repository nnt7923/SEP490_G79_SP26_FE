import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Hash, LogOut, Reply, Smile } from 'lucide-react'
import Layout from '../Layout'
import useAuthStore from '../../store/useAuthStore'
import useChannelChatStore from '../../store/useChannelChatStore'
import { useNavigate } from 'react-router-dom'
import ROUTER from '../../router/ROUTER'
import { useChannelChatHub } from '../../hooks/useChannelChatHub'
import { getChannels, getChannelMessages, sendChannelMessage } from '../../services/ChannelChatService'
import type { ChannelMessageDto } from '../../types/channel-chat'
import { getChannelMessageStatus } from '../../types/channel-chat'
import MessageStatusIcon from '../Chat/MessageStatusIcon'
import { useTheme } from '../../contexts/ThemeContext'
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
} from '@chatscope/chat-ui-kit-react'
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react'
import ChatReplyPreview from '../Chat/ChatReplyPreview'
import {
  normalizeChatMessageContent,
  getReplyPreviewText,
} from '../Chat/chatReply'
import type { SidebarNavItem } from '../Sidebar'

// ── Helpers ──────────────────────────────────────────────────────

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getMessagePosition(
  messages: ChannelMessageDto[],
  idx: number
): 'single' | 'first' | 'normal' | 'last' {
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

// Reply helpers adapted for ChannelMessageDto
type ChannelReplyPreview =
  | { kind: 'text'; senderLabel: string; content: string }

interface ChannelReplyDraft {
  messageId: string
  preview: ChannelReplyPreview
}

function buildChannelReplyDraft(
  message: ChannelMessageDto,
  currentUserId: string,
  youLabel: string
): ChannelReplyDraft | null {
  const senderLabel = message.senderId === currentUserId ? youLabel : (message.senderName || '?')
  return {
    messageId: message.messageId,
    preview: {
      kind: 'text',
      senderLabel,
      content: normalizeChatMessageContent(message.content).trim() || '...',
    },
  }
}

function buildChannelReplyPreviewForMessage(
  message: ChannelMessageDto,
  messages: ChannelMessageDto[],
  currentUserId: string,
  youLabel: string,
  unavailableLabel: string
): ChannelReplyPreview | null {
  if (!message.replyToMessageId) return null
  const source = messages.find((m) => m.messageId === message.replyToMessageId)
  if (source) {
    const senderLabel = source.senderId === currentUserId ? youLabel : (source.senderName || '?')
    return {
      kind: 'text',
      senderLabel,
      content: normalizeChatMessageContent(source.content).trim() || unavailableLabel,
    }
  }
  const senderLabel = message.replyToSenderId === currentUserId ? youLabel : '?'
  return {
    kind: 'text',
    senderLabel,
    content: normalizeChatMessageContent(message.replyToContent).trim() || unavailableLabel,
  }
}

// ── Props ───────────────────────────────────────────────────────

export interface ChannelChatPageProps {
  role: 'Student' | 'Mentor'
  sidebarNavItems: SidebarNavItem[]
  embedded?: boolean
}

// ── Component ───────────────────────────────────────────────────

const ChannelChatPage: React.FC<ChannelChatPageProps> = ({ role, sidebarNavItems, embedded = false }) => {
  const { t } = useTranslation('student')
  const { t: tc } = useTranslation('common')
  const { theme } = useTheme()
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  const {
    channels,
    activeCategory,
    messagesByCategory,
    setChannels,
    setActiveCategory,
    setMessages,
    appendMessage,
  } = useChannelChatStore()

  const [showEmoji, setShowEmoji] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [replyDraft, setReplyDraft] = useState<ChannelReplyDraft | null>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const deliveredRef = useRef<Set<string>>(new Set())
  const seenRef = useRef<Set<string>>(new Set())
  const messageListId = 'channel-chat-message-list'
  const messageInputRef = useRef<any>(null)

  const currentUserId = String(user?.id ?? '')
  const activeMessages = activeCategory
    ? (messagesByCategory[activeCategory] ?? [])
    : []

  const hub = useChannelChatHub({
    onError: (code) => {
      if (code === 'UNAUTHORIZED') {
        logout()
        navigate(ROUTER.LOGIN)
      }
    },
  })

  // ── Load channels on mount ──
  useEffect(() => {
    getChannels()
      .then((list) => {
        setChannels(list)
        if (list.length > 0 && !activeCategory) {
          setActiveCategory(list[0].category)
        }
      })
      .catch(() => {})

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Join channel + load messages when active category changes ──
  useEffect(() => {
    if (!activeCategory) return
    hub.joinChannel(activeCategory).catch(() => {})
    getChannelMessages(activeCategory)
      .then((res) => setMessages(activeCategory, res?.items ?? []))
      .catch(() => {})

    // Load sent shares for the channel (mentor, no studentId → status=null)
    return () => {
      hub.leaveChannel(activeCategory).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory])

  // ── Clear state on category switch ──
  useEffect(() => {
    deliveredRef.current.clear()
    seenRef.current.clear()
    setShowEmoji(false)
    setInputValue('')
    setReplyDraft(null)
  }, [activeCategory])

  // ── Track scroll position ──
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
  }, [activeCategory, activeMessages.length])

  // ── Auto mark delivered/seen ──
  useEffect(() => {
    if (!activeCategory || activeMessages.length === 0) return
    const canMarkSeen = isAtBottom && (typeof document === 'undefined' || document.hasFocus())
    for (const msg of activeMessages) {
      if (msg.senderId === currentUserId) continue
      if (!msg.deliveredAt && !deliveredRef.current.has(msg.messageId)) {
        deliveredRef.current.add(msg.messageId)
        hub.markDelivered(activeCategory, msg.messageId).catch(() => {
          deliveredRef.current.delete(msg.messageId)
        })
      }
      if (canMarkSeen && !msg.seenAt && !seenRef.current.has(msg.messageId)) {
        seenRef.current.add(msg.messageId)
        hub.markSeen(activeCategory, msg.messageId).catch(() => {
          seenRef.current.delete(msg.messageId)
        })
      }
    }
  }, [activeCategory, activeMessages, isAtBottom, currentUserId])

  // ── Handlers ──
  const handleSelectChannel = (category: string) => {
    setActiveCategory(category)
  }

  const handleReplyToMessage = (message: ChannelMessageDto) => {
    const draft = buildChannelReplyDraft(
      message,
      currentUserId,
      t('chat.you', { defaultValue: 'You' })
    )
    if (!draft) return
    setReplyDraft(draft)
    setShowEmoji(false)
    messageInputRef.current?.focus?.()
  }

  // Primary: send via SignalR → server broadcasts ReceiveChannelMessage to ALL clients in the channel.
  // Fallback: if SignalR fails, send via REST + optimistic local update (receiver won't get real-time).
  const handleSendText = async (_innerHtml: string, textContent: string) => {
    if (!activeCategory) return
    const trimmed = textContent.trim()
    if (!trimmed) return
    const replyId = replyDraft?.messageId ?? null
    setReplyDraft(null)
    setInputValue('')

    try {
      // SignalR send → server saves AND broadcasts to group → everyone gets ReceiveChannelMessage
      const saved = await hub.sendMessage(activeCategory, trimmed, 'Text', replyId)
      if (saved?.messageId) {
        appendMessage(activeCategory, saved)
      }
    } catch (err) {
      console.warn('[ChannelChat] SignalR send failed, falling back to REST:', err)
      // Fallback: REST send + optimistic local update (other clients won't get real-time for this msg)
      try {
        const saved = await sendChannelMessage(activeCategory, {
          content: trimmed,
          messageType: 'Text',
          replyToMessageId: replyId,
        })
        if (saved?.messageId) {
          appendMessage(activeCategory, saved)
        }
      } catch {
        // Both failed — restore input
        setReplyDraft(replyId ? replyDraft : null)
        setInputValue(trimmed)
      }
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate(ROUTER.LOGIN)
  }

  // ── Build sidebar config ──
  const sidebarConfig = {
    navItems: sidebarNavItems,
    actions: [
      {
        label: tc('sidebar.logout'),
        icon: <LogOut className="w-5 h-5" />,
        onClick: handleLogout,
        variant: 'danger' as const,
      },
    ],
    brand: {
      name: t('channelChat.title', { defaultValue: 'Community' }),
      subtitle: role === 'Mentor' ? 'Mentor' : 'Student',
    },
  }

  const pickerTheme = theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT

  const youLabel = t('chat.you', { defaultValue: 'You' })
  const unavailableLabel = t('chat.replyUnavailable', {
    defaultValue: 'Message deleted or unavailable',
  })

  const composerPlaceholder = replyDraft
    ? `${t('chat.replyingTo', { name: replyDraft.preview.senderLabel })}: ${getReplyPreviewText(replyDraft.preview as any)}`
    : t('channelChat.typePlaceholder', { defaultValue: 'Type a message...' })

  const content = (
    <MainContainer responsive className="chat-kit-container">
          <ChatSidebar position="left" scrollable={false} className="chat-kit-sidebar">
            <div className="chat-kit-sidebar-header">
              <div className="chat-kit-tabs">
                <button className="chat-kit-tab" aria-pressed="true">
                  <Hash size={14} />
                  {t('channelChat.channels', { defaultValue: 'Channels' })}
                </button>
              </div>
            </div>
            <div className="chat-kit-sidebar-body">
              {channels.length === 0 ? (
                <div className="chat-kit-empty chat-kit-empty--fill">
                  {t('channelChat.noChannels', { defaultValue: 'No channels available' })}
                </div>
              ) : (
                <ChatConversationList>
                  {channels.map((ch) => (
                    <Conversation
                      key={ch.category}
                      name={ch.name}
                      info=""
                      active={ch.category === activeCategory}
                      onClick={() => handleSelectChannel(ch.category)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleSelectChannel(ch.category)
                        }
                      }}
                    >
                      <Avatar>
                        <span className="chat-kit-avatar">
                          <Hash size={16} />
                        </span>
                      </Avatar>
                    </Conversation>
                  ))}
                </ChatConversationList>
              )}
            </div>
          </ChatSidebar>

          <ChatContainer className="chat-kit-panel">
            <ConversationHeader>
              <Avatar>
                <span className="chat-kit-avatar chat-kit-avatar--header">
                  <Hash size={18} />
                </span>
              </Avatar>
              <ConversationHeader.Content
                userName={activeCategory
                  ? channels.find((c) => c.category === activeCategory)?.name || activeCategory
                  : t('channelChat.title', { defaultValue: 'Community' })
                }
              />
            </ConversationHeader>

            <MessageList
              id={messageListId}
              className="chat-kit-message-list"
              autoScrollToBottom
              scrollBehavior="smooth"
            >
              {!activeCategory ? (
                <MessageList.Content>
                  <div className="chat-kit-empty">
                    {t('channelChat.selectChannel', { defaultValue: 'Select a channel to start chatting' })}
                  </div>
                </MessageList.Content>
              ) : activeMessages.length === 0 ? (
                <MessageList.Content>
                  <div className="chat-kit-empty">
                    {t('channelChat.noMessages', { defaultValue: 'No messages yet' })}
                  </div>
                </MessageList.Content>
              ) : (
                activeMessages.map((msg, idx) => {
                  const isMine = msg.senderId === currentUserId
                  const position = getMessagePosition(activeMessages, idx)
                  const isLastMine =
                    isMine && !activeMessages.slice(idx + 1).some((m) => m.senderId === currentUserId)
                  const displayContent = normalizeChatMessageContent(msg.content)
                  const replyPreview = buildChannelReplyPreviewForMessage(
                    msg,
                    activeMessages,
                    currentUserId,
                    youLabel,
                    unavailableLabel
                  )
                  const showSenderName = !isMine && (position === 'single' || position === 'first')

                  // Normal text/emoji message
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
                      <Message.CustomContent>
                        <div className="chat-kit-message-body">
                          {showSenderName && (
                            <div className="channel-chat-sender-name">{msg.senderName}</div>
                          )}
                          {replyPreview && (
                            <ChatReplyPreview preview={replyPreview as any} />
                          )}
                          <div className="chat-kit-message-text">{displayContent}</div>
                        </div>
                      </Message.CustomContent>
                      <Message.Footer>
                        <div className="chat-kit-message-footer-row">
                          <span className="chat-kit-message-meta">
                            {formatMessageTime(msg.sentAt)}
                            {isMine && isLastMine && (
                              <MessageStatusIcon status={getChannelMessageStatus(msg)} />
                            )}
                          </span>
                          <button
                            type="button"
                            className="chat-kit-reply-action"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              handleReplyToMessage(msg)
                            }}
                          >
                            <Reply size={12} />
                            {t('chat.reply')}
                          </button>
                        </div>
                      </Message.Footer>
                    </Message>
                  )
                })
              )}
            </MessageList>

            {replyDraft && (
              <div className="chat-kit-composer-reply">
                <div className="chat-kit-composer-reply__label">
                  {t('chat.replyingTo', { name: replyDraft.preview.senderLabel })}
                </div>
                <ChatReplyPreview
                  preview={replyDraft.preview as any}
                  variant="composer"
                  onClose={() => setReplyDraft(null)}
                />
              </div>
            )}

            <MessageInput
              placeholder={composerPlaceholder}
              onSend={handleSendText}
              onChange={(_html, textContent) => setInputValue(textContent)}
              value={inputValue}
              activateAfterChange
              attachButton={false}
              disabled={!activeCategory}
              sendDisabled={!activeCategory}
              ref={messageInputRef}
            />

            <InputToolbox className="chat-kit-input-toolbox">
              <button
                onClick={() => activeCategory && setShowEmoji(!showEmoji)}
                className={`chat-kit-emoji-toggle ${showEmoji ? 'is-active' : ''}`}
                aria-label="Toggle emoji"
                disabled={!activeCategory}
              >
                <Smile size={20} />
              </button>
              {showEmoji && activeCategory && (
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
  )

  if (embedded) {
    return content
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="chat-kit-page">
        {content}
      </div>
    </Layout>
  )
}

export default ChannelChatPage
