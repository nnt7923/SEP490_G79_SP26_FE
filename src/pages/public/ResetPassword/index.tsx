
import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import * as AuthService from '../../../services/AuthService'
import ROUTER from '../../../router/ROUTER'
import { extractErrorMessage } from '../../../components/Error/ErrorHandler'
import { useResponsive } from '../../../hook/useResponsive'
import { useTranslation } from 'react-i18next'

const ResetPassword: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const tokenFromQuery = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search)
      return (params.get('token') || '').trim()
    } catch {
      return ''
    }
  }, [location.search])

  const emailFromQuery = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search)
      return (params.get('email') || '').trim()
    } catch {
      return ''
    }
  }, [location.search])

  const [email, setEmail] = useState(emailFromQuery)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { t } = useTranslation('auth')

  useEffect(() => {
    const state: any = location.state
    const msg = state?.toast
    if (msg) {
      setToast(String(msg))
      const t = setTimeout(() => setToast(''), 3000)
      return () => clearTimeout(t)
    }
  }, [location.state])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const token = tokenFromQuery
    if (!token) {
      setError(t('resetPassword.tokenMissing'))
      return
    }

    const pwd = password.trim()
    const cf = confirm.trim()
    if (!pwd || !cf) {
      setError(t('resetPassword.enterBothFields'))
      return
    }
    if (pwd.length < 6) {
      setError(t('resetPassword.passwordMin'))
      return
    }
    if (pwd !== cf) {
      setError(t('resetPassword.passwordMismatch'))
      return
    }

    try {
      setSubmitting(true)
      await AuthService.resetPassword({ Token: token, Password: pwd, Email: email || undefined })
      navigate(ROUTER.LOGIN, { state: { toast: t('resetPassword.success') } })
    } catch (err: any) {
      setError(extractErrorMessage(err, t('resetPassword.failed')))
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
          {toast && (
            <div style={{
              background: 'var(--color-emerald-500)', color: 'var(--bg-surface-short)', padding: '8px 12px', borderRadius: 6,
              marginBottom: 12, fontSize: 14
            }} role="status">{toast}</div>
          )}
          <h2 className="auth__title">{t('resetPassword.title')}</h2>
          <p className="auth__subtitle">{t('resetPassword.subtitle')}</p>
          {!tokenFromQuery && (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>
              {t('resetPassword.emailSent')}
            </div>
          )}
          <form className="form" onSubmit={onSubmit}>
            <label className="form__label" htmlFor="email">{t('resetPassword.emailOptional')}</label>
            <input
              id="email"
              type="email"
              className="form__input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label className="form__label" htmlFor="password">{t('resetPassword.newPassword')}</label>
            <input
              id="password"
              type="password"
              className="form__input"
              placeholder={t('resetPassword.newPassword')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label className="form__label" htmlFor="confirm">{t('resetPassword.confirmPassword')}</label>
            <input
              id="confirm"
              type="password"
              className="form__input"
              placeholder={t('resetPassword.confirmPassword')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            {error && <div className="form__error" role="alert">{error}</div>}

            <button type="submit" className="btn btn-primary auth__submit" disabled={submitting}>
              {submitting ? t('resetPassword.submitting') : t('resetPassword.submit')}
            </button>

            <div className="auth__links" style={{ justifyContent: 'space-between' }}>
              <span>{t('resetPassword.back')}</span>
              <Link to={ROUTER.LOGIN}>{t('resetPassword.backToLogin')}</Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default ResetPassword