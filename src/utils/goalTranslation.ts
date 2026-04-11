import i18n from '../i18n'

/**
 * Get the translated goal title.
 * Looks up the i18n key `titles.<goalId>` in the `goals` namespace.
 * Falls back to the original API title if no translation is found.
 */
export function getGoalTitle(
  _t: unknown,
  goalId: string | undefined,
  fallbackTitle: string
): string {
  if (!goalId) return fallbackTitle
  const key = `titles.${goalId}`
  const translated = i18n.t(key, { ns: 'goals', defaultValue: '' })
  return translated || fallbackTitle
}
