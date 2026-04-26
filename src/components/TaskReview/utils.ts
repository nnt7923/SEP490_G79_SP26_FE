import type { FocusSessionHistoryItem } from '../../services/FocusSessionService'
import type { TaskReviewDetail } from '../../services/TaskReviewService'

export function hasTaskReviewSubmission(
  session: Pick<FocusSessionHistoryItem, 'submittedCode' | 'submittedSummary' | 'submittedQuizAnswers'>,
): boolean {
  return Boolean(
    String(session.submittedCode ?? '').trim()
    || String(session.submittedSummary ?? '').trim()
    || String(session.submittedQuizAnswers ?? '').trim(),
  )
}

export function canRequestTaskReview(
  session: Pick<FocusSessionHistoryItem, 'taskReview' | 'submittedCode' | 'submittedSummary' | 'submittedQuizAnswers'>,
): boolean {
  return !session.taskReview && hasTaskReviewSubmission(session)
}

export function isTaskReviewQuotaReached(remaining: number | null | undefined): boolean {
  return remaining != null && remaining !== -1 && remaining <= 0
}

export function canCurrentUserSubmitTaskReview(
  review: Pick<TaskReviewDetail, 'status' | 'mentorId'> | null | undefined,
  currentUserId: string,
  roleName: string,
): boolean {
  if (!review) return false
  return roleName.trim().toLowerCase() === 'mentor'
    && review.status === 'Pending'
    && String(review.mentorId || '').trim() === String(currentUserId || '').trim()
}
