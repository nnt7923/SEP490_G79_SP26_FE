import React from 'react'
import { Link } from 'react-router-dom'
import ROUTER from '../../../router/ROUTER'
import BrandIcon from '../../../assets/div.png'

const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="footer__brand">
          <Link to="/" className="brand">
            <img src={BrandIcon} alt="CodeNexus" className="brand__logo" />
            <span className="brand__name">CodeNexus</span>
          </Link>
          <p className="footer__desc">Personalized learning paths powered by real-time content.</p>
        </div>
        <div className="footer__links">
          <div className="footer__col">
            <h4 className="footer__title">Product</h4>
            <ul className="footer__list">
              <li><Link to={ROUTER.PLANS} className="footer__link">Plans</Link></li>
              <li><Link to={ROUTER.STUDENT_DASHBOARD} className="footer__link">Dashboard</Link></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4 className="footer__title">Company</h4>
            <ul className="footer__list">
              <li><Link to={ROUTER.ABOUT} className="footer__link">About Us</Link></li>
              <li><Link to={ROUTER.PROFILE} className="footer__link">My Profile</Link></li>
              <li><a href="#contact" className="footer__link">Contact</a></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4 className="footer__title">Legal</h4>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer