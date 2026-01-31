import React from 'react'


const SiteFooter: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>© {new Date().getFullYear()} Pro-Skills. All rights reserved.</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <a href="#" aria-label="privacy">Privacy</a>
          <a href="#" aria-label="terms">Terms</a>
          <a href="#" aria-label="contact">Contact</a>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter