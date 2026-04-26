import api from '../Axios'

export type MentorReviewDecisionStatus = 'Pending' | 'Accepted' | 'Rejected' | 'WaitingStudentResponse'

export interface AdminMentorReviewItem {
  reviewId: string
  pathId: string
  pathTitle: string
  studentId: string
  studentName: string
  studentEmail: string
  mentorId: string
  mentorName: string
  mentorEmail: string
  decisionStatus: MentorReviewDecisionStatus
  studentRequestNote: string | null
  changeSummary: string | null
  changeReason: string | null
  studentDecisionNote: string | null
  studentDecidedAt: string | null
  mentorRespondedAt: string | null
  createdAt: string
  updatedAt: string | null
}

export interface AdminMentorReviewsParams {
  status?: MentorReviewDecisionStatus | ''
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  items: T[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

class AdminMentorReviewServiceClass {
  async sendReminder(reviewId: string): Promise<void> {
    await api.post(`/admin/mentor-reviews/${reviewId}/send-reminder`)
  }

  async getReviews(params?: AdminMentorReviewsParams): Promise<PaginatedResult<AdminMentorReviewItem>> {
    const response = await api.get('/admin/mentor-reviews', {
      params: {
        status: params?.status || undefined,
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 20,
      },
    })
    const data = (response as any)?.data ?? response
    return {
      items: Array.isArray(data) ? data : (data?.items ?? []),
      pageNumber: data?.pageNumber ?? params?.page ?? 1,
      pageSize: data?.pageSize ?? params?.pageSize ?? 20,
      totalCount: data?.totalCount ?? (Array.isArray(data) ? data.length : 0),
      totalPages: data?.totalPages ?? 1,
      hasPreviousPage: data?.hasPreviousPage ?? false,
      hasNextPage: data?.hasNextPage ?? false,
    }
  }
}

export const AdminMentorReviewService = new AdminMentorReviewServiceClass()
export default AdminMentorReviewService
