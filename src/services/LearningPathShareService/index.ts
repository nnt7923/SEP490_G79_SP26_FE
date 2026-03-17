import api from '../Axios'
import type { PendingLearningPathShareSummaryDto } from '../../types/chat'

/** 4.2.1 — Mentor gửi learning path cho student */
export async function shareToStudent(
  pathId: string,
  studentId: string
): Promise<void> {
  return api.post(`/learningpath-shares/paths/${pathId}`, { studentId })
}

/** 4.2.2 — Student accept share */
export async function acceptShare(shareId: string): Promise<void> {
  return api.post(`/learningpath-shares/${shareId}/accept`)
}

/** 4.2.3 — Student reject share */
export async function rejectShare(shareId: string): Promise<void> {
  return api.post(`/learningpath-shares/${shareId}/reject`)
}

/** 4.2.4 — Student lấy danh sách pending share */
export async function getPendingShares(): Promise<PendingLearningPathShareSummaryDto[]> {
  return api.get('/learningpath-shares/pending')
}
