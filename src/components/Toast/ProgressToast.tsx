import React from 'react'
import { CheckCircle2, XCircle, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ProgressToastProps {
  message: string
  progress: number
  status: 'loading' | 'success' | 'error'
  onClose?: () => void
}

const ProgressToast: React.FC<ProgressToastProps> = ({ message, progress, status, onClose }) => {
  const { t } = useTranslation('common')

  const styles = {
    loading: {
      accent: '#2563eb',
      border: 'rgba(37, 99, 235, 0.28)',
      background: 'rgba(239, 246, 255, 0.96)',
      title: t('toast.loading'),
    },
    success: {
      accent: '#16a34a',
      border: 'rgba(22, 163, 74, 0.28)',
      background: 'rgba(240, 253, 244, 0.96)',
      title: t('toast.success'),
    },
    error: {
      accent: '#dc2626',
      border: 'rgba(220, 38, 38, 0.28)',
      background: 'rgba(254, 242, 242, 0.96)',
      title: t('toast.error'),
    },
  } as const

  const current = styles[status]

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, width: 'min(420px, calc(100vw - 32px))' }}>
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${current.border}`,
          background: current.background,
          boxShadow: '0 14px 34px rgba(15, 23, 42, 0.16)',
          backdropFilter: 'blur(8px)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: current.accent,
              background: 'rgba(255,255,255,0.72)',
              flexShrink: 0,
            }}
          >
            {status === 'loading' && <Loader2 size={16} className="animate-spin" />}
            {status === 'success' && <CheckCircle2 size={16} />}
            {status === 'error' && <XCircle size={16} />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: current.accent, marginBottom: 2 }}>{current.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{message}</div>
          </div>

          {status !== 'loading' && onClose && (
            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 4,
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {status === 'loading' && (
          <div style={{ padding: '0 14px 12px' }}>
            <div style={{ height: 6, borderRadius: 999, background: 'rgba(148, 163, 184, 0.25)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.max(2, Math.min(100, progress))}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${current.accent}, #60a5fa)`,
                  transition: 'width 0.25s ease',
                }}
              />
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)', textAlign: 'right', fontWeight: 700 }}>
              {Math.round(progress)}%
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProgressToast
