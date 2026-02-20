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
  },

  clearState: () => {
    set({ token: null, user: null, loading: false })
    try { localStorage.removeItem('accessToken') } catch { }
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
      const defaultMsg = 'Đăng ký thất bại.'
      let msg = data?.msg || data?.detail || data?.title || data?.message
      if (!msg) {
        if (status === 500) msg = 'Máy chủ gặp sự cố. Vui lòng thử lại sau.'
        else if (status === 409) msg = 'Email hoặc Username đã tồn tại.'
        else if (status === 400) msg = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.'
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
      try { console.debug('[auth] login response:', resp) } catch { }

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

        set({ user: loginUser })
        try { console.debug('[auth] set login user:', loginUser) } catch { }

        // Load full profile after token; preserve role if profile lacks it
        await get().fetchProfile()
        return { isOk: true }
      }
      return { isOk: false, msg: 'Không nhận được token' }
    } catch (error: any) {
      const data = error?.response?.data
      const msg = data?.msg || data?.detail || data?.title || data?.message || error?.message || 'Đăng nhập thất bại.'
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
      await get().fetchProfile()
    }
  },

  fetchProfile: async () => {
    try {
      const data: any = await UserService.getProfile()
      const profileData: any = data?.data ?? data
      try { console.debug('[auth] fetchProfile response:', profileData) } catch { }
      const currentUser = get().user

      // Determine role from profile if available; otherwise keep current role
      const profileRoleName: string | undefined = profileData?.role?.name || profileData?.roleName || (Array.isArray(profileData?.roles) ? profileData.roles[0] : undefined)

      const user: User = {
        ...(currentUser || {} as any),
        ...profileData,
        role: profileRoleName ? { name: profileRoleName } : currentUser?.role,
      }

      try { console.debug('[auth] final user after fetchProfile:', user) } catch { }
      set({ user })
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
      return { isOk: true, msg: 'Upload ảnh thành công' }
    } catch {
      return { isOk: false, msg: 'Upload ảnh thất bại' }
    } finally {
      set({ loading: false })
    }
  },

  changePassword: async (payload) => {
    try {
      const res = await UserService.changePassword(payload)

      console.log('API response:', res)

      return {
        isOk: true,
        msg: res?.msg || res?.message || 'Password changed successfully!',
      }
    } catch (err: any) {
      console.error('API error:', err)

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