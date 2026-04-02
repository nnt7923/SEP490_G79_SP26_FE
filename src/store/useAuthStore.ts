import { create } from 'zustand'
import { AuthService, UserService } from '../services'
import useChatStore from './useChatStore'

export type User = {
  id: number | string // Support both number and GUID
  username: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  dateOfBirth?: string
  phone?: string
  address?: string
  bio?: string
  name: string
  email?: string
  role?: { name: string }
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  loading: boolean
  updatingProfile: boolean
  updatingAvatar: boolean
  setToken: (token: string | null) => void
  setRefreshToken: (refreshToken: string | null) => void
  setUser: (user: User | null) => void
  clearState: () => void
  login: (username: string, password: string) => Promise<{ isOk: boolean; msg?: string; errorCode?: string }>
  register: (payload: any) => Promise<{ isOk: boolean; msg?: string }>
  logout: () => Promise<void>
  init: () => Promise<void>
  fetchProfile: () => Promise<void>
  updateProfile: (payload: any) => Promise<{ isOk: boolean; msg?: string }>
  uploadAvatar: (file: File, onProgress?: (progress: number) => void) => Promise<{ isOk: boolean; msg: string }>
  changePassword: (payload: any) => Promise<{ isOk: boolean; msg?: string }>
}

const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  loading: false,
  updatingProfile: false,
  updatingAvatar: false,
  setToken: (token) => {
    set({ token })
    try {
      if (token) {
        localStorage.setItem('accessToken', token)
        AuthService.setAccessToken?.(token)
      } else {
        localStorage.removeItem('accessToken')
        AuthService.clearState?.()
      }
    } catch { }
  },

  setRefreshToken: (refreshToken) => {
    set({ refreshToken })
    try {
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken)
      } else {
        localStorage.removeItem('refreshToken')
      }
    } catch { }
  },

  setUser: (user) => {
    set({ user })
    // Persist user and role to localStorage
    try {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user))
        if (user?.role?.name) {
          localStorage.setItem('userRole', user.role.name)
        }
      } else {
        localStorage.removeItem('user')
        localStorage.removeItem('userRole')
      }
    } catch { }
  },

  clearState: () => {
    set({ token: null, refreshToken: null, user: null, loading: false })
    try {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem('userRole')
    } catch { }
    try { AuthService.clearState?.() } catch { }
    try {
      import('../services/SubscriptionService').then(({ clearSubscriptionCaches }) => {
        clearSubscriptionCaches()
      })
    } catch { }
    try {
      import('./useAppNotificationStore').then(({ default: useAppNotificationStore }) => {
        useAppNotificationStore.getState().reset()
      })
    } catch { }
  },

  register: async (payload) => {
    set({ loading: true })
    try {
      await AuthService.register(payload)
      return { isOk: true }
    } catch (error: any) {
      const data = error?.response?.data
      const status = error?.response?.status
      const defaultMsg = 'Registration failed.'
      let msg = data?.msg || data?.detail || data?.title || data?.message
      if (!msg) {
        if (status === 500) msg = 'Server error. Please try again later.'
        else if (status === 409) msg = 'Email or username already exists.'
        else if (status === 400) msg = 'Invalid data. Please check and try again.'
        else msg = error?.message || defaultMsg
      }
      return { isOk: false, msg }
    } finally {
      set({ loading: false })
    }
  },

  login: async (username, password) => {
    set({ loading: true })
    try {
      const resp: any = await AuthService.login({ Identifier: username, Password: password })

      const token: string | undefined = resp?.token
      const refreshToken: string | undefined = resp?.refreshToken
      const rawUser: any = resp?.user ?? resp

      if (token) {
        get().setToken(token)

        // Save refresh token if provided
        if (refreshToken) {
          get().setRefreshToken(refreshToken)
        }

        // Normalize role name from various possible shapes
        const roleName: string | undefined = rawUser?.role?.name || rawUser?.roleName || (Array.isArray(rawUser?.roles) ? rawUser.roles[0] : undefined)

        const loginUser: User = {
          id: rawUser?.id,
          username: rawUser?.username,
          name: rawUser?.name || rawUser?.username || 'User',
          email: rawUser?.email,
          role: { name: roleName || 'Student' },
        }

        // Use setUser to persist role to localStorage
        get().setUser(loginUser)

        // Reconnect SignalR hubs with new token
        try {
          const { reconnectHubs } = await import('../services/SignalR')
          await reconnectHubs()
        } catch (e) {
          console.warn('Failed to reconnect SignalR hubs:', e)
        }

        // Load full profile after token; preserve role if profile lacks it
        await get().fetchProfile()
        return { isOk: true }
      }
      return { isOk: false, errorCode: 'LOGIN_RESPONSE_INVALID', msg: 'No token received' }
    } catch (error: any) {
      const data = error?.response?.data
      const errorCodeRaw = data?.errorCode ?? data?.code
      const errorCode = typeof errorCodeRaw === 'string' && errorCodeRaw.trim().length > 0
        ? errorCodeRaw.trim().toUpperCase()
        : undefined
      const fallbackMsg = data?.msg || data?.detail || data?.title || data?.message || error?.message || 'Login failed.'
      return { isOk: false, errorCode, msg: fallbackMsg }
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    set({ loading: true })
    try {
      await AuthService.logout()
    } catch { }
    
    // Disconnect SignalR hubs before clearing state
    try {
      const { disconnectHubs } = await import('../services/SignalR')
      await disconnectHubs()
    } catch (e) {
      console.warn('Failed to disconnect SignalR hubs:', e)
    }
    
    get().clearState()
    useChatStore.getState().reset()
    set({ loading: false })
  },

  init: async () => {
    const raw = localStorage.getItem('accessToken')
    const storedRefreshToken = localStorage.getItem('refreshToken')
    const storedUser = localStorage.getItem('user')

    if (raw) {
      set({ token: raw })
      AuthService.setAccessToken?.(raw)

      // Restore refresh token if available
      if (storedRefreshToken) {
        set({ refreshToken: storedRefreshToken })
      }

      // Restore user from localStorage if available
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          set({ user: parsedUser })
        } catch {
          // If parsing fails, restore role only
          const storedRole = localStorage.getItem('userRole')
          if (storedRole) {
            set({
              user: {
                id: 0,
                username: '',
                name: '',
                role: { name: storedRole }
              } as User
            })
          }
        }
      } else {
        // Fallback: restore role from localStorage before fetching profile
        const storedRole = localStorage.getItem('userRole')
        if (storedRole) {
          set({
            user: {
              id: 0,
              username: '',
              name: '',
              role: { name: storedRole }
            } as User
          })
        }
      }

      // Fetch fresh profile data from server
      await get().fetchProfile()
    }
  },

  fetchProfile: async () => {
    try {
      const data: any = await UserService.getProfile()
      const profileData: any = data?.data ?? data

      const currentUser = get().user

      // Determine role from profile if available; otherwise keep current role
      const profileRoleName: string | undefined = profileData?.role?.name || profileData?.roleName || (Array.isArray(profileData?.roles) ? profileData.roles[0] : undefined)

      // IMPORTANT: Always preserve current role if profile doesn't provide one
      const finalRole = profileRoleName
        ? { name: profileRoleName }
        : (currentUser?.role || undefined)

      const user: User = {
        ...(currentUser || {} as any),
        ...profileData,
        role: finalRole,
      }

      // Use setUser to persist role to localStorage
      get().setUser(user)
    } catch {
      get().clearState()
    }
  },

  updateProfile: async (payload) => {
    try {
      set({ updatingProfile: true })

      const response: any = await UserService.updateProfile(payload)
      set((state) => ({
        user: {
          ...state.user,
          ...payload
        }
      }))

      return {
        isOk: true,
        msg: response?.msg || response?.message,
      }
    } catch (error: any) {
      return {
        isOk: false,
        msg: error?.response?.data?.msg || error?.response?.data?.message,
      }
    } finally {
      set({ updatingProfile: false })
    }
  },

  uploadAvatar: async (file: File, onProgress?: (progress: number) => void) => {
    try {
      set({ updatingAvatar: true })

      const formData = new FormData()
      formData.append('file', file)

      await UserService.uploadAvatarProfile(formData, onProgress)

      await get().fetchProfile()

      return { isOk: true, msg: 'Avatar uploaded successfully' }
    } catch {
      return { isOk: false, msg: 'Avatar upload failed' }
    } finally {
      set({ updatingAvatar: false })
    }
  },

  changePassword: async (payload) => {
    try {
      const res = await UserService.changePassword(payload)



      return {
        isOk: true,
        msg: res?.msg || res?.message || 'Password changed successfully!',
      }
    } catch (err: any) {
      // Removed console.error in auth store API error handler
      return {
        isOk: false,
        msg:
          err?.response?.data?.msg ||
          err?.response?.data?.message ||
          'Passwords do not match',
      }
    }
  },
}))

export default useAuthStore
