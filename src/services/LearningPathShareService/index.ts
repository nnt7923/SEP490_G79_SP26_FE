import api from '../Axios'
import type {
  LearningPathShareDto,
  LearningPathSharePreviewDto,
  LearningPathShareUpdateAction,
  LearningPathShareUpdateContextDto,
  PendingLearningPathShareSummaryDto,
  SentLearningPathShareSummaryDto,
  ShareStatus,
} from '../../types/chat'

function toShareArray<T>(payload: any): T[] {
  const candidates = [
    payload?.items,
    payload?.data?.items,
    payload?.result?.items,
    payload?.shares,
    payload?.data?.shares,
    payload?.result?.shares,
    payload?.data,
    payload?.result,
    payload,
  ]

  return candidates.find((value) => Array.isArray(value)) ?? []
}

/** 4.2.1 — Mentor gửi learning path cho student */
export async function shareToStudent(
  pathId: string,
  studentId: string
): Promise<LearningPathShareDto> {
  return api.post(`/learningpath-shares/paths/${pathId}`, { studentId })
}

/** 4.2.2 — Student accept share */
export async function acceptShare(shareId: string): Promise<LearningPathShareDto> {
  return api.post(`/learningpath-shares/${shareId}/accept`)
}

/** 4.2.3 — Student reject share */
export async function rejectShare(shareId: string): Promise<void> {
  return api.post(`/learningpath-shares/${shareId}/reject`)
}

/** 4.2.4 — Student lấy danh sách pending share */
export async function getPendingShares(): Promise<PendingLearningPathShareSummaryDto[]> {
  const response = await api.get('/learningpath-shares/pending')
  return toShareArray<PendingLearningPathShareSummaryDto>(response)
}

export async function getSentShares(filters?: {
  status?: ShareStatus
  studentId?: string
}): Promise<SentLearningPathShareSummaryDto[]> {
  const response = await api.get('/learningpath-shares/sent', { params: filters })
  return toShareArray<SentLearningPathShareSummaryDto>(response)
}

export async function getSharePreview(shareId: string): Promise<LearningPathSharePreviewDto> {
  return api.get(`/learningpath-shares/${shareId}/preview`)
}

export async function getUpdateContext(shareId: string): Promise<LearningPathShareUpdateContextDto> {
  return api.get(`/learningpath-shares/${shareId}/update-context`)
}

export async function applyUpdate(
  shareId: string,
  action: LearningPathShareUpdateAction,
): Promise<LearningPathShareDto> {
  return api.post(`/learningpath-shares/${shareId}/apply-update`, { action })
}
