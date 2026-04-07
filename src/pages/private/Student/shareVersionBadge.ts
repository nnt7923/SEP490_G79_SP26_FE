const parseBooleanFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return false
}

export const shouldShowShareUpdateBadge = (context: { hasNewVersion?: unknown } | null | undefined): boolean => {
  return parseBooleanFlag(context?.hasNewVersion)
}

export const shouldShowSourceUpdateBadge = (plan: { hasSourceUpdate?: unknown } | null | undefined): boolean => {
  return parseBooleanFlag(plan?.hasSourceUpdate)
}
