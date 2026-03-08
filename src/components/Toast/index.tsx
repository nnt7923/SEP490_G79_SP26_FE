
import React, { useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'warning'
  onClose: () => void
  duration?: number
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-status-green" />,
    error: <XCircle className="w-5 h-5 text-status-red-muted" />,
    warning: <AlertCircle className="w-5 h-5 text-orange-500" />,
  }

  const bgColors = {
    success: 'bg-status-green-bg border-green-200',
    error: 'bg-status-red-bg border-red-200',
    warning: 'bg-orange-50 border-orange-200',
  }

  const textColors = {
    success: 'text-status-green-darker',
    error: 'text-status-red-darker',
    warning: 'text-orange-800',
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-slide-in-right">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bgColors[type]} min-w-[300px] max-w-md`}>
        {icons[type]}
        <p className={`flex-1 text-sm font-medium ${textColors[type]}`}>{message}</p>
        <button
          onClick={onClose}
          className="text-sl-400 hover:text-sl-600 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default Toast
