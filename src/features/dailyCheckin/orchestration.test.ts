import { describe, expect, it, vi } from 'vitest'
import { resolveDailyCheckinErrorMessage, syncDailyCheckinAfterActivity } from './orchestration'

describe('daily check-in orchestration', () => {
  it('does nothing when sync is disabled', async () => {
    const deps = {
      getTodayCheckinWithFallback: vi.fn(),
      getDailyCheckinStats: vi.fn(),
      t: vi.fn((key: string) => key),
    }

    await expect(syncDailyCheckinAfterActivity(deps, { enabled: false })).resolves.toBeNull()
    expect(deps.getTodayCheckinWithFallback).not.toHaveBeenCalled()
    expect(deps.getDailyCheckinStats).not.toHaveBeenCalled()
  })

  it('returns popup payload when user becomes checked in after the action', async () => {
    const deps = {
      getTodayCheckinWithFallback: vi.fn().mockResolvedValue({
        todayCheckin: {
          checkinId: 'checkin-1',
          userId: 'user-1',
          checkinDate: '2026-04-04T00:00:00Z',
          mood: 'Focused',
          productivity: 4,
          createdAt: '2026-04-04T10:00:00Z',
        },
        todayCheckedIn: true,
      }),
      getDailyCheckinStats: vi.fn().mockResolvedValue({
        todayCheckedIn: true,
        currentStreak: 7,
        longestStreak: 7,
        totalCheckins: 20,
        lastCheckinDate: '2026-04-04T00:00:00Z',
        isStreakMilestone: true,
        popupCode: 'DAILY_CHECKIN_DONE_TODAY_STREAK',
        popupParams: {
          currentStreak: '7',
        },
      }),
      t: vi.fn((key: string, options?: Record<string, unknown>) => {
        if (key === 'dashboard.dailyCheckin.popup.DAILY_CHECKIN_DONE_TODAY_STREAK') {
          return `Streak ${options?.currentStreak}`
        }
        return ''
      }),
    }

    const result = await syncDailyCheckinAfterActivity(deps, {
      preActionStatus: {
        todayCheckedIn: false,
        currentStreak: 6,
      },
    })

    expect(result?.todayCheckedIn).toBe(true)
    expect(result?.stats.currentStreak).toBe(7)
    expect(result?.shouldShowPopup).toBe(true)
    expect(result?.message).toBe('Streak 7')
  })

  it('suppresses popup when user was already checked in before the action', async () => {
    const deps = {
      getTodayCheckinWithFallback: vi.fn().mockResolvedValue({
        todayCheckin: null,
        todayCheckedIn: true,
      }),
      getDailyCheckinStats: vi.fn().mockResolvedValue({
        todayCheckedIn: true,
        currentStreak: 7,
        longestStreak: 7,
        totalCheckins: 20,
        lastCheckinDate: '2026-04-04T00:00:00Z',
        isStreakMilestone: true,
        popupCode: 'DAILY_CHECKIN_DONE_TODAY_STREAK',
        popupParams: {
          currentStreak: '7',
        },
      }),
      t: vi.fn((key: string, options?: Record<string, unknown>) => {
        if (key === 'dashboard.dailyCheckin.popup.DAILY_CHECKIN_DONE_TODAY_STREAK') {
          return `Streak ${options?.currentStreak}`
        }
        return ''
      }),
    }

    const result = await syncDailyCheckinAfterActivity(deps, {
      preActionStatus: {
        todayCheckedIn: true,
        currentStreak: 7,
      },
    })

    expect(result?.shouldShowPopup).toBe(false)
    expect(result?.message).toBe('')
  })

  it('suppresses popup when pre-action status is unavailable', async () => {
    const deps = {
      getTodayCheckinWithFallback: vi.fn().mockResolvedValue({
        todayCheckin: null,
        todayCheckedIn: true,
      }),
      getDailyCheckinStats: vi.fn().mockResolvedValue({
        todayCheckedIn: true,
        currentStreak: 3,
        longestStreak: 3,
        totalCheckins: 9,
        lastCheckinDate: '2026-04-04T00:00:00Z',
        isStreakMilestone: false,
        popupCode: 'DAILY_CHECKIN_DONE_TODAY',
        popupParams: null,
      }),
      t: vi.fn((key: string) => key === 'dashboard.dailyCheckin.popup.DAILY_CHECKIN_DONE_TODAY' ? 'Done today' : ''),
    }

    const result = await syncDailyCheckinAfterActivity(deps, {
      preActionStatus: null,
    })

    expect(result?.shouldShowPopup).toBe(false)
  })

  it('maps error codes to translated messages when available', () => {
    const t = vi.fn((key: string) => {
      if (key === 'dashboard.dailyCheckin.errors.PAGE_SIZE_TOO_LARGE') return 'Page too large'
      return ''
    })

    expect(resolveDailyCheckinErrorMessage(t, {
      status: 400,
      code: 'PAGE_SIZE_TOO_LARGE',
      message: 'fallback',
    })).toBe('Page too large')
  })
})
