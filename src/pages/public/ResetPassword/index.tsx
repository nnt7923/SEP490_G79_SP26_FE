import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import * as AuthService from '../../../services/AuthService'
import ROUTER from '../../../router/ROUTER'
import { extractErrorMessage } from '../../../components/Error/ErrorHandler'
import { useResponsive } from '../../../hook/useResponsive'

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
      setError('Reset token is missing or invalid')
      return
    }

    const pwd = password.trim()
    const cf = confirm.trim()
    if (!pwd || !cf) {
      setError('Please enter new password and confirmation')
      return
    }
    if (pwd.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (pwd !== cf) {
      setError('Password and confirmation do not match')
      return
    }

    try {
      setSubmitting(true)
      await AuthService.resetPassword({ Token: token, Password: pwd, Email: email || undefined })
      navigate(ROUTER.LOGIN, { state: { toast: 'Password has been reset. Please log in.' } })
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to reset password.'))
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
              background: '#10b981', color: '#fff', padding: '8px 12px', borderRadius: 6,
              marginBottom: 12, fontSize: 14
            }} role="status">{toast}</div>
          )}
          <h2 className="auth__title">Reset Password</h2>
          <p className="auth__subtitle">Enter your new password</p>
          {!tokenFromQuery && (
            <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>
              We have sent a reset link to your email. Please open the link from your email to continue.
            </div>
          )}
          <form className="form" onSubmit={onSubmit}>
            <label className="form__label" htmlFor="email">Email (optional)</label>
            <input
              id="email"
              type="email"
              className="form__input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label className="form__label" htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              className="form__input"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label className="form__label" htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm"
              type="password"
              className="form__input"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            {error && <div className="form__error" role="alert">{error}</div>}

            <button type="submit" className="btn btn-primary auth__submit" disabled={submitting}>
              {submitting ? 'Resetting...' : 'Reset Password'}
            </button>

            <div className="auth__links" style={{ justifyContent: 'space-between' }}>
              <span>Back</span>
              <Link to={ROUTER.LOGIN}>Login</Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default ResetPassword