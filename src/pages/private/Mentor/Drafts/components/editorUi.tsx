import React from 'react'

export const shellStyle: React.CSSProperties = {
  minHeight: '100vh',
  padding: 24,
  background: 'var(--bg-main)',
  fontFamily: 'inherit',
}

export const cardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-base)',
  borderRadius: 2,
  boxShadow: 'none',
}

export const getButtonStyle = ({
  active = false,
  accent = false,
  disabled = false,
  compact = false,
}: {
  active?: boolean
  accent?: boolean
  disabled?: boolean
  compact?: boolean
} = {}): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: compact ? '8px 10px' : '10px 14px',
  borderRadius: 2,
  border: `1px solid ${active || accent ? 'var(--accent-primary)' : 'var(--border-base)'}`,
  background: active
    ? 'color-mix(in srgb, var(--accent-primary) 12%, var(--bg-surface) 88%)'
    : accent
      ? 'var(--accent-primary)'
      : 'var(--bg-surface)',
  color: accent ? '#ffffff' : active ? 'var(--accent-primary)' : 'var(--text-primary)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: 700,
  fontFamily: 'inherit',
  opacity: disabled ? 0.55 : 1,
  transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
})

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid var(--border-base)',
  borderRadius: 2,
  background: 'var(--bg-main)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  outline: 'none',
}

export const textAreaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 120,
  resize: 'vertical',
  lineHeight: 1.6,
}

export const subtleTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
}

export const pillStyle = ({
  accent = false,
  warning = false,
}: {
  accent?: boolean
  warning?: boolean
} = {}): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  borderRadius: 2,
  fontSize: 12,
  fontWeight: 700,
  border: `1px solid ${warning ? 'var(--warning-primary)' : accent ? 'var(--accent-primary)' : 'var(--border-base)'}`,
  color: warning ? 'var(--warning-primary)' : accent ? 'var(--accent-primary)' : 'var(--text-secondary)',
  background: warning
    ? 'color-mix(in srgb, var(--warning-primary) 8%, var(--bg-surface) 92%)'
    : accent
      ? 'color-mix(in srgb, var(--accent-primary) 8%, var(--bg-surface) 92%)'
      : 'var(--bg-surface)',
})

export const Field = ({
  label,
  children,
  required = false,
  hint,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
  hint?: React.ReactNode
}) => (
  <label style={{ display: 'grid', gap: 8 }}>
    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
      {label}
      {required ? <span style={{ color: 'var(--danger-primary)', marginLeft: 4 }}>*</span> : null}
    </span>
    {children}
    {hint ? <span style={subtleTextStyle}>{hint}</span> : null}
  </label>
)

export const SectionCard = ({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) => (
  <section style={{ ...cardStyle, padding: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 18 }}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>{title}</h2>
        {subtitle ? <p style={{ ...subtleTextStyle, margin: '8px 0 0' }}>{subtitle}</p> : null}
      </div>
      {action ? <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{action}</div> : null}
    </div>
    {children}
  </section>
)

export const EmptyPanel = ({ message }: { message: string }) => (
  <div style={{ ...cardStyle, padding: 32, textAlign: 'center', ...subtleTextStyle }}>
    {message}
  </div>
)
