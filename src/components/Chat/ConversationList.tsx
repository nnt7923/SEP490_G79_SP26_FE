import React from 'react'
import { Search } from 'lucide-react'
import type { DirectConversationDto } from '../../types/chat'
import ConversationItem from './ConversationItem'

interface Props {
  conversations: DirectConversationDto[]
  currentUserId: string
  activeConversationId: string | null
  searchQuery: string
  onSearchChange(q: string): void
  onSelect(conversationId: string): void
  searchPlaceholder?: string
  emptyLabel?: string
}

const ConversationList: React.FC<Props> = ({
  conversations,
  currentUserId,
  activeConversationId,
  searchQuery,
  onSearchChange,
  onSelect,
  searchPlaceholder = 'Search...',
  emptyLabel = 'No conversations',
}) => {
  const filtered = conversations.filter((c) => {
    const name =
      c.mentorId === currentUserId ? c.studentName : c.mentorName
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRight: '1px solid var(--border-base)',
        background: 'var(--bg-surface)',
      }}
    >
      {/* Search */}
      <div style={{ padding: '12px 12px 8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-base)',
            borderRadius: '8px',
            padding: '6px 10px',
          }}
        >
          <Search size={14} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }}>
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-disabled)',
              fontSize: '13px',
              paddingTop: '32px',
            }}
          >
            {emptyLabel}
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.conversationId}
              conversation={conv}
              currentUserId={currentUserId}
              isActive={conv.conversationId === activeConversationId}
              onClick={() => onSelect(conv.conversationId)}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default ConversationList
