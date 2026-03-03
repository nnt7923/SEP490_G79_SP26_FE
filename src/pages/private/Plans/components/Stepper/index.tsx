import React from 'react'

interface StepperProps {
  currentStep: number
  totalSteps: number
}

const Stepper: React.FC<StepperProps> = ({ currentStep, totalSteps }) => {
  return (
    <nav className="flex items-center justify-center gap-3 mb-10" aria-label="progress">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm transition-all duration-300 ${
              currentStep >= step
                ? 'bg-blue-500 text-white shadow-lg scale-110'
                : 'bg-gray-200 text-gray-500'
            }`}
            aria-current={currentStep === step ? 'step' : undefined}
          >
            {step}
          </div>
          {step !== totalSteps && (
            <div
              className={`w-12 md:w-16 h-1 mx-2 rounded-full transition-all duration-300 ${
                currentStep > step ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </nav>
  )
}

export default Stepper
