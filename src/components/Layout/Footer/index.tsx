import React from 'react'
import { Link } from 'react-router-dom'
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
          <p className="footer__desc">Learn new skills anytime, anywhere.</p>
        </div>
        <div className="footer__links">
          <div className="footer__col">
            <h4 className="footer__title">Product</h4>
            <Link to="/" className="footer__link">Home</Link>
            <Link to="/classes" className="footer__link">Classes</Link>
            <Link to="/plans" className="footer__link">Plans</Link>
          </div>
          <div className="footer__col">
            <h4 className="footer__title">Company</h4>
            <Link to="/about" className="footer__link">About Us</Link>
            <Link to="/contact" className="footer__link">Contact</Link>
            <Link to="/careers" className="footer__link">Careers</Link>
          </div>
          <div className="footer__col">
            <h4 className="footer__title">Legal</h4>
            <Link to="/privacy" className="footer__link">Privacy</Link>
            <Link to="/terms" className="footer__link">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer