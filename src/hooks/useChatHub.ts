import { useEffect, useCallback, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import useAuthStore from '../store/useAuthStore'
import useChatStore from '../store/useChatStore'
import type {
  DirectConversationDto,
  DirectMessageDto,
  NewMessageNotificationPayload,
} from '../types/chat'
import { getUnreadCount } from '../services/DirectChatService'

// ================================================================
// Hub URL — same origin strategy as existing SignalR services
// ================================================================
const rawBase = (import.meta.env.VITE_API_BASE_URL as string)
  || (import.meta.env.VITE_BASE_URL as string)
  || (import.meta.env.PROD ? 'https://pplp.click/api' : '')
const trimmed = (rawBase || '').replace(/\/+$/, '')
const isDev = typeof window !== 'undefined' && import.meta.env.DEV
const HUB_BASE = isDev
  ? ''
  : trimmed
    ? (trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed)
    : ''

const DIRECT_CHAT_HUB_URL = `${HUB_BASE}/hubs/direct-chat`

// Notification sound (short beep)
function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch {
    // AudioContext not available (e.g. SSR / test env) — ignore
  }
}

export interface UseChatHubOptions {
  /** Called when hub emits `DirectChatError` */
  onError?: (errorCode: string, errorMessage: string) => void
  /** Called when `NewMessageNotification` arrives (for toast / badge) */
  onNewMessageNotification?: (payload: NewMessageNotificationPayload) => void
}

export interface ChatHubRef {
  joinConversation(conversationId: string, page?: number, size?: number): Promise<void>
  leaveConversation(conversationId: string): Promise<void>
  sendMessage(
    conversationId: string,
    content: string,
    messageType?: 'Text' | 'Emoji',
    replyToMessageId?: string | null
  ): Promise<void>
  markDelivered(conversationId: string, messageId: string): Promise<void>
  markSeen(conversationId: string, messageId: string): Promise<void>
  requestConversations(): Promise<void>
  requestChatContacts(): Promise<void>
  startConversation(participantId: string): Promise<void>
}

/**
 * Hook that manages the Direct Chat SignalR connection.
 * Mount it at the page level (StudentChatPage / MentorChatPage).
 * Returns a ref with helper methods to invoke hub methods.
 */
