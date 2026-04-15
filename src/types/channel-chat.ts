// ============================================================
// Channel Chat Types — Category-based global chat
// Based on: ChannelMessages API specs
// ============================================================

export type MessageType = 'Text' | 'Emoji'

/** Channel category DTO */
export interface ChannelDto {
  category: string
  name: string
}

/** Channel message DTO */
export interface ChannelMessageDto {
  messageId: string
  conversationId: string
  category: string
  senderId: string
  senderName: string
  content: string
  messageType: MessageType
  sentAt: string            // ISO 8601
  deliveredAt: string | null
  seenAt: string | null
  replyToMessageId: string | null
  replyToContent: string | null
  replyToSenderId: string | null
}

/** Paginated response for channel messages */
export interface ChannelMessagePagination {
  items: ChannelMessageDto[]
  pageNumber: number
  pageSize: number
  totalCount: number
}

/** Derived: message delivery status for UI */
export type ChannelMessageStatus = 'sent' | 'delivered' | 'seen'

export function getChannelMessageStatus(msg: ChannelMessageDto): ChannelMessageStatus {
  if (msg.seenAt) return 'seen'
  if (msg.deliveredAt) return 'delivered'
  return 'sent'
}
