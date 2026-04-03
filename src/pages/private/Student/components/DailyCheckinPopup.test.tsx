import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import DailyCheckinPopup from './DailyCheckinPopup'

describe('DailyCheckinPopup', () => {
  it('renders nothing when closed', () => {
    const html = renderToStaticMarkup(
      <DailyCheckinPopup
        isOpen={false}
        title="Popup"
        message="Unlocked"
        currentStreakLabel="Current streak"
        moodLabel="Mood"
        productivityLabel="Productivity"
        productivityValueTemplate="{{value}}/5"
        closeLabel="Close"
        stats={null}
        todayCheckin={null}
        onClose={() => {}}
      />,
    )

    expect(html).toBe('')
  })

  it('renders popup message and check-in details when open', () => {
    const html = renderToStaticMarkup(
      <DailyCheckinPopup
        isOpen
        title="Check-in unlocked"
        message="You are now on a 3-day streak."
        currentStreakLabel="Current streak"
        moodLabel="Mood"
        productivityLabel="Productivity"
        productivityValueTemplate="{{value}}/5"
        closeLabel="Close"
        stats={{
          todayCheckedIn: true,
          currentStreak: 3,
          longestStreak: 5,
          totalCheckins: 12,
          lastCheckinDate: null,
          isStreakMilestone: false,
          popupCode: '',
          popupParams: null,
        }}
        todayCheckin={{
          checkinId: 'checkin-1',
          userId: 'user-1',
          checkinDate: '2026-04-04T00:00:00Z',
          mood: 'Focused',
          productivity: 4,
          createdAt: '2026-04-04T10:00:00Z',
        }}
        onClose={() => {}}
      />,
    )

    expect(html).toContain('Check-in unlocked')
    expect(html).toContain('You are now on a 3-day streak.')
    expect(html).toContain('Current streak: 3')
    expect(html).toContain('Focused')
    expect(html).toContain('4/5')
  })

  it('changes popup accent color when streak is higher', () => {
    const html = renderToStaticMarkup(
      <DailyCheckinPopup
        isOpen
        title="Check-in unlocked"
        message="You are now on a 16-day streak."
        currentStreakLabel="Current streak"
        moodLabel="Mood"
        productivityLabel="Productivity"
        productivityValueTemplate="{{value}}/5"
        closeLabel="Close"
        stats={{
          todayCheckedIn: true,
          currentStreak: 16,
          longestStreak: 20,
          totalCheckins: 40,
          lastCheckinDate: null,
          isStreakMilestone: false,
          popupCode: '',
          popupParams: null,
        }}
        todayCheckin={null}
        onClose={() => {}}
      />,
    )

    expect(html).toContain('#ea580c')
    expect(html).toContain('border-radius:6px')
  })
})
