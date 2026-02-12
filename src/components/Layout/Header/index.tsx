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
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const initials = (user?.name || user?.username || 'U')
    .split(' ')
    .map((s) => s[0]?.toUpperCase())
    .slice(0, 2)
    .join('')

  // Markdown now uses link syntax for navigation
  const md = `- [Dashboard](/dashboard)\n- [Profile](/profile)\n- [Settings](/settings)\n- [Logout](#logout)`

  const onLogout = async () => {
    try { await logout() } catch {}
    navigate(ROUTER.HOME)
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__brand">
          <Link to="/" className="brand">
            <img src={BrandIcon} alt="CodeNexus" className="brand__logo" />
            <span className="brand__name">CodeNexus</span>
          </Link>
        </div>
        <nav className="site-header__nav">
          <Link to="/" className="nav__link">Home</Link>
          <Link to="/classes" className="nav__link">Classes</Link>
          <Link to="/plans" className="nav__link">Plans</Link>
          <Link to="/about" className="nav__link">About Us</Link>
        </nav>
        <div className="site-header__cta" ref={menuRef}>
          {!token ? (
            <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
          ) : (
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <Link to={ROUTER.PROFILE} aria-label="profile" style={{ display: 'inline-block' }}>
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb',
                    display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, color: '#374151'
                  }}>{initials}</div>
                )}
              </Link>

              <button
                aria-label="user menu"
                onClick={() => setOpen((v) => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'transparent', border: '1px solid transparent', cursor: 'pointer', padding: '4px 6px'
                }}
              >
                <span style={{ fontSize: 14, color: '#374151' }}>{user?.name || user?.username}</span>
              </button>

              {open && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 8,
                    width: 260, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: 10, zIndex: 50
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => { setOpen(false); navigate(ROUTER.STUDENT_DASHBOARD) }}>Dashboard</button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setOpen(false); navigate(ROUTER.PROFILE) }}>Profile</button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setOpen(false); navigate(ROUTER.HOME) }}>Settings</button>
                    <button className="btn btn-primary btn-sm" onClick={onLogout}>Logout</button>
                  </div>
                  <div style={{ paddingTop: 8, borderTop: '1px dashed #e5e7eb' }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Các chức năng</div>
                    <div style={{ fontSize: 13, color: '#374151' }}>
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              onClick={(e) => {
                                e.preventDefault()
                                setOpen(false)
                                if (href === '#logout') onLogout()
                                else if (href === '/dashboard') navigate(ROUTER.STUDENT_DASHBOARD)
                                
                                else if (href === '/profile') navigate(ROUTER.PROFILE)
                                else if (href === '/settings') navigate(ROUTER.HOME)
                              }}
                              style={{ color: '#2563eb', textDecoration: 'none', cursor: 'pointer' }}
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {md}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header