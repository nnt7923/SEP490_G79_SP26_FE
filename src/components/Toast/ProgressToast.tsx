import React from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

interface ProgressToastProps {
  message: string
  progress: number // 0-100
  status: 'loading' | 'success' | 'error'
  onClose?: () => void
}

const ProgressToast: React.FC<ProgressToastProps> = ({ message, progress, status, onClose }) => {
  const circumference = 2 * Math.PI * 16 // radius = 16

  const bgColors = {
    loading: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  }

  const textColors = {
    loading: 'text-blue-800 dark:text-blue-200',
    success: 'text-green-800 dark:text-green-200',
    error: 'text-red-800 dark:text-red-200',
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-slide-in-right">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bgColors[status]} min-w-[300px] max-w-md`}>
        {/* Progress Circle or Status Icon */}
        <div className="flex-shrink-0">
          {status === 'loading' && (
            <div className="relative w-10 h-10">
              {/* Background Circle */}
              <svg className="w-10 h-10 transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  fill="none"
                  className="text-blue-200 dark:text-blue-800"
                />
                {/* Progress Circle */}
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (progress / 100) * circumference}
                  className="text-blue-600 dark:text-blue-400 transition-all duration-300"
                  strokeLinecap="round"
                />
              </svg>
              {/* Percentage Text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          )}
          
          {status === 'success' && (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
          
          {status === 'error' && (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
        </div>

        {/* Message */}
        <p className={`flex-1 text-sm font-medium ${textColors[status]}`}>
          {message}
        </p>

        {/* Close Button (only for success/error) */}
        {status !== 'loading' && onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default ProgressToast
