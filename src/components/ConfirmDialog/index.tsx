import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  if (!isOpen) return null

  const variantStyles = {
    danger: {
      icon: 'text-status-red-muted',
      button: 'bg-status-red-solid hover:bg-status-red-solid-dark',
    },
    warning: {
      icon: 'text-orange-500',
      button: 'bg-orange-600 hover:bg-orange-700',
    },
    info: {
      icon: 'text-status-blue-muted',
      button: 'bg-status-blue-solid hover:bg-status-blue-solid-hover',
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-th-card rounded-lg shadow-xl w-full max-w-md border border-sl-200 animate-scale-in">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-sl-200">
          <div className={`flex-shrink-0 ${styles.icon}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-sl-900">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-sl-400 hover:text-sl-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-sl-600">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-sl-200">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-sl-300 rounded-lg text-sl-700 hover:bg-sl-50 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors cursor-pointer ${styles.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
