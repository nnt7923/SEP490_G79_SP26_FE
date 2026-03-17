import React from 'react'
import { ArrowLeft } from 'lucide-react'

interface Props {
  name: string
  onBack?: () => void
}

const ChatHeader: React.FC<Props> = ({ name, onBack }) => {
  const initials = name
    .split(' ')
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-base)',
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ArrowLeft size={18} />
        </button>
      )}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--accent-primary)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <span
        style={{
          fontWeight: 600,
          fontSize: '15px',
          color: 'var(--text-primary)',
        }}
      >
        {name}
      </span>
    </div>
  )
}

export default ChatHeader
