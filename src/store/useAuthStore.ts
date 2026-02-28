import { create } from 'zustand'
import { AuthService, UserService } from '../services'

export type User = {
  id: number
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
  user: User | null
  loading: boolean
  setToken: (token: string | null) => void
  setUser: (user: User | null) => void
  clearState: () => void
  login: (username: string, password: string) => Promise<{ isOk: boolean; msg?: string }>
  register: (payload: any) => Promise<{ isOk: boolean; msg?: string }>
  logout: () => Promise<void>
  init: () => Promise<void>
  fetchProfile: () => Promise<void>
  updateProfile: (payload: any) => Promise<{ isOk: boolean; msg?: string }>
  uploadAvatar: (file: File) => Promise<{ isOk: boolean; url?: string; msg?: string }>
  changePassword: (payload: any) => Promise<{ isOk: boolean; msg?: string }>
}

const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  loading: false,

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

  setUser: (user) => {
    set({ user })
    // Persist role to localStorage
    if (user?.role?.name) {
      try {
        localStorage.setItem('userRole', user.role.name)
      } catch { }
    }
  },

  clearState: () => {
    set({ token: null, user: null, loading: false })
    try {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('userRole')
    } catch { }
    try { AuthService.clearState?.() } catch { }
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
      const rawUser: any = resp?.user ?? resp

      if (token) {
        get().setToken(token)

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


        // Load full profile after token; preserve role if profile lacks it
        await get().fetchProfile()
        return { isOk: true }
      }
      return { isOk: false, msg: 'No token received' }
    } catch (error: any) {
      const data = error?.response?.data
      const msg = data?.msg || data?.detail || data?.title || data?.message || error?.message || 'Login failed.'
      return { isOk: false, msg }
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    set({ loading: true })
    try {
      await AuthService.logout()
    } catch { }
    get().clearState()
    set({ loading: false })
  },

  init: async () => {
    const raw = localStorage.getItem('accessToken')
    if (raw) {
      set({ token: raw })
      AuthService.setAccessToken?.(raw)

      // Restore role from localStorage before fetching profile
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
      set({ loading: true })

      await UserService.updateProfile(payload)

      await get().fetchProfile()

      return { isOk: true, msg: 'Update profile successfully' }
    } catch {
      return { isOk: false, msg: 'Update profile failed' }
    } finally {
      set({ loading: false })
    }
  },

  uploadAvatar: async (file: File) => {

    try {
      set({ loading: true })

      const formData = new FormData()
      formData.append('file', file)
      await UserService.uploadAvatarProfile(formData)
      await get().fetchProfile()
      return { isOk: true, msg: 'Avatar uploaded successfully' }
    } catch {
      return { isOk: false, msg: 'Avatar upload failed' }
    } finally {
      set({ loading: false })
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