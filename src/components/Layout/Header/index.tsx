
import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandIcon from '../../../assets/div.png'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import ReactMarkdown from 'react-markdown'

const Header: React.FC = () => {
  const navigate = useNavigate()
  const { token, user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
  const mdLines = [`- [Dashboard](${dashboardPath})`]
  if (profilePath) mdLines.push(`- [Profile](${profilePath})`)
  if (isStudent) mdLines.push(`- [My Plans](${ROUTER.MY_PLANS})`)
  mdLines.push(`- [Change Password](${ROUTER.CHANGE_PASSWORD})`)
  mdLines.push('- [Logout](#logout)')
  const md = mdLines.join('\n')

  const onLogout = async () => {
    try { await logout() } catch {}
    navigate(ROUTER.HOME)
  }

  const AvatarEl = (
    user?.avatarUrl ? (
      <img src={user.avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
    ) : (
      <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold text-slate-700 dark:text-slate-200">{initials}</div>
    )
  )

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
      {/* Make container full-width so left/right groups stick to screen edges */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3">
              <img src={BrandIcon} alt="CodeNexus" className="w-8 h-8 rounded-md" />
              <span className="text-xl font-semibold text-slate-900 dark:text-white">CodeNexus</span>
            </Link>
          </div>

          {/* Center: Navigation */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Primary">
            <Link to="/" className="text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Home</Link>
            {/* <Link to="/classes" className="text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Classes</Link> */}
            {showPlansLink && (
              <Link to="/plans" className="text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Plans</Link>
            )}
            <Link to="/about" className="text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">About</Link>
          </nav>

          {/* Right: User menu */}
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-md text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {!token ? (
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-md border border-blue-600 text-blue-600 text-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Login
              </Link>
            ) : (
              <div className="relative" ref={menuRef}>
                <div className="flex items-center gap-3">
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
                    className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <span className="text-sm text-slate-900 dark:text-white">{user?.name || user?.username}</span>
                  </button>
                </div>

                {open && (
                  <div
                    role="menu"
                    aria-label="User menu"
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg p-3 z-50"
                  >
                    <div className="flex flex-col gap-2">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            <button
                              type="button"
                              role="menuitem"
                              className="text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-slate-800 w-full"
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
          <div className="md:hidden border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <nav className="px-4 py-3 space-y-2" aria-label="Mobile navigation">
              <Link 
                to="/" 
                className="block px-3 py-2 rounded-md text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              {showPlansLink && (
                <Link 
                  to="/plans" 
                  className="block px-3 py-2 rounded-md text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Plans
                </Link>
              )}
              <Link 
                to="/about" 
                className="block px-3 py-2 rounded-md text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header