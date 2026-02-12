import React from 'react'

export type CardProps = {
  title: string
  subtitle?: string
  right?: React.ReactNode
  selected?: boolean
  onClick?: () => void
}

const Card: React.FC<CardProps> = ({ title, subtitle, right, selected, onClick }) => {
  return (
    <div
      className="card"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick() }}
      aria-pressed={onClick ? (!!selected) : undefined}
      style={{
        padding: 12,
        border: selected ? '2px solid #2563eb' : '1px solid #e5e7eb',
        borderRadius: 12,
        backgroundColor: selected ? '#eff6ff' : '#fff',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        {subtitle ? <div style={{ color: '#6b7280', fontSize: 13 }}>{subtitle}</div> : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  )
}

export default Card