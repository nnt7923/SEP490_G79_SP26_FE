import React from 'react'

interface LanguageCardProps {
  active?: boolean
  name: string
  tag?: string
  icon?: string
  desc?: string
  onClick?: () => void
}

const LanguageCard: React.FC<LanguageCardProps> = ({
  active,
  name,
  tag,
  icon,
  desc,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active ? 'true' : 'false'}
    style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      padding: 16, border: '1px solid var(--border-base)', borderRadius: 2,
      background: active ? 'var(--bg-blue-hover)' : 'var(--bg-surface)',
      borderColor: active ? 'var(--accent-primary)' : 'var(--border-base)',
      textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
      boxSizing: 'border-box'
    }}
    onMouseEnter={(e) => {
      if (!active) { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--bg-main)' }
    }}
    onMouseLeave={(e) => {
      if (!active) { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.background = 'var(--bg-surface)' }
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, width: '100%' }}>
      <div style={{ fontSize: 24, flexShrink: 0 }}>
        {icon ? (
          icon.startsWith('devicon-') ? (
            <i className={icon}></i>
          ) : (
            icon
          )
        ) : (
          '🔖'
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          {active ? `> ${name}` : `$ ${name}`}
        </div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</div>}
      </div>
    </div>
    {tag && (
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 16, padding: '2px 6px', background: 'var(--bg-main)', border: '1px solid var(--gray-200)', borderRadius: 2 }}>
        [{tag}]
      </span>
    )}
  </button>
)

export default LanguageCard
