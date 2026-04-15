import { create } from 'zustand'
import type { ChannelDto, ChannelMessageDto } from '../types/channel-chat'

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function mergeMessages(
  existing: ChannelMessageDto[],
  incoming: ChannelMessageDto[]
): ChannelMessageDto[] {
  const merged = new Map<string, ChannelMessageDto>()

  for (const message of existing) {
    merged.set(message.messageId, message)
  }

  for (const message of incoming) {
    const current = merged.get(message.messageId)
    merged.set(message.messageId, current ? { ...current, ...message } : message)
  }

  return Array.from(merged.values()).sort((left, right) => {
    const timeDiff = toTimestamp(left.sentAt) - toTimestamp(right.sentAt)
    if (timeDiff !== 0) return timeDiff
    return left.messageId.localeCompare(right.messageId)
  })
}

interface ChannelChatState {
  /** All available channel categories */
  channels: ChannelDto[]
  /** Currently active channel category */
  activeCategory: string | null
  /** Messages keyed by category */
  messagesByCategory: Record<string, ChannelMessageDto[]>
  /** Loading state */
  loading: boolean

  // === Actions ===
  setChannels(channels: ChannelDto[]): void
  setActiveCategory(category: string | null): void
  setMessages(category: string, messages: ChannelMessageDto[]): void
  appendMessage(category: string, message: ChannelMessageDto): void
  updateMessageStatus(
    category: string,
    messageId: string,
    patch: Partial<Pick<ChannelMessageDto, 'deliveredAt' | 'seenAt'>>
  ): void
  setLoading(loading: boolean): void
  reset(): void
}

const useChannelChatStore = create<ChannelChatState>((set) => ({
  channels: [],
  activeCategory: null,
  messagesByCategory: {},
  loading: false,

  setChannels(channels) {
    set({ channels })
  },

  setActiveCategory(category) {
    set({ activeCategory: category })
  },

  setMessages(category, messages) {
    set((state) => ({
      messagesByCategory: {
        ...state.messagesByCategory,
        [category]: mergeMessages(state.messagesByCategory[category] ?? [], messages),
      },
    }))
  },

  appendMessage(category, message) {
    set((state) => {
      const existing = state.messagesByCategory[category] ?? []
      return {
        messagesByCategory: {
          ...state.messagesByCategory,
          [category]: mergeMessages(existing, [message]),
        },
      }
    })
  },

  updateMessageStatus(category, messageId, patch) {
    set((state) => {
      const msgs = state.messagesByCategory[category]
      if (!msgs) return state
      return {
        messagesByCategory: {
          ...state.messagesByCategory,
          [category]: msgs.map((m) =>
            m.messageId === messageId ? { ...m, ...patch } : m
          ),
        },
      }
    })
  },

  setLoading(loading) {
    set({ loading })
  },

  reset() {
    set({
      channels: [],
      activeCategory: null,
      messagesByCategory: {},
      loading: false,
    })
  },
}))

export default useChannelChatStore
