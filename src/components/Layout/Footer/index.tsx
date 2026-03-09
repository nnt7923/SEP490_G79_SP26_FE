import React from 'react'
import { Link } from 'react-router-dom'
import ROUTER from '../../../router/ROUTER'
import { useTranslation } from 'react-i18next'

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()
  const { t } = useTranslation('common')

  return (
    <footer
      style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-base)',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ width: '100%', padding: '0 24px' }}>
        {/* Main Footer Content */}
        <div style={{ padding: '32px 0' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 32,
            }}
          >
            {/* Brand Section */}
            <div>
              <Link
                to="/"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  textDecoration: 'none',
                  color: 'var(--text-primary)',
                  marginBottom: 8,
                }}
              >
                <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: 13 }}>{'>'}_</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>CodeNexus</span>
              </Link>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {/* Personalized learning paths */}
                {t('footer.tagline1')}
                <br />
                {t('footer.tagline2')}
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  margin: '0 0 12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {t('footer.product')}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: 6 }}>
                  <Link
                    to={ROUTER.PLANS}
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-primary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    {t('footer.plans')}
                  </Link>
                </li>
                <li style={{ marginBottom: 6 }}>
                  <Link
                    to={ROUTER.STUDENT_OVERVIEW}
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-primary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    {t('footer.overview')}
                  </Link>
                </li>
                <li style={{ marginBottom: 6 }}>
                  <Link
                    to={ROUTER.MY_RESOURCES}
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-primary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    {t('footer.resources')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  margin: '0 0 12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {t('footer.company')}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: 6 }}>
                  <Link
                    to={ROUTER.ABOUT}
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-primary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    {t('footer.about')}
                  </Link>
                </li>
                <li style={{ marginBottom: 6 }}>
                  <Link
                    to={ROUTER.HOME}
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-primary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    {t('footer.home')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid var(--border-base)',
            padding: '12px 0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
            {t('footer.copyright', { year: currentYear })}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a
              href="#terms"
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {t('footer.terms')}
            </a>
            <a
              href="#privacy"
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {t('footer.privacy')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer