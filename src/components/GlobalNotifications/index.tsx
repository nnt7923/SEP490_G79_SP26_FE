import React from 'react'
import useNotificationStore from '../../store/useNotificationStore'
import Toast from '../Toast'
import ProgressToast from '../Toast/ProgressToast'

const GlobalNotifications: React.FC = () => {
  const { toasts, progressNotifications, hideToast, hideProgress } = useNotificationStore()

  return (
    <>
      {/* Regular Toasts */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>

      {/* Progress Toasts */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {progressNotifications.map((notification) => (
          <ProgressToast
            key={notification.id}
            message={notification.message}
            progress={notification.progress}
            status={notification.status}
            onClose={() => hideProgress(notification.id)}
          />
        ))}
      </div>
    </>
  )
}

export default GlobalNotifications
