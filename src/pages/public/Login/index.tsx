
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import { useResponsive } from '../../../hook/useResponsive'
import { AuthService } from '../../../services'
import { useTranslation } from 'react-i18next'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const authStore = useAuthStore()
  const { t } = useTranslation('auth')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(false)
  const [toast, setToast] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Google Identity Services setup
  const googleBtnRef = useRef<HTMLDivElement | null>(null)
  const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
    '241803303859-6jds7jhib6rgupj2pfmnr9pr0akla4n2.apps.googleusercontent.com'

  // Check for error in URL params (persists across remounts)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      // Clean URL without triggering navigation
      searchParams.delete('error')
      const newSearch = searchParams.toString()
      window.history.replaceState({}, '', `${location.pathname}${newSearch ? '?' + newSearch : ''}`)
    }
  }, [location.search, location.pathname])

  // Check for persisted login error on mount
  useEffect(() => {
    const loginError = localStorage.getItem('loginError')
    if (loginError) {
      setError(loginError)
      localStorage.removeItem('loginError')
    }
  }, [])

  useEffect(() => {
    const state: any = location.state
    const msg = state?.toast
    if (msg) {
      setToast(String(msg))
      const t = setTimeout(() => setToast(''), 3000)
      return () => clearTimeout(t)
    }
  }, [location.state])

  useEffect(() => {
    // Inject GIS script if not present
    if (!(window as any).google) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initGoogleButton
      document.head.appendChild(script)
      return
    }
    initGoogleButton()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initGoogleButton = () => {
    try {
      const google: any = (window as any).google
      if (!google?.accounts?.id || !googleBtnRef.current) return
      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleGoogleCredential,
      })
      google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline', size: 'large', text: 'continue_with'
      })
    } catch (e) {
      // Removed console.error in Google init failure
    }
  }

  const navigateByRole = (roleRaw?: string) => {
    const normalized = (roleRaw || '').toString().trim().toLowerCase()
    if (normalized === 'admin') return navigate(ROUTER.ADMIN_DASHBOARD)
    if (normalized === 'mentor') return navigate(ROUTER.MENTOR_DASHBOARD)
    if (normalized === 'student') return navigate(ROUTER.STUDENT_OVERVIEW)
    return navigate(ROUTER.HOME)
  }

  const handleGoogleCredential = async (response: any) => {
    try {
      const credential: string | undefined = response?.credential
      if (!credential) throw new Error('Did not receive idToken from Google')
      const { token, user } = await AuthService.loginWithGoogle({ ClientId: CLIENT_ID, IdToken: credential })
      authStore.setToken(token)
      authStore.setUser(user as any)
      // Tải đầy đủ thông tin user sau khi có token từ Google
      await authStore.fetchProfile()
      const roleName = (authStore.user?.role?.name) || (user as any)?.role?.name || (user as any)?.roleName || (user as any)?.roles?.[0]
      navigateByRole(roleName)
    } catch (err: any) {
      const errorMsg = err?.message || 'Google login failed'
      setError(errorMsg)
      navigate(`/login?error=${encodeURIComponent(errorMsg)}`, { replace: true })
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    localStorage.removeItem('loginError')
    
    try {
      // Call authStore.login directly to get full error details
      const result = await authStore.login(username.trim(), password)
      
      if (!result.isOk) {
        // Login failed, show error message from backend
        const errorMsg = result.msg || t('login.invalidCredentials')
        setError(errorMsg)
        return false
      }
      
      // Only navigate if login successful
      if (remember) {
        // Could persist longer session here
      }
      const roleName = (authStore.user?.role?.name) || (authStore.user as any)?.roleName || (authStore.user as any)?.roles?.[0]
      navigateByRole(roleName)
    } catch (err: any) {
      // Unexpected error (network error, etc.)
      const errorMsg = t('login.networkError')
      setError(errorMsg)
      return false
    }
  }

  const { isSmallScreen } = useResponsive()

  // Terminal code snippet for the visual panel
  const codeLines = [
    { num: 1, content: '// CodeNexus Authentication', color: '#8b949e' },
    { num: 2, content: '', color: '' },
    { num: 3, content: 'const auth = new CodeNexus({', color: '#e6edf3' },
    { num: 4, content: '  platform: "learning",', color: '#e6edf3' },
    { num: 5, content: '  features: [', color: '#e6edf3' },
    { num: 6, content: '    "personalized-paths",', color: '#79c0ff' },
    { num: 7, content: '    "ai-powered",', color: '#79c0ff' },
    { num: 8, content: '    "community"', color: '#79c0ff' },
    { num: 9, content: '  ],', color: '#e6edf3' },
    { num: 10, content: '  status: "ready"', color: '#3fb950' },
    { num: 11, content: '});', color: '#e6edf3' },
    { num: 12, content: '', color: '' },
    { num: 13, content: 'auth.connect();', color: '#e6edf3' },
    { num: 14, content: '// → Welcome back, developer', color: '#8b949e' },
  ]

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
                auth.js — CodeNexus
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
                      color: 'var(--terminal-comment)',
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
          {toast && (
            <div
              style={{
                background: 'var(--bg-green-tint)',
                color: 'var(--success-primary)',
                padding: '8px 12px',
                borderRadius: 2,
                marginBottom: 16,
                fontSize: 13,
                border: '1px solid var(--success-primary)',
                fontFamily: 'inherit',
              }}
              role="status"
            >
              // SUCCESS: {toast}
            </div>
          )}

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
              {t('login.title')}
            </h2>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 13,
                margin: 0,
                fontFamily: 'inherit',
              }}
            >
              {t('login.subtitle')}
            </p>
          </div>

          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'inherit',
                }}
              >
                {t('login.email')}
              </label>
              <input
                id="email"
                type="text"
                placeholder="you@example.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
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
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'inherit',
                }}
              >
                {t('login.password')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    padding: '8px 36px 8px 12px',
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
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
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
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? t('login.hidePassword') : t('login.showPassword')}
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
                  margin: '12px 0',
                  color: 'var(--danger-primary)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
                role="alert"
              >
                // ERROR: {error}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '12px 0',
              }}
            >
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                {t('login.rememberMe')}
              </label>
              <Link
                to={ROUTER.FORGOT_PASSWORD}
                style={{
                  fontSize: 13,
                  color: 'var(--accent-primary)',
                  textDecoration: 'none',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
              >
                {t('login.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'var(--text-primary)',
                color: 'var(--bg-surface)',
                border: '1px solid var(--text-primary)',
                borderRadius: 2,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background-color 0.2s ease',
                marginTop: 4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--text-strong)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--text-primary)' }}
            >
              {t('login.submit')}
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                margin: '16px 0',
              }}
            >
              <div style={{ height: 1, background: 'var(--border-base)', flex: 1 }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'inherit' }}>{t('login.or')}</span>
              <div style={{ height: 1, background: 'var(--border-base)', flex: 1 }} />
            </div>

            <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }} />

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
              <span>{t('login.noAccount')}</span>
              <Link
                to="/register"
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
                {t('login.signUp')}
              </Link>
            </div>
          </form>
        </div>

      </section>
    </div>
  )
}

export default Login