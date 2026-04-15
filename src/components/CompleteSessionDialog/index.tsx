import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface CompleteSessionDialogProps {
  isOpen: boolean
  onConfirm: (submissionType: 0 | 1) => void
  onCancel: () => void
  loading?: boolean
}

const CompleteSessionDialog: React.FC<CompleteSessionDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  loading = false
}) => {
  const { t } = useTranslation('student')
  const [selectedType, setSelectedType] = useState<0 | 1>(0)

  const submitTypes = [
    {
      id: 0 as const,
      icon: '💾',
      title: t('focusSession.saveProgressTitle'),
      description: t('focusSession.saveProgressDescription')
    },
    {
      id: 1 as const,
      icon: '✅',
      title: t('focusSession.submitFinalTitle'),
      description: t('focusSession.submitFinalDescription')
    }
  ]

  const handleConfirm = () => {
    onConfirm(selectedType)
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
        border: '2px solid var(--accent-primary)', 
        borderRadius: 4, 
        maxWidth: 500, 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        {/* Header */}
        <div style={{ 
          padding: 20, 
          borderBottom: '1px solid var(--border-base)',
          textAlign: 'center'
        }}>
          <h3 style={{ 
            fontSize: 16, 
            fontWeight: 700, 
            color: 'var(--text-primary)', 
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}>
            🏁 {t('focusSession.completeDialogTitle')}
          </h3>
        </div>
        
        {/* Content */}
        <div style={{ padding: 20 }}>
          <div style={{ 
            fontSize: 13, 
            color: 'var(--text-secondary)', 
            marginBottom: 16,
            fontWeight: 600
          }}>
            {t('focusSession.completeDialogChooseType')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {submitTypes.map((type) => (
              <label
                key={type.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: 12,
                  border: '1px solid var(--border-base)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: selectedType === type.id ? 'var(--bg-blue-hover)' : 'var(--bg-main)',
                  borderColor: selectedType === type.id ? 'var(--accent-primary)' : 'var(--border-base)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedType !== type.id) {
                    e.currentTarget.style.background = 'var(--gray-50)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedType !== type.id) {
                    e.currentTarget.style.background = 'var(--bg-main)'
                  }
                }}
              >
                <input
                  type="radio"
                  name="submitType"
                  value={type.id}
                  checked={selectedType === type.id}
                  onChange={() => setSelectedType(type.id)}
                  style={{ margin: '2px 0 0 0' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 6, 
                    marginBottom: 4 
                  }}>
                    <span style={{ fontSize: 14 }}>{type.icon}</span>
                    <span style={{ 
                      fontSize: 13, 
                      fontWeight: 600, 
                      color: 'var(--text-primary)' 
                    }}>
                      {type.title}
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    color: 'var(--text-secondary)', 
                    lineHeight: 1.4 
                  }}>
                    {type.description}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* Early finish warning */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
            padding: 12,
            background: 'var(--warning-surface)',
            border: '1px solid var(--warning-primary)',
            borderRadius: 4
          }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <div style={{ fontSize: 12, color: 'var(--warning-primary)' }}>
              <strong>{t('focusSession.completeDialogEarlyFinish')}</strong>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{ 
                flex: 1, 
                padding: '10px 16px', 
                border: '1px solid var(--border-base)', 
                borderRadius: 2, 
                background: 'var(--bg-surface-short)', 
                color: 'var(--text-primary)', 
                fontSize: 13, 
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
              {t('focusSession.cancel')}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              style={{ 
                flex: 1, 
                padding: '10px 16px', 
                background: loading ? 'var(--text-secondary)' : 'var(--text-primary)', 
                color: 'var(--bg-surface-short)', 
                border: 'none', 
                borderRadius: 2, 
                fontSize: 13, 
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
              🏁 {loading ? t('focusSession.completingBtn') : t('focusSession.completeBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompleteSessionDialog