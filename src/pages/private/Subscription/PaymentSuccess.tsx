import React, { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Layout from '../../../components/Layout'
import ROUTER from '../../../router/ROUTER'
import { useStudentSidebarConfig } from '../Student/components/StudentSideBar'
import { clearSubscriptionCaches } from '../../../services/SubscriptionService'

const PaymentSuccess: React.FC = () => {
  const { t } = useTranslation('student')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const navItems = useStudentSidebarConfig()

  const sidebarConfig = useMemo(() => ({
    navItems,
    actions: [],
    brand: { name: 'Subscription', subtitle: 'Student' },
  }), [navItems])

  const responseCode = searchParams.get('vnp_ResponseCode')
  const isSuccess = responseCode === '00'

  useEffect(() => {
    if (isSuccess) {
      clearSubscriptionCaches()
    }
  }, [isSuccess])

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
            {isSuccess
              ? <CheckCircle2 size={26} color="var(--success-primary)" />
              : <XCircle size={26} color="var(--danger-primary)" />}
            <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 24, fontWeight: 800 }}>
              {isSuccess ? t('subscription.paymentSuccessTitle') : t('subscription.paymentFailedTitle')}
            </h1>
          </div>

          <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {isSuccess ? t('subscription.paymentSuccessDescription') : t('subscription.paymentFailedDescription')}
          </p>

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
