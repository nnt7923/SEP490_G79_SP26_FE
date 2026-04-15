import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import DailyCheckinCard from './DailyCheckinCard'

const labels = {
  title: 'Daily Check-in',
  subtitle: 'Subtitle',
  loading: 'Loading daily check-in...',
  checkedIn: 'Checked in today',
  notCheckedIn: 'Not checked in today',
  empty: 'Complete something to check in.',
  today: 'Today',
  currentStreak: 'Current streak',
  longestStreak: 'Longest streak',
  totalCheckins: 'Total check-ins',
  lastCheckin: 'Last check-in',
  mood: 'Mood',
  productivity: 'Productivity',
  productivityValue: '{{value}}/5',
}

describe('DailyCheckinCard', () => {
  it('renders loading state', () => {
    const html = renderToStaticMarkup(
      <DailyCheckinCard
        loading
        error={null}
        todayCheckin={null}
        stats={null}
        labels={labels}
      />,
    )

    expect(html).toContain('Loading daily check-in...')
  })

  it('renders error state', () => {
    const html = renderToStaticMarkup(
      <DailyCheckinCard
        loading={false}
        error="Failed to load"
        todayCheckin={null}
        stats={null}
        labels={labels}
      />,
    )

    expect(html).toContain('Failed to load')
  })

  it('renders checked-in details and productivity as read-only text', () => {
    const html = renderToStaticMarkup(
      <DailyCheckinCard
        loading={false}
        error={null}
        todayCheckin={{
          checkinId: 'checkin-1',
          userId: 'user-1',
          checkinDate: '2026-04-04T00:00:00Z',
          mood: 'Focused',
          productivity: 4,
          createdAt: '2026-04-04T10:00:00Z',
        }}
        stats={{
          todayCheckedIn: true,
          currentStreak: 4,
          longestStreak: 8,
          totalCheckins: 18,
          lastCheckinDate: '2026-04-04T00:00:00Z',
          isStreakMilestone: false,
          popupCode: '',
          popupParams: null,
        }}
        labels={labels}
      />,
    )

    expect(html).toContain('Checked in today')
    expect(html).toContain('Focused')
    expect(html).toContain('4/5')
  })

  it('renders empty hint when there is no check-in today', () => {
    const html = renderToStaticMarkup(
      <DailyCheckinCard
        loading={false}
        error={null}
        todayCheckin={null}
        stats={{
          todayCheckedIn: false,
          currentStreak: 0,
          longestStreak: 3,
          totalCheckins: 10,
          lastCheckinDate: null,
          isStreakMilestone: false,
          popupCode: '',
          popupParams: null,
        }}
        labels={labels}
      />,
    )

    expect(html).toContain('Not checked in today')
    expect(html).toContain('Complete something to check in.')
  })

  it('changes the streak panel theme when the streak gets higher', () => {
    const html = renderToStaticMarkup(
      <DailyCheckinCard
        loading={false}
        error={null}
        todayCheckin={{
          checkinId: 'checkin-2',
          userId: 'user-1',
          checkinDate: '2026-04-04T00:00:00Z',
          mood: 'Locked in',
          productivity: 5,
          createdAt: '2026-04-04T10:00:00Z',
        }}
        stats={{
          todayCheckedIn: true,
          currentStreak: 16,
          longestStreak: 20,
          totalCheckins: 40,
          lastCheckinDate: '2026-04-04T00:00:00Z',
          isStreakMilestone: false,
          popupCode: '',
          popupParams: null,
        }}
        labels={labels}
      />,
    )

    expect(html).toContain('linear-gradient(135deg, #f59e0b, #ea580c)')
  })
})
