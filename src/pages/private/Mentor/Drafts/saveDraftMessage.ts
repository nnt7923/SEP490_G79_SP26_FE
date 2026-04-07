import type { SkeletonResponse } from '../../../../services/LearningPathService'

const NO_MEANINGFUL_CHANGE_KEY = 'learningPath.draft.save.noMeaningfulChange'
const VERSION_BUMPED_KEY = 'learningPath.draft.save.versionBumped'
const FALLBACK_SUCCESS_KEY = 'drafts.manualUpdateSuccess'

const parseVersionNumber = (value: unknown): number | null => {
  if (value == null || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const parseMeaningfulChange = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return null
}

const parseVersionFromTitle = (title: string): number | null => {
  const match = title.match(/-\s*ver\s*(\d+)\s*$/i)
  if (!match) return null
  return parseVersionNumber(match[1])
}

export const resolveDraftUpdateSuccessMessage = (
  response: SkeletonResponse,
  latestDraft: SkeletonResponse,
  previousTitle: string,
  t: (key: string) => string,
): string => {
  const hasMeaningfulChange = parseMeaningfulChange(
    response?.hasMeaningfulChange
      ?? response?.HasMeaningfulChange
      ?? latestDraft?.hasMeaningfulChange
      ?? latestDraft?.HasMeaningfulChange,
  )

  if (hasMeaningfulChange === true) return t(VERSION_BUMPED_KEY)
  if (hasMeaningfulChange === false) return t(NO_MEANINGFUL_CHANGE_KEY)

  const version = parseVersionNumber(response?.version ?? response?.Version ?? latestDraft?.version ?? latestDraft?.Version)
  const previousVersion = parseVersionNumber(
    response?.previousVersion ?? response?.PreviousVersion ?? latestDraft?.previousVersion ?? latestDraft?.PreviousVersion,
  )

  if (version != null && previousVersion != null) {
    return version > previousVersion ? t(VERSION_BUMPED_KEY) : t(NO_MEANINGFUL_CHANGE_KEY)
  }

  const oldVersion = parseVersionFromTitle(previousTitle)
  const newVersion = parseVersionFromTitle(String(latestDraft?.title ?? latestDraft?.Title ?? response?.title ?? response?.Title ?? ''))
  if (oldVersion != null && newVersion != null) {
    return newVersion > oldVersion ? t(VERSION_BUMPED_KEY) : t(NO_MEANINGFUL_CHANGE_KEY)
  }

  return t(FALLBACK_SUCCESS_KEY)
}
