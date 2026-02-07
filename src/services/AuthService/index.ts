import api from '../Axios'
import { loginUrl, registerUrl, logoutUrl, refreshUrl, loginWithGoogleUrl, verifyOtpUrl, resendOtpUrl, forgotPasswordUrl, resetPasswordUrl } from './urls'



export function getStoredAuth(): { token: string } | null {
  try {
    const token = localStorage.getItem('accessToken')
    if (token) return { token }
    return null
  } catch {
    return null
  }
}

export async function register(payload: any) {
  const res: any = await api.post(registerUrl, payload)
  return res?.data ?? res
}

export async function loginWithGoogle(payload: any) {
  const res: any = await api.post(loginWithGoogleUrl, payload)
  const data = res?.data ?? res
  const token: string | undefined = data?.token ?? data?.data?.token
  const user: any = data?.user ?? data?.data?.user
  if (!token || !user) throw new Error('Google login response missing token/user')
  return { user, token }
}

export async function login(payload: { Identifier: string; Password: string }) {
  const res: any = await api.post(loginUrl, payload)
  const data = res?.data ?? res

  const token: string | undefined = data?.accessToken ?? data?.data?.accessToken

  const user: any = {
    id: data?.userId ?? data?.data?.userId,
    username: data?.username ?? data?.data?.username,
    name:
      data?.username ?? data?.data?.username ??
      (data?.email ?? data?.data?.email)?.split?.('@')?.[0] ?? 'User',
    email: data?.email ?? data?.data?.email,
    role: { name: data?.roleName ?? data?.data?.roleName },
  }

  if (!token || !user?.id) throw new Error('Login response missing token/user')
  return { user, token }
}

export async function logout() {
  // FE-only logout: do not call backend
  try {
    const defaults: any = api?.defaults
    if (defaults?.headers?.common) {
      delete defaults.headers.common['Authorization']
    }
  } catch {}
}

export function isAuthenticated(): boolean {
  const stored = getStoredAuth()
  return !!stored?.token
}

export function setAccessToken(token: string) {
  try {
    if (token) {
      localStorage.setItem('accessToken', token)
      ;(api.defaults.headers.common as any).Authorization = `Bearer ${token}`
    } else {
      localStorage.removeItem('accessToken')
      delete (api.defaults.headers.common as any).Authorization
    }
  } catch {}
}

export function clearState() {
  // Ensure axios does not carry Authorization after clearing
  try {
    const defaults: any = api?.defaults
    if (defaults?.headers?.common) {
      delete defaults.headers.common['Authorization']
    }
  } catch {}
}

export async function verifyOtp(payload: { Email: string; Otp: string }) {
  const res: any = await api.post(verifyOtpUrl, payload)
  const data = res?.data ?? res

  const token: string | undefined = data?.accessToken ?? data?.data?.accessToken

  const user: any = {
    id: data?.userId ?? data?.data?.userId,
    username: data?.username ?? data?.data?.username,
    name:
      data?.username ?? data?.data?.username ??
      (data?.email ?? data?.data?.email)?.split?.('@')?.[0] ?? 'User',
    email: data?.email ?? data?.data?.email,
    role: { name: data?.roleName ?? data?.data?.roleName },
  }

  const msg: string = data?.message ?? data?.msg ?? 'OTP verified successfully.'

  // If backend provides token/user, return them; otherwise only return ok + message
  if (token && user?.id) return { user, token, isOk: true, msg }
  return { isOk: true, msg }
}

export async function resendOtp(payload: { Email: string }) {
  const res: any = await api.post(resendOtpUrl, payload)
  return res?.data ?? res
}

export async function forgotPassword(payload: { Email: string }) {
  const res: any = await api.post(forgotPasswordUrl, payload)
  return res?.data ?? res
}

export async function resetPassword(payload: { Token: string; Password: string; Email?: string }) {
  const res: any = await api.post(resetPasswordUrl, payload)
  const data = res?.data ?? res
  return data
}
export default { login, logout, register, loginWithGoogle, verifyOtp, resendOtp, forgotPassword, resetPassword, getStoredAuth, isAuthenticated, setAccessToken, clearState }
