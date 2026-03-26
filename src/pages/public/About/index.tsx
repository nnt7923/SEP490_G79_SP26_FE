import React from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Globe, Users, Sparkles, Target, ShieldCheck } from 'lucide-react'

const AboutPage: React.FC = () => {
  const { t } = useTranslation('home')

  const values = [
    {
      icon: <Sparkles size={18} />,
      title: t('about.values.aiFirst.title'),
      description: t('about.values.aiFirst.description'),
    },
    {
      icon: <Target size={18} />,
      title: t('about.values.goalDriven.title'),
      description: t('about.values.goalDriven.description'),
    },
    {
      icon: <ShieldCheck size={18} />,
      title: t('about.values.reliable.title'),
      description: t('about.values.reliable.description'),
    },
    {
      icon: <Users size={18} />,
      title: t('about.values.community.title'),
      description: t('about.values.community.description'),
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
            background: 'var(--bg-blue-hover)',
            color: 'var(--accent-primary)',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 2,
          }}
        >
          {t('about.badge')}
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
          {t('about.title')}
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
          {t('about.subtitle')}
        </p>
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
          <h2 style={{ margin: '0 0 10px', fontSize: 20, color: 'var(--text-primary)' }}>{t('about.mission.title')}</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.75, fontSize: 14 }}>{t('about.mission.description')}</p>
        </div>

        <div style={{ border: '1px solid var(--border-base)', background: 'var(--bg-surface)', borderRadius: 2, padding: 20 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 20, color: 'var(--text-primary)' }}>{t('about.contact.title')}</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
              <Mail size={16} />
              <span>{t('about.contact.email')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
              <Globe size={16} />
              <span>{t('about.contact.website')}</span>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7, marginTop: 2 }}>
              {t('about.contact.note')}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '8px 20px 64px',
        }}
      >
        <h2 style={{ margin: '0 0 14px', fontSize: 22, color: 'var(--text-primary)' }}>{t('about.values.title')}</h2>
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
    </div>
  )
}

export default AboutPage
