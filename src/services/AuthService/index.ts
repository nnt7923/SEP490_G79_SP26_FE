import api from '../Axios'
import { loginUrl, registerUrl, logoutUrl, refreshUrl, loginWithGoogleUrl, verifyOtpUrl } from './urls'

export type User = {
  id: number
  username: string
  name: string
  email?: string
}

const STORAGE_KEY = 'auth'

function saveAuth(payload: { token: string; user: User }) {
  // no-op: storage disabled; API is source of truth
}

export function getStoredAuth(): { token: string; user: User } | null {
  // storage disabled; always return null
  return null
}

// legacy login(username, password) removed; use payload { Identifier, Password }

export async function register(payload: any) {
  const res: any = await api.post(registerUrl, payload)
  return res?.data ?? res
}

export async function loginWithGoogle(payload: any) {
  const res: any = await api.post(loginWithGoogleUrl, payload)
  const data = res?.data ?? res
  const token: string | undefined = data?.token ?? data?.data?.token
  const user: User | undefined = data?.user ?? data?.data?.user
  if (!token || !user) throw new Error('Google login response missing token/user')
  return { user, token }
}

export async function login(payload: { Identifier: string; Password: string }) {
  // Send top-level fields as backend requires Identifier and Password
  const res: any = await api.post(loginUrl, payload)
  const data = res?.data ?? res

  // Backend returns accessToken, refreshToken, userId, email, username, roleId, roleName
  const token: string | undefined = data?.accessToken ?? data?.data?.accessToken

  // Construct user object from top-level fields
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
  // no-op: storage disabled
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

  // Expect same structure as login: accessToken and top-level user fields
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

  if (!token || !user?.id) throw new Error('Verify OTP response missing token/user')
  return { user, token }
}

export default { login, logout, register, loginWithGoogle, verifyOtp, getStoredAuth, isAuthenticated, setAccessToken, clearState }
