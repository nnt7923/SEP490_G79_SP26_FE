import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../Axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from '../Axios'
import {
  getDailyCheckinStats,
  getDailyCheckinStatus,
  getTodayCheckin,
  getTodayCheckinWithFallback,
  normalizeDailyCheckinError,
} from './index'

const mockedApi = vi.mocked(api, true)

describe('DailyCheckinService', () => {
  beforeEach(() => {
    mockedApi.get.mockReset()
  })

  it('normalizes today check-in payload', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        value: {
          checkinId: 'checkin-1',
          userId: 'user-1',
          checkinDate: '2026-04-04T00:00:00Z',
          mood: 'Focused',
          productivity: '4',
          createdAt: '2026-04-04T10:00:00Z',
        },
      },
    })

    await expect(getTodayCheckin()).resolves.toEqual({
      checkinId: 'checkin-1',
      userId: 'user-1',
      checkinDate: '2026-04-04T00:00:00Z',
      mood: 'Focused',
      productivity: 4,
      createdAt: '2026-04-04T10:00:00Z',
    })
  })

  it('normalizes stats and status payloads defensively', async () => {
    mockedApi.get
      .mockResolvedValueOnce({
        data: {
          value: {
            todayCheckedIn: true,
            currentStreak: '5',
            longestStreak: '12',
            totalCheckins: '40',
            lastCheckinDate: '2026-04-04T00:00:00Z',
            isStreakMilestone: false,
            popupCode: 'DAILY_CHECKIN_DONE_TODAY_STREAK',
            popupParams: {
              currentStreak: 5,
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          value: {
            todayCheckedIn: false,
            currentStreak: '0',
          },
        },
      })

    await expect(getDailyCheckinStats()).resolves.toEqual({
      todayCheckedIn: true,
      currentStreak: 5,
      longestStreak: 12,
      totalCheckins: 40,
      lastCheckinDate: '2026-04-04T00:00:00Z',
      isStreakMilestone: false,
      popupCode: 'DAILY_CHECKIN_DONE_TODAY_STREAK',
      popupParams: {
        currentStreak: '5',
      },
    })

    await expect(getDailyCheckinStatus()).resolves.toEqual({
      todayCheckedIn: false,
      currentStreak: 0,
    })
  })

  it('falls back to same-day list when today endpoint returns DAILY_CHECKIN_NOT_FOUND', async () => {
    mockedApi.get
      .mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            errorCode: 'DAILY_CHECKIN_NOT_FOUND',
            errorMessage: 'Not found',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          value: [
            {
              checkinId: 'checkin-2',
              userId: 'user-2',
              checkinDate: '2026-04-04T00:00:00Z',
              mood: 'Motivated',
              productivity: 5,
              createdAt: '2026-04-04T11:00:00Z',
            },
          ],
        },
      })

    await expect(getTodayCheckinWithFallback(new Date('2026-04-04T08:00:00Z'))).resolves.toEqual({
      todayCheckin: {
        checkinId: 'checkin-2',
        userId: 'user-2',
        checkinDate: '2026-04-04T00:00:00Z',
        mood: 'Motivated',
        productivity: 5,
        createdAt: '2026-04-04T11:00:00Z',
      },
      todayCheckedIn: true,
    })

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/daily-checkins/me/today')
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/daily-checkins/me?fromDate=2026-04-04&toDate=2026-04-04&pageNumber=1&pageSize=20')
  })

  it('normalizes backend errors into a stable shape', () => {
    expect(normalizeDailyCheckinError({
      response: {
        status: 400,
        data: {
          errorCode: 'PAGE_SIZE_TOO_LARGE',
          errorMessage: 'Too large',
        },
      },
    })).toEqual({
      status: 400,
      code: 'PAGE_SIZE_TOO_LARGE',
      message: 'Too large',
    })
  })
})
