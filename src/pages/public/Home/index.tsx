import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="stat">
    <div className="stat__value">{value}</div>
    <div className="stat__label">{label}</div>
  </div>
)

const FeatureCard: React.FC<{ icon: string; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div
    style={{
      padding: 20,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-base)',
      borderRadius: 2,
      transition: 'border-color 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      cursor: 'default',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
  >
    <span style={{ fontSize: 14, color: 'var(--accent-primary)', fontWeight: 600 }}>{icon}</span>
    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
    <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{description}</p>
  </div>
)

const Home: React.FC = () => {
  const navigate = useNavigate()
  const { token, user } = useAuthStore()

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

  // Terminal code lines for hero visual
  const heroCode = [
    { num: 1, content: '// CodeNexus Platform', color: '#8b949e' },
    { num: 2, content: '', color: '' },
    { num: 3, content: 'const platform = {', color: '#e6edf3' },
    { num: 4, content: '  courses: 1000,', color: '#e6edf3' },
    { num: 5, content: '  students: 5000,', color: '#e6edf3' },
    { num: 6, content: '  experts: 200,', color: '#e6edf3' },
    { num: 7, content: '  features: [', color: '#e6edf3' },
    { num: 8, content: '    "ai-powered-paths",', color: '#79c0ff' },
    { num: 9, content: '    "hands-on-projects",', color: '#79c0ff' },
    { num: 10, content: '    "expert-mentoring",', color: '#79c0ff' },
    { num: 11, content: '    "certifications"', color: '#79c0ff' },
    { num: 12, content: '  ]', color: '#e6edf3' },
    { num: 13, content: '};', color: '#e6edf3' },
    { num: 14, content: '', color: '' },
    { num: 15, content: 'platform.launch();', color: '#3fb950' },
    { num: 16, content: '// → Ready to code!', color: '#8b949e' },
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
          gap: 32,
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
            {'>'} Launch Your Tech Career
          </div>
          <h1
            style={{
              fontSize: 32,
              lineHeight: 1.3,
              color: 'var(--text-primary)',
              margin: '0 0 12px',
              fontWeight: 700,
            }}
          >
            Master <span style={{ color: 'var(--accent-primary)' }}>Modern Programming</span>
            <br />and Land Your Dream Job
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              marginBottom: 24,
              maxWidth: 520,
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            // Learn from industry experts with 1000+ hands-on courses.
            <br />
            // Build real projects and join 5000+ successful graduates.
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
            <a
              href="#"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {'>'} Start Free Trial <ArrowRight size={14} />
            </a>
            <a href="#" className="btn btn-outline">
              Explore Courses
            </a>
          </div>

          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <Stat value="1000+" label="Courses" />
            <Stat value="5000+" label="Students" />
            <Stat value="200+" label="Experts" />
          </div>
        </div>

        {/* Terminal panel replacing the image */}
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
              borderBottom: '1px solid var(--text-strong)',
              background: 'var(--terminal-bg)',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--terminal-btn-red)' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--terminal-btn-yellow)' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--terminal-btn-green)' }} />
            <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--terminal-gutter)' }}>
              platform.js — CodeNexus
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
                    color: 'var(--terminal-comment)',
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
              borderTop: '1px solid var(--text-strong)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--terminal-bg)',
            }}
          >
            <span style={{ color: 'var(--success-primary)', fontSize: 13 }}>➜</span>
            <span style={{ color: 'var(--accent-primary)', fontSize: 13 }}>codenexus</span>
            <span style={{ color: 'var(--terminal-gutter)', fontSize: 13 }}>git:(main)</span>
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 14,
                background: 'var(--gray-200)',
                animation: 'blink 1s step-end infinite',
              }}
            />
          </div>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '48px 20px',
          borderTop: '1px solid var(--border-base)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
            // Why Choose Our Platform?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Everything you need to become a professional developer
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
            icon="[usr]"
            title="Learn from Experts"
            description="Get mentored by developers from Google, Meta, Microsoft, and more"
          />
          <FeatureCard
            icon="[</>]"
            title="Real-World Projects"
            description="Build portfolio projects you can showcase to employers"
          />
          <FeatureCard
            icon="[^up]"
            title="Career Growth"
            description="Job-ready curriculum designed by industry professionals"
          />
          <FeatureCard
            icon="[***]"
            title="Certifications"
            description="Get recognized certificates upon course completion"
          />
          <FeatureCard
            icon="[>>>]"
            title="Fast Learning"
            description="Structured paths designed to learn 3x faster than traditional courses"
          />
          <FeatureCard
            icon="[>_]"
            title="Live Coding Sessions"
            description="Weekly live sessions and 1-on-1 mentoring with instructors"
          />
        </div>
      </section>

      {/* ========== HOW IT WORKS SECTION ========== */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '48px 20px',
          borderTop: '1px solid var(--border-base)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
            // How It Works
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Create your personalized learning path in 4 simple steps
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
            { step: 1, icon: '01', title: 'Choose Language', desc: 'Select the programming language you want to learn' },
            { step: 2, icon: '02', title: 'Choose Your Goal', desc: 'Pick a learning goal that matches your career aspirations' },
            { step: 3, icon: '03', title: 'Choose Level', desc: 'Select your skill level: Beginner, Intermediate, or Advanced' },
            { step: 4, icon: '04', title: 'Generate Path', desc: 'Get your personalized AI-powered learning path' },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                padding: 20,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-base)',
                borderRadius: 2,
                transition: 'border-color 0.2s ease',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
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
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                {item.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {'>'} Start Your Journey <ArrowRight size={14} />
          </button>
        </div>
      </section>
    </div>
  )
}

export default Home
