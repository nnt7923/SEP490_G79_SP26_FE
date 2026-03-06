import React from 'react'

interface StepHeaderProps {
  title: string
  subtitle: string
  icon?: React.ReactNode
}

const StepHeader: React.FC<StepHeaderProps> = ({ title, subtitle, icon }) => (
  <div className="text-center p--10 mb-4">
    <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-500 text-white text-2xl  shadow-lg">
      {icon ?? '🎯'}
    </div>
    <h1 id="plans-title" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
      {title}
    </h1>
    <p className="text-gray-600 text-lg max-w-2xl mx-auto">{subtitle}</p>
  </div>
)

export default StepHeader
