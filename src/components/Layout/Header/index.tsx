
import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import ReactMarkdown from 'react-markdown'
import { useTheme } from '../../../contexts/ThemeContext'
import LanguageSwitcher from '../../LanguageSwitcher'
import { useTranslation } from 'react-i18next'

const Header: React.FC = () => {
  const navigate = useNavigate()
  const { token, user, logout } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { t } = useTranslation('common')
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const initials = (user?.name || user?.username || 'U')
    .split(' ')
    .map((s) => s[0]?.toUpperCase())
    .slice(0, 2)
    .join('')

  // Determine dashboard path by role (case-insensitive)
  const roleName = (user?.role?.name || (user as any)?.roleName || (user as any)?.roles?.[0] || '').toString()
  const normalizedRole = roleName.trim().toLowerCase()
  
  const isAdmin = normalizedRole === 'admin'
  const isMentor = normalizedRole === 'mentor'
  const isStudent = normalizedRole === 'student' || (!isAdmin && !isMentor)
  
  const dashboardPath = isAdmin
    ? ROUTER.ADMIN_DASHBOARD
    : isMentor
      ? ROUTER.MENTOR_DASHBOARD
      : ROUTER.STUDENT_DASHBOARD

  // Decide profile path by role; admin has no profile
  const profilePath = isAdmin ? '' : (isMentor ? ROUTER.MENTOR_PROFILE : ROUTER.PROFILE)

  const showPlansLink = !isAdmin

  // Build markdown menu dynamically - only show My Plans for students
  const mdLines = [`- [${t('userMenu.dashboard')}](${dashboardPath})`]
  if (profilePath) mdLines.push(`- [${t('userMenu.profile')}](${profilePath})`)
  if (isStudent) mdLines.push(`- [${t('userMenu.myPlans')}](${ROUTER.MY_PLANS})`)
  mdLines.push(`- [${t('userMenu.changePassword')}](${ROUTER.CHANGE_PASSWORD})`)
  mdLines.push(`- [${t('userMenu.logout')}](#logout)`)
  const md = mdLines.join('\n')

  const onLogout = async () => {
    try { await logout() } catch {}
    navigate(ROUTER.HOME)
  }

  const AvatarEl = (
    user?.avatarUrl ? (
      <img
        src={user.avatarUrl}
        alt="avatar"
        style={{
          width: 28,
          height: 28,
          borderRadius: 2,
          objectFit: 'cover',
          border: '1px solid var(--border-base)',
        }}
      />
    ) : (
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 2,
          background: 'var(--bg-neutral)',
          border: '1px solid var(--border-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-primary)',
          fontFamily: 'inherit',
        }}
      >
        {initials}
      </div>
    )
  )

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-base)',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ width: '100%', padding: '0 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 48,
          }}
        >
          {/* Left: Logo */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
                color: 'var(--text-primary)',
              }}
            >
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: 14 }}>{'>'}_</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                CodeNexus
              </span>
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 14,
                  background: 'var(--accent-primary)',
                  animation: 'blink 1s step-end infinite',
                  marginLeft: 2,
                }}
              />
            </Link>
          </div>

          {/* Center: Navigation */}
          <nav
            className="hidden md:flex"
            style={{
              alignItems: 'center',
              gap: 24,
            }}
            aria-label="Primary"
          >
            <Link
              to="/"
              className="nav-terminal-link"
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {t('nav.home')}
            </Link>
            {showPlansLink && (
              <Link
                to="/plans"
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                {t('nav.plans')}
              </Link>
            )}
            <Link
              to="/about"
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {t('nav.about')}
            </Link>
          </nav>

          {/* Right: Theme toggle + User menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                padding: '4px 10px',
                border: '1px solid var(--border-base)',
                borderRadius: 2,
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: 'inherit',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              aria-label="Toggle dark mode"
              title={theme === 'light' ? t('theme.switchToDark') : t('theme.switchToLight')}
            >
              {theme === 'light' ? '☾' : '☀'}
            </button>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden"
              style={{
                padding: 6,
                border: '1px solid var(--border-base)',
                borderRadius: 2,
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                alignItems: 'center',
              }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {!token ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link
                  to="/login"
                  style={{
                    padding: '5px 14px',
                    border: '1px solid var(--text-primary)',
                    borderRadius: 2,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--text-primary)'
                    e.currentTarget.style.color = 'var(--bg-surface)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                >
                  {t('auth.login')}
                </Link>
                <Link
                  to="/register"
                  style={{
                    padding: '5px 14px',
                    border: '1px solid var(--accent-primary)',
                    borderRadius: 2,
                    fontSize: 13,
                    fontWeight: 600,
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    textDecoration: 'none',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.85'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  {t('auth.register')}
                </Link>
              </div>
            ) : (
              <div style={{ position: 'relative' }} ref={menuRef}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {profilePath ? (
                    <Link to={profilePath} aria-label="profile">
                      {AvatarEl}
                    </Link>
                  ) : (
                    <span aria-label="profile">{AvatarEl}</span>
                  )}

                  <button
                    type="button"
                    aria-haspopup="true"
                    onClick={() => setOpen((v) => !v)}
                    className="hidden sm:inline-flex"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      border: '1px solid var(--border-base)',
                      borderRadius: 2,
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--accent-primary)' }}>$</span>
                    <span>{user?.name || user?.username}</span>
                  </button>
                </div>

                {open && (
                  <div
                    role="menu"
                    aria-label="User menu"
                    style={{
                      position: 'absolute',
                      right: 0,
                      marginTop: 4,
                      width: 220,
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-base)',
                      borderRadius: 2,
                      padding: 8,
                      zIndex: 50,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            <button
                              type="button"
                              role="menuitem"
                              style={{
                                textAlign: 'left',
                                padding: '6px 10px',
                                borderRadius: 2,
                                fontSize: 13,
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                fontFamily: 'inherit',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-neutral)' }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                              onClick={() => {
                                setOpen(false)
                                if (href === '#logout') onLogout()
                                else if (href) navigate(href)
                              }}
                            >{children}</button>
                          ),
                        }}
                      >{md}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div
            style={{
              borderTop: '1px solid var(--border-base)',
              background: 'var(--bg-surface)',
            }}
          >
            <nav style={{ padding: '8px 0' }} aria-label="Mobile navigation">
              <Link
                to="/"
                style={{
                  display: 'block',
                  padding: '6px 12px',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.home')}
              </Link>
              {showPlansLink && (
                <Link
                  to="/plans"
                  style={{
                    display: 'block',
                    padding: '6px 12px',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.plans')}
                </Link>
              )}
              <Link
                to="/about"
                style={{
                  display: 'block',
                  padding: '6px 12px',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.about')}
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header