export function useChatHub(options: UseChatHubOptions = {}): ChatHubRef {
  const { onError, onNewMessageNotification } = options
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const store = useChatStore

  // ── Build connection once ──────────────────────────────────────
  function getConnection(): signalR.HubConnection {
    if (!connectionRef.current) {
      connectionRef.current = new signalR.HubConnectionBuilder()
        .withUrl(DIRECT_CHAT_HUB_URL, {
          accessTokenFactory: () => {
            try { return useAuthStore.getState().token ?? '' } catch { return '' }
          },
          withCredentials: true,
        } as signalR.IHttpConnectionOptions)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (ctx) =>
            ctx.previousRetryCount === 0 ? 0 : Math.min(1000 << ctx.previousRetryCount, 30000),
        })
        .configureLogging(signalR.LogLevel.None)
        .build()
    }
    return connectionRef.current
  }

  async function ensureConnected() {
    const conn = getConnection()
    if (conn.state === signalR.HubConnectionState.Connected) return

    // If connecting/reconnecting, wait briefly for the connection to be ready
    const isConnectingOrReconnecting =
      conn.state === signalR.HubConnectionState.Connecting ||
      conn.state === signalR.HubConnectionState.Reconnecting
    if (isConnectingOrReconnecting) {
      const maxWait = 10000
      const startTime = Date.now()
      while (Date.now() - startTime < maxWait) {
        if (conn.state === signalR.HubConnectionState.Connected) return
        if (conn.state === signalR.HubConnectionState.Disconnected) break
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    if (conn.state === signalR.HubConnectionState.Disconnected) {
      await conn.start()
    }
  }

  function normalizeMessagesPayload(arg1: any, arg2?: any): { conversationId: string; messages: DirectMessageDto[] } | null {
    const pickMessages = (payload: any): DirectMessageDto[] | null => {
      const candidates = [
        payload,
        payload?.items,
        payload?.data?.items,
        payload?.result?.items,
        payload?.messages,
        payload?.data?.messages,
        payload?.result?.messages,
        payload?.data,
        payload?.result,
      ]
      const list = candidates.find((value) => Array.isArray(value))
      return Array.isArray(list) ? list : null
    }

    if (typeof arg1 === 'string') {
      const messages = pickMessages(arg2)
      if (messages) return { conversationId: arg1, messages }
    }
    if (arg1 && typeof arg1 === 'object') {
      const conversationId = arg1.conversationId ?? arg1.data?.conversationId ?? arg1.result?.conversationId
      const messages = pickMessages(arg1)
      if (conversationId && messages) return { conversationId, messages }
    }
    return null
  }

  // ── Register event handlers ────────────────────────────────────
  useEffect(() => {
    let mounted = true
    const conn = getConnection()

    // ── Section 5.2: Events FE nhận ──

    conn.on('ConversationsLoaded', (payload: DirectConversationDto[] | { items: DirectConversationDto[] }) => {
      if (!mounted) return
      const list = Array.isArray(payload) ? payload : (payload?.items ?? [])
      store.getState().setConversations(list)
    })

    conn.on('ConversationStarted', (conv: DirectConversationDto) => {
      if (!mounted) return
      store.getState().upsertConversation(conv)
    })

    conn.on('ConversationMessagesLoaded', (arg1: any, arg2?: any) => {
      if (!mounted) return
      const normalized = normalizeMessagesPayload(arg1, arg2)
      if (!normalized) return
      store.getState().setMessages(normalized.conversationId, normalized.messages)
    })

    conn.on('ReceiveMessage', (payload: DirectMessageDto | { message?: DirectMessageDto; data?: DirectMessageDto }) => {
      if (!mounted) return
      const message = (payload as any)?.message ?? (payload as any)?.data ?? payload
      if (!message?.conversationId) return
      store.getState().appendMessage(message.conversationId, message)
    })

    conn.on('ConversationUpdated', (conv: DirectConversationDto) => {
      if (!mounted) return
      store.getState().upsertConversation(conv)
    })

    conn.on('UnreadCountUpdated', (data: { totalUnreadCount?: number; conversationId?: string }) => {
      if (!mounted) return
      if (typeof data?.totalUnreadCount === 'number') {
        // Idempotent: just set the new total
        store.getState().setGlobalUnreadCount(data.totalUnreadCount)
      } else if (data?.conversationId) {
        // Sync total when backend sends only conversationId
        getUnreadCount()
          .then((res) => store.getState().setGlobalUnreadCount(res?.totalUnreadCount ?? 0))
          .catch(() => { })
      }
    })

    conn.on('MessageDelivered', (data: { conversationId: string; messageId: string; deliveredAt: string }) => {
      if (!mounted) return
      store.getState().updateMessageStatus(data.conversationId, data.messageId, { deliveredAt: data.deliveredAt })
    })

    conn.on('MessageSeen', (data: { conversationId: string; messageId: string; seenAt: string }) => {
      if (!mounted) return
      store.getState().updateMessageStatus(data.conversationId, data.messageId, { seenAt: data.seenAt })
    })

    conn.on('NewMessageNotification', (payload: NewMessageNotificationPayload) => {
      if (!mounted) return
      // Increment badge
      store.getState().incrementGlobalUnreadCount(payload.badgeIncrement)
      // Play sound
      if (payload.playSound) playNotificationSound()
      // Notify parent (for toast etc.)
      onNewMessageNotification?.(payload)
    })

    conn.on('ChatContactsLoaded', (_contacts: unknown) => {
      // Contacts not stored in Zustand for now; handled by pages via requestChatContacts + local state
    })

    conn.on('DirectChatError', (err: { errorCode: string; errorMessage: string }) => {
      if (!mounted) return
      onError?.(err.errorCode, err.errorMessage)
    })

    // Start the connection
    ensureConnected().catch(() => {/* silent; hub auto-reconnects */})

    return () => {
      mounted = false
      // Remove all handlers on unmount (avoid leaks across re-mounts)
      conn.off('ConversationsLoaded')
      conn.off('ConversationStarted')
      conn.off('ConversationMessagesLoaded')
      conn.off('ReceiveMessage')
      conn.off('ConversationUpdated')
      conn.off('UnreadCountUpdated')
      conn.off('MessageDelivered')
      conn.off('MessageSeen')
      conn.off('NewMessageNotification')
      conn.off('ChatContactsLoaded')
      conn.off('DirectChatError')
      // Disconnect only when the component fully unmounts
      conn.stop().catch(() => { })
      connectionRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Methods exposed to callers ─────────────────────────────────

  const joinConversation = useCallback(
    async (conversationId: string, page = 1, size = 30) => {
      await ensureConnected()
      return connectionRef.current!.invoke('JoinConversation', conversationId, page, size)
    },
    []
  )

  const leaveConversation = useCallback(
    async (conversationId: string) => {
      await ensureConnected()
      return connectionRef.current!.invoke('LeaveConversation', conversationId)
    },
    []
  )

  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      messageType: 'Text' | 'Emoji' = 'Text',
      replyToMessageId: string | null = null
    ) => {
      await ensureConnected()
      return connectionRef.current!.invoke('SendMessage', conversationId, content, messageType, replyToMessageId)
    },
    []
  )

  const markDelivered = useCallback(
    async (conversationId: string, messageId: string) => {
      await ensureConnected()
      return connectionRef.current!.invoke('MarkDelivered', conversationId, messageId)
    },
    []
  )

  const markSeen = useCallback(
    async (conversationId: string, messageId: string) => {
      await ensureConnected()
      return connectionRef.current!.invoke('MarkSeen', conversationId, messageId)
    },
    []
  )

  const requestConversations = useCallback(async () => {
    await ensureConnected()
    return connectionRef.current!.invoke('RequestConversations')
  }, [])

  const requestChatContacts = useCallback(async () => {
    await ensureConnected()
    return connectionRef.current!.invoke('RequestChatContacts')
  }, [])

  const startConversation = useCallback(
    async (participantId: string) => {
      await ensureConnected()
      return connectionRef.current!.invoke('StartConversation', participantId)
    },
    []
  )

  return {
    joinConversation,
    leaveConversation,
    sendMessage,
    markDelivered,
    markSeen,
    requestConversations,
    requestChatContacts,
    startConversation,
  }
}
