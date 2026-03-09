import { create } from 'zustand'

export interface ToastNotification {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number // milliseconds, undefined = no auto-close
}

export interface ProgressNotification {
  id: string
  message: string
  progress: number // 0-100
  status: 'loading' | 'success' | 'error'
}

interface NotificationState {
  toasts: ToastNotification[]
  progressNotifications: ProgressNotification[]
  
  // Toast actions
  showToast: (message: string, type: ToastNotification['type'], duration?: number) => string
  hideToast: (id: string) => void
  clearAllToasts: () => void
  
  // Progress notification actions
  showProgress: (id: string, message: string, progress: number, status: ProgressNotification['status']) => void
  hideProgress: (id: string) => void
  clearAllProgress: () => void
}

const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  progressNotifications: [],
  
  showToast: (message, type, duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }]
    }))
    
    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id)
        }))
      }, duration)
    }
    
    return id
  },
  
  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
  },
  
  clearAllToasts: () => {
    set({ toasts: [] })
  },
  
  showProgress: (id, message, progress, status) => {
    set((state) => {
      const existing = state.progressNotifications.find((p) => p.id === id)
      
      if (existing) {
        // Update existing
        return {
          progressNotifications: state.progressNotifications.map((p) =>
            p.id === id ? { ...p, message, progress, status } : p
          )
        }
      } else {
        // Add new
        return {
          progressNotifications: [...state.progressNotifications, { id, message, progress, status }]
        }
      }
    })
    
    // Auto-hide success/error after 3 seconds
    if (status === 'success' || status === 'error') {
      setTimeout(() => {
        set((state) => ({
          progressNotifications: state.progressNotifications.filter((p) => p.id !== id)
        }))
      }, 3000)
    }
  },
  
  hideProgress: (id) => {
    set((state) => ({
      progressNotifications: state.progressNotifications.filter((p) => p.id !== id)
    }))
  },
  
  clearAllProgress: () => {
    set({ progressNotifications: [] })
  }
}))

export default useNotificationStore
