import React, { useState, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import * as AuthService from '../../../services/AuthService'
import useAuthStore from '../../../store/useAuthStore'
import { extractErrorMessage } from '../../../components/Error/ErrorHandler'
import { useResponsive } from '../../../hook/useResponsive'

const VerifyOtp: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const store = useAuthStore()

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
      setError('Please enter the registered email and OTP code')
      return
    }

    try {
      setVerifying(true)
      const result = await AuthService.verifyOtp({ Email: mail, Otp: otp })
      const toastMsg = result?.msg || 'OTP verification successful! Please log in.'
      // On success, redirect to login page with a toast message
      navigate('/login', { state: { toast: toastMsg } })
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'OTP verification failed.')
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
      setError('Please enter the registered email to resend OTP')
      return
    }
    try {
      setResending(true)
      await AuthService.resendOtp({ Email: mail })
      setMessage('A new OTP has been sent to your email.')
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'Failed to resend OTP.')
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
          <h2 className="auth__title">Verify Your Account</h2>
          <p className="auth__subtitle">Enter the OTP sent to your email</p>
          <form className="form" onSubmit={onSubmit}>
            <label className="form__label" htmlFor="email">Email</label>
            <input id="email" type="email" className="form__input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label className="form__label" htmlFor="otp">OTP</label>
            <input id="otp" type="text" className="form__input" placeholder="Enter OTP" value={code} onChange={(e) => setCode(e.target.value)} />

            {error && <div className="form__error" role="alert">{error}</div>}
            {message && <div style={{ color: '#10b981', fontSize: 14 }}>{message}</div>}

            <button type="submit" className="btn btn-primary auth__submit" disabled={verifying}>Verify OTP</button>

            <div className="auth__links" style={{ justifyContent: 'space-between' }}>
              <span>Didn't receive the email?</span>
              <a href="#" onClick={onResend}>{resending ? 'Resending...' : 'Resend'}</a>
            </div>

            <div className="auth__links">
              <span>Back</span>
              <Link to="/register">Register</Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default VerifyOtp