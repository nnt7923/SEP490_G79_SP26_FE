import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LogIn, UserPlus } from 'lucide-react'


const SiteHeader: React.FC = () => {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-logo">
          <span className="site-logo__badge">Pr</span>
          <span className="site-logo__text">Pro-Skills</span>
        </Link>

        <nav className="site-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>Home</NavLink>
          <NavLink to="/classes" className={({ isActive }) => (isActive ? 'active' : '')}>Classes</NavLink>
          <NavLink to="/plans" className={({ isActive }) => (isActive ? 'active' : '')}>Plans</NavLink>
          <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : '')}>About Us</NavLink>
        </nav>

        <div className="site-actions">
          <Link to="/login" className="btn btn-outline btn-sm">
            <LogIn size={16} />
            <span>Login</span>
          </Link>
          <Link to="/register" className="btn btn-primary btn-sm">
            <UserPlus size={16} />
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    </header>
  )
}

export default SiteHeader