import React, { useState, useRef, useEffect } from 'react'
import { Send, X, Minimize2, Maximize2, Bot, User, Loader2 } from 'lucide-react'
import { sendTutorMessage, requestTutorMessages, type TutorHubError } from '../../services/SignalR'
import Toast from '../Toast'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
}

const TUTOR_MESSAGE_CACHE_KEY = 'tutorMessagesByConversation'

const readTutorMessageCache = (): Record<string, Array<{ id: string; type: 'user' | 'assistant'; content: string; timestamp: string }>> => {
  try {
    const raw = sessionStorage.getItem(TUTOR_MESSAGE_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writeTutorMessageCache = (
  conversationId: string,
  messages: Message[],
) => {
  try {
    const cache = readTutorMessageCache()
    cache[conversationId] = messages
      .filter((message) => !message.isLoading)
      .map((message) => ({
        id: message.id,
        type: message.type,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
      }))
    sessionStorage.setItem(TUTOR_MESSAGE_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore cache failures
  }
}

const getCachedTutorMessages = (conversationId: string): Message[] => {
  try {
    const cache = readTutorMessageCache()
    const items = Array.isArray(cache[conversationId]) ? cache[conversationId] : []
    return items.map((item) => ({
      id: item.id,
      type: item.type,
      content: item.content,
      timestamp: new Date(item.timestamp),
    }))
  } catch {
    return []
  }
}

const normalizeHistoryItems = (payload: any): any[] => {
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.Items)) return payload.Items
  if (Array.isArray(payload?.data?.items)) return payload.data.items
  if (Array.isArray(payload?.data?.Items)) return payload.data.Items
  return []
}

interface TutorChatbotProps {
  conversationId?: string | null
  learningPathId?: string | null
  chapterId?: string | null
  lessonId?: string | null
  chapterTitle?: string | null
  lessonTitle?: string | null
  isResolvingSession?: boolean
  resolveErrorCode?: string | null
}

const TutorChatbot: React.FC<TutorChatbotProps> = ({
  conversationId = null,
  chapterId = null,
  lessonId = null,
  chapterTitle = null,
  lessonTitle = null,
  isResolvingSession = false,
  resolveErrorCode = null,
}) => {
  const { t } = useTranslation('student')
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId)
  const [messagesLoaded, setMessagesLoaded] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'info' } | null>(null)

  const previousChapterIdRef = useRef<string | null>(chapterId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const resolveSessionLoading = Boolean(isResolvingSession)

  const mapTutorErrorCodeToMessage = (errorCode?: string) => {
    const code = errorCode || 'UNEXPECTED_ERROR'
    switch (code) {
      case 'UNAUTHORIZED':
        return t('tutorChat.errors.UNAUTHORIZED')
      case 'EMPTY_MESSAGE':
        return t('tutorChat.errors.EMPTY_MESSAGE')
      case 'AI_CONFIG_NOT_FOUND':
        return t('tutorChat.errors.AI_CONFIG_NOT_FOUND')
      case 'CONVERSATION_NOT_FOUND':
        return t('tutorChat.errors.CONVERSATION_NOT_FOUND')
      case 'AI_RESPONSE_FAILED':
        return t('tutorChat.errors.AI_RESPONSE_FAILED')
      case 'CHAPTER_NOT_FOUND':
        return t('tutorChat.errors.CHAPTER_NOT_FOUND')
      case 'LESSON_NOT_FOUND':
        return t('tutorChat.errors.LESSON_NOT_FOUND')
      case 'LESSON_NOT_IN_CHAPTER':
        return t('tutorChat.errors.LESSON_NOT_IN_CHAPTER')
      case 'LEARNING_PATH_NOT_FOUND':
        return t('tutorChat.errors.LEARNING_PATH_NOT_FOUND')
      case 'ACCESS_DENIED':
        return t('tutorChat.errors.ACCESS_DENIED')
      case 'CONVERSATION_CONTEXT_MISMATCH':
        return t('tutorChat.errors.CONVERSATION_CONTEXT_MISMATCH')
      case 'CONTEXT_REQUIRED':
        return t('tutorChat.errors.CONTEXT_REQUIRED')
      case 'TUTOR_MESSAGE_LIMIT_EXCEEDED':
        return t('tutorChat.errors.TUTOR_MESSAGE_LIMIT_EXCEEDED')
      case 'CONVERSATION_ID_REQUIRED':
        return t('tutorChat.errors.CONVERSATION_ID_REQUIRED')
      case 'UNEXPECTED_ERROR':
      default:
        return t('tutorChat.errors.UNEXPECTED_ERROR')
    }
  }

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!isOpen || isMinimized) return

    const frameId = window.requestAnimationFrame(() => {
      scrollToBottom('auto')
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isOpen, isMinimized, currentConversationId, messagesLoaded, loadingHistory])

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, isMinimized])

  useEffect(() => {
    const previousChapterId = previousChapterIdRef.current
    if (previousChapterId && chapterId && previousChapterId !== chapterId) {
      setMessages([])
      setMessagesLoaded(false)
      setCurrentConversationId(null)
    }
    previousChapterIdRef.current = chapterId
  }, [chapterId])

  useEffect(() => {
    setCurrentConversationId(conversationId || null)
    setMessagesLoaded(false)
  }, [conversationId])

  useEffect(() => {
    if (!currentConversationId) return
    const cachedMessages = getCachedTutorMessages(currentConversationId)
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages)
      setMessagesLoaded(true)
    }
  }, [currentConversationId])

  useEffect(() => {
    if (!currentConversationId) return
    if (messages.length === 0) return
    writeTutorMessageCache(currentConversationId, messages)
  }, [currentConversationId, messages])

  useEffect(() => {
    if (!resolveErrorCode) return
    setToast({ message: mapTutorErrorCodeToMessage(resolveErrorCode), type: 'error' })
  }, [resolveErrorCode])

  // Load message history when chat is opened and we have a conversation ID
  useEffect(() => {
    if (isOpen && !isMinimized && currentConversationId && !messagesLoaded && !loadingHistory) {
      loadMessageHistory(currentConversationId)
    }
  }, [isOpen, isMinimized, currentConversationId, messagesLoaded, loadingHistory])

  const loadMessageHistory = async (targetConversationId: string) => {
    setLoadingHistory(true)
    try {
      const result = await requestTutorMessages(
        targetConversationId,
        1,
        30,
        undefined,
        undefined,
        (error) => {
          setToast({ message: mapTutorErrorCodeToMessage(error?.code), type: 'error' })
        },
      )

      const historyItems = normalizeHistoryItems(result)

      if (historyItems.length > 0) {
        const historyMessages: Message[] = historyItems.flatMap((item: any) => {
          if (item?.userMessage || item?.assistantMessage) {
            const mixed: Message[] = []
            if (item?.userMessage) {
              mixed.push({
                id: item?.userMessageId || `user-${Date.now()}-${Math.random()}`,
                type: 'user',
                content: item.userMessage,
                timestamp: new Date(item?.createdAt || Date.now()),
              })
            }
            if (item?.assistantMessage) {
              mixed.push({
                id: item?.assistantMessageId || `assistant-${Date.now()}-${Math.random()}`,
                type: 'assistant',
                content: item.assistantMessage,
                timestamp: new Date(item?.createdAt || Date.now()),
              })
            }
            return mixed
          }

          return [{
          id: item.messageId || `msg-${Date.now()}-${Math.random()}`,
          type:
            String(item?.role || item?.senderRole || item?.type || '').toLowerCase() === 'user'
              ? 'user'
              : 'assistant',
          content: item.content || item.message || '',
          timestamp: new Date(item.createdAt || Date.now()),
          }]
        })
        setMessages(historyMessages)
        writeTutorMessageCache(targetConversationId, historyMessages)
      }

      setMessagesLoaded(true)
    } catch (error: any) {
      const tutorError = error as TutorHubError
      setToast({ message: mapTutorErrorCodeToMessage(tutorError?.code), type: 'error' })
      setMessagesLoaded(true)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSendMessage = async () => {
    const message = inputMessage.trim()
    if (!message || isSending) return
    if (!currentConversationId) {
      setToast({ message: mapTutorErrorCodeToMessage('CONVERSATION_ID_REQUIRED'), type: 'warning' })
      return
    }

    const userMessageId = `user-${Date.now()}`
    const userMessage: Message = {
      id: userMessageId,
      type: 'user',
      content: message,
      timestamp: new Date()
    }

    // Add user message
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsSending(true)

    // Add loading message for assistant
    const loadingMessageId = `loading-${Date.now()}`
    const loadingMessage: Message = {
      id: loadingMessageId,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    }
    setMessages(prev => [...prev, loadingMessage])

    try {
      const result = await sendTutorMessage(
        currentConversationId,
        null,
        null,
        lessonId,
        message,
        () => {
          setIsSending(true)
        },
        (data) => {
          // Message received
          const assistantMessage: Message = {
            id: data.assistantMessageId || `assistant-${Date.now()}`,
            type: 'assistant',
            content: data.assistantMessage || '',
            timestamp: new Date(data.createdAt || Date.now())
          }

          // Update conversation ID if this is a new conversation
          if (data.conversationId && !currentConversationId) {
            setCurrentConversationId(data.conversationId)
          }

          // Replace loading message with actual response
          setMessages(prev => prev.map(msg => 
            msg.id === loadingMessageId ? assistantMessage : msg
          ))
        },
        (error) => {
          setToast({ message: mapTutorErrorCodeToMessage(error?.code), type: 'error' })
        },
      )

      // Fallback if onMessageReceived wasn't called
      if (result && !messages.find(m => m.id === result.assistantMessageId)) {
        const assistantMessage: Message = {
          id: result.assistantMessageId || `assistant-${Date.now()}`,
          type: 'assistant',
          content: result.assistantMessage || '',
          timestamp: new Date(result.createdAt || Date.now())
        }

        if (result.conversationId && !currentConversationId) {
          setCurrentConversationId(result.conversationId)
        }

        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessageId ? assistantMessage : msg
        ))
      }
    } catch (error: any) {
      const tutorError = error as TutorHubError
      // Remove loading message and show error
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId))
      setToast({ message: mapTutorErrorCodeToMessage(tutorError?.code), type: 'error' })
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleOpen = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setIsMinimized(false)
    }
  }

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const toggleExpanded = () => {
    if (isMinimized) {
      setIsMinimized(false)
    }
    setIsExpanded((prev) => !prev)
  }

  const panelWidth = isMinimized
    ? 'min(396px, calc(100vw - 24px))'
    : (isExpanded ? 'min(500px, calc(100vw - 24px))' : 'min(396px, calc(100vw - 24px))')
  const panelMaxHeight = 'calc(100vh - 140px)'
  const panelHeight = isMinimized
    ? 72
    : (isExpanded
      ? 'min(620px, calc(100vh - 140px))'
      : 'min(500px, calc(100vh - 140px))')

  if (!isOpen) {
    return (
      <div style={{ position: 'fixed', bottom: 116, right: 20, zIndex: 1000 }}>
        <button
          onClick={toggleOpen}
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'linear-gradient(145deg, color-mix(in oklab, var(--accent-primary) 20%, var(--bg-surface)), color-mix(in oklab, #22D3EE 10%, var(--bg-surface)))',
            border: '1px solid color-mix(in oklab, var(--accent-primary) 26%, var(--border-base))',
            color: 'color-mix(in oklab, var(--accent-primary) 66%, #334155)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 24px rgba(37, 99, 235, 0.18)',
            transition: 'all 0.22s ease',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(37, 99, 235, 0.24)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)'
            e.currentTarget.style.boxShadow = '0 10px 24px rgba(37, 99, 235, 0.18)'
          }}
          title={t('tutorChat.openTutor')}
        >
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg 
              width="28" 
              height="28" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <circle cx="9" cy="10" r="1"/>
              <circle cx="15" cy="10" r="1"/>
              <path d="M9 14s1.5 1 3 1 3-1 3-1"/>
            </svg>
          </div>

          <div style={{
            position: 'absolute',
            top: 7,
            right: 7,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'color-mix(in oklab, #10B981 88%, white)',
            border: '2px solid var(--bg-surface)'
          }} />
        </button>
      </div>
    )
  }

  return (
    <>
      <div style={{ position: 'fixed', bottom: 116, right: 20, zIndex: 1000 }}>
        <div
          style={{
            width: panelWidth,
            height: panelHeight,
            maxHeight: panelMaxHeight,
            background: 'linear-gradient(180deg, color-mix(in oklab, var(--accent-primary) 5%, var(--bg-surface)) 0%, var(--bg-surface) 18%)',
            border: '1px solid color-mix(in oklab, var(--accent-primary) 18%, var(--border-base))',
            borderRadius: 14,
            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.06) inset',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'height 0.22s ease, width 0.22s ease'
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent-primary) 24%, var(--bg-surface)), color-mix(in oklab, #06B6D4 14%, var(--bg-surface)))',
              borderBottom: '1px solid color-mix(in oklab, var(--accent-primary) 26%, var(--border-base))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'color-mix(in oklab, var(--accent-primary) 42%, #ffffff)',
                    color: 'color-mix(in oklab, var(--accent-primary) 72%, #111827)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Bot size={15} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {chapterTitle || t('tutorChat.aiTutor')}
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {lessonTitle || t('tutorChat.unknownLesson')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={toggleMinimize}
                  style={{
                    background: 'color-mix(in oklab, white 92%, var(--bg-main))',
                    border: '1px solid color-mix(in oklab, var(--accent-primary) 20%, var(--border-base))',
                    color: 'color-mix(in oklab, var(--accent-primary) 64%, #334155)',
                    cursor: 'pointer',
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={isMinimized ? t('tutorChat.maximize') : t('tutorChat.minimize')}
                >
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button
                  onClick={toggleExpanded}
                  style={{
                    background: 'color-mix(in oklab, white 92%, var(--bg-main))',
                    border: '1px solid color-mix(in oklab, var(--accent-primary) 20%, var(--border-base))',
                    color: 'color-mix(in oklab, var(--accent-primary) 64%, #334155)',
                    cursor: 'pointer',
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={isExpanded ? 'Reduce chat size' : 'Expand chat size'}
                >
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  onClick={toggleOpen}
                  style={{
                    background: 'color-mix(in oklab, white 92%, var(--bg-main))',
                    border: '1px solid color-mix(in oklab, var(--accent-primary) 20%, var(--border-base))',
                    color: 'color-mix(in oklab, var(--accent-primary) 64%, #334155)',
                    cursor: 'pointer',
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={t('tutorChat.close')}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px dashed color-mix(in oklab, var(--accent-primary) 20%, var(--border-base))',
                  background: 'linear-gradient(90deg, color-mix(in oklab, var(--accent-primary) 5%, var(--bg-surface)), color-mix(in oklab, #22D3EE 3%, var(--bg-surface)))',
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap'
                }}
              >
                {resolveSessionLoading && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Loader2 size={12} className="animate-spin" />
                    <span>{t('tutorChat.resolvingSession')}</span>
                  </div>
                )}
                {loadingHistory && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Loader2 size={12} className="animate-spin" />
                    <span>{t('tutorChat.loadingHistory')}</span>
                  </div>
                )}
                {isSending && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Loader2 size={12} className="animate-spin" />
                    <span>{t('tutorChat.sendingMessage')}</span>
                  </div>
                )}
              </div>

              <div
                style={{
                  flex: 1,
                  padding: '14px 12px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: 'linear-gradient(180deg, color-mix(in oklab, var(--accent-primary) 3%, var(--bg-main)) 0%, var(--bg-main) 34%)'
                }}
              >
                {messages.length === 0 && !loadingHistory && (
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      fontSize: 13,
                      padding: '18px 0'
                    }}
                  >
                    <Bot size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>{t('tutorChat.welcomeMessage')}</p>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      flexDirection: message.type === 'user' ? 'row-reverse' : 'row'
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: message.type === 'user'
                          ? 'linear-gradient(145deg, var(--accent-primary), color-mix(in oklab, var(--accent-primary) 74%, #6366F1))'
                          : 'color-mix(in oklab, #22D3EE 10%, var(--bg-main))',
                        border: message.type === 'assistant' ? '1px solid var(--border-base)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {message.type === 'user' ? (
                        <User size={14} color="white" />
                      ) : (
                        <Bot size={14} color="var(--text-secondary)" />
                      )}
                    </div>
                    <div
                      style={{
                        maxWidth: '78%',
                        padding: '8px 11px',
                        borderRadius: 12,
                        background: message.type === 'user'
                          ? 'linear-gradient(145deg, var(--accent-primary), color-mix(in oklab, var(--accent-primary) 74%, #6366F1))'
                          : 'linear-gradient(145deg, color-mix(in oklab, var(--accent-primary) 8%, var(--bg-surface)), color-mix(in oklab, #22D3EE 4%, var(--bg-surface)))',
                        color: message.type === 'user'
                          ? 'white'
                          : 'var(--text-primary)',
                        fontSize: 13,
                        lineHeight: 1.4,
                        wordBreak: 'break-word'
                      }}
                    >
                      {message.isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Loader2 size={14} className="animate-spin" />
                          <span>{t('tutorChat.thinking')}</span>
                        </div>
                      ) : (
                        message.type === 'assistant' ? (
                          <div style={{ whiteSpace: 'normal' }}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ ...props }: any) => <p style={{ margin: '0 0 8px 0' }} {...props} />,
                                ul: ({ ...props }: any) => <ul style={{ margin: '0 0 8px 16px', paddingLeft: 14 }} {...props} />,
                                ol: ({ ...props }: any) => <ol style={{ margin: '0 0 8px 16px', paddingLeft: 14 }} {...props} />,
                                li: ({ ...props }: any) => <li style={{ marginBottom: 4 }} {...props} />,
                                pre: ({ ...props }: any) => (
                                  <pre
                                    style={{
                                      margin: '8px 0',
                                      padding: '8px 10px',
                                      borderRadius: 8,
                                      overflowX: 'auto',
                                      background: 'color-mix(in oklab, var(--bg-main) 88%, #0f172a)',
                                      border: '1px solid var(--border-base)',
                                    }}
                                    {...props}
                                  />
                                ),
                                code: ({ inline, ...props }: any) => (
                                  <code
                                    style={inline
                                      ? {
                                        padding: '1px 6px',
                                        borderRadius: 6,
                                        background: 'color-mix(in oklab, var(--accent-primary) 10%, var(--bg-main))',
                                        fontSize: '0.92em',
                                      }
                                      : {}}
                                    {...props}
                                  />
                                ),
                                table: ({ ...props }: any) => (
                                  <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                                    <table
                                      style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: 12,
                                        border: '1px solid var(--border-base)',
                                      }}
                                      {...props}
                                    />
                                  </div>
                                ),
                                th: ({ ...props }: any) => (
                                  <th
                                    style={{
                                      border: '1px solid var(--border-base)',
                                      padding: '6px 8px',
                                      textAlign: 'left',
                                      background: 'color-mix(in oklab, var(--accent-primary) 8%, var(--bg-main))',
                                    }}
                                    {...props}
                                  />
                                ),
                                td: ({ ...props }: any) => (
                                  <td
                                    style={{
                                      border: '1px solid var(--border-base)',
                                      padding: '6px 8px',
                                      verticalAlign: 'top',
                                    }}
                                    {...props}
                                  />
                                ),
                              }}
                            >
                              {message.content || ''}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap' }}>
                            {message.content}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div
                style={{
                  padding: 12,
                  borderTop: '1px solid color-mix(in oklab, var(--accent-primary) 18%, var(--border-base))',
                  background: 'linear-gradient(180deg, color-mix(in oklab, var(--accent-primary) 5%, var(--bg-surface)), color-mix(in oklab, #06B6D4 2%, var(--bg-surface)))'
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('tutorChat.typeMessage')}
                    disabled={isSending || resolveSessionLoading}
                    style={{
                      flex: 1,
                      padding: '9px 11px',
                      border: '1px solid color-mix(in oklab, var(--accent-primary) 24%, var(--border-base))',
                      borderRadius: 10,
                      background: 'color-mix(in oklab, var(--accent-primary) 5%, var(--bg-main))',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      outline: 'none',
                      resize: 'none'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-base)'}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isSending || resolveSessionLoading}
                    style={{
                      padding: 8,
                      background: (!inputMessage.trim() || isSending || resolveSessionLoading)
                        ? 'var(--text-disabled)'
                        : 'linear-gradient(145deg, var(--accent-primary), color-mix(in oklab, var(--accent-primary) 72%, #6366F1))',
                      border: 'none',
                      borderRadius: 10,
                      color: 'white',
                      cursor: (!inputMessage.trim() || isSending || resolveSessionLoading) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}
                    title={t('tutorChat.sendMessage')}
                  >
                    {isSending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', top: 84, right: 20, zIndex: 1200 }}>
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
            duration={3200}
          />
        </div>
      )}
    </>
  )
}

export default TutorChatbot