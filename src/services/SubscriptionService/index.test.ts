import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../Axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import axiosInstance from '../Axios'
import SubscriptionService from './index'

const mockedAxios = vi.mocked(axiosInstance, true)

describe('SubscriptionService shop APIs', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset()
    mockedAxios.post.mockReset()
  })

  it('normalizes mentor quota and keeps unlimited as -1', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        subscriptionId: 'sub-1',
        packageId: 'pkg-1',
        packageName: 'Starter',
        hasActiveSubscription: true,
        sharesFromMentorLimit: -1,
        sharesFromMentorUsed: 3,
        sharesFromMentorRemaining: -1,
        validationRequestLimit: 5,
        validationRequestsUsed: 0,
        validationRequestsRemaining: 5,
        taskReviewLimit: 4,
        taskReviewsUsed: 1,
        taskReviewsRemaining: 3,
      },
    })

    await expect(SubscriptionService.getMentorQuota()).resolves.toEqual({
      subscriptionId: 'sub-1',
      packageId: 'pkg-1',
      packageName: 'Starter',
      hasActiveSubscription: true,
      sharesFromMentorLimit: -1,
      sharesFromMentorUsed: 3,
      sharesFromMentorRemaining: -1,
      validationRequestLimit: 5,
      validationRequestsUsed: 0,
      validationRequestsRemaining: 5,
      taskReviewLimit: 4,
      taskReviewsUsed: 1,
      taskReviewsRemaining: 3,
    })
  })

  it('sends mentorPackageId to VNPay create endpoint', async () => {
    mockedAxios.post.mockResolvedValue({ paymentUrl: 'https://vnpay.test/pay' })

    await SubscriptionService.createVnpayPayment({
      mentorPackageId: 'mentor-pkg-1',
      returnUrl: 'https://example.com/billing/result',
    })

    expect(mockedAxios.post).toHaveBeenCalledWith('/payments/vnpay/create', {
      mentorPackageId: 'mentor-pkg-1',
      returnUrl: 'https://example.com/billing/result',
    })
  })

  it('normalizes transaction type and package display name for token and mentor purchases', async () => {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          paymentTransactionId: 'tx-1',
          mentorPackageName: 'Mentor Plus',
          subscriptionId: 'sub-mentor',
          amount: 99000,
          creditedTokens: 0,
          status: 'success',
        },
        {
          paymentTransactionId: 'tx-2',
          tokenPackageName: 'Token Starter',
          amount: 50000,
          creditedTokens: 55000,
          status: 'success',
        },
      ],
      totalCount: 2,
      pageNumber: 1,
      pageSize: 10,
    })

    const result = await SubscriptionService.getMyTransactions({ PageNumber: 1, PageSize: 10 })

    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toMatchObject({
      transactionType: 'mentor_package',
      packageDisplayName: 'Mentor Plus',
    })
    expect(result.items[1]).toMatchObject({
      transactionType: 'token_topup',
      packageDisplayName: 'Token Starter',
    })
  })
})
