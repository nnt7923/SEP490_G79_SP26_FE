
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import * as AuthService from '../../../services/AuthService'
import ROUTER from '../../../router/ROUTER'
import { extractErrorMessage } from '../../../components/Error/ErrorHandler'
import { useResponsive } from '../../../hook/useResponsive'
import { useTranslation } from 'react-i18next'

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { t } = useTranslation('auth')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const mail = email.trim()
    if (!mail) {
      setError(t('forgotPassword.enterEmail'))
      return
    }

    try {
      setSubmitting(true)
      const res: any = await AuthService.forgotPassword({ Email: mail })
      const data = res ?? {}
      const resetToken: string | undefined = data?.resetToken ?? data?.token ?? data?.data?.resetToken ?? data?.data?.token
      const toastMsg: string = data?.message ?? data?.msg ?? t('forgotPassword.resetLinkSent')

      if (resetToken) {
        navigate(`${ROUTER.RESET_PASSWORD}?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(mail)}`, {
          state: { toast: t('forgotPassword.setNewPassword') },
        })
      } else {
        navigate(`${ROUTER.RESET_PASSWORD}?email=${encodeURIComponent(mail)}`, {
          state: { toast: toastMsg },
        })
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, t('forgotPassword.failed')))
    } finally {
      setSubmitting(false)
    }
  }

  const { isSmallScreen } = useResponsive()
  const containerClass = `auth auth--split ${isSmallScreen ? 'auth--stack auth--fluid' : ''}`

  return (
    <div className="page">
      <section className={containerClass}>
        <div className="auth__card">
          <h2 className="auth__title">{t('forgotPassword.title')}</h2>
          <p className="auth__subtitle">{t('forgotPassword.subtitle')}</p>
          <form className="form" onSubmit={onSubmit}>
            <label className="form__label" htmlFor="email">{t('forgotPassword.email')}</label>
            <input
              id="email"
              type="email"
              className="form__input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {error && <div className="form__error" role="alert">{error}</div>}
            {message && <div style={{ color: 'var(--color-emerald-500)', fontSize: 14 }}>{message}</div>}

            <button type="submit" className="btn btn-primary auth__submit" disabled={submitting}>
              {submitting ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
            </button>

            <div className="auth__links" style={{ justifyContent: 'space-between' }}>
              <span>{t('forgotPassword.remembered')}</span>
              <Link to={ROUTER.LOGIN}>{t('forgotPassword.backToLogin')}</Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default ForgotPassword