import { create } from 'zustand'
import type {
  DirectConversationDto,
  DirectMessageDto,
  PendingLearningPathShareSummaryDto,
  ReceivedLearningPathShareSummaryDto,
  ShareStatus,
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
  // Received learning path shares with status (Student only)
  receivedLearningPathShares: ReceivedLearningPathShareSummaryDto[]

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
  upsertReceivedShare(share: ReceivedLearningPathShareSummaryDto): void
  removePendingShare(shareId: string): void
  patchShareMessage(
    shareId: string,
    patch: Partial<Pick<DirectMessageDto, 'shareStatus' | 'respondedAt' | 'learningPathTitle' | 'learningPathDescription' | 'pathId' | 'mentorName' | 'studentName'>>
  ): void
  reconcilePendingShares(shares: PendingLearningPathShareSummaryDto[]): void
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
  receivedLearningPathShares: [],

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

  upsertReceivedShare(share) {
    set((state) => {
      const index = state.receivedLearningPathShares.findIndex((item) => item.shareId === share.shareId)
      if (index < 0) {
        return {
          receivedLearningPathShares: [share, ...state.receivedLearningPathShares],
        }
      }

      const next = [...state.receivedLearningPathShares]
      next[index] = {
        ...next[index],
        ...share,
      }

      return {
        receivedLearningPathShares: next,
      }
    })
  },

  removePendingShare(shareId) {
    set(state => ({
      pendingLearningPathShares: state.pendingLearningPathShares.filter(
        s => s.shareId !== shareId
      ),
    }))
  },

  patchShareMessage(shareId, patch) {
    set(state => {
      const nextMessagesByConversationId: Record<string, DirectMessageDto[]> = {}
      let changed = false

      for (const [conversationId, messages] of Object.entries(state.messagesByConversationId)) {
        nextMessagesByConversationId[conversationId] = messages.map((message) => {
          const messageShareId =
            message.learningPathShareId ??
            (message as any)?.LearningPathShareId ??
            (message as any)?.learningPathShare?.shareId ??
            (message as any)?.LearningPathShare?.shareId

          if (messageShareId !== shareId) return message
          changed = true
          return {
            ...message,
            ...patch,
            learningPathShare: {
              ...(message.learningPathShare ?? {}),
              shareId,
              status: (patch.shareStatus ?? message.shareStatus ?? message.learningPathShare?.status) as ShareStatus | undefined,
              respondedAt: patch.respondedAt ?? message.respondedAt ?? message.learningPathShare?.respondedAt,
              pathId: patch.pathId ?? message.pathId ?? message.learningPathShare?.pathId,
              learningPathTitle: patch.learningPathTitle ?? message.learningPathTitle ?? message.learningPathShare?.learningPathTitle,
              learningPathDescription: patch.learningPathDescription ?? message.learningPathDescription ?? message.learningPathShare?.learningPathDescription,
              mentorName: patch.mentorName ?? message.mentorName ?? message.learningPathShare?.mentorName,
              studentName: patch.studentName ?? message.studentName ?? message.learningPathShare?.studentName,
            },
          }
        })
      }

      if (!changed) return state

      const nextReceivedShares = state.receivedLearningPathShares.map((share) => {
        if (share.shareId !== shareId) return share
        return {
          ...share,
          status: (patch.shareStatus ?? share.status) as ShareStatus,
          respondedAt: patch.respondedAt ?? share.respondedAt,
          pathId: patch.pathId ?? share.pathId,
          learningPathTitle: patch.learningPathTitle ?? share.learningPathTitle,
          learningPathDescription: patch.learningPathDescription ?? share.learningPathDescription,
          mentorName: patch.mentorName ?? share.mentorName,
        }
      })

      return {
        messagesByConversationId: nextMessagesByConversationId,
        receivedLearningPathShares: nextReceivedShares,
      }
    })
  },

  reconcilePendingShares(shares) {
    const patchShareMessage = get().patchShareMessage
    const upsertReceivedShare = get().upsertReceivedShare
    const receivedLearningPathShares = get().receivedLearningPathShares

    shares.forEach((share) => {
      // Không overwrite nếu share đã được quyết định (Accepted/Rejected) trong store
      const existing = receivedLearningPathShares.find((r) => r.shareId === share.shareId)
      if (existing && existing.status !== 'Pending') return

      patchShareMessage(share.shareId, {
        shareStatus: 'Pending',
        learningPathTitle: share.learningPathTitle,
        learningPathDescription: share.learningPathDescription,
        pathId: share.pathId,
        mentorName: share.mentorName,
        respondedAt: null,
      })
      upsertReceivedShare({
        shareId: share.shareId,
        pathId: share.pathId,
        learningPathTitle: share.learningPathTitle,
        learningPathDescription: share.learningPathDescription,
        mentorId: share.mentorId,
        mentorName: share.mentorName,
        status: 'Pending',
        sentAt: share.sentAt,
        respondedAt: null,
      })
    })
  },

  reset() {
    set({
      conversationsById: {},
      conversationOrder: [],
      messagesByConversationId: {},
      globalUnreadCount: 0,
      activeConversationId: null,
      pendingLearningPathShares: [],
      receivedLearningPathShares: [],
    })
  },
}))

export default useChatStore
