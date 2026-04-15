
import React, { useState, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import * as AuthService from '../../../services/AuthService'
import ROUTER from '../../../router/ROUTER'
import { extractErrorMessage } from '../../../components/Error/ErrorHandler'
import { useTranslation } from 'react-i18next'

const VerifyOtp: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation('auth')

  const emailFromQuery = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search)
      return (params.get('email') || '').trim()
    } catch {
      return ''
    }
  }, [location.search])

  const purposeFromQuery = useMemo<'register' | 'reset-password'>(() => {
    try {
      const params = new URLSearchParams(location.search)
      const value = (params.get('purpose') || '').trim().toLowerCase()
      return value === 'reset-password' ? 'reset-password' : 'register'
    } catch {
      return 'register'
    }
  }, [location.search])

  const [email, setEmail] = useState(emailFromQuery)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const mail = email.trim()
    const otp = code.trim()
    if (!mail || !otp) {
      setError(t('verifyOtp.enterBothFields'))
      return
    }
    if (!/^\d{6}$/.test(otp)) {
      setError(t('verifyOtp.invalidOtpFormat'))
      return
    }

    try {
      setVerifying(true)
      const result = await AuthService.verifyOtp({ Email: mail, Otp: otp })
      const responsePurpose = String(result?.purpose ?? '').trim()
      const resetToken: string | undefined = result?.resetToken ?? undefined
      const toastMsg = result?.message ?? result?.msg ?? t('verifyOtp.verifySuccess')

      if (
        (responsePurpose === 'ResetPassword' || purposeFromQuery === 'reset-password') &&
        resetToken
      ) {
        navigate(`${ROUTER.RESET_PASSWORD}?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(mail)}`, {
          state: { toast: t('forgotPassword.setNewPassword') },
        })
        return
      }

      if (purposeFromQuery === 'reset-password' && !resetToken) {
        setError(t('verifyOtp.resetTokenMissing'))
        return
      }

      navigate(ROUTER.LOGIN, { state: { toast: toastMsg } })
    } catch (err: any) {
      const msg = extractErrorMessage(err, t('verifyOtp.verifyFailed'))
      setError(msg)
    } finally {
      setVerifying(false)
    }
  }

  const onResend = async (e: React.MouseEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    const mail = email.trim()
    if (!mail) {
      setError(t('verifyOtp.enterEmailToResend'))
      return
    }
    try {
      setResending(true)
      await AuthService.resendOtp({
        Email: mail,
        Purpose: purposeFromQuery === 'reset-password' ? 'ResetPassword' : 'Register',
      })
      setMessage(t('verifyOtp.resendSuccess'))
    } catch (err: any) {
      const msg = extractErrorMessage(err, t('verifyOtp.resendFailed'))
      setError(msg)
    } finally {
      setResending(false)
    }
  }

  const backTarget = purposeFromQuery === 'reset-password' ? ROUTER.FORGOT_PASSWORD : ROUTER.REGISTER
  const backText = purposeFromQuery === 'reset-password' ? t('verifyOtp.backToForgotPassword') : t('verifyOtp.register')

  return (
    <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <section style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
        <div className="auth__card" style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 32, background: 'var(--bg-surface)' }}>
          <h2 className="auth__title">{t('verifyOtp.title')}</h2>
          <p className="auth__subtitle">{t('verifyOtp.subtitle')}</p>
          <form className="form" onSubmit={onSubmit}>
            <label className="form__label" htmlFor="email">{t('verifyOtp.email')}</label>
            <input id="email" type="email" className="form__input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label className="form__label" htmlFor="otp">{t('verifyOtp.otp')}</label>
            <input
              id="otp"
              type="text"
              className="form__input"
              placeholder={t('verifyOtp.otpPlaceholder')}
              value={code}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 6)
                setCode(next)
              }}
            />

            {error && <div className="form__error" role="alert">{error}</div>}
            {message && <div style={{ color: 'var(--color-emerald-500)', fontSize: 14 }}>{message}</div>}

            <button type="submit" className="btn btn-primary auth__submit" disabled={verifying}>{t('verifyOtp.submit')}</button>

            <div className="auth__links" style={{ justifyContent: 'space-between' }}>
              <span>{t('verifyOtp.didntReceive')}</span>
              <a href="#" onClick={onResend}>{resending ? t('verifyOtp.resending') : t('verifyOtp.resend')}</a>
            </div>

            <div className="auth__links">
              <span>{t('verifyOtp.back')}</span>
              <Link to={backTarget}>{backText}</Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default VerifyOtp