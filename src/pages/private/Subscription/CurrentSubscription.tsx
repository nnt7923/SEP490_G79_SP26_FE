import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Crown, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Layout from '../../../components/Layout'
import { useStudentSidebarConfig } from '../Student/components/StudentSideBar'
import SubscriptionService, { type CurrentSubscriptionPlan } from '../../../services/SubscriptionService'

const CurrentSubscription: React.FC = () => {
  const { t } = useTranslation('student')
  const navItems = useStudentSidebarConfig()
  const sidebarConfig = useMemo(() => ({
    navItems,
    actions: [],
    brand: { name: 'Pricing', subtitle: 'Student' },
  }), [navItems])

  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<CurrentSubscriptionPlan | null>(null)

  useEffect(() => {
    const fetchCurrentSubscription = async () => {
      try {
        const response = await SubscriptionService.getCurrentSubscription()
        setSubscription(response)
      } catch {
        setSubscription(null)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentSubscription()
  }, [])

  const getDisplayName = () => {
    if (!subscription) return t('subscription.notSubscribed')

    const directName = typeof subscription.name === 'string' ? subscription.name : ''
    if (directName) return directName

    const directType = typeof subscription.planType === 'string' ? subscription.planType : ''
    if (directType) return directType

    const nestedPlan = subscription.subscriptionPlan as { name?: string; planType?: string } | undefined
    if (nestedPlan?.name) return nestedPlan.name
    if (nestedPlan?.planType) return nestedPlan.planType

    return t('subscription.notSubscribed')
  }

  const getPeriodText = () => {
    if (!subscription) return '-'

    const startedAt = (subscription.startedAt || subscription.startDate) as string | undefined
    const expiredAt = (subscription.expiresAt || subscription.expiredAt || subscription.endDate) as string | undefined

    if (!startedAt && !expiredAt) return '-'

    const parseUtcFromBackend = (rawDate: string) => {
      const hasTimezone = /Z|[+-]\d{2}:?\d{2}$/.test(rawDate)
      if (hasTimezone) {
        return new Date(rawDate)
      }

      const matched = rawDate.match(
        /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/
      )

      if (!matched) {
        return new Date(rawDate)
      }

      const [, year, month, day, hour, minute, second, fraction] = matched
      const milliseconds = fraction
        ? Math.floor(Number(`0.${fraction}`) * 1000)
        : 0

      return new Date(
        Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second),
          milliseconds
        )
      )
    }

    const formatDateTimeVn = (date?: string) => {
      if (!date) return '-'
      const parsed = parseUtcFromBackend(date)
      if (Number.isNaN(parsed.getTime())) return '-'
      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(parsed)
    }

    if (!startedAt && expiredAt) {
      return t('subscription.expireAtOnly', { time: formatDateTimeVn(expiredAt) })
    }

    return `${formatDateTimeVn(startedAt)} - ${formatDateTimeVn(expiredAt)}`
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 20, background: 'var(--bg-main)', minHeight: '100vh' }}>
        <div
          style={{
            border: '1px solid var(--border-base)',
            borderRadius: 10,
            padding: 20,
            background: 'var(--bg-surface)',
            maxWidth: 760,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Crown size={20} color="var(--accent-primary)" />
            <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 24, fontWeight: 800 }}>
              {t('subscription.currentSubscriptionPageTitle')}
            </h1>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
              <Loader2 size={16} className="animate-spin" />
              <span>{t('subscription.loadingCurrentSubscription')}</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('subscription.currentPlanNameLabel')}</div>
                <div style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700 }}>{getDisplayName()}</div>

                <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>{t('subscription.currentPlanPeriodLabel')}</div>
                <div style={{ color: 'var(--text-primary)', fontSize: 14 }}>{getPeriodText()}</div>

                <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>{t('subscription.currentPlanStatusLabel')}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--success-primary)', fontWeight: 600 }}>
                  <CheckCircle2 size={16} />
                  {subscription ? t('subscription.currentPlanStatusActive') : t('subscription.currentPlanStatusNone')}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default CurrentSubscription
