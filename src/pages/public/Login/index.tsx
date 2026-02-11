import React, { useEffect, useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hook/useAuth'
import GroupImg from '../../../assets/img-code.png'
import LanguageOrbit from '../../../components/Icons/Orbit'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import { extractErrorMessage } from '../../../components/Error/ErrorHandler'
import { useResponsive } from '../../../hook/useResponsive'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const authStore = useAuthStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const state: any = location.state
    const msg = state?.toast
    if (msg) {
      setToast(String(msg))
      // Clear toast after 3s
      const t = setTimeout(() => setToast(''), 3000)
      return () => clearTimeout(t)
    }
  }, [location.state])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(username.trim(), password)
      if (remember) {
        // Could persist longer session here
      }
      const roleName = authStore.user?.role?.name
      if (roleName === 'Student') navigate(ROUTER.STUDENT_DASHBOARD)
      else navigate(ROUTER.HOME)
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Login failed'))
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
          <h2 className="auth__title">Welcome Back</h2>
          <p className="auth__subtitle">Login to your account</p>
          <form className="form" onSubmit={onSubmit}>
            <label className="form__label" htmlFor="email">Email</label>
            <input
              id="email"
              type="text"
              className="form__input"
              placeholder="Enter your email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <label className="form__label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form__input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <div className="form__error" role="alert">{error}</div>}

            <div className="auth__links" style={{ justifyContent: 'space-between' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Remember me
              </label>
              <Link to={ROUTER.FORGOT_PASSWORD}>Forgot password?</Link>
            </div>

            <button type="submit" className="btn btn-primary auth__submit">Login</button>

            <div className="auth__links">
              <span>Don't have an account?</span>
              <Link to="/register">Register</Link>
            </div>
          </form>
        </div>

        <div className="auth__visual" aria-hidden>
          <div className="auth-decor auth-decor--red" />
          <div className="auth-decor auth-decor--yellow" />

          <div className="auth-circle">
            <img
              src={GroupImg}
              alt="developer"
              className="auth-circle__img"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>

          <div style={{ position: 'absolute', left: 24, top: 6, zIndex: 3 }}>
            <h3 style={{ margin: 0, color: '#111827' }}>Join the Developer Community</h3>
            <p style={{ margin: '8px 0', color: '#6b7280' }}>
              Connect with thousands of developers, share your projects, and grow your coding skills.
            </p>
          </div>

          <LanguageOrbit />
        </div>
      </section>
    </div>
  )
}

export default Login