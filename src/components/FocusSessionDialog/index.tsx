import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('student')
  const [sessionType, setSessionType] = useState<SessionType>(SessionType.Pomodoro)
  const [duration, setDuration] = useState<number>(25)
  const [title, setTitle] = useState<string>('')

  const handleConfirm = () => {
    onConfirm(sessionType, duration, title.trim() || undefined)
  }

  const handleSessionTypeChange = (type: SessionType) => {
    setSessionType(type)
    // Set default duration based on session type
    if (type === SessionType.Pomodoro) {
      setDuration(25)
    } else {
      setDuration(60)
    }
  }

  const getMaxDuration = () => {
    return sessionType === SessionType.Pomodoro ? 120 : 480
  }

  const getMinDuration = () => {
    return 1
  }

  if (!isOpen) return null

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'var(--overlay-dark)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 50, 
      padding: 16 
    }}>
      <div style={{ 
        background: 'var(--bg-surface-short)', 
        border: '1px solid var(--border-base)', 
        borderRadius: 2, 
        maxWidth: 500, 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--border-base)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {'>'} Tạo phiên học tập
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
            Bạn có muốn tạo phiên học tập cho task: <strong>{taskTitle}</strong>?
          </p>
        </div>
        
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Session Type */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 11, 
              fontWeight: 600, 
              color: 'var(--text-secondary)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px', 
              marginBottom: 8 
            }}>
              $ Loại phiên
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => handleSessionTypeChange(SessionType.Pomodoro)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid var(--border-base)',
                  borderRadius: 2,
                  background: sessionType === SessionType.Pomodoro ? 'var(--bg-blue-hover)' : 'var(--bg-surface)',
                  borderColor: sessionType === SessionType.Pomodoro ? 'var(--accent-primary)' : 'var(--border-base)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🍅 Pomodoro
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                  1-120 phút
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleSessionTypeChange(SessionType.Study)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid var(--border-base)',
                  borderRadius: 2,
                  background: sessionType === SessionType.Study ? 'var(--bg-blue-hover)' : 'var(--bg-surface)',
                  borderColor: sessionType === SessionType.Study ? 'var(--accent-primary)' : 'var(--border-base)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📚 Study
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                  1-480 phút
                </div>
              </button>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 11, 
              fontWeight: 600, 
              color: 'var(--text-secondary)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px', 
              marginBottom: 6 
            }}>
              $ Thời gian (phút)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(getMinDuration(), Math.min(getMaxDuration(), parseInt(e.target.value) || getMinDuration())))}
              min={getMinDuration()}
              max={getMaxDuration()}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                fontSize: 13, 
                border: '1px solid var(--border-base)', 
                borderRadius: 2, 
                background: 'var(--bg-main)', 
                color: 'var(--text-primary)', 
                outline: 'none', 
                boxSizing: 'border-box' 
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} 
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              Từ {getMinDuration()} đến {getMaxDuration()} phút
            </div>
          </div>

          {/* Title (Optional) */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 11, 
              fontWeight: 600, 
              color: 'var(--text-secondary)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px', 
              marginBottom: 6 
            }}>
              $ Tiêu đề (tùy chọn)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề cho phiên học tập..."
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                fontSize: 13, 
                border: '1px solid var(--border-base)', 
                borderRadius: 2, 
                background: 'var(--bg-main)', 
                color: 'var(--text-primary)', 
                outline: 'none', 
                boxSizing: 'border-box' 
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} 
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, paddingTop: 16 }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{ 
                flex: 1, 
                padding: '8px 16px', 
                border: '1px solid var(--border-base)', 
                borderRadius: 2, 
                background: 'var(--bg-surface-short)', 
                color: 'var(--text-primary)', 
                fontSize: 12, 
                fontWeight: 600, 
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
              onMouseEnter={(e) => { 
                if (!loading) {
                  e.currentTarget.style.background = 'var(--gray-100)' 
                }
              }} 
              onMouseLeave={(e) => { 
                if (!loading) {
                  e.currentTarget.style.background = 'var(--bg-surface-short)' 
                }
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              style={{ 
                flex: 1, 
                padding: '8px 16px', 
                background: loading ? 'var(--text-secondary)' : 'var(--text-primary)', 
                color: 'var(--bg-surface-short)', 
                border: 'none', 
                borderRadius: 2, 
                fontSize: 12, 
                fontWeight: 600, 
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
              onMouseEnter={(e) => { 
                if (!loading) {
                  e.currentTarget.style.background = 'var(--text-strong)' 
                }
              }} 
              onMouseLeave={(e) => { 
                if (!loading) {
                  e.currentTarget.style.background = 'var(--text-primary)' 
                }
              }}
            >
              {loading && (
                <div className="animate-spin" style={{ 
                  width: 14, 
                  height: 14, 
                  border: '2px solid var(--bg-surface-short)', 
                  borderTopColor: 'transparent', 
                  borderRadius: '50%' 
                }} />
              )}
              {loading ? 'Đang tạo...' : 'Tạo phiên'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FocusSessionDialog