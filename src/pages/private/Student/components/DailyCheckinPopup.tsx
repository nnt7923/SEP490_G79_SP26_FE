import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Flame, Sparkles, X } from 'lucide-react'
import type { DailyCheckinDto, DailyCheckinStatsDto } from '../../../../services/DailyCheckinService'

type Props = {
  isOpen: boolean
  title: string
  message: string
  currentStreakLabel: string
  moodLabel: string
  productivityLabel: string
  productivityValueTemplate: string
  closeLabel: string
  stats: DailyCheckinStatsDto | null
  todayCheckin: DailyCheckinDto | null
  onClose: () => void
  autoCloseMs?: number
}

type PopupTheme = {
  accent: string
  accentSoft: string
  accentBorder: string
  iconBackground: string
  iconShadow: string
}

const getPopupTheme = (currentStreak: number) => {
  if (currentStreak >= 30) {
    return {
      accent: '#dc2626',
      accentSoft: 'rgba(220, 38, 38, 0.08)',
      accentBorder: 'rgba(220, 38, 38, 0.22)',
      iconBackground: 'linear-gradient(180deg, #ef4444, #dc2626)',
      iconShadow: '0 16px 28px rgba(220, 38, 38, 0.28)',
    }
  }

  if (currentStreak >= 14) {
    return {
      accent: '#ea580c',
      accentSoft: 'rgba(234, 88, 12, 0.08)',
      accentBorder: 'rgba(234, 88, 12, 0.22)',
      iconBackground: 'linear-gradient(180deg, #fb923c, #ea580c)',
      iconShadow: '0 16px 28px rgba(234, 88, 12, 0.28)',
    }
  }

  if (currentStreak >= 7) {
    return {
      accent: '#0891b2',
      accentSoft: 'rgba(8, 145, 178, 0.08)',
      accentBorder: 'rgba(8, 145, 178, 0.22)',
      iconBackground: 'linear-gradient(180deg, #22d3ee, #0891b2)',
      iconShadow: '0 16px 28px rgba(8, 145, 178, 0.28)',
    }
  }

  return {
    accent: '#16a34a',
    accentSoft: 'rgba(22, 163, 74, 0.08)',
    accentBorder: 'rgba(22, 163, 74, 0.22)',
    iconBackground: 'linear-gradient(180deg, #34d399, #16a34a)',
    iconShadow: '0 16px 28px rgba(22, 163, 74, 0.28)',
  }
}

const DailyCheckinPopup: React.FC<Props> = ({
  isOpen,
  title,
  message,
  currentStreakLabel,
  moodLabel,
  productivityLabel,
  productivityValueTemplate,
  closeLabel,
  stats,
  todayCheckin,
  onClose,
  autoCloseMs = 3500,
}) => {
  const { t } = useTranslation('student')

  useEffect(() => {
    if (!isOpen) return
    const timeoutId = window.setTimeout(() => {
      onClose()
    }, autoCloseMs)
    return () => window.clearTimeout(timeoutId)
  }, [autoCloseMs, isOpen, onClose])

  if (!isOpen) return null

  const theme = getPopupTheme(stats?.currentStreak ?? 0)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(15, 23, 42, 0.34)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-checkin-popup-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 6,
          border: `1px solid ${theme.accentBorder}`,
          background: 'var(--bg-surface)',
          boxShadow: '0 28px 80px rgba(15, 23, 42, 0.3)',
          padding: 22,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: theme.iconBackground,
              color: '#fff',
              boxShadow: theme.iconShadow,
            }}
          >
            <CheckCircle2 size={30} />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <h2 id="daily-checkin-popup-title" style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
            {message}
          </p>
        </div>

        <div
          style={{
            border: `1px solid ${theme.accentBorder}`,
            borderRadius: 6,
            background: `linear-gradient(180deg, ${theme.accentSoft}, rgba(255, 255, 255, 0.68))`,
            padding: 14,
            display: 'grid',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: theme.accent, fontWeight: 800, fontSize: 18 }}>
            <Flame size={18} />
            <span>{currentStreakLabel}: {stats?.currentStreak ?? 0}</span>
          </div>

          {(todayCheckin?.mood || todayCheckin?.productivityMessage) ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <div style={{ border: '1px solid var(--border-base)', borderRadius: 6, background: 'var(--bg-surface)', padding: '10px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{moodLabel}</div>
                <div style={{ marginTop: 4, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{todayCheckin?.mood || '-'}</div>
              </div>
              <div style={{ border: '1px solid var(--border-base)', borderRadius: 6, background: 'var(--bg-surface)', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  <Sparkles size={12} />
                  <span>{productivityLabel}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {todayCheckin?.productivityMessage ? t(todayCheckin.productivityMessage) : '-'}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default DailyCheckinPopup
