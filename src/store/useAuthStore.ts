import { create } from 'zustand'
import { AuthService , UserService } from '../services'

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
    } catch {}
  },

  setUser: (user) => {
    set({ user })
  },

  clearState: () => {
    set({ token: null, user: null, loading: false })
    try { localStorage.removeItem('accessToken') } catch {}
    try { AuthService.clearState?.() } catch {}
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
      const res: any = await AuthService.login({ Identifier: username, Password: password })
      const token: string | undefined = res?.token || res?.data?.token
      if (token) {
        get().setToken(token)
        // Tải đầy đủ dữ liệu user sau khi có token
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
    } catch {}
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
      const user: User = data?.data ?? data
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
  uploadAvatar: async (file) => {
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

}))

export default useAuthStore