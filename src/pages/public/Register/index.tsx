import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LanguageOrbit from '../../../components/Icons/Orbit'
import GroupImg from '../../../assets/img-code.png'
import useAuthStore from '../../../store/useAuthStore'
import { extractErrorMessage } from '../../../components/Error/ErrorHandler'
import { useResponsive } from '../../../hook/useResponsive'

const Register: React.FC = () => {
  const navigate = useNavigate()
  const authStore = useAuthStore()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      username: username.trim(),
      password: password.trim(),
    }

    if (!payload.firstName || !payload.lastName || !payload.email || !payload.username || !payload.password) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const res = await authStore.register(payload)
      if (res.isOk) {
        setMessage('Registration successful! Please check your email for the OTP.')
        navigate(`/verify-otp?email=${encodeURIComponent(payload.email)}`)
      } else {
        setError(res.msg || 'Registration failed.')
      }
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'Registration failed.')
      setError(msg)
    }
  }

  const { isSmallScreen } = useResponsive()
  const containerClass = `auth auth--split ${isSmallScreen ? 'auth--stack auth--fluid' : ''}`

  return (
    <div className="page">
      <section className={containerClass}>
        <div className="auth__card">
          <h2 className="auth__title">Create Account</h2>
          <p className="auth__subtitle">Register to get started</p>
          <form className="form" onSubmit={onSubmit}>
            <label className="form__label" htmlFor="firstName">First name</label>
            <input id="firstName" type="text" className="form__input" placeholder="Your first name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />

            <label className="form__label" htmlFor="lastName">Last name</label>
            <input id="lastName" type="text" className="form__input" placeholder="Your last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />

            <label className="form__label" htmlFor="email">Email</label>
            <input id="email" type="email" className="form__input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label className="form__label" htmlFor="username">Username</label>
            <input id="username" type="text" className="form__input" placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} />

            <label className="form__label" htmlFor="password">Password</label>
            <input id="password" type="password" className="form__input" placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} />

            {error && <div className="form__error" role="alert">{error}</div>}
            {message && <div style={{ color: '#10b981', fontSize: 14 }}>{message}</div>}

            <button type="submit" className="btn btn-primary auth__submit" disabled={authStore.loading}>Register</button>

            <div className="auth__links">
              <span>Already have an account?</span>
              <Link to="/login">Log in</Link>
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
            <h3 style={{ margin: 0, color: '#111827' }}>Start Your Learning Journey</h3>
            <p style={{ margin: '8px 0', color: '#6b7280' }}>
              Access 1000+ courses and join a thriving developer community.
            </p>
          </div>

          <LanguageOrbit />
        </div>
      </section>
    </div>
  )
}

export default Register