import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import * as AuthService from '../AuthService'
import useAuthStore from '../../store/useAuthStore'

// Compute API base from env (append /api if missing)
const rawBase = (import.meta.env.VITE_API_BASE_URL as string)
  || (import.meta.env.VITE_BASE_URL as string)
  || (import.meta.env.PROD ? 'https://pplp.click/api' : '')
const trimmed = (rawBase || '').replace(/\/+$/, '')
const isDev = typeof window !== 'undefined' && import.meta.env.DEV
const isVercel = typeof window !== 'undefined' && /vercel\.app$/i.test(window.location.hostname)
const API_BASE = (isDev || isVercel)
  ? '/api'
  : trimmed
    ? (trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`)
    : '/api'

// Axios instance configured via env
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  // headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = []

function processQueue(err?: any, token?: string) {
  failedQueue.forEach((p) => (err ? p.reject(err) : token ? p.resolve(token) : p.reject(err)))
  failedQueue = []
}

// Paths that MUST NOT include Authorization header (unauthenticated endpoints)
const noAuthHeaderPaths = [
  '/Auth/login',
  '/Auth/register',
  '/Auth/refresh-token',
  '/Auth/login-google',
  // '/Auth/verify-email', // removed: endpoint not used
  '/Auth/verify-otp',
  '/Auth/resend-otp',
  '/Auth/forgot-password',
  '/Auth/reset-password',
]

// Attach Authorization from store or stored auth on requests except unauthenticated endpoints
api.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const url = config.url || ''
    if (noAuthHeaderPaths.some((p) => url.includes(p))) {
      return config
    }

    // Prefer token from Zustand store if available
    let token: string | undefined
    try {
      token = useAuthStore.getState().token ?? undefined
    } catch {}
    if (!token) {
      const stored = AuthService.getStoredAuth()
      token = stored?.token
    }
    if (token) {
      config.headers = config.headers || {}
      ;(config.headers as any).Authorization = `Bearer ${token}`
    }
    return config
  },
  (err: AxiosError) => Promise.reject(err)
)

// Auth endpoints that should not trigger refresh logic
const authPaths = [
  '/Auth/login',
  '/Auth/register',
  '/Auth/refresh-token',
  '/Auth/forgot-password',
  '/Auth/reset-password',
  '/Auth/logout',
  '/Auth/login-google',
  // '/Auth/verify-email', // removed: endpoint not used
  '/Auth/verify-otp',
  '/Auth/resend-otp',
]

api.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const originalRequest: any = (error as any).config
    if (!originalRequest) return Promise.reject(error)

    // Skip refresh handling for direct auth calls
    if (authPaths.some((p) => originalRequest.url?.includes(p))) {
      return Promise.reject(error)
    }

    // Handle 401 with refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers = originalRequest.headers || {}
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Get current refresh token from store or localStorage
        const currentRefreshToken: string | null =
          useAuthStore.getState().refreshToken ||
          localStorage.getItem('refreshToken')

        if (!currentRefreshToken) throw new Error('No refresh token available')

        const refreshRes = await axios.post(
          `${API_BASE}/Auth/refresh-token`,
          { refreshToken: currentRefreshToken },
          { withCredentials: true }
        )

        const resData = (refreshRes as any)?.data?.data ?? (refreshRes as any)?.data ?? refreshRes
        const newToken: string | undefined = resData?.accessToken ?? resData?.token
        const newRefreshToken: string | undefined = resData?.refreshToken

        if (!newToken) throw new Error('No token from refresh')

        // Persist new access token
        try { useAuthStore.getState().setToken(newToken) } catch {}
        if (typeof AuthService.setAccessToken === 'function') {
          AuthService.setAccessToken(newToken)
        }
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

        // Persist rotated refresh token (one-time use — must update)
        if (newRefreshToken) {
          try { useAuthStore.getState().setRefreshToken(newRefreshToken) } catch {}
        }

        processQueue(null, newToken)

        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (err) {
        processQueue(err, undefined)
        try { useAuthStore.getState().clearState() } catch {}
        if (typeof AuthService.clearState === 'function') {
          AuthService.clearState()
        }
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api