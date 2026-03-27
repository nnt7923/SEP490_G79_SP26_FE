import { useCallback, useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import useAuthStore from '../store/useAuthStore'
import useChannelChatStore from '../store/useChannelChatStore'
import type { ChannelMessageDto } from '../types/channel-chat'

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

const CHANNEL_HUB_URL = `${HUB_BASE}/hubs/channel`

function playNotificationSound() {
  try {
    const AudioContextCtor = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return

    const ctx = new AudioContextCtor()
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
    // Ignore browsers/environments that do not allow AudioContext here.
  }
}

export interface UseChannelChatHubOptions {
  onError?: (errorCode: string, errorMessage: string) => void
}

export interface ChannelChatHubRef {
  joinChannel(category: string): Promise<void>
  leaveChannel(category: string): Promise<void>
  sendMessage(
    category: string,
    content: string,
    messageType?: 'Text' | 'Emoji',
    replyToMessageId?: string | null
  ): Promise<ChannelMessageDto | null>
  markDelivered(category: string, messageId: string): Promise<void>
  markSeen(category: string, messageId: string): Promise<void>
}

const SUBJECT_CATEGORY_BY_VALUE: Record<string, string> = {
  '0': 'ProgrammingLanguage',
  '1': 'Frontend',
  '2': 'Backend',
  '3': 'Database',
  '5': 'Cloud',
  '6': 'DataScience',
  '7': 'MachineLearning',
  '8': 'Algorithms',
  '9': 'GameDevelopment',
  '10': 'Mobile',
  '11': 'Other',
}

function normalizeCategoryValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  if (!normalized) return null
  return SUBJECT_CATEGORY_BY_VALUE[normalized] ?? normalized
}

function normalizeChannelMessage(
  payload: any,
  preferredCategory?: string | null
): ChannelMessageDto | null {
  if (!payload || typeof payload !== 'object') return null

  const nested =
    payload?.message ??
    payload?.data?.message ??
    payload?.result?.message ??
    payload?.data ??
    payload?.result ??
    payload

  if (!nested || typeof nested !== 'object') return null

  const category = normalizeCategoryValue(
    preferredCategory ??
    nested.category ??
    nested.Category ??
    payload?.category ??
    payload?.Category
  )
  const messageId = nested.messageId ?? nested.MessageId
  const conversationId = nested.conversationId ?? nested.ConversationId

  if (!category || !messageId || !conversationId) return null

  return {
    ...nested,
    category,
    messageId,
    conversationId,
    senderId: nested.senderId ?? nested.SenderId ?? '',
    senderName: nested.senderName ?? nested.SenderName ?? '',
    content: nested.content ?? nested.Content ?? '',
    messageType: nested.messageType ?? nested.MessageType ?? 'Text',
    sentAt: nested.sentAt ?? nested.SentAt ?? new Date().toISOString(),
    deliveredAt: nested.deliveredAt ?? nested.DeliveredAt ?? null,
    seenAt: nested.seenAt ?? nested.SeenAt ?? null,
    replyToMessageId: nested.replyToMessageId ?? nested.ReplyToMessageId ?? null,
    replyToContent: nested.replyToContent ?? nested.ReplyToContent ?? null,
    replyToSenderId: nested.replyToSenderId ?? nested.ReplyToSenderId ?? null,
  }
}

function resolveCategoryKey(
  category: string | null,
  conversationId: string | null | undefined,
  joinedCategories: Set<string>,
  store: typeof useChannelChatStore
): string | null {
  if (!category && joinedCategories.size === 1) {
    return Array.from(joinedCategories)[0]
  }

  if (!category) {
    return store.getState().activeCategory
  }

  const state = store.getState()
  const knownCategories = new Set<string>([
    ...state.channels.map((item) => item.category),
    ...Object.keys(state.messagesByCategory),
    ...Array.from(joinedCategories),
  ])

  if (knownCategories.has(category)) {
    return category
  }

  if (conversationId) {
    for (const [knownCategory, messages] of Object.entries(state.messagesByCategory)) {
      if (messages.some((message) => message.conversationId === conversationId)) {
        return knownCategory
      }
    }
  }

  if (joinedCategories.size === 1) {
    return Array.from(joinedCategories)[0]
  }

  return state.activeCategory ?? category
}

function normalizeStatusPayload(
  key: 'deliveredAt' | 'seenAt',
  arg1: any,
  arg2?: any,
  arg3?: any
): { category: string; messageId: string; deliveredAt?: string | null; seenAt?: string | null } | null {
  if (typeof arg1 === 'string' && typeof arg2 === 'string') {
    return {
      category: normalizeCategoryValue(arg1) ?? arg1,
      messageId: arg2,
      [key]: typeof arg3 === 'string' ? arg3 : null,
    }
  }

  const payload = arg1?.data ?? arg1?.result ?? arg1
  if (!payload || typeof payload !== 'object') return null

  const category = normalizeCategoryValue(payload.category ?? payload.Category)
  const messageId = payload.messageId ?? payload.MessageId
  if (!category || !messageId) return null

  return {
    category,
    messageId,
    deliveredAt: payload.deliveredAt ?? payload.DeliveredAt ?? null,
    seenAt: payload.seenAt ?? payload.SeenAt ?? null,
  }
}

export function useChannelChatHub(options: UseChannelChatHubOptions = {}): ChannelChatHubRef {
  const { onError } = options
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const readyPromiseRef = useRef<Promise<void> | null>(null)
  const joinedCategoriesRef = useRef<Set<string>>(new Set())
  const onErrorRef = useRef(onError)
  const store = useChannelChatStore

  onErrorRef.current = onError

  useEffect(() => {
    let mounted = true

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(CHANNEL_HUB_URL, {
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

    connectionRef.current = conn

    conn.onclose((err) => console.log('[ChannelHub] closed', err))
    conn.onreconnecting((err) => console.log('[ChannelHub] reconnecting...', err))
    conn.onreconnected(async (id) => {
      console.log('[ChannelHub] reconnected', id)
      const categories = Array.from(joinedCategoriesRef.current)
      await Promise.all(
        categories.map((category) =>
          conn.invoke('JoinChannel', category).catch((err) => {
            console.error('[ChannelHub] rejoin failed:', category, err)
          })
        )
      )
    })

    conn.on('ReceiveChannelMessage', (payload: any) => {
      if (!mounted) return
      const rawConversationId =
        payload?.conversationId ??
        payload?.ConversationId ??
        payload?.message?.conversationId ??
        payload?.message?.ConversationId ??
        payload?.data?.conversationId ??
        payload?.data?.ConversationId
      const rawCategory = normalizeCategoryValue(
        payload?.category ??
        payload?.Category ??
        payload?.message?.category ??
        payload?.message?.Category ??
        payload?.data?.category ??
        payload?.data?.Category
      )
      const categoryKey = resolveCategoryKey(rawCategory, rawConversationId, joinedCategoriesRef.current, store)
      const message = normalizeChannelMessage(payload, categoryKey)
      if (!message) {
        console.warn('[ChannelHub] unable to normalize ReceiveChannelMessage payload', payload)
        return
      }
      store.getState().appendMessage(message.category, message)

      const currentUserId = String(useAuthStore.getState().user?.id ?? '')
      if (currentUserId && String(message.senderId ?? '') !== currentUserId) {
        playNotificationSound()
      }
    })

    conn.on('ChannelMessageDelivered', (arg1: any, arg2?: any, arg3?: any) => {
      if (!mounted) return
      const data = normalizeStatusPayload('deliveredAt', arg1, arg2, arg3)
      if (!data) return
      const categoryKey = resolveCategoryKey(data.category, null, joinedCategoriesRef.current, store)
      if (!categoryKey) return
      store.getState().updateMessageStatus(categoryKey, data.messageId, { deliveredAt: data.deliveredAt ?? null })
    })

    conn.on('ChannelMessageSeen', (arg1: any, arg2?: any, arg3?: any) => {
      if (!mounted) return
      const data = normalizeStatusPayload('seenAt', arg1, arg2, arg3)
      if (!data) return
      const categoryKey = resolveCategoryKey(data.category, null, joinedCategoriesRef.current, store)
      if (!categoryKey) return
      store.getState().updateMessageStatus(categoryKey, data.messageId, { seenAt: data.seenAt ?? null })
    })

    conn.on('ChannelChatError', (err: any) => {
      if (!mounted) return
      console.error('[ChannelHub] ChannelChatError:', err)
      onErrorRef.current?.(err?.errorCode ?? 'UNKNOWN', err?.errorMessage ?? '')
    })

    readyPromiseRef.current = conn.start()
      .then(() => {
        console.log('[ChannelHub] connected:', conn.state)
      })
      .catch((err) => {
        console.error('[ChannelHub] initial connection failed:', err)
      })

    return () => {
      mounted = false
      joinedCategoriesRef.current.clear()
      conn.off('ReceiveChannelMessage')
      conn.off('ChannelMessageDelivered')
      conn.off('ChannelMessageSeen')
      conn.off('ChannelChatError')
      conn.stop().catch(() => {})
      connectionRef.current = null
      readyPromiseRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function waitForReady(): Promise<signalR.HubConnection> {
    if (readyPromiseRef.current) {
      await readyPromiseRef.current
    }

    const conn = connectionRef.current
    if (!conn) throw new Error('[ChannelHub] no connection')

    if (conn.state === signalR.HubConnectionState.Disconnected) {
      await conn.start()
    }

    if (
      conn.state === signalR.HubConnectionState.Connecting ||
      conn.state === signalR.HubConnectionState.Reconnecting
    ) {
      const deadline = Date.now() + 10000
      while (Date.now() < deadline) {
        if (conn.state === signalR.HubConnectionState.Connected) return conn
        if (conn.state === signalR.HubConnectionState.Disconnected) {
          await conn.start()
          return conn
        }
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    return conn
  }

  const joinChannel = useCallback(async (category: string) => {
    const conn = await waitForReady()
    joinedCategoriesRef.current.add(category)
    return conn.invoke('JoinChannel', category)
  }, [])

  const leaveChannel = useCallback(async (category: string) => {
    const conn = await waitForReady()
    joinedCategoriesRef.current.delete(category)
    return conn.invoke('LeaveChannel', category)
  }, [])

  const sendMessage = useCallback(async (
    category: string,
    content: string,
    messageType: 'Text' | 'Emoji' = 'Text',
    replyToMessageId: string | null = null
  ) => {
    const conn = await waitForReady()
    const result = await conn.invoke('SendMessage', category, content, messageType, replyToMessageId)
    return normalizeChannelMessage(result, category)
  }, [])

  const markDelivered = useCallback(async (category: string, messageId: string) => {
    const conn = await waitForReady()
    return conn.invoke('MarkDelivered', category, messageId)
  }, [])

  const markSeen = useCallback(async (category: string, messageId: string) => {
    const conn = await waitForReady()
    return conn.invoke('MarkSeen', category, messageId)
  }, [])

  return {
    joinChannel,
    leaveChannel,
    sendMessage,
    markDelivered,
    markSeen,
  }
}
