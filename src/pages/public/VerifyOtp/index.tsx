
import React, { useState, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import * as AuthService from '../../../services/AuthService'
import useAuthStore from '../../../store/useAuthStore'
import { extractErrorMessage } from '../../../components/Error/ErrorHandler'
import { useResponsive } from '../../../hook/useResponsive'
import { useTranslation } from 'react-i18next'

const VerifyOtp: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const store = useAuthStore()
  const { t } = useTranslation('auth')

  const emailFromQuery = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search)
      return (params.get('email') || '').trim()
    } catch {
      return ''
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

    try {
      setVerifying(true)
      const result = await AuthService.verifyOtp({ Email: mail, Otp: otp })
      const toastMsg = result?.msg || t('verifyOtp.verifySuccess')
      // On success, redirect to login page with a toast message
      navigate('/login', { state: { toast: toastMsg } })
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
      await AuthService.resendOtp({ Email: mail })
      setMessage(t('verifyOtp.resendSuccess'))
    } catch (err: any) {
      const msg = extractErrorMessage(err, t('verifyOtp.resendFailed'))
      setError(msg)
    } finally {
      setResending(false)
    }
  }

  const { isSmallScreen } = useResponsive()
  const containerClass = `auth auth--split ${isSmallScreen ? 'auth--stack auth--fluid' : ''}`

  return (
    <div className="page">
      <section className={containerClass}>
        <div className="auth__card">
          <h2 className="auth__title">{t('verifyOtp.title')}</h2>
          <p className="auth__subtitle">{t('verifyOtp.subtitle')}</p>
          <form className="form" onSubmit={onSubmit}>
            <label className="form__label" htmlFor="email">{t('verifyOtp.email')}</label>
            <input id="email" type="email" className="form__input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label className="form__label" htmlFor="otp">{t('verifyOtp.otp')}</label>
            <input id="otp" type="text" className="form__input" placeholder={t('verifyOtp.otpPlaceholder')} value={code} onChange={(e) => setCode(e.target.value)} />

            {error && <div className="form__error" role="alert">{error}</div>}
            {message && <div style={{ color: 'var(--color-emerald-500)', fontSize: 14 }}>{message}</div>}

            <button type="submit" className="btn btn-primary auth__submit" disabled={verifying}>{t('verifyOtp.submit')}</button>

            <div className="auth__links" style={{ justifyContent: 'space-between' }}>
              <span>{t('verifyOtp.didntReceive')}</span>
              <a href="#" onClick={onResend}>{resending ? t('verifyOtp.resending') : t('verifyOtp.resend')}</a>
            </div>

            <div className="auth__links">
              <span>{t('verifyOtp.back')}</span>
              <Link to="/register">{t('verifyOtp.register')}</Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default VerifyOtp