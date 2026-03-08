
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  const [showPassword, setShowPassword] = useState(false)
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

  // Terminal code snippet for the visual panel
  const codeLines = [
    { num: 1, content: '// CodeNexus — Create Account', color: 'var(--text-secondary)' },
    { num: 2, content: '', color: '' },
    { num: 3, content: 'const student = {', color: 'var(--gray-200)' },
    { num: 4, content: '  role: "learner",', color: 'var(--gray-200)' },
    { num: 5, content: '  goals: [', color: 'var(--gray-200)' },
    { num: 6, content: '    "master-coding",', color: 'var(--accent-primary)' },
    { num: 7, content: '    "build-projects",', color: 'var(--accent-primary)' },
    { num: 8, content: '    "join-community"', color: 'var(--accent-primary)' },
    { num: 9, content: '  ],', color: 'var(--gray-200)' },
    { num: 10, content: '  plan: "personalized",', color: 'var(--success-primary)' },
    { num: 11, content: '  ai: true', color: 'var(--success-primary)' },
    { num: 12, content: '};', color: 'var(--gray-200)' },
    { num: 13, content: '', color: '' },
    { num: 14, content: 'student.start();', color: 'var(--gray-200)' },
    { num: 15, content: '// → Journey begins here', color: 'var(--text-secondary)' },
  ]

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: 13,
    fontFamily: 'inherit',
    border: '1px solid var(--border-base)',
    borderRadius: 2,
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--bg-main)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: 'inherit',
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--accent-primary)'
  }
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--border-base)'
  }

  return (
    <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <section
        style={{
          maxWidth: 960,
          width: '100%',
          margin: '0 auto',
          padding: '40px 20px',
          display: 'grid',
          gridTemplateColumns: isSmallScreen ? '1fr' : '1fr 1fr',
          gap: 32,
          alignItems: 'start',
        }}
      >
        {/* Visual Panel - Terminal/Code (LEFT) */}
        {!isSmallScreen && (
          <div
            style={{
              border: '1px solid var(--border-base)',
              borderRadius: 2,
              background: 'var(--text-primary)',
              overflow: 'hidden',
              minHeight: 420,
            }}
          >
            {/* Title bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
                borderBottom: '1px solid var(--color-hex-25)',
                background: 'var(--color-hex-107)',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-hex-108)' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-hex-109)' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-hex-110)' }} />
              <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--color-hex-111)', fontFamily: 'inherit' }}>
                register.js — CodeNexus
              </span>
            </div>
            {/* Code content */}
            <div style={{ padding: '20px 0' }}>
              {codeLines.map((line) => (
                <div
                  key={line.num}
                  style={{
                    display: 'flex',
                    padding: '1px 14px',
                    lineHeight: '22px',
                    fontSize: 13,
                    fontFamily: 'inherit',
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      textAlign: 'right',
                      color: 'var(--color-hex-112)',
                      userSelect: 'none',
                      paddingRight: 16,
                      flexShrink: 0,
                    }}
                  >
                    {line.num}
                  </span>
                  <span style={{ color: line.color || 'transparent' }}>
                    {line.content || '\u00A0'}
                  </span>
                </div>
              ))}
            </div>
            {/* Terminal prompt */}
            <div
              style={{
                borderTop: '1px solid var(--color-hex-25)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--color-hex-107)',
              }}
            >
              <span style={{ color: 'var(--success-primary)', fontSize: 13, fontFamily: 'inherit' }}>➜</span>
              <span style={{ color: 'var(--accent-primary)', fontSize: 13, fontFamily: 'inherit' }}>codenexus</span>
              <span style={{ color: 'var(--color-hex-111)', fontSize: 13, fontFamily: 'inherit' }}>git:(main)</span>
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 14,
                  background: 'var(--gray-200)',
                  animation: 'blink 1s step-end infinite',
                }}
              />
            </div>
          </div>
        )}

        {/* Form Card (RIGHT) */}
        <div
          style={{
            border: '1px solid var(--border-base)',
            borderRadius: 2,
            padding: 32,
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <h2
              style={{
                margin: '0 0 4px',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
              }}
            >
              {'>'} Create Account
            </h2>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 13,
                margin: 0,
                fontFamily: 'inherit',
              }}
            >
              // Register to get started
            </p>
          </div>

          <form onSubmit={onSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label htmlFor="firstName" style={labelStyle}>
                  $ firstName
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
              <div>
                <label htmlFor="lastName" style={labelStyle}>
                  $ lastName
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label htmlFor="email" style={labelStyle}>
                $ email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label htmlFor="username" style={labelStyle}>
                $ username
              </label>
              <input
                id="username"
                type="text"
                placeholder="your-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="password" style={labelStyle}>
                $ password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 2,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    lineHeight: 1,
                  }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'hide' : 'show'}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: 'var(--color-hex-113)',
                  border: '1px solid var(--danger-primary)',
                  borderRadius: 2,
                  padding: '8px 12px',
                  marginBottom: 12,
                  color: 'var(--danger-primary)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
                role="alert"
              >
                // ERROR: {error}
              </div>
            )}
            {message && (
              <div
                style={{
                  background: 'var(--color-hex-67)',
                  border: '1px solid var(--success-primary)',
                  borderRadius: 2,
                  padding: '8px 12px',
                  marginBottom: 12,
                  color: 'var(--success-primary)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                // SUCCESS: {message}
              </div>
            )}

            <button
              type="submit"
              disabled={authStore.loading}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: authStore.loading ? 'var(--text-secondary)' : 'var(--text-primary)',
                color: 'var(--bg-surface)',
                border: `1px solid ${authStore.loading ? 'var(--text-secondary)' : 'var(--text-primary)'}`,
                borderRadius: 2,
                fontSize: 13,
                fontWeight: 600,
                cursor: authStore.loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => { if (!authStore.loading) e.currentTarget.style.background = 'var(--color-hex-25)' }}
              onMouseLeave={(e) => { if (!authStore.loading) e.currentTarget.style.background = 'var(--text-primary)' }}
            >
              {'>'} {authStore.loading ? 'registering...' : 'register'}
            </button>

            <div
              style={{
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                color: 'var(--text-secondary)',
                marginTop: 16,
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              <span>// Already have an account?</span>
              <Link
                to="/login"
                style={{
                  color: 'var(--accent-primary)',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
              >
                login
              </Link>
            </div>
          </form>
        </div>

      </section>
    </div>
  )
}

export default Register