import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Book, Timer, X } from 'lucide-react'
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
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)', 
      backdropFilter: 'blur(3px)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 50, 
      padding: 20 
    }}>
      <div style={{ 
        background: 'white', 
        borderRadius: 12, 
        width: '100%',
        maxWidth: 420, 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '20px 20px 16px 20px', 
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between'
        }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <h3 style={{ 
              fontSize: 18, 
              fontWeight: 600, 
              color: '#1e293b', 
              margin: 0,
              marginBottom: 4,
              lineHeight: 1.3
            }}>
              Tạo phiên học tập
            </h3>
            <p style={{ 
              fontSize: 13, 
              color: '#64748b', 
              margin: 0,
              lineHeight: 1.4
            }}>
              Bạn có muốn tạo phiên học tập cho bài tập: <br/>
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
          {/* Session Type */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ 
              display: 'block', 
              fontSize: 13, 
              fontWeight: 600, 
              color: '#374151', 
              marginBottom: 12
            }}>
              Loại phiên học tập
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                type="button"
                onClick={() => handleSessionTypeChange(SessionType.Pomodoro)}
                style={{
                  padding: '14px 12px',
                  border: sessionType === SessionType.Pomodoro ? '2px solid #ef4444' : '2px solid #e2e8f0',
                  borderRadius: 8,
                  background: sessionType === SessionType.Pomodoro ? '#fef2f2' : 'white',
                  color: sessionType === SessionType.Pomodoro ? '#dc2626' : '#64748b',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  if (sessionType !== SessionType.Pomodoro) {
                    e.currentTarget.style.borderColor = '#cbd5e1'
                    e.currentTarget.style.background = '#f8fafc'
                  }
                }}
                onMouseLeave={(e) => {
                  if (sessionType !== SessionType.Pomodoro) {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.background = 'white'
                  }
                }}
              >
                <Timer size={18} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Pomodoro</div>
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>Từ 1 đến 120 phút</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleSessionTypeChange(SessionType.Study)}
                style={{
                  padding: '14px 12px',
                  border: sessionType === SessionType.Study ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                  borderRadius: 8,
                  background: sessionType === SessionType.Study ? '#eff6ff' : 'white',
                  color: sessionType === SessionType.Study ? '#2563eb' : '#64748b',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  if (sessionType !== SessionType.Study) {
                    e.currentTarget.style.borderColor = '#cbd5e1'
                    e.currentTarget.style.background = '#f8fafc'
                  }
                }}
                onMouseLeave={(e) => {
                  if (sessionType !== SessionType.Study) {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.background = 'white'
                  }
                }}
              >
                <Book size={18} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Học tập</div>
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>Từ 1 đến 480 phút</div>
                </div>
              </button>
            </div>
          </div>

          {/* Duration */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ 
              display: 'block', 
              fontSize: 13, 
              fontWeight: 600, 
              color: '#374151', 
              marginBottom: 8
            }}>
              Thời gian (phút)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(getMinDuration(), Math.min(getMaxDuration(), parseInt(e.target.value) || getMinDuration())))}
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
              onFocus={(e) => { 
                e.currentTarget.style.borderColor = '#3b82f6'
              }} 
              onBlur={(e) => { 
                e.currentTarget.style.borderColor = '#e2e8f0'
              }}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Từ {getMinDuration()} đến {getMaxDuration()} phút
            </div>
          </div>

          {/* Title (Optional) */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ 
              display: 'block', 
              fontSize: 13, 
              fontWeight: 600, 
              color: '#374151', 
              marginBottom: 8
            }}>
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
              onFocus={(e) => { 
                e.currentTarget.style.borderColor = '#3b82f6'
              }} 
              onBlur={(e) => { 
                e.currentTarget.style.borderColor = '#e2e8f0'
              }}
            />
          </div>

          {/* Actions */}
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
              onMouseEnter={(e) => { 
                if (!loading) {
                  e.currentTarget.style.background = '#f8fafc'
                  e.currentTarget.style.borderColor = '#cbd5e1'
                }
              }} 
              onMouseLeave={(e) => { 
                if (!loading) {
                  e.currentTarget.style.background = 'white'
                  e.currentTarget.style.borderColor = '#e2e8f0'
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
                padding: '10px 16px', 
                background: loading ? '#94a3b8' : '#1e293b', 
                color: 'white', 
                border: 'none', 
                borderRadius: 6, 
                fontSize: 13, 
                fontWeight: 500, 
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => { 
                if (!loading) {
                  e.currentTarget.style.background = '#0f172a'
                }
              }} 
              onMouseLeave={(e) => { 
                if (!loading) {
                  e.currentTarget.style.background = '#1e293b'
                }
              }}
            >
              {loading && (
                <div className="spinner" style={{ 
                  width: 14, 
                  height: 14, 
                  border: '2px solid rgba(255, 255, 255, 0.3)', 
                  borderTopColor: 'white', 
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