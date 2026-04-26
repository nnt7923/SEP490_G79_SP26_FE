import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { SessionType } from '../../services/FocusSessionService'

interface FocusSessionDialogProps {
  isOpen: boolean
  taskTitle: string
  onConfirm: (sessionType: SessionType, duration: number, title?: string) => void
  onCancel: () => void
  loading?: boolean
}

const FocusSessionDialog: React.FC<FocusSessionDialogProps> = ({
  isOpen,
  taskTitle,
  onConfirm,
  onCancel,
  loading = false
}) => {
  const [sessionType] = useState<SessionType>(SessionType.Study)
  const [duration, setDuration] = useState<number>(25)
  const [title, setTitle] = useState<string>('')

  const getMinDuration = () => 1
  const getMaxDuration = () => 480

  const handleConfirm = () => {
    onConfirm(sessionType, duration, title.trim() || undefined)
  }

  if (!isOpen) return null

  const dialogContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        padding: 20
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '20px 20px 16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ flex: 1, paddingRight: 12 }}>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#1e293b',
                margin: 0,
                marginBottom: 4,
                lineHeight: 1.3
              }}
            >
              Tạo phiên học tập
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              Bạn có muốn tạo phiên học tập cho bài tập: <br />
              <span style={{ fontWeight: 500, color: '#1e293b' }}>{taskTitle}</span>?
            </p>
          </div>
          <button
            onClick={onCancel}
            style={{
              padding: 6,
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9'
              e.currentTarget.style.color = '#475569'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 8
              }}
            >
              Thời gian (phút)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) =>
                setDuration(
                  Math.max(
                    getMinDuration(),
                    Math.min(getMaxDuration(), parseInt(e.target.value, 10) || getMinDuration())
                  )
                )
              }
              min={getMinDuration()}
              max={getMaxDuration()}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                border: '2px solid #e2e8f0',
                borderRadius: 6,
                background: 'white',
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Từ {getMinDuration()} đến {getMaxDuration()} phút
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 8
              }}
            >
              Tiêu đề (tùy chọn)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề cho phiên học tập..."
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                border: '2px solid #e2e8f0',
                borderRadius: 6,
                background: 'white',
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: 6,
                background: 'white',
                color: '#64748b',
                fontSize: 13,
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: 'none',
                borderRadius: 6,
                background: '#1e293b',
                color: 'white',
                fontSize: 13,
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? 'Đang tạo...' : 'Tạo phiên'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') {
    return dialogContent
  }

  return createPortal(dialogContent, document.body)
}

export default FocusSessionDialog