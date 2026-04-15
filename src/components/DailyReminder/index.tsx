import React from 'react'
import { Loader } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type DailyReminderModalProps = {
  open: boolean
  loading?: boolean
  initialTime?: string | null
  onSkip: () => void
  onSave: (time: string) => Promise<void> | void
}

const INPUT_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

const toInputTime = (value?: string | null): string => {
  const normalized = String(value || '').trim()
  if (!normalized) return ''

  if (INPUT_TIME_REGEX.test(normalized)) return normalized

  const parts = normalized.split(':')
  if (parts.length >= 2) {
    const candidate = `${parts[0]}:${parts[1]}`
    if (INPUT_TIME_REGEX.test(candidate)) return candidate
  }

  return ''
}

const toApiTime = (value: string): string => `${value}:00`

const DailyReminderModal: React.FC<DailyReminderModalProps> = ({
  open,
  loading = false,
  initialTime,
  onSkip,
  onSave,
}) => {
  const { t } = useTranslation('student')
  const [value, setValue] = React.useState('')
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setValue(toInputTime(initialTime))
    setError('')
  }, [open, initialTime])

  React.useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onSkip()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [loading, onSkip, open])

  if (!open) return null

  const handleSave = async () => {
    const normalized = value.trim()
    if (!normalized) {
      setError(t('dailyReminder.required'))
      return
    }

    if (!INPUT_TIME_REGEX.test(normalized)) {
      setError(t('dailyReminder.invalid'))
      return
    }

    setError('')
    await onSave(toApiTime(normalized))
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-dark)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 80,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-reminder-title"
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          borderRadius: 10,
          border: '1px solid var(--border-base)',
          background: 'var(--bg-surface-short)',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.24)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-base)' }}>
          <h2 id="daily-reminder-title" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
            {t('dailyReminder.title')}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {t('dailyReminder.subtitle')}
          </p>
        </div>

        <div style={{ padding: 20 }}>
          <label
            htmlFor="daily-reminder-time"
            style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}
          >
            {t('dailyReminder.timeLabel')}
          </label>
          <input
            id="daily-reminder-time"
            type="time"
            value={value}
            disabled={loading}
            onChange={(event) => setValue(event.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: `1px solid ${error ? 'var(--danger-primary)' : 'var(--border-base)'}`,
              background: 'var(--bg-main)',
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
            }}
          />
          {error ? (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--danger-primary)' }}>{error}</p>
          ) : (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{t('dailyReminder.timeHint')}</p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            borderTop: '1px solid var(--border-base)',
            padding: 16,
            background: 'var(--bg-main)',
          }}
        >
          <button
            type="button"
            onClick={onSkip}
            disabled={loading}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid var(--border-base)',
              background: 'var(--bg-surface-short)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {t('dailyReminder.skip')}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSave()
            }}
            disabled={loading}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid var(--text-primary)',
              background: 'var(--text-primary)',
              color: 'var(--bg-surface-short)',
              fontSize: 12,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {loading ? <Loader size={14} className="animate-spin" /> : null}
            {loading ? t('dailyReminder.saving') : t('dailyReminder.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DailyReminderModal
