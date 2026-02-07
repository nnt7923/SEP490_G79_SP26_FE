export type BackendErrorData = {
  code?: string
  errorCode?: string
  msg?: string
  message?: string
  title?: string
  detail?: string
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_OTP: 'Invalid OTP or no pending verification found.',
  OTP_EXPIRED: 'Your OTP has expired. Please resend a new OTP.',
  EMAIL_ALREADY_VERIFIED: 'Email is already verified.',
  USER_NOT_FOUND: 'Account not found for this email.',
  BAD_CREDENTIALS: 'Incorrect email or password.',
  ACCOUNT_LOCKED: 'Your account is locked. Please contact support.',
  RATE_LIMITED: 'Too many attempts. Please try again later.',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access forbidden. Please check your permissions.',
  NOT_FOUND: 'Requested resource was not found.',
  SERVER_ERROR: 'A server error occurred. Please try again later.',
  // Add/adjust mappings to match backend codes as needed
}

function pickFirstMessage(data?: BackendErrorData): string | undefined {
  if (!data) return undefined
  return (
    data.msg ||
    data.detail ||
    data.title ||
    data.message ||
    undefined
  )
}

export function extractErrorMessage(err: any, fallback = 'An unexpected error occurred.'): string {
  try {
    const data: BackendErrorData | undefined = err?.response?.data
    const code: string | undefined = data?.code || data?.errorCode

    // Prefer mapped message by error code
    let message: string | undefined = code ? ERROR_MESSAGES[code] : undefined

    // Fallback to server-provided message fields
    if (!message) message = pickFirstMessage(data)

    // Fallback to generic error message
    if (!message) message = err?.message || fallback

    // Ensure single-line output
    return String(message).replace(/\s+/g, ' ').trim()
  } catch {
    return fallback
  }
}