import React from 'react'
import { Link } from 'react-router-dom'
import { Mail, Globe, Users, Sparkles, Target, ShieldCheck, MessageCircle, Clock3, LifeBuoy, Code2, Cpu, TerminalSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ROUTER from '../../../router/ROUTER'

const AboutPage: React.FC = () => {
  const { t } = useTranslation('common')

  const values = [
    {
      icon: <Sparkles size={18} />,
      title: t('aboutPage.values.aiFirst.title'),
      description: t('aboutPage.values.aiFirst.description'),
    },
    {
      icon: <Target size={18} />,
      title: t('aboutPage.values.goalDriven.title'),
      description: t('aboutPage.values.goalDriven.description'),
    },
    {
      icon: <ShieldCheck size={18} />,
      title: t('aboutPage.values.reliable.title'),
      description: t('aboutPage.values.reliable.description'),
    },
    {
      icon: <Users size={18} />,
      title: t('aboutPage.values.community.title'),
      description: t('aboutPage.values.community.description'),
    },
  ]

  return (
    <div style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
      <section
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '56px 20px 18px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            border: '1px solid var(--border-base)',
            background: 'linear-gradient(90deg, rgba(16,185,129,0.14), rgba(59,130,246,0.14))',
            color: 'var(--accent-primary)',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 2,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}
        >
          <TerminalSquare size={14} />
          {t('aboutPage.badge')}
        </div>

        <h1
          style={{
            margin: '14px 0 12px',
            fontSize: 34,
            lineHeight: 1.3,
            color: 'var(--text-primary)',
            fontWeight: 800,
          }}
        >
          {t('aboutPage.title')}
        </h1>

        <p
          style={{
            margin: 0,
            maxWidth: 860,
            color: 'var(--text-secondary)',
            fontSize: 15,
            lineHeight: 1.75,
          }}
        >
          {t('aboutPage.description')}
        </p>

        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 10,
          }}
        >
          <div style={{ border: '1px solid var(--border-base)', background: 'var(--bg-surface)', borderRadius: 2, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            <Code2 size={15} color='var(--accent-primary)' />
            {t('aboutPage.tags.supportOnly')}
          </div>
          <div style={{ border: '1px solid var(--border-base)', background: 'var(--bg-surface)', borderRadius: 2, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            <Cpu size={15} color='var(--accent-primary)' />
            {t('aboutPage.tags.aiGenerated')}
          </div>
          <div style={{ border: '1px solid var(--border-base)', background: 'var(--bg-surface)', borderRadius: 2, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            <Target size={15} color='var(--accent-primary)' />
            {t('aboutPage.tags.goalTracking')}
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '8px 20px 26px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 14,
        }}
      >
        <div style={{ border: '1px solid var(--border-base)', background: 'var(--bg-surface)', borderRadius: 2, padding: 20 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 20, color: 'var(--text-primary)' }}>{t('aboutPage.features.title')}</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 14 }}>
            <li>{t('aboutPage.features.items.0')}</li>
            <li>{t('aboutPage.features.items.1')}</li>
            <li>{t('aboutPage.features.items.2')}</li>
            <li>{t('aboutPage.features.items.3')}</li>
          </ul>
          <div
            style={{
              marginTop: 12,
              border: '1px dashed var(--border-base)',
              padding: '10px 12px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: 12,
              color: 'var(--text-secondary)',
              background: 'var(--bg-main)',
            }}
          >
            {t('aboutPage.supportStatement')}
          </div>
        </div>

        <div style={{ border: '1px solid var(--border-base)', background: 'var(--bg-surface)', borderRadius: 2, padding: 20 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 20, color: 'var(--text-primary)' }}>{t('aboutPage.support.title')}</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
              <Mail size={16} />
              <span>{t('aboutPage.support.email')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
              <Globe size={16} />
              <span>{t('aboutPage.support.website')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
              <MessageCircle size={16} />
              <span>{t('aboutPage.support.liveChat')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
              <Clock3 size={16} />
              <span>{t('aboutPage.support.response')}</span>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7, marginTop: 2 }}>
              {t('aboutPage.support.note')}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '8px 20px 28px',
        }}
      >
        <h2 style={{ margin: '0 0 14px', fontSize: 22, color: 'var(--text-primary)' }}>{t('aboutPage.valuesTitle')}</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14,
          }}
        >
          {values.map((item) => (
            <div
              key={item.title}
              style={{
                border: '1px solid var(--border-base)',
                background: 'var(--bg-surface)',
                borderRadius: 2,
                padding: 18,
              }}
            >
              <div style={{ display: 'inline-flex', color: 'var(--accent-primary)' }}>{item.icon}</div>
              <h3 style={{ margin: '10px 0 8px', fontSize: 17, color: 'var(--text-primary)' }}>{item.title}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 14 }}>{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '0 20px 64px',
        }}
      >
        <div style={{ border: '1px solid var(--border-base)', background: 'var(--bg-surface)', borderRadius: 2, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
            <LifeBuoy size={18} />
            {t('aboutPage.supportCenter.title')}
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.75, fontSize: 14 }}>
            {t('aboutPage.supportCenter.description')}
          </p>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              to={ROUTER.HOME}
              style={{
                border: '1px solid var(--accent-primary)',
                color: 'var(--accent-primary)',
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: 2,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {t('aboutPage.supportCenter.backHome')}
            </Link>
            <a
              href="mailto:support@codenexus.app"
              style={{
                border: '1px solid var(--border-base)',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: 2,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {t('aboutPage.supportCenter.sendEmail')}
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
