import React, { useState, useRef, useEffect } from 'react'
import { Send, X, Minimize2, Maximize2, Bot, User, Loader2 } from 'lucide-react'
import { sendTutorMessage, requestTutorMessages } from '../../services/SignalR'
import { useTranslation } from 'react-i18next'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
}

interface TutorChatbotProps {
  conversationId?: string | null
  learningPathId?: string | null
  chapterId?: string | null
  lessonId?: string | null
}

const TutorChatbot: React.FC<TutorChatbotProps> = ({
  conversationId = null,
  learningPathId = null,
  chapterId = null,
  lessonId = null
}) => {
  const { t } = useTranslation('student')
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId)
  const [messagesLoaded, setMessagesLoaded] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, isMinimized])

  // Update conversation ID when prop changes
  useEffect(() => {
    setCurrentConversationId(conversationId)
    // Reset messages loaded state when conversation changes
    if (conversationId !== currentConversationId) {
      setMessagesLoaded(false)
      setMessages([])
    }
  }, [conversationId])

  // Load message history when chat is opened and we have a conversation ID
  useEffect(() => {
    if (isOpen && currentConversationId && !messagesLoaded && !loadingHistory) {
      loadMessageHistory()
    }
  }, [isOpen, currentConversationId, messagesLoaded, loadingHistory])

  const loadMessageHistory = async () => {
    if (!currentConversationId || messagesLoaded || loadingHistory) return

    setLoadingHistory(true)
    try {
      const result = await requestTutorMessages(
        currentConversationId,
        1, // pageNumber
        30, // pageSize
        () => {
          // onLoading - already set loading above
        },
        (data) => {
          // onMessagesLoaded
          if (data?.items && Array.isArray(data.items)) {
            const historyMessages: Message[] = data.items.map((item: any) => ({
              id: item.messageId || `msg-${Date.now()}-${Math.random()}`,
              type: item.role === 'user' ? 'user' : 'assistant',
              content: item.content || '',
              timestamp: new Date(item.createdAt || Date.now())
            }))
            setMessages(historyMessages)
          }
        }
      )

      // Set messages from result if not set via callback
      if (result?.items && Array.isArray(result.items) && messages.length === 0) {
        const historyMessages: Message[] = result.items.map((item: any) => ({
          id: item.messageId || `msg-${Date.now()}-${Math.random()}`,
          type: item.role === 'user' ? 'user' : 'assistant',
          content: item.content || '',
          timestamp: new Date(item.createdAt || Date.now())
        }))
        setMessages(historyMessages)
      }

      setMessagesLoaded(true)
    } catch (error: any) {
      console.warn('Failed to load message history:', error.message)
      // Don't show error to user, just continue with empty history
      setMessagesLoaded(true)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSendMessage = async () => {
    const message = inputMessage.trim()
    if (!message || isLoading) return

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
    setIsLoading(true)

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
        learningPathId,
        chapterId,
        lessonId,
        message,
        () => {
          // Message started - already showing loading
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
        }
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
      // Remove loading message and show error
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId))
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: `❌ ${error.message || t('tutorChat.errorSendingMessage')}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
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

  const clearChat = () => {
    setMessages([])
    setCurrentConversationId(null)
  }

  if (!isOpen) {
    return (
      <div style={{ position: 'fixed', bottom: 130, right: 24, zIndex: 1000 }}>
        <button
          onClick={toggleOpen}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, #4F46E5 100%)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0px)'
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.3)'
          }}
          title={t('tutorChat.openTutor')}
        >
          {/* Chat bubble with animation */}
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
            
            {/* Pulse animation */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              animation: 'pulse 2s infinite'
            }} />
          </div>
          
          {/* Notification dot */}
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#10B981',
            border: '2px solid white',
            animation: 'bounce 1s infinite'
          }} />
        </button>
        
        <style>
          {`
            @keyframes pulse {
              0% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0.7;
              }
              50% {
                transform: translate(-50%, -50%) scale(1.1);
                opacity: 0.3;
              }
              100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0.7;
              }
            }
            
            @keyframes bounce {
              0%, 20%, 50%, 80%, 100% {
                transform: translateY(0);
              }
              40% {
                transform: translateY(-3px);
              }
              60% {
                transform: translateY(-1px);
              }
            }
          `}
        </style>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', bottom: 130, right: 24, zIndex: 1000 }}>
      <div
        style={{
          width: 380,
          height: isMinimized ? 60 : 500,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-base)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'height 0.3s ease'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--accent-primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 48
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={20} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {t('tutorChat.aiTutor')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={toggleMinimize}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={isMinimized ? t('tutorChat.maximize') : t('tutorChat.minimize')}
            >
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button
              onClick={toggleOpen}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={t('tutorChat.close')}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div
              style={{
                flex: 1,
                padding: 16,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}
            >
              {loadingHistory && (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    padding: '20px 0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{t('tutorChat.loadingHistory')}</span>
                  </div>
                </div>
              )}

              {messages.length === 0 && !loadingHistory && (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    padding: '20px 0'
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
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: message.type === 'user' ? 'var(--accent-primary)' : 'var(--bg-main)',
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
                      maxWidth: '75%',
                      padding: '8px 12px',
                      borderRadius: 12,
                      background: message.type === 'user' 
                        ? 'var(--accent-primary)' 
                        : 'var(--bg-main)',
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
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              style={{
                padding: 16,
                borderTop: '1px solid var(--border-base)',
                background: 'var(--bg-surface)'
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
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid var(--border-base)',
                    borderRadius: 6,
                    background: 'var(--bg-main)',
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
                  disabled={!inputMessage.trim() || isLoading}
                  style={{
                    padding: 8,
                    background: (!inputMessage.trim() || isLoading) 
                      ? 'var(--text-disabled)' 
                      : 'var(--accent-primary)',
                    border: 'none',
                    borderRadius: 6,
                    color: 'white',
                    cursor: (!inputMessage.trim() || isLoading) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s'
                  }}
                  title={t('tutorChat.sendMessage')}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
              
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  style={{
                    marginTop: 8,
                    padding: '4px 8px',
                    background: 'transparent',
                    border: '1px solid var(--border-base)',
                    borderRadius: 4,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-main)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  {t('tutorChat.clearChat')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default TutorChatbot