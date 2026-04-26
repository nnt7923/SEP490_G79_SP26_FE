
import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import ReactMarkdown from 'react-markdown'
import { useTheme } from '../../../contexts/ThemeContext'
import LanguageSwitcher from '../../LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { FaBell } from 'react-icons/fa'
import NotificationList from '../../Notifications/NotificationList'
import useAppNotificationStore from '../../../store/useAppNotificationStore'
import useNotificationStore from '../../../store/useNotificationStore'
import { navigateAndMarkNotificationRead } from '../../Notifications/utils'

const FOCUS_SESSION_RUNNING_LOCK_KEY = 'focus_session_running_lock'

const Header: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, user, logout, fetchProfile } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { t } = useTranslation('common')
  const menuRef = useRef<HTMLDivElement | null>(null)
  const lastBalanceSyncAtRef = useRef<number>(0)
  const panelItems = useAppNotificationStore((state) => state.panelItems)
  const panelLoading = useAppNotificationStore((state) => state.panelLoading)
  const notificationError = useAppNotificationStore((state) => state.error)
  const unreadNotificationCount = useAppNotificationStore((state) => state.unreadCount)
  const refreshPanel = useAppNotificationStore((state) => state.refreshPanel)
  const markAsRead = useAppNotificationStore((state) => state.markAsRead)
  const showToast = useNotificationStore((state) => state.showToast)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setNotificationsOpen(false)
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

  useEffect(() => {
    if (!token || !isStudent) return

    const syncProfileBalance = () => {
      const now = Date.now()
      if (now - lastBalanceSyncAtRef.current < 15000) return
      lastBalanceSyncAtRef.current = now
      void fetchProfile().catch(() => {})
    }

    const onFocus = () => {
      syncProfileBalance()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncProfileBalance()
      }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [fetchProfile, isStudent, token])
  
  const dashboardPath = isAdmin
    ? ROUTER.ADMIN_DASHBOARD
    : isMentor
      ? ROUTER.MENTOR_DASHBOARD
      : ROUTER.STUDENT_DASHBOARD

  // Decide profile path by role; admin has no profile
  const profilePath = isAdmin ? '' : (isMentor ? ROUTER.MENTOR_PROFILE : ROUTER.PROFILE)

  const showPlansLink = !isAdmin
  const balanceVnd = Number((user as any)?.tokenBalance ?? (user as any)?.BalanceVnd ?? (user as any)?.balanceVnd ?? 0)
  const formattedBalanceVnd = Number.isFinite(balanceVnd)
    ? new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(balanceVnd)))
    : '0'

  // Build markdown menu dynamically - only show My Plans for students
  const mdLines = [`- [${t('userMenu.dashboard')}](${dashboardPath})`]
  if (profilePath) mdLines.push(`- [${t('userMenu.profile')}](${profilePath})`)
  if (isStudent) mdLines.push(`- [${t('userMenu.myPlans')}](${ROUTER.MY_PLANS})`)
  if (isStudent || isMentor) mdLines.push(`- [${t('userMenu.changePassword')}](${ROUTER.CHANGE_PASSWORD})`)
  mdLines.push(`- [${t('userMenu.logout')}](#logout)`)
  const md = mdLines.join('\n')

  const onLogout = async () => {
    const isFocusSessionRoute = location.pathname === ROUTER.FOCUS_SESSION
    const hasRunningFocusSession = typeof window !== 'undefined' && Boolean(window.sessionStorage.getItem(FOCUS_SESSION_RUNNING_LOCK_KEY))

    if (isFocusSessionRoute && hasRunningFocusSession) {
      showToast(t('userMenu.mustPauseBeforeLogout'), 'warning')
      setOpen(false)
      setMobileMenuOpen(false)
      return
    }

    try { await logout() } catch {}
    navigate(ROUTER.HOME)
  }

  const handleNotificationsToggle = async () => {
    const nextOpen = !notificationsOpen
    setNotificationsOpen(nextOpen)
    setOpen(false)

    if (!nextOpen) return

    try {
      await refreshPanel()
    } catch (error: any) {
      showToast(error?.message || t('notifications.fetchError'), 'error')
    }
  }

  const handleNotificationClick = async (notification: any) => {
    setNotificationsOpen(false)
    try {
      await navigateAndMarkNotificationRead(notification, navigate, markAsRead)
    } catch (error: any) {
      showToast(error?.message || t('notifications.markReadError'), 'error')
    }
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
    <motion.header
      initial={{ y: -48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
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
          {token && (
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
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
          )}

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

            {/* Mobile menu button (only when logged in) */}
            {token && (
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
            )}

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {isStudent && (
                    <button
                      type="button"
                      onClick={() => navigate(ROUTER.SHOP)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        border: '1px solid var(--border-base)',
                        borderRadius: 999,
                        background: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        padding: '6px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title={t('userMenu.balanceBadgeTitle')}
                    >
                      <span style={{ color: 'var(--accent-primary)' }}>●</span>
                      {t('userMenu.balanceBadge', { amount: formattedBalanceVnd })}
                    </button>
                  )}

                  {isStudent && (
                    <button
                      type="button"
                      onClick={() => { void handleNotificationsToggle() }}
                      style={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 34,
                        height: 34,
                        padding: 0,
                        color: 'var(--text-primary)',
                        background: notificationsOpen || unreadNotificationCount > 0 ? 'var(--bg-main)' : 'transparent',
                        border: notificationsOpen || unreadNotificationCount > 0 ? '1px solid var(--border-base)' : '1px solid transparent',
                        borderRadius: 4,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      title={t('notifications.title')}
                    >
                      <FaBell size={15} />
                      {unreadNotificationCount > 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            background: 'var(--danger-primary)',
                            borderRadius: '999px',
                            minWidth: 16,
                            height: 16,
                            padding: '0 4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 700,
                            transform: 'translate(25%, -25%)',
                            boxShadow: '0 0 0 2px var(--bg-surface)',
                          }}
                        >
                          {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                        </span>
                      )}
                    </button>
                  )}

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

                <AnimatePresence>
                {open && (
                  <motion.div
                    key="dropdown"
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
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
                  </motion.div>
                )}
                </AnimatePresence>

                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      key="notifications-dropdown"
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                      style={{
                        position: 'absolute',
                        right: 72,
                        top: 40,
                        width: 320,
                        maxWidth: 'calc(100vw - 32px)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-base)',
                        borderRadius: 6,
                        padding: 12,
                        zIndex: 55,
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {t('notifications.title')}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {t('notifications.unreadCountLabel', { count: unreadNotificationCount })}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNotificationsOpen(false)
                            navigate(ROUTER.NOTIFICATIONS)
                          }}
                          style={{
                            border: '1px solid var(--border-base)',
                            borderRadius: 4,
                            background: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            padding: '6px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {t('notifications.viewAll')}
                        </button>
                      </div>

                      <NotificationList
                        items={panelItems.slice(0, 5)}
                        loading={panelLoading}
                        error={notificationError}
                        emptyLabel={t('notifications.empty')}
                        onItemClick={handleNotificationClick}
                        onReadVisible={markAsRead}
                        compact
                        titleOnly
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {(mobileMenuOpen && token) && (
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
    </motion.header>
  )
}

export default Header
