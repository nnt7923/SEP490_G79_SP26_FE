import api from '../Axios'

export interface MentorRatingItem {
  ratingId: string
  studentId: string
  studentName: string
  studentAvatarUrl: string | null
  score: number
  comment: string | null
  createdAt: string
  updatedAt: string | null
}

export interface MentorReviewsResponse {
  averageRating: number
  totalReviews: number
  reviews: PaginatedResult<MentorRatingItem>
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

class MentorReviewServiceClass {
  async getMyReviews(params?: { pageNumber?: number; pageSize?: number }): Promise<MentorReviewsResponse> {
    const response = await api.get('/mentors/me/reviews', {
      params: {
        pageNumber: params?.pageNumber ?? 1,
        pageSize: params?.pageSize ?? 20,
      },
    })
    const data = (response as any)?.data ?? response
    return {
      averageRating: data?.averageRating ?? 0,
      totalReviews: data?.totalReviews ?? 0,
      reviews: {
        items: data?.reviews?.items ?? [],
        pageNumber: data?.reviews?.pageNumber ?? params?.pageNumber ?? 1,
        pageSize: data?.reviews?.pageSize ?? params?.pageSize ?? 20,
        totalCount: data?.reviews?.totalCount ?? 0,
        totalPages: data?.reviews?.totalPages ?? 1,
        hasPreviousPage: data?.reviews?.hasPreviousPage ?? false,
        hasNextPage: data?.reviews?.hasNextPage ?? false,
      },
    }
  }
}

export const MentorReviewService = new MentorReviewServiceClass()
export default MentorReviewService
