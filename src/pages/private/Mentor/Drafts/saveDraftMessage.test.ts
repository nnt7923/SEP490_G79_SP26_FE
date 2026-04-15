import { describe, expect, it } from 'vitest'
import type { SkeletonResponse } from '../../../../services/LearningPathService'
import { resolveDraftUpdateSuccessMessage } from './saveDraftMessage'

const t = (key: string) => key

describe('resolveDraftUpdateSuccessMessage', () => {
  it('returns version bumped key when hasMeaningfulChange is true', () => {
    const response = { hasMeaningfulChange: true } as SkeletonResponse
    const latestDraft = {} as SkeletonResponse

    const result = resolveDraftUpdateSuccessMessage(response, latestDraft, 'Path - ver 1', t)

    expect(result).toBe('learningPath.draft.save.versionBumped')
  })

  it('returns no meaningful change key when hasMeaningfulChange is false string in PascalCase field', () => {
    const response = { HasMeaningfulChange: 'false' } as SkeletonResponse
    const latestDraft = {} as SkeletonResponse

    const result = resolveDraftUpdateSuccessMessage(response, latestDraft, 'Path - ver 1', t)

    expect(result).toBe('learningPath.draft.save.noMeaningfulChange')
  })

  it('falls back to version and previousVersion comparison when meaningful flag is missing', () => {
    const response = { version: 4, previousVersion: 3 } as SkeletonResponse
    const latestDraft = {} as SkeletonResponse

    const result = resolveDraftUpdateSuccessMessage(response, latestDraft, 'Path - ver 3', t)

    expect(result).toBe('learningPath.draft.save.versionBumped')
  })

  it('falls back to title version parsing when explicit version fields are missing', () => {
    const response = {} as SkeletonResponse
    const latestDraft = { title: 'Frontend Basics - ver 7' } as SkeletonResponse

    const result = resolveDraftUpdateSuccessMessage(response, latestDraft, 'Frontend Basics - ver 6', t)

    expect(result).toBe('learningPath.draft.save.versionBumped')
  })

  it('returns manual update success fallback when no comparison data is available', () => {
    const response = {} as SkeletonResponse
    const latestDraft = { title: 'Frontend Basics' } as SkeletonResponse

    const result = resolveDraftUpdateSuccessMessage(response, latestDraft, 'Frontend Basics', t)

    expect(result).toBe('drafts.manualUpdateSuccess')
  })
})
