import api from '../Axios'

export interface LearningPathReviewItem {
  reviewId: string
  pathId: string
  pathTitle: string
  studentId: string
  studentName: string
  studentEmail: string
  mentorId: string
  mentorName: string
  mentorEmail: string
  decisionStatus: string
  studentRequestNote: string | null
  changeSummary: string | null
  changeReason: string | null
  studentDecisionNote: string | null
  studentDecidedAt: string | null
  mentorRespondedAt: string | null
  createdAt: string
  updatedAt: string | null
}

export interface LearningPathReviewsResult {
  items: LearningPathReviewItem[]
  totalCount: number
  totalPages: number
  pageNumber: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface GetLearningPathReviewsParams {
  status?: string
  page?: number
  pageSize?: number
}

async function getLearningPathReviews(
  params: GetLearningPathReviewsParams = {}
): Promise<LearningPathReviewsResult> {
  const query: Record<string, unknown> = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  }
  if (params.status) query.status = params.status

  const res: unknown = await api.get('/mentors/me/learning-path-reviews', { params: query })
  // Axios interceptor returns response.data directly, so res is already the payload
  const raw = res

  if (Array.isArray(raw)) {
    return {
      items: raw as LearningPathReviewItem[],
      totalCount: raw.length,
      totalPages: 1,
      pageNumber: 1,
      pageSize: raw.length,
      hasNextPage: false,
      hasPreviousPage: false,
    }
  }

  const r = raw as Record<string, unknown>
  const items: LearningPathReviewItem[] = Array.isArray(r?.items)
    ? (r.items as LearningPathReviewItem[])
    : Array.isArray(r?.value)
    ? (r.value as LearningPathReviewItem[])
    : Array.isArray(r?.data)
    ? (r.data as LearningPathReviewItem[])
    : []

  return {
    items,
    totalCount: Number(r?.totalCount ?? r?.total ?? items.length),
    totalPages: Number(r?.totalPages ?? 1),
    pageNumber: Number(r?.pageNumber ?? r?.page ?? params.page ?? 1),
    pageSize: Number(r?.pageSize ?? params.pageSize ?? 20),
    hasNextPage: Boolean(r?.hasNextPage),
    hasPreviousPage: Boolean(r?.hasPreviousPage),
  }
}

export default { getLearningPathReviews }
