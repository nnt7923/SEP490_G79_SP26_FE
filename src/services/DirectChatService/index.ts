import api from '../Axios'
import type {
  DirectConversationDto,
  DirectMessageDto,
  DirectUnreadCountDto,
  DirectChatContactDto,
} from '../../types/chat'

/** Pagination response wrapper */
interface PaginationDto<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

function toMessagePagination(payload: any): PaginationDto<DirectMessageDto> {
  const candidates = [
    payload?.items,
    payload?.data?.items,
    payload?.result?.items,
    payload?.messages,
    payload?.data?.messages,
    payload?.result?.messages,
    payload?.data,
    payload?.result,
    payload,
  ]

  const items = candidates.find((value) => Array.isArray(value)) ?? []

  return {
    items,
    totalCount: Number(payload?.totalCount ?? payload?.data?.totalCount ?? payload?.result?.totalCount ?? items.length ?? 0),
    pageNumber: Number(payload?.pageNumber ?? payload?.data?.pageNumber ?? payload?.result?.pageNumber ?? 1),
    pageSize: Number(payload?.pageSize ?? payload?.data?.pageSize ?? payload?.result?.pageSize ?? items.length ?? 0),
  }
}

/** 4.1.1 — Lấy danh sách conversations */
export async function getConversations(): Promise<DirectConversationDto[]> {
  return api.get('/direct-chats/conversations')
}

/** 4.1.2 — Lấy danh sách contacts */
export async function getContacts(): Promise<DirectChatContactDto[]> {
  return api.get('/direct-chats/contacts')
}

/** 4.1.3 — Tạo hoặc lấy conversation đã tồn tại */
export async function createOrGetConversation(
  participantId: string
): Promise<DirectConversationDto> {
  return api.post('/direct-chats/conversations', { participantId })
}

/** 4.1.4 — Lấy lịch sử tin nhắn */
export async function getMessages(
  conversationId: string,
  pageNumber = 1,
  pageSize = 30
): Promise<PaginationDto<DirectMessageDto>> {
  const response = await api.get(
    `/direct-chats/conversations/${conversationId}/messages`,
    { params: { pageNumber, pageSize } }
  )
  return toMessagePagination(response)
}

/** 4.1.5 — Gửi tin nhắn qua REST (fallback) */
export async function sendMessageRest(
  conversationId: string,
  content: string,
  messageType: 'Text' | 'Emoji' = 'Text',
  replyToMessageId: string | null = null
): Promise<DirectMessageDto> {
  return api.post(`/direct-chats/conversations/${conversationId}/messages`, {
    content,
    messageType,
    replyToMessageId,
  })
}

/** 4.1.6 — Mark delivered */
export async function markDelivered(messageId: string): Promise<void> {
  return api.patch(`/direct-chats/messages/${messageId}/delivered`)
}

/** 4.1.7 — Mark seen */
export async function markSeen(messageId: string): Promise<void> {
  return api.patch(`/direct-chats/messages/${messageId}/seen`)
}

/** 4.1.8 — Lấy unread count tổng */
export async function getUnreadCount(): Promise<DirectUnreadCountDto> {
  return api.get('/direct-chats/unread-count')
}
