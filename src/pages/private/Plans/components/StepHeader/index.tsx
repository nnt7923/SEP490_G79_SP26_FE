import React from 'react'

interface StepHeaderProps {
  title: string
  subtitle: string
  icon?: React.ReactNode
  selectedValue?: string
}

const StepHeader: React.FC<StepHeaderProps> = ({ title, subtitle, icon, selectedValue }) => (
  <div style={{ marginBottom: 32 }}>
    <style>
      {`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .blinking-cursor {
          display: inline-block;
          width: 8px;
          height: 16px;
          background-color: var(--accent-primary);
          vertical-align: middle;
          margin-left: 6px;
          animation: blink 1s step-end infinite;
        }
      `}
    </style>
    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
      {icon && <span style={{ fontSize: 24 }}>{icon}</span>}
      {'>_'} {title}
    </h1>
    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
      // {subtitle}
    </p>
    <div style={{ fontSize: 14, fontWeight: 600, color: selectedValue ? 'var(--accent-primary)' : 'var(--text-primary)', minHeight: 20, display: 'flex', alignItems: 'center' }}>
      {'>'} {selectedValue || ''} <span className="blinking-cursor"></span>
    </div>
  </div>
)

export default StepHeader
