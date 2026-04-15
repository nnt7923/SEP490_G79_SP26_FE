
import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import * as AuthService from '../../../services/AuthService'
import ROUTER from '../../../router/ROUTER'
import { extractErrorMessage } from '../../../components/Error/ErrorHandler'
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
  const [showPassword, setShowPassword] = useState(false)
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
      await AuthService.resetPassword({
        resetToken: token,
        newPassword: pwd,
        email: email.trim() || undefined,
      })
      navigate(ROUTER.LOGIN, { state: { toast: t('resetPassword.success') } })
    } catch (err: any) {
      setError(extractErrorMessage(err, t('resetPassword.failed')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <section style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 32, background: 'var(--bg-surface)' }}>
          {toast && (
            <div style={{ background: 'var(--bg-green-tint)', border: '1px solid var(--success-primary)', color: 'var(--success-primary)', padding: '8px 12px', borderRadius: 2, marginBottom: 16, fontSize: 13, fontFamily: 'inherit' }} role="status">
              // SUCCESS: {toast}
            </div>
          )}
          <div style={{ marginBottom: 24 }}>
             <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'inherit' }}>{t('resetPassword.title')}</h2>
             <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, fontFamily: 'inherit' }}>{t('resetPassword.subtitle')}</p>
          </div>
          {!tokenFromQuery && (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, fontFamily: 'inherit' }}>
              // {t('resetPassword.emailSent')}
            </div>
          )}
          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="email" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'inherit' }}>{t('resetPassword.emailOptional')}</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', border: '1px solid var(--border-base)', borderRadius: 2, width: '100%', boxSizing: 'border-box', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s ease' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="password" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'inherit' }}>{t('resetPassword.newPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('resetPassword.newPassword')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ padding: '8px 36px 8px 12px', fontSize: 13, fontFamily: 'inherit', border: '1px solid var(--border-base)', borderRadius: 2, width: '100%', boxSizing: 'border-box', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s ease' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'inherit', lineHeight: 1 }}
                  tabIndex={-1}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? t('login.hidePassword') : t('login.showPassword')}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="confirm" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'inherit' }}>{t('resetPassword.confirmPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('resetPassword.confirmPassword')}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  style={{ padding: '8px 36px 8px 12px', fontSize: 13, fontFamily: 'inherit', border: '1px solid var(--border-base)', borderRadius: 2, width: '100%', boxSizing: 'border-box', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s ease' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'inherit', lineHeight: 1 }}
                  tabIndex={-1}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? t('login.hidePassword') : t('login.showPassword')}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'var(--bg-red-light)', border: '1px solid var(--danger-primary)', borderRadius: 2, padding: '8px 12px', margin: '12px 0', color: 'var(--danger-primary)', fontSize: 13, fontFamily: 'inherit' }} role="alert">
                // ERROR: {error}
              </div>
            )}

            <button
               type="submit"
               disabled={submitting}
               style={{ width: '100%', padding: '10px 16px', background: 'var(--text-primary)', color: 'var(--bg-surface)', border: '1px solid var(--text-primary)', borderRadius: 2, fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background-color 0.2s ease', marginTop: 8 }}
               onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = 'var(--text-strong)' }}
               onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = 'var(--text-primary)' }}
            >
              {submitting ? t('resetPassword.submitting') : t('resetPassword.submit')}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
              <span>{t('resetPassword.back')}</span>
              <Link to={ROUTER.LOGIN} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }} onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}>
                {t('resetPassword.backToLogin')}
              </Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default ResetPassword