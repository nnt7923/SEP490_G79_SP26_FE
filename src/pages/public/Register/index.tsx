
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../../store/useAuthStore'
import { extractErrorMessage } from '../../../components/Error/ErrorHandler'
import { useResponsive } from '../../../hook/useResponsive'
import { useTranslation } from 'react-i18next'
import { TypeAnimation } from 'react-type-animation'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import Tilt from 'react-parallax-tilt'
import { motion } from 'framer-motion'


const Register: React.FC = () => {
  const navigate = useNavigate()
  const authStore = useAuthStore()
  const { t } = useTranslation('auth')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [init, setInit] = useState(false)

  React.useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => {
      setInit(true)
    })
  }, [])

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
      setError(t('register.fillAllFields'))
      return
    }

    try {
      const res = await authStore.register(payload)
      if (res.isOk) {
        setMessage(t('register.successMessage'))
        navigate(`/verify-otp?email=${encodeURIComponent(payload.email)}`)
      } else {
        setError(res.msg || t('register.failedMessage'))
      }
    } catch (err: any) {
      const msg = extractErrorMessage(err, t('register.failedMessage'))
      setError(msg)
    }
  }

  const { isSmallScreen } = useResponsive()

  // Terminal code snippet for the visual panel
  const codeLines = [
    { num: 1, content: '// CodeNexus — Create Account', color: '#8b949e' },
    { num: 2, content: '', color: '' },
    { num: 3, content: 'const student = {', color: '#e6edf3' },
    { num: 4, content: '  role: "learner",', color: '#e6edf3' },
    { num: 5, content: '  goals: [', color: '#e6edf3' },
    { num: 6, content: '    "master-coding",', color: '#79c0ff' },
    { num: 7, content: '    "build-projects",', color: '#79c0ff' },
    { num: 8, content: '    "join-community"', color: '#79c0ff' },
    { num: 9, content: '  ],', color: '#e6edf3' },
    { num: 10, content: '  plan: "personalized",', color: '#3fb950' },
    { num: 11, content: '  ai: true', color: '#3fb950' },
    { num: 12, content: '};', color: '#e6edf3' },
    { num: 13, content: '', color: '' },
    { num: 14, content: 'student.start();', color: '#e6edf3' },
    { num: 15, content: '// → Journey begins here', color: '#8b949e' },
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
    <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      
      {/* Particles Background */}
      {init && (
        <Particles
          id="tsparticles-register"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
          options={{
            background: { color: { value: 'transparent' } },
            fpsLimit: 120,
            interactivity: {
              events: {
                onClick: { enable: true, mode: 'push' },
                onHover: { enable: true, mode: 'repulse' },
                resize: { enable: true }
              },
              modes: {
                push: { quantity: 4 },
                repulse: { distance: 100, duration: 0.4 }
              }
            },
            particles: {
              color: { value: '#3B82F6' },
              links: { color: '#3B82F6', distance: 150, enable: true, opacity: 0.2, width: 1 },
              move: { direction: 'none', enable: true, outModes: { default: 'bounce' }, random: false, speed: 1.2, straight: false },
              number: { density: { enable: true, width: 800 }, value: 60 },
              opacity: { value: 0.3 },
              shape: { type: 'circle' },
              size: { value: { min: 1, max: 3 } }
            },
            detectRetina: true
          }}
        />
      )}

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
          <Tilt tiltMaxAngleX={3} tiltMaxAngleY={3} scale={1.02} transitionSpeed={400} style={{ position: 'relative', zIndex: 1, height: '100%' }}>
            <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              border: '1px solid var(--border-base)',
              borderRadius: 2,
              background: 'var(--code-block-bg)',
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
                borderBottom: '1px solid var(--text-strong)',
                background: 'var(--terminal-bg)',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--terminal-btn-red)' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--terminal-btn-yellow)' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--terminal-btn-green)' }} />
              <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--terminal-gutter)', fontFamily: 'inherit' }}>
                register.js — CodeNexus
              </span>
            </div>
            {/* Code content - React Type Animation */}
            <div style={{ padding: '20px 0', minHeight: 400, position: 'relative' }}>
              {/* Line numbers tĩnh */}
              <div style={{ position: 'absolute', left: 0, top: 20, bottom: 20, width: 46, display: 'flex', flexDirection: 'column' }}>
                {codeLines.map(line => (
                  <div key={`num-${line.num}`} style={{ textAlign: 'right', paddingRight: 16, color: 'var(--terminal-comment)', fontSize: 13, lineHeight: '24px', userSelect: 'none', fontFamily: 'inherit' }}>
                    {line.num}
                  </div>
                ))}
              </div>
              
              {/* Typewriter text */}
              <div style={{ paddingLeft: 46, paddingRight: 14 }}>
                <TypeAnimation
                  sequence={[
                    500,
                    codeLines.map(l => l.content).join('\n'),
                  ]}
                  wrapper="div"
                  cursor={false}
                  speed={75}
                  style={{
                    margin: 0,
                    fontFamily: 'inherit',
                    fontSize: 13,
                    lineHeight: '24px',
                    color: '#e6edf3',
                    whiteSpace: 'pre-wrap',
                    display: 'block'
                  }}
                />
              </div>
            </div>
            {/* Terminal prompt */}
            <div
              style={{
                borderTop: '1px solid var(--text-strong)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--terminal-bg)',
              }}
            >
              <span style={{ color: 'var(--success-primary)', fontSize: 13, fontFamily: 'inherit' }}>➜</span>
              <span style={{ color: 'var(--accent-primary)', fontSize: 13, fontFamily: 'inherit' }}>codenexus</span>
              <span style={{ color: 'var(--terminal-gutter)', fontSize: 13, fontFamily: 'inherit' }}>git:(main)</span>
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
          </motion.div>
          </Tilt>
        )}

        {/* Form Card (RIGHT) */}
        <Tilt tiltMaxAngleX={2} tiltMaxAngleY={2} transitionSpeed={600} style={{ position: 'relative', zIndex: 1 }}>
          <motion.div
          initial={{ opacity: 0, x: 30, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
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
              {t('register.title')}
            </h2>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 13,
                margin: 0,
                fontFamily: 'inherit',
              }}
            >
              {t('register.subtitle')}
            </p>
          </div>

          <form onSubmit={onSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label htmlFor="firstName" style={labelStyle}>
                  {t('register.firstName')}
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
                  {t('register.lastName')}
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
                {t('register.email')}
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
                {t('register.username')}
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
                {t('register.password')}
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
                  aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
                >
                  {showPassword ? t('register.hidePassword') : t('register.showPassword')}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: 'var(--bg-red-light)',
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
                  background: 'var(--bg-green-tint)',
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
              onMouseEnter={(e) => { if (!authStore.loading) e.currentTarget.style.background = 'var(--text-strong)' }}
              onMouseLeave={(e) => { if (!authStore.loading) e.currentTarget.style.background = 'var(--text-primary)' }}
            >
              {authStore.loading ? t('register.submitting') : t('register.submit')}
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
              <span>{t('register.hasAccount')}</span>
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
                {t('register.signIn')}
              </Link>
            </div>
          </form>
        </motion.div>
        </Tilt>

      </section>
    </div>
  )
}

export default Register