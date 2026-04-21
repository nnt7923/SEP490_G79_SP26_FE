import api from '../Axios'

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

class MentorServiceClass {
  /**
   * Get list of mentors with optional filters
   * GET /api/mentors
   */
  async getMentors(params?: GetMentorsParams): Promise<MentorListResponse> {
    const response = await api.get('/mentors', { params })
    return response as any
  }

  /**
   * Get mentor details by ID
   * GET /api/mentors/{mentorId}
   */
  async getMentorById(mentorId: string): Promise<MentorDto> {
    const response = await api.get(`/mentors/${mentorId}`)
    return response as any
  }
}

export const MentorService = new MentorServiceClass()
export default MentorService
