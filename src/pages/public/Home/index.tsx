import React, { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import { useTranslation } from 'react-i18next'
import { TypeAnimation } from 'react-type-animation'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import Tilt from 'react-parallax-tilt'
import { SpotlightCard } from '../../../components/ui/SpotlightCard'
import { HeroBackground, TextReveal } from '../../../components/ui/Effects'
import { MagneticButton } from '../../../components/ui/MagneticButton'

/* ─── Shared sub-components ─── */

const FeatureCard: React.FC<{
  prefix: string
  title: string
  description: string
  accent?: string
}> = ({ prefix, title, description, accent }) => (
  <Tilt tiltMaxAngleX={4} tiltMaxAngleY={4} scale={1.02} transitionSpeed={400} style={{ height: '100%' }}>
    <SpotlightCard
      spotlightColor="var(--bg-blue-hover)"
      className="transition-[border-color] duration-200 ease-in"
      style={{ height: '100%' }}
    >
      <div
        style={{
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          cursor: 'default',
          height: '100%'
        }}
      >
        <span style={{ fontSize: 13, color: accent || 'var(--accent-primary)', fontWeight: 600 }}>
          {prefix}
        </span>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
    </SpotlightCard>
  </Tilt>
)


/* ─── Main component ─── */

const Home: React.FC = () => {
  const navigate = useNavigate()
  const { token, user } = useAuthStore()
  const { t } = useTranslation('home')
  const [init, setInit] = React.useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => {
      setInit(true)
    })
  }, [])

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
    <div className="page overflow-x-hidden relative">
      {/* ========== HERO SECTION (PARTICLES BG) ========== */}
      <HeroBackground />
      {init && (
        <Particles
          id="tsparticles"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
          options={{
            background: { color: { value: 'transparent' } },
            fpsLimit: 120,
            interactivity: {
              events: {
                onClick: { enable: true, mode: 'push' },
                onHover: { enable: true, mode: 'repulse' },
                resize: { enable: true }
              },
              modes: {
                push: { quantity: 4 },
                repulse: { distance: 100, duration: 0.4 }
              }
            },
            particles: {
              color: { value: '#3B82F6' },
              links: { color: '#3B82F6', distance: 150, enable: true, opacity: 0.2, width: 1 },
              move: { direction: 'none', enable: true, outModes: { default: 'bounce' }, random: false, speed: 1.2, straight: false },
              number: { density: { enable: true, width: 800 }, value: 60 },
              opacity: { value: 0.3 },
              shape: { type: 'circle' },
              size: { value: { min: 1, max: 3 } }
            },
            detectRetina: true
          }}
        />
      )}
      
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '60px 20px 80px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
          alignItems: 'center',
          position: 'relative',
          zIndex: 1
        }}
        id="hero"
      >
        {/* Hero text — slide in from left */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
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
          <TextReveal 
            text={`${t('hero.descLine1')} ${t('hero.descLine2')}`}
            delay={3}
            className="text-[var(--text-secondary)] mb-6 max-w-[480px] text-[13px] leading-[1.7]"
          />
          <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
            <MagneticButton
              className="btn btn-primary"
              onClick={() => navigate(ROUTER.PLANS)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {t('hero.ctaPlan')} <ArrowRight size={14} />
            </MagneticButton>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/register" className="btn btn-outline">
                {t('hero.ctaRegister')}
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Terminal panel — slide in from right */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
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
          {/* Code lines — React Type Animation */}
          <div style={{ padding: '16px 0', minHeight: 330, position: 'relative' }}>
            {/* Dựng line numbers tĩnh bên trái */}
            <div style={{ position: 'absolute', left: 0, top: 16, bottom: 16, width: 46, display: 'flex', flexDirection: 'column' }}>
              {heroCode.map(line => (
                <div key={`num-${line.num}`} style={{ textAlign: 'right', paddingRight: 16, color: '#484f58', fontSize: 13, lineHeight: '22px', userSelect: 'none' }}>
                  {line.num}
                </div>
              ))}
            </div>
            
            {/* Hiệu ứng gõ Text */}
            <div style={{ paddingLeft: 46, paddingRight: 14 }}>
              <TypeAnimation
                sequence={[
                  1000,
                  heroCode.map(l => l.content).join('\n'),
                ]}
                wrapper="pre"
                cursor={false}
                speed={70}
                style={{
                  margin: 0,
                  fontFamily: 'monospace',
                  fontSize: 13,
                  lineHeight: '22px',
                  color: '#e6edf3',
                  whiteSpace: 'pre-wrap',
                  display: 'block'
                }}
              />
            </div>
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
            <span style={{ color: '#484f58', fontSize: 13 }}>git:(main)</span>
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
        </motion.div>
      </section>

      {/* ========== PLATFORM FEATURES ========== */}
      <section
        data-aos="fade-up"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '48px 20px',
          borderTop: '1px solid var(--border-base)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }} data-aos="fade-up">
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
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
          {[
            { prefix: '[plan]', title: t('features.plan.title'), description: t('features.plan.description'), accent: undefined },
            { prefix: '[goal]', title: t('features.goal.title'), description: t('features.goal.description'), accent: 'var(--success-primary)' },
            { prefix: '[track]', title: t('features.track.title'), description: t('features.track.description'), accent: 'var(--warning-primary)' },
            { prefix: '[lesson]', title: t('features.lesson.title'), description: t('features.lesson.description'), accent: undefined },
            { prefix: '[ai]', title: t('features.ai.title'), description: t('features.ai.description'), accent: 'var(--success-primary)' },
          ].map((card, i) => (
            <motion.div
              key={card.prefix}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <FeatureCard {...card} />
            </motion.div>
          ))}
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
        <div style={{ textAlign: 'center', marginBottom: 32 }} data-aos="fade-up">
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
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
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -4 }}
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
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--border-base)', marginBottom: 12 }}>
                {item.icon}
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                {item.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <motion.button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(ROUTER.PLANS)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {t('howItWorks.ctaStart')} <ArrowRight size={14} />
          </motion.button>
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
        <div style={{ textAlign: 'center', marginBottom: 32 }} data-aos="fade-up">
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
            {t('roles.title')}
          </h2>
        </div>

        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ y: -4 }}
            style={{
              padding: 24,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-base)',
              borderRadius: 2,
              transition: 'border-color 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 8 }}>
              {t('roles.personalizeLabel')}
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
              {t('roles.personalizeTitle')}
            </h3>
            <ul style={{ margin: 0, padding: '0 0 0 16px', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 2 }}>
              <li>{t('roles.feature1')}</li>
              <li>{t('roles.feature2')}</li>
              <li>{t('roles.feature3')}</li>
              <li>{t('roles.feature4')}</li>
            </ul>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default Home
