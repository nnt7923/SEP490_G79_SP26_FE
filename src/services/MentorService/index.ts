import api from '../Axios'

export interface MentorReviewDto {
  ratingId: string
  studentId: string
  studentName: string
  studentAvatarUrl: string | null
  score: number
  comment: string | null
  createdAt: string
  updatedAt: string
}

export interface MentorDto {
  mentorId: string
  username: string
  firstName: string
  lastName: string
  fullName: string
  avatarUrl: string | null
  bio: string | null
  averageRating: number
  totalReviews: number
  specializations: string[]
  specializedSubjects: string[]
  myReview?: MentorReviewDto | null
  recentReviews?: MentorReviewDto[]
}

export interface MentorListResponse {
  items: MentorDto[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface GetMentorsParams {
  PageNumber?: number
  PageSize?: number
  SearchTerm?: string
  SubjectCategory?: string
  SubjectName?: string
  // Note: minRating, sortBy, sortDescending are not supported by backend
  // These should be handled client-side if needed
}

export interface MentorReviewPayload {
  score: number
  comment?: string | null
}

class MentorServiceClass {
  async getMentors(params?: GetMentorsParams): Promise<MentorListResponse> {
    const response = await api.get('/mentors', { params })
    return response as any
  }

  async getMentorById(mentorId: string): Promise<MentorDto> {
    const response = await api.get(`/mentors/${mentorId}`)
    return response as any
  }

  async reviewMentor(mentorId: string, payload: MentorReviewPayload): Promise<any> {
    const response = await api.put(`/mentors/${mentorId}/review`, payload)
    return response as any
  }
}

export const MentorService = new MentorServiceClass()
export default MentorService
