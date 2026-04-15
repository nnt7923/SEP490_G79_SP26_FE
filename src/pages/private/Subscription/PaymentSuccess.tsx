import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Layout from '../../../components/Layout'
import ROUTER from '../../../router/ROUTER'
import { useStudentSidebarConfig } from '../Student/components/StudentSideBar'
import SubscriptionService, {
  type PaymentTransactionStatus,
} from '../../../services/SubscriptionService'
import useAuthStore from '../../../store/useAuthStore'
import { UserService } from '../../../services'

type PaymentResultStatus = PaymentTransactionStatus

const PaymentSuccess: React.FC = () => {
  const { t } = useTranslation('student')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, setUser } = useAuthStore()
  const navItems = useStudentSidebarConfig()

  const sidebarConfig = useMemo(() => ({
    navItems,
    actions: [],
    brand: { name: 'Token', subtitle: 'Student' },
  }), [navItems])

  const [status, setStatus] = useState<PaymentResultStatus>('pending')
  const [isVerifying, setIsVerifying] = useState<boolean>(true)
  const [message, setMessage] = useState<string>('')
  const [balanceVnd, setBalanceVnd] = useState<number>(() => {
    const parsed = Number((user as any)?.BalanceVnd ?? (user as any)?.balanceVnd ?? 0)
    return Number.isFinite(parsed) ? parsed : 0
  })

  const parseStatusFromCallback = (source: any): PaymentResultStatus => {
    const normalizedStatus = String(source?.status ?? source?.paymentStatus ?? source?.result ?? '').trim().toLowerCase()
    const alreadyProcessed = Boolean(source?.alreadyProcessed || source?.isAlreadyProcessed)
    const isSuccess =
      Boolean(source?.success || source?.isSuccess)
      || normalizedStatus === 'success'
      || normalizedStatus === 'succeeded'
      || normalizedStatus === 'paid'
      || normalizedStatus === 'completed'

    if (alreadyProcessed) return 'already-processed'
    if (isSuccess) return 'success'

    const code = String(source?.vnp_ResponseCode ?? source?.responseCode ?? source?.code ?? '').trim()
    if (code === '24' || normalizedStatus === 'canceled' || normalizedStatus === 'cancelled') {
      return 'canceled'
    }
    return 'failed'
  }

  useEffect(() => {
    let cancelled = false
    setIsVerifying(true)

    const refreshProfileBalance = async () => {
      try {
        const profileRaw = await UserService.getProfile()
        const profile = (profileRaw as any)?.data ?? profileRaw
        const latestBalance = Number(profile?.BalanceVnd ?? profile?.balanceVnd)

        if (!cancelled && Number.isFinite(latestBalance)) {
          setBalanceVnd(latestBalance)
        }

        if (!cancelled && profile) {
          setUser({ ...(user ?? {}), ...profile } as any)
        }
      } catch {
        // Keep current balance when profile refresh fails.
      }
    }

    const verifyPayment = async () => {
      const queryObject = Object.fromEntries(searchParams.entries()) as Record<string, string>
      const rawStatusParam = String(searchParams.get('status') || '').trim().toLowerCase()
      const statusFromParam: PaymentResultStatus | null = (() => {
        if (rawStatusParam === 'success' || rawStatusParam === 'paid' || rawStatusParam === 'succeeded') {
          return 'success'
        }
        if (rawStatusParam === 'failed' || rawStatusParam === 'fail' || rawStatusParam === 'error') {
          return 'failed'
        }
        if (rawStatusParam === 'canceled' || rawStatusParam === 'cancelled') {
          return 'canceled'
        }
        return null
      })()

      if (statusFromParam) {
        if (!cancelled) {
          setStatus(statusFromParam)
          setMessage(String(searchParams.get('message') || ''))
          setIsVerifying(false)
        }

        if (statusFromParam === 'success') {
          await refreshProfileBalance()
        }
        return
      }

      const hasTransactionParams = [
        'vnp_TxnRef',
        'vnp_ResponseCode',
        'vnp_TransactionNo',
        'vnp_SecureHash',
      ].some((key) => Boolean(queryObject[key]))

      if (!hasTransactionParams) {
        navigate(ROUTER.SUBSCRIPTION, { replace: true })
        return
      }

      try {
        const callbackRaw = await SubscriptionService.verifyVnpayCallback(queryObject)
        const callback = ((callbackRaw as any)?.data ?? (callbackRaw as any)?.value ?? callbackRaw) as Record<string, unknown>
        const nextStatus = parseStatusFromCallback({ ...queryObject, ...callback })

        if (!cancelled) {
          setStatus(nextStatus)
          setMessage(String(callback?.message || callback?.description || ''))
        }

        if (nextStatus === 'success' || nextStatus === 'already-processed') {
          await refreshProfileBalance()
        }
      } catch (error: any) {
        if (!cancelled) {
          const responseCode = String(queryObject.vnp_ResponseCode || '').trim()
          const nextStatus: PaymentResultStatus = responseCode === '24' ? 'canceled' : 'failed'
          const fallbackMessage = String(error?.response?.data?.message || error?.message || t('subscription.verifyPaymentFailed'))

          setStatus(nextStatus)
          setMessage(fallbackMessage)
        }
      }

      if (!cancelled) {
        setIsVerifying(false)
      }
    }

    void verifyPayment()

    return () => {
      cancelled = true
    }
  }, [navigate, searchParams, setUser, t, user])

  const title = (() => {
    if (isVerifying || status === 'pending') return t('subscription.paymentCheckingTitle')
    if (status === 'success' || status === 'already-processed') return t('subscription.paymentSuccessTitle')
    if (status === 'canceled') return t('subscription.paymentCanceledTitle')
    return t('subscription.paymentFailedTitle')
  })()

  const description = (() => {
    if (isVerifying || status === 'pending') return t('subscription.paymentCheckingDescription')
    if (status === 'success') return t('subscription.paymentSuccessDescription')
    if (status === 'already-processed') return t('subscription.paymentAlreadyProcessedDescription')
    if (status === 'canceled') return t('subscription.paymentCanceledDescription')
    return t('subscription.paymentFailedDescription')
  })()

  const statusIcon = (() => {
    if (isVerifying || status === 'pending') return <Loader2 size={26} color="var(--accent-primary)" className="animate-spin" />
    if (status === 'success' || status === 'already-processed') return <CheckCircle2 size={26} color="var(--success-primary)" />
    return <XCircle size={26} color="var(--danger-primary)" />
  })()

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(amount)))
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 20, background: 'var(--bg-main)', minHeight: '100vh' }}>
        <div
          style={{
            border: '1px solid var(--border-base)',
            borderRadius: 12,
            background: 'var(--bg-surface)',
            maxWidth: 760,
            margin: '0 auto',
            padding: 28,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {statusIcon}
            <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 24, fontWeight: 800 }}>
              {title}
            </h1>
          </div>

          <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {description}
          </p>

          {Boolean(message) && (
            <div style={{
              marginBottom: 14,
              border: '1px solid var(--border-base)',
              borderRadius: 8,
              padding: '10px 12px',
              color: 'var(--text-secondary)',
              fontSize: 13,
              background: 'var(--bg-main)'
            }}>
              {message}
            </div>
          )}

          {(status === 'success' || status === 'already-processed') && (
            <div style={{
              marginBottom: 16,
              border: '1px solid var(--success-primary)',
              borderRadius: 8,
              padding: '10px 12px',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 700,
              background: 'color-mix(in oklab, var(--success-primary) 10%, var(--bg-surface))'
            }}>
              {t('subscription.currentBalanceAfterTopUp', { balance: formatCurrency(balanceVnd) })}
            </div>
          )}

          {!isVerifying && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                borderRadius: 8,
                border: '1px solid var(--border-base)',
                background: 'var(--bg-main)',
                color: 'var(--text-primary)',
                padding: '10px 16px',
                fontWeight: 700,
                cursor: 'pointer',
                marginRight: 10,
              }}
            >
              {t('subscription.checkPaymentAgain')}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate(ROUTER.SUBSCRIPTION)}
            style={{
              borderRadius: 8,
              border: '1px solid var(--accent-primary)',
              background: 'var(--accent-primary)',
              color: 'var(--bg-surface)',
              padding: '10px 16px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t('subscription.backToSubscription')}
          </button>
        </div>
      </div>
    </Layout>
  )
}

export default PaymentSuccess
