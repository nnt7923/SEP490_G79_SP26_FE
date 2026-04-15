import React from 'react'
import { Flame, Loader2, Trophy } from 'lucide-react'
import type { DailyCheckinDto, DailyCheckinStatsDto } from '../../../../services/DailyCheckinService'

export type DailyCheckinCardLabels = {
  title: string
  subtitle: string
  loading: string
  checkedIn: string
  notCheckedIn: string
  empty: string
  today: string
  currentStreak: string
  longestStreak: string
  totalCheckins: string
  lastCheckin: string
  mood: string
  productivity: string
  productivityValue: string
}

type Props = {
  loading: boolean
  error: string | null
  todayCheckin: DailyCheckinDto | null
  stats: DailyCheckinStatsDto | null
  labels: DailyCheckinCardLabels
}

type StreakTheme = {
  accent: string
  accentSoft: string
  panelBackground: string
  panelBorder: string
}

const getStreakTheme = (currentStreak: number, checkedInToday: boolean): StreakTheme => {
  if (!checkedInToday) {
    return {
      accent: '#2563eb',
      accentSoft: 'rgba(37, 99, 235, 0.10)',
      panelBackground: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
      panelBorder: 'rgba(37, 99, 235, 0.18)',
    }
  }

  if (currentStreak >= 30) {
    return {
      accent: '#dc2626',
      accentSoft: 'rgba(220, 38, 38, 0.10)',
      panelBackground: 'linear-gradient(135deg, #b91c1c, #ea580c)',
      panelBorder: 'rgba(185, 28, 28, 0.22)',
    }
  }

  if (currentStreak >= 14) {
    return {
      accent: '#ea580c',
      accentSoft: 'rgba(234, 88, 12, 0.10)',
      panelBackground: 'linear-gradient(135deg, #f59e0b, #ea580c)',
      panelBorder: 'rgba(234, 88, 12, 0.22)',
    }
  }

  if (currentStreak >= 7) {
    return {
      accent: '#0891b2',
      accentSoft: 'rgba(8, 145, 178, 0.10)',
      panelBackground: 'linear-gradient(135deg, #0f766e, #0891b2)',
      panelBorder: 'rgba(8, 145, 178, 0.22)',
    }
  }

  if (currentStreak >= 3) {
    return {
      accent: '#0f766e',
      accentSoft: 'rgba(15, 118, 110, 0.10)',
      panelBackground: 'linear-gradient(135deg, #15803d, #0f766e)',
      panelBorder: 'rgba(15, 118, 110, 0.22)',
    }
  }

  return {
    accent: '#16a34a',
    accentSoft: 'rgba(22, 163, 74, 0.10)',
    panelBackground: 'linear-gradient(135deg, #15803d, #10b981)',
    panelBorder: 'rgba(22, 163, 74, 0.22)',
  }
}

const formatDisplayDate = (value?: string | null) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString()
}

const DailyCheckinCard: React.FC<Props> = ({
  loading,
  error,
  todayCheckin,
  stats,
  labels,
}) => {
  const checkedInToday = Boolean(stats?.todayCheckedIn || todayCheckin)
  const currentStreak = stats?.currentStreak ?? 0
  const longestStreak = stats?.longestStreak ?? 0
  const totalCheckins = stats?.totalCheckins ?? 0
  const theme = getStreakTheme(currentStreak, checkedInToday)
  const summaryText = todayCheckin
    ? `${labels.mood}: ${todayCheckin.mood || '-'} | ${labels.productivity}: ${todayCheckin.productivity ? labels.productivityValue.replace('{{value}}', String(todayCheckin.productivity)) : '-'}`
    : labels.empty
  const metaText = [
    `${labels.longestStreak}: ${longestStreak}`,
    `${labels.totalCheckins}: ${totalCheckins}`,
    `${labels.lastCheckin}: ${formatDisplayDate(stats?.lastCheckinDate)}`,
  ].join(' | ')

  return (
    <section
      style={{
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: 4,
        padding: 20,
        marginBottom: 16,
        background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.95), rgba(240, 253, 250, 0.92))',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${theme.panelBorder}`,
                background: theme.accentSoft,
                color: theme.accent,
              }}
            >
              <Trophy size={15} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{labels.title}</h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, maxWidth: 620, lineHeight: 1.55 }}>{labels.subtitle}</p>
        </div>

        <div
          style={{
            border: `1px solid ${theme.panelBorder}`,
            borderRadius: 999,
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 700,
            color: checkedInToday ? theme.accent : 'var(--text-secondary)',
            background: checkedInToday ? theme.accentSoft : 'rgba(148, 163, 184, 0.10)',
            whiteSpace: 'nowrap',
          }}
        >
          {checkedInToday ? labels.checkedIn : labels.notCheckedIn}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: 12 }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{labels.loading}</span>
        </div>
      ) : error ? (
        <div style={{ padding: 14, border: '1px solid var(--danger-primary)', borderRadius: 4, background: 'var(--bg-red-tint)', color: 'var(--danger-primary)', fontSize: 12 }}>
          {error}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          <div
            style={{
              borderRadius: 4,
              padding: 18,
              border: `1px solid ${theme.panelBorder}`,
              background: theme.panelBackground,
              color: '#ffffff',
              display: 'grid',
              gap: 12,
              minHeight: 180,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                <Flame size={14} />
                <span>{labels.currentStreak}</span>
              </div>
                <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.92 }}>{checkedInToday ? labels.today : labels.notCheckedIn}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 60, fontWeight: 900, lineHeight: 0.9 }}>{currentStreak}</div>
              <div style={{ fontSize: 16, fontWeight: 700, paddingBottom: 8 }}>{checkedInToday ? labels.checkedIn : labels.notCheckedIn}</div>
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.92)' }}>
              {summaryText}
            </div>

            <div style={{ fontSize: 12, lineHeight: 1.7, color: 'rgba(255,255,255,0.82)', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: 12 }}>
              {metaText}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default DailyCheckinCard
