
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import * as AuthService from '../../../services/AuthService'
import ROUTER from '../../../router/ROUTER'
import { extractErrorMessage } from '../../../components/Error/ErrorHandler'
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
      const toastMsg: string = data?.message ?? data?.msg ?? t('forgotPassword.resetLinkSent')

      navigate(`${ROUTER.VERIFY_OTP}?email=${encodeURIComponent(mail)}&purpose=reset-password`, {
        state: { toast: toastMsg },
      })
    } catch (err: any) {
      setError(extractErrorMessage(err, t('forgotPassword.failed')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <section style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 32, background: 'var(--bg-surface)' }}>
          <div style={{ marginBottom: 24 }}>
             <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'inherit' }}>{t('forgotPassword.title')}</h2>
             <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, fontFamily: 'inherit' }}>{t('forgotPassword.subtitle')}</p>
          </div>
          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="email" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'inherit' }}>{t('forgotPassword.email')}</label>
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

            {error && (
              <div style={{ background: 'var(--bg-red-light)', border: '1px solid var(--danger-primary)', borderRadius: 2, padding: '8px 12px', margin: '12px 0', color: 'var(--danger-primary)', fontSize: 13, fontFamily: 'inherit' }} role="alert">
                // ERROR: {error}
              </div>
            )}
            
            {message && (
               <div style={{ background: 'var(--bg-green-tint)', border: '1px solid var(--success-primary)', borderRadius: 2, padding: '8px 12px', margin: '12px 0', color: 'var(--success-primary)', fontSize: 13, fontFamily: 'inherit' }} role="status">
                 // SUCCESS: {message}
               </div>
            )}

            <button
               type="submit"
               disabled={submitting}
               style={{ width: '100%', padding: '10px 16px', background: 'var(--text-primary)', color: 'var(--bg-surface)', border: '1px solid var(--text-primary)', borderRadius: 2, fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background-color 0.2s ease', marginTop: 8 }}
               onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = 'var(--text-strong)' }}
               onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = 'var(--text-primary)' }}
            >
              {submitting ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
              <span>{t('forgotPassword.remembered')}</span>
              <Link to={ROUTER.LOGIN} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }} onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}>
                {t('forgotPassword.backToLogin')}
              </Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default ForgotPassword