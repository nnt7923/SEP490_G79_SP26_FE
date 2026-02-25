import React from 'react'

interface StepHeaderProps {
  title: string
  subtitle: string
  icon?: string
}

const StepHeader: React.FC<StepHeaderProps> = ({ title, subtitle, icon }) => (
  <div className="text-center mb-8">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 text-white text-2xl mb-4 shadow-lg shadow-teal-500/30">
      {icon ?? '🎯'}
    </div>
    <h1 id="plans-title" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
      {title}
    </h1>
    <p className="text-gray-600 text-lg max-w-2xl mx-auto">{subtitle}</p>
  </div>
)

export default StepHeader
