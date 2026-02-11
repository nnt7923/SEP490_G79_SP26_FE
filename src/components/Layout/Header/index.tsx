import React from 'react'
import { Link } from 'react-router-dom'
import BrandIcon from '../../../assets/div.png'

const Header: React.FC = () => {
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
        <div className="site-header__cta">
          <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
        </div>
      </div>
    </header>
  )
}

export default Header