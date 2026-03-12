import React from 'react'
import { AnimatePresence } from 'framer-motion'
import useNotificationStore from '../../store/useNotificationStore'
import Toast from '../Toast'
import ProgressToast from '../Toast/ProgressToast'

const GlobalNotifications: React.FC = () => {
  const { toasts, progressNotifications, hideToast, hideProgress } = useNotificationStore()

  return (
    <>
      {/* Regular Toasts */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => hideToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Progress Toasts */}
      <div className="fixed top-20 right-4 z-[9999] space-y-2">
        <AnimatePresence mode="popLayout">
          {progressNotifications.map((notification) => (
            <ProgressToast
              key={notification.id}
              message={notification.message}
              progress={notification.progress}
              status={notification.status}
              onClose={() => hideProgress(notification.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}

export default GlobalNotifications
