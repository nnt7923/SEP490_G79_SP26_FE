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

function parseBooleanLike(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  return false
}

function extractShouldPromptDailyReminderTime(root: any): boolean {
  const container = root?.data ?? root

  const candidates = [
    container?.shouldPromptDailyReminderTime,
    container?.ShouldPromptDailyReminderTime,
    container?.shouldPromptDailyReminder,
    container?.ShouldPromptDailyReminder,
    root?.shouldPromptDailyReminderTime,
    root?.ShouldPromptDailyReminderTime,
    root?.shouldPromptDailyReminder,
    root?.ShouldPromptDailyReminder,
  ]

  for (const candidate of candidates) {
    if (candidate != null) return parseBooleanLike(candidate)
  }

  return false
}

export async function loginWithGoogle(payload: { ClientId: string; IdToken: string }) {
  const res: any = await api.post(loginWithGoogleUrl, payload)
  const data = res?.data ?? res
  const token: string | undefined = data?.accessToken ?? data?.data?.accessToken
  const shouldPromptDailyReminderTime = extractShouldPromptDailyReminderTime(data)
  const user: any = {
    id: data?.userId ?? data?.data?.userId,
    username: data?.username ?? data?.data?.username,
    name:
      data?.username ?? data?.data?.username ??
      (data?.email ?? data?.data?.email)?.split?.('@')?.[0] ?? 'User',
    email: data?.email ?? data?.data?.email,
    role: { name: data?.roleName ?? data?.data?.roleName },
  }

  if (!token || !user?.id) throw new Error('Google login response missing token/user')
  return { user, token, shouldPromptDailyReminderTime }
}

export async function login(payload: { Identifier: string; Password: string }) {
  const res: any = await api.post(loginUrl, payload)
  const data = res?.data ?? res

  // Handle both old and new API response formats
  const token: string | undefined = data?.accessToken ?? data?.data?.accessToken
  const refreshToken: string | undefined = data?.refreshToken ?? data?.data?.refreshToken
  const shouldPromptDailyReminderTime = extractShouldPromptDailyReminderTime(data)

  const user: any = {
    id: data?.userId ?? data?.data?.userId,
    username: data?.username ?? data?.data?.username ?? data?.identifier ?? data?.data?.identifier,
    name:
      data?.username ?? data?.data?.username ?? data?.identifier ?? data?.data?.identifier ??
      (data?.email ?? data?.data?.email)?.split?.('@')?.[0] ?? 'User',
    email: data?.email ?? data?.data?.email,
    role: { name: data?.roleName ?? data?.data?.roleName ?? 'Student' },
  }

  if (!token || !user?.id) throw new Error('Login response missing token/user')

  // Store refresh token if provided
  if (refreshToken) {
    try {
      localStorage.setItem('refreshToken', refreshToken)
    } catch { }
  }

  return { user, token, refreshToken, shouldPromptDailyReminderTime }
}

export async function logout() {
  // Call backend to invalidate session/token — send refreshToken in body
  try {
    const refreshToken = localStorage.getItem('refreshToken')
    await api.post(logoutUrl, refreshToken ? { refreshToken } : undefined)
  } catch { }
  // Ensure axios does not carry Authorization after logout
  try {
    const defaults: any = api?.defaults
    if (defaults?.headers?.common) {
      delete defaults.headers.common['Authorization']
    }
  } catch { }
}

export function isAuthenticated(): boolean {
  const stored = getStoredAuth()
  return !!stored?.token
}

export function setAccessToken(token: string) {
  try {
    if (token) {
      localStorage.setItem('accessToken', token)
        ; (api.defaults.headers.common as any).Authorization = `Bearer ${token}`
    } else {
      localStorage.removeItem('accessToken')
      delete (api.defaults.headers.common as any).Authorization
    }
  } catch { }
}

export function clearState() {
  // Clear refresh token
  try {
    localStorage.removeItem('refreshToken')
  } catch { }
  // Ensure axios does not carry Authorization after clearing
  try {
    const defaults: any = api?.defaults
    if (defaults?.headers?.common) {
      delete defaults.headers.common['Authorization']
    }
  } catch { }
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
  const purpose: string | undefined = data?.purpose ?? data?.data?.purpose
  const resetToken: string | undefined = data?.resetToken ?? data?.data?.resetToken

  // If backend provides token/user, return them; otherwise only return ok + message
  if (token && user?.id) return { user, token, purpose, resetToken, message: msg, isOk: true, msg }
  return { purpose, resetToken, message: msg, isOk: true, msg }
}

export async function resendOtp(payload: { Email: string; Purpose?: string }) {
  const res: any = await api.post(resendOtpUrl, payload)
  return res?.data ?? res
}

export async function forgotPassword(payload: { Email: string }) {
  const res: any = await api.post(forgotPasswordUrl, payload)
  return res?.data ?? res
}

export async function resetPassword(payload: {
  resetToken?: string
  newPassword?: string
  email?: string
  Token?: string
  Password?: string
  Email?: string
}) {
  const resetToken = payload.resetToken ?? payload.Token
  const newPassword = payload.newPassword ?? payload.Password
  const email = payload.email ?? payload.Email

  const requestBody: Record<string, string> = {
    resetToken: resetToken ?? '',
    newPassword: newPassword ?? '',
    // Backward compatibility for old backend contracts (safe if ignored).
    ResetToken: resetToken ?? '',
    NewPassword: newPassword ?? '',
  }

  if (email) {
    requestBody.email = email
    requestBody.Email = email
  }

  const res: any = await api.post(resetPasswordUrl, requestBody)
  const data = res?.data ?? res
  return data
}
export async function refresh() {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) throw new Error('No refresh token available')
  const res: any = await api.post(refreshUrl, { refreshToken })
  const data = res?.data ?? res
  const newToken: string | undefined = data?.accessToken ?? data?.data?.accessToken ?? data?.token ?? data?.data?.token
  const newRefreshToken: string | undefined = data?.refreshToken ?? data?.data?.refreshToken
  if (newToken) {
    try { setAccessToken(newToken) } catch { }
  }
  if (newRefreshToken) {
    try { localStorage.setItem('refreshToken', newRefreshToken) } catch { }
  }
  return { token: newToken, refreshToken: newRefreshToken }
}

export default { login, logout, register, loginWithGoogle, verifyOtp, resendOtp, forgotPassword, resetPassword, getStoredAuth, isAuthenticated, setAccessToken, clearState, refresh }
