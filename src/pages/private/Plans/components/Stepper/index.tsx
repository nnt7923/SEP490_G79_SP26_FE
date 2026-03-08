import React from 'react'

interface StepperProps {
  currentStep: number
  totalSteps: number
}

const Stepper: React.FC<StepperProps> = ({ currentStep, totalSteps }) => {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 40, fontFamily: 'monospace' }} aria-label="progress">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
        const isActive = currentStep === step
        const isPast = currentStep > step
        
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, border: `1px solid ${isActive || isPast ? 'var(--text-primary)' : 'var(--border-base)'}`,
                background: isActive ? 'var(--text-primary)' : 'transparent',
                color: isActive ? 'var(--bg-surface-short)' : (isPast ? 'var(--text-primary)' : 'var(--text-disabled)'),
                fontWeight: isActive ? 700 : 400,
                fontSize: 14, borderRadius: 2
              }}
              aria-current={isActive ? 'step' : undefined}
            >
              {isPast ? '✓' : step}
            </div>
            {step !== totalSteps && (
              <div style={{ color: isPast ? 'var(--text-primary)' : 'var(--border-base)', letterSpacing: 2, fontSize: 12 }}>
                -----
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export default Stepper
