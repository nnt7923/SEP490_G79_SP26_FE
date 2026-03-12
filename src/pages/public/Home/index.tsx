import React, { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import { useTranslation } from 'react-i18next'

/* ─── Shared sub-components ─── */

const FeatureCard: React.FC<{
  prefix: string
  title: string
  description: string
  accent?: string
}> = ({ prefix, title, description, accent }) => (
  <div
    style={{
      padding: 20,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-base)',
      borderRadius: 2,
      transition: 'border-color 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = accent || 'var(--accent-primary)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--border-base)'
    }}
  >
    <span
      style={{
        fontSize: 12,
        color: accent || 'var(--accent-primary)',
        fontWeight: 600,
      }}
    >
      {prefix}
    </span>
    <h3
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--text-primary)',
        margin: 0,
      }}
    >
      {title}
    </h3>
    <p
      style={{
        color: 'var(--text-secondary)',
        fontSize: 13,
        margin: 0,
        lineHeight: 1.6,
      }}
    >
      {description}
    </p>
  </div>
)

/* ─── Main component ─── */

const Home: React.FC = () => {
  const navigate = useNavigate()
  const { token, user } = useAuthStore()
  const { t } = useTranslation('home')

  useEffect(() => {
    if (token && user) {
      const roleName = String((user as any)?.role?.name || '').toLowerCase()
      if (roleName === 'admin') {
        navigate(ROUTER.ADMIN_DASHBOARD, { replace: true })
      } else if (roleName === 'mentor') {
        navigate(ROUTER.MENTOR_DASHBOARD, { replace: true })
      } else if (roleName === 'student') {
        navigate(ROUTER.STUDENT_OVERVIEW, { replace: true })
      }
    }
  }, [token, user, navigate])

  // Terminal code for hero — shows what the platform does
  const heroCode = [
    { num: 1, content: '// CodeNexus — Learning Support', color: '#8b949e' },
    { num: 2, content: '', color: '' },
    { num: 3, content: 'const myPlan = CodeNexus.createPlan({', color: '#e6edf3' },
    { num: 4, content: '  language: "JavaScript",', color: '#79c0ff' },
    { num: 5, content: '  goal: "Full-stack Developer",', color: '#79c0ff' },
    { num: 6, content: '  level: "Intermediate",', color: '#79c0ff' },
    { num: 7, content: '});', color: '#e6edf3' },
    { num: 8, content: '', color: '' },
    { num: 9, content: 'myPlan.generateLessons();', color: '#e6edf3' },
    { num: 10, content: 'myPlan.trackProgress();', color: '#e6edf3' },
    { num: 11, content: '', color: '' },
    { num: 12, content: '// → 12 chapters generated', color: '#3fb950' },
    { num: 13, content: '// → Progress: 3/12 completed', color: '#3fb950' },
  ]

  return (
    <div className="page">
      {/* ========== HERO SECTION ========== */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '48px 20px 60px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-blue-hover)',
              border: '1px solid var(--border-base)',
              borderRadius: 2,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent-primary)',
              marginBottom: 16,
            }}
          >
            {t('hero.badge')}
          </div>
          <h1
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              color: 'var(--text-primary)',
              margin: '0 0 12px',
              fontWeight: 700,
            }}
          >
            {t('hero.titleLine1')}{' '}
            <span style={{ color: 'var(--accent-primary)' }}>{t('hero.titleHighlight')}</span>
            <br />
            {t('hero.titleLine2')}
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              marginBottom: 24,
              maxWidth: 480,
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            {t('hero.descLine1')}
            <br />
            {t('hero.descLine2')}
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(ROUTER.PLANS)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {t('hero.ctaPlan')} <ArrowRight size={14} />
            </button>
            <Link
              to="/register"
              className="btn btn-outline"
            >
              {t('hero.ctaRegister')}
            </Link>
          </div>
        </div>

        {/* Terminal panel */}
        <div
          style={{
            border: '1px solid var(--border-base)',
            borderRadius: 2,
            background: 'var(--code-block-bg)',
            overflow: 'hidden',
          }}
        >
          {/* Title bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              background: 'var(--terminal-bg)',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--terminal-btn-red)' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--terminal-btn-yellow)' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--terminal-btn-green)' }} />
            <span style={{ marginLeft: 12, fontSize: 11, color: '#8b949e' }}>
              learning-plan.js — CodeNexus
            </span>
          </div>
          {/* Code content */}
          <div style={{ padding: '16px 0' }}>
            {heroCode.map((line) => (
              <div
                key={line.num}
                style={{
                  display: 'flex',
                  padding: '1px 14px',
                  lineHeight: '22px',
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    width: 32,
                    textAlign: 'right',
                    color: '#484f58',
                    userSelect: 'none',
                    paddingRight: 16,
                    flexShrink: 0,
                  }}
                >
                  {line.num}
                </span>
                <span style={{ color: line.color || 'transparent' }}>
                  {line.content || '\u00A0'}
                </span>
              </div>
            ))}
          </div>
          {/* Terminal prompt */}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--terminal-bg)',
            }}
          >
            <span style={{ color: '#3fb950', fontSize: 13 }}>➜</span>
            <span style={{ color: '#79c0ff', fontSize: 13 }}>codenexus</span>
            <span style={{ color: '#484f58', fontSize: 13 }}>
              git:(main)
            </span>
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 14,
                background: '#e6edf3',
                animation: 'blink 1s step-end infinite',
              }}
            />
          </div>
        </div>
      </section>

      {/* ========== PLATFORM FEATURES ========== */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '48px 20px',
          borderTop: '1px solid var(--border-base)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 8px',
            }}
          >
            {t('features.title')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {t('features.subtitle')}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          <FeatureCard
            prefix="[plan]"
            title={t('features.plan.title')}
            description={t('features.plan.description')}
          />
          <FeatureCard
            prefix="[goal]"
            title={t('features.goal.title')}
            description={t('features.goal.description')}
            accent="var(--success-primary)"
          />
          <FeatureCard
            prefix="[track]"
            title={t('features.track.title')}
            description={t('features.track.description')}
            accent="var(--warning-primary)"
          />
          <FeatureCard
            prefix="[lesson]"
            title={t('features.lesson.title')}
            description={t('features.lesson.description')}
          />
          <FeatureCard
            prefix="[ai]"
            title={t('features.ai.title')}
            description={t('features.ai.description')}
            accent="var(--success-primary)"
          />
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '48px 20px',
          borderTop: '1px solid var(--border-base)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 8px',
            }}
          >
            {t('howItWorks.title')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {t('howItWorks.subtitle')}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {[
            { step: 1, icon: '01', title: t('howItWorks.step1.title'), desc: t('howItWorks.step1.desc') },
            { step: 2, icon: '02', title: t('howItWorks.step2.title'), desc: t('howItWorks.step2.desc') },
            { step: 3, icon: '03', title: t('howItWorks.step3.title'), desc: t('howItWorks.step3.desc') },
            { step: 4, icon: '04', title: t('howItWorks.step4.title'), desc: t('howItWorks.step4.desc') },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                padding: 20,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-base)',
                borderRadius: 2,
                transition: 'border-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-base)'
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--border-base)',
                  marginBottom: 12,
                  fontFamily: 'inherit',
                }}
              >
                {item.icon}
              </div>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: '0 0 8px',
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(ROUTER.PLANS)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {t('howItWorks.ctaStart')} <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* ========== ROLES SECTION ========== */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '48px 20px 64px',
          borderTop: '1px solid var(--border-base)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 8px',
            }}
          >
            {t('roles.title')}
          </h2>
        </div>

        <div
          style={{
            maxWidth: 500,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              padding: 24,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-base)',
              borderRadius: 2,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--accent-primary)',
                marginBottom: 8,
              }}
            >
              {t('roles.personalizeLabel')}
            </div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 12px',
              }}
            >
              {t('roles.personalizeTitle')}
            </h3>
            <ul
              style={{
                margin: 0,
                padding: '0 0 0 16px',
                color: 'var(--text-secondary)',
                fontSize: 13,
                lineHeight: 2,
              }}
            >
              <li>{t('roles.feature1')}</li>
              <li>{t('roles.feature2')}</li>
              <li>{t('roles.feature3')}</li>
              <li>{t('roles.feature4')}</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
