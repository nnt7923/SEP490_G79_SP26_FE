import { create } from 'zustand'
import type {
  DirectConversationDto,
  DirectMessageDto,
  PendingLearningPathShareSummaryDto,
} from '../types/chat'

interface ChatState {
  // Conversations map
  conversationsById: Record<string, DirectConversationDto>
  // Conversation IDs sorted by lastMessageAt desc
  conversationOrder: string[]
  // Messages map keyed by conversationId
  messagesByConversationId: Record<string, DirectMessageDto[]>
  // Global unread count
  globalUnreadCount: number
  // Currently open conversation
  activeConversationId: string | null
  // Pending learning path shares (Student only)
  pendingLearningPathShares: PendingLearningPathShareSummaryDto[]

  // === Actions ===

  /** Load/replace full conversation list */
  setConversations(list: DirectConversationDto[]): void

  /** Upsert a single conversation (from ConversationUpdated event) */
  upsertConversation(conv: DirectConversationDto): void

  /** Load full message history for a conversation */
  setMessages(conversationId: string, messages: DirectMessageDto[]): void

  /** Append a new incoming/outgoing message */
  appendMessage(conversationId: string, message: DirectMessageDto): void

  /** Patch a message (e.g. deliveredAt/seenAt updated) */
  updateMessageStatus(
    conversationId: string,
    messageId: string,
    patch: Partial<Pick<DirectMessageDto, 'deliveredAt' | 'seenAt'>>
  ): void

  setGlobalUnreadCount(count: number): void
  incrementGlobalUnreadCount(by: number): void
  setActiveConversation(id: string | null): void
  setPendingShares(shares: PendingLearningPathShareSummaryDto[]): void
  removePendingShare(shareId: string): void
  reset(): void
}

/** Sort conversation IDs by lastMessageAt descending (null → bottom) */
function sortedOrder(convMap: Record<string, DirectConversationDto>): string[] {
  return Object.keys(convMap).sort((a, b) => {
    const ta = convMap[a]?.lastMessageAt ? new Date(convMap[a].lastMessageAt!).getTime() : 0
    const tb = convMap[b]?.lastMessageAt ? new Date(convMap[b].lastMessageAt!).getTime() : 0
    return tb - ta
  })
}

const useChatStore = create<ChatState>((set, get) => ({
  conversationsById: {},
  conversationOrder: [],
  messagesByConversationId: {},
  globalUnreadCount: 0,
  activeConversationId: null,
  pendingLearningPathShares: [],

  setConversations(list) {
    const map: Record<string, DirectConversationDto> = {}
    list.forEach(c => { map[c.conversationId] = c })
    set({ conversationsById: map, conversationOrder: sortedOrder(map) })
  },

  upsertConversation(conv) {
    set(state => {
      const updated = { ...state.conversationsById, [conv.conversationId]: conv }
      return { conversationsById: updated, conversationOrder: sortedOrder(updated) }
    })
  },

  setMessages(conversationId, messages) {
    set(state => ({
      messagesByConversationId: {
        ...state.messagesByConversationId,
        [conversationId]: messages,
      },
    }))
  },

  appendMessage(conversationId, message) {
    set(state => {
      const existing = state.messagesByConversationId[conversationId] ?? []
      // Avoid duplicates
      if (existing.some(m => m.messageId === message.messageId)) return state
      return {
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: [...existing, message],
        },
      }
    })
  },

  updateMessageStatus(conversationId, messageId, patch) {
    set(state => {
      const msgs = state.messagesByConversationId[conversationId]
      if (!msgs) return state
      return {
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: msgs.map(m =>
            m.messageId === messageId ? { ...m, ...patch } : m
          ),
        },
      }
    })
  },

  setGlobalUnreadCount(count) {
    set({ globalUnreadCount: Math.max(0, count) })
  },

  incrementGlobalUnreadCount(by) {
    set(state => ({ globalUnreadCount: state.globalUnreadCount + by }))
  },

  setActiveConversation(id) {
    set({ activeConversationId: id })
  },

  setPendingShares(shares) {
    set({ pendingLearningPathShares: shares })
  },

  removePendingShare(shareId) {
    set(state => ({
      pendingLearningPathShares: state.pendingLearningPathShares.filter(
        s => s.shareId !== shareId
      ),
    }))
  },

  reset() {
    set({
      conversationsById: {},
      conversationOrder: [],
      messagesByConversationId: {},
      globalUnreadCount: 0,
      activeConversationId: null,
      pendingLearningPathShares: [],
    })
  },
}))

export default useChatStore
