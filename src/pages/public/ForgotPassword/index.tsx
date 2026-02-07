import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import * as AuthService from '../../../services/AuthService'
import ROUTER from '../../../router/ROUTER'
import { extractErrorMessage } from '../../../components/Error/ErrorHandler'
import { useResponsive } from '../../../hook/useResponsive'

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const mail = email.trim()
    if (!mail) {
      setError('Please enter your registered email')
      return
    }

    try {
      setSubmitting(true)
      const res: any = await AuthService.forgotPassword({ Email: mail })
      const data = res ?? {}
      const resetToken: string | undefined = data?.resetToken ?? data?.token ?? data?.data?.resetToken ?? data?.data?.token
      const toastMsg: string = data?.message ?? data?.msg ?? 'We have sent a reset link to your email.'

      if (resetToken) {
        navigate(`${ROUTER.RESET_PASSWORD}?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(mail)}`, {
          state: { toast: 'Please set a new password.' },
        })
      } else {
        navigate(`${ROUTER.RESET_PASSWORD}?email=${encodeURIComponent(mail)}`, {
          state: { toast: toastMsg },
        })
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to process password reset request.'))
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
          <h2 className="auth__title">Forgot Password</h2>
          <p className="auth__subtitle">Enter your email to receive instructions</p>
          <form className="form" onSubmit={onSubmit}>
            <label className="form__label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form__input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {error && <div className="form__error" role="alert">{error}</div>}
            {message && <div style={{ color: '#10b981', fontSize: 14 }}>{message}</div>}

            <button type="submit" className="btn btn-primary auth__submit" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Instructions'}
            </button>

            <div className="auth__links" style={{ justifyContent: 'space-between' }}>
              <span>Remembered your password?</span>
              <Link to={ROUTER.LOGIN}>Back to Login</Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default ForgotPassword