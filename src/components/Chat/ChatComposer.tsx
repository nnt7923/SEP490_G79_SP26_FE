import React, { useState, useRef } from 'react'
import { Send, Smile } from 'lucide-react'

const EMOJI_LIST = ['😄', '😊', '👍', '❤️', '🎉', '🔥', '😂', '🙏', '✅', '💡']

interface Props {
  onSend(content: string, type: 'Text' | 'Emoji'): void
  placeholder?: string
  disabled?: boolean
}

const ChatComposer: React.FC<Props> = ({
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
}) => {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, 'Text')
    setText('')
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEmojiClick = (emoji: string) => {
    onSend(emoji, 'Emoji')
    setShowEmoji(false)
  }

  return (
    <div
      style={{
        padding: '12px 16px',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-base)',
        position: 'relative',
      }}
    >
      {/* Emoji picker */}
      {showEmoji && (
        <div
          style={{
            position: 'absolute',
            bottom: '72px',
            left: '16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-base)',
            borderRadius: '12px',
            padding: '10px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            width: '220px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 50,
          }}
        >
          {EMOJI_LIST.map((em) => (
            <button
              key={em}
              onClick={() => handleEmojiClick(em)}
              style={{
                fontSize: '22px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-main)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'none'
              }}
            >
              {em}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
        {/* Emoji toggle */}
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          disabled={disabled}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: showEmoji ? 'var(--accent-primary)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            padding: '6px',
            borderRadius: '8px',
            flexShrink: 0,
          }}
        >
          <Smile size={20} />
        </button>

        {/* Text input */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            border: '1px solid var(--border-base)',
            borderRadius: '12px',
            padding: '8px 12px',
            fontSize: '14px',
            color: 'var(--text-primary)',
            background: 'var(--bg-main)',
            outline: 'none',
            lineHeight: '1.5',
            maxHeight: '120px',
            overflowY: 'auto',
            fontFamily: 'inherit',
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          style={{
            background: disabled || !text.trim()
              ? 'var(--border-base)'
              : 'var(--accent-primary)',
            border: 'none',
            borderRadius: '10px',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled || !text.trim() ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          <Send size={16} color="#fff" />
        </button>
      </div>
    </div>
  )
}

export default ChatComposer
