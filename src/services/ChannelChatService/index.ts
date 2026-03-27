import api from '../Axios'
import type {
  ChannelDto,
  ChannelMessageDto,
  ChannelMessagePagination,
} from '../../types/channel-chat'

/** Normalize paginated response to ChannelMessagePagination */
function toMessagePagination(payload: any): ChannelMessagePagination {
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
    totalCount: Number(
      payload?.totalCount ?? payload?.data?.totalCount ?? payload?.result?.totalCount ?? items.length ?? 0
    ),
    pageNumber: Number(
      payload?.pageNumber ?? payload?.data?.pageNumber ?? payload?.result?.pageNumber ?? 1
    ),
    pageSize: Number(
      payload?.pageSize ?? payload?.data?.pageSize ?? payload?.result?.pageSize ?? items.length ?? 0
    ),
  }
}

/** Get all channel categories */
export async function getChannels(): Promise<ChannelDto[]> {
  const response: any = await api.get('/channel-messages/channels')
  if (Array.isArray(response)) return response
  const c = [
    response?.items,
    response?.data?.items,
    response?.data,
    response?.result,
  ]
  return c.find((v: any) => Array.isArray(v)) ?? []
}

/** Get messages for a channel category */
export async function getChannelMessages(
  category: string,
  pageNumber = 1,
  pageSize = 30
): Promise<ChannelMessagePagination> {
  const response = await api.get(
    `/channel-messages/channels/${encodeURIComponent(category)}/messages`,
    { params: { pageNumber, pageSize } }
  )
  return toMessagePagination(response)
}

/** Send a message to a channel category */
export async function sendChannelMessage(
  category: string,
  body: {
    content: string
    messageType: 'Text' | 'Emoji'
    replyToMessageId?: string | null
  }
): Promise<ChannelMessageDto> {
  return api.post(
    `/channel-messages/channels/${encodeURIComponent(category)}/messages`,
    body
  )
}

/** Mark a channel message as delivered */
export async function markChannelDelivered(messageId: string): Promise<void> {
  return api.patch(`/channel-messages/messages/${messageId}/delivered`)
}

/** Mark a channel message as seen */
export async function markChannelSeen(messageId: string): Promise<void> {
  return api.patch(`/channel-messages/messages/${messageId}/seen`)
}
