import axiosInstance from '../Axios'

export interface SubscriptionPlan {
  subscriptionPlanId: string
  planType: string
  name: string
  description: string
  priceVnd: number
  durationDays: number
  isActive: boolean
  displayOrder: number
}

export interface CreateVnpayPaymentRequest {
  subscriptionPlanId: string
  orderInfo: string
  returnUrl: string
}

export interface CreateVnpayPaymentResponse {
  paymentUrl?: string
  payUrl?: string
  url?: string
  [key: string]: unknown
}

export interface CurrentSubscriptionPlan {
  subscriptionPlanId?: string
  planType?: string
  name?: string
  description?: string
  priceVnd?: number
  durationDays?: number
  expiresAt?: string
  startedAt?: string
  startDate?: string
  expiredAt?: string
  endDate?: string
  isFreeFallback?: boolean
  isActive?: boolean
  status?: string
  [key: string]: unknown
}

class SubscriptionService {
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const response = await axiosInstance.get('/subscription-plans')
    return response as unknown as SubscriptionPlan[]
  }

  async createVnpayPayment(payload: CreateVnpayPaymentRequest): Promise<CreateVnpayPaymentResponse> {
    const response = await axiosInstance.post('/payments/vnpay/create', payload)
    return response as unknown as CreateVnpayPaymentResponse
  }

  async getCurrentSubscription(): Promise<CurrentSubscriptionPlan | null> {
    const response = await axiosInstance.get('/subscription-plans/me') as unknown

    if (!response || typeof response !== 'object') {
      return null
    }

    const record = response as Record<string, unknown>
    const nestedData = record.data

    if (nestedData && typeof nestedData === 'object') {
      return nestedData as CurrentSubscriptionPlan
    }

    return record as CurrentSubscriptionPlan
  }
}

export default new SubscriptionService()
