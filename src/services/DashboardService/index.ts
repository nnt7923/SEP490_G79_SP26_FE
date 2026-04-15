import api from '../Axios';

export interface RecentMessageDto {
  messageId: string;
  conversationId: string;
  studentId: string;
  studentName: string;
  content: string;
  sentAt: string;
}

export interface MentorOverviewResponse {
  supportedStudentsCount: number;
  createdSubjectsCount: number;
  draftLearningPathsCount: number;
  recentStudentMessages: RecentMessageDto[];
}

export async function getMentorOverview(): Promise<MentorOverviewResponse> {
  const res: any = await api.get('/dashboard/mentor/overview');
  return res?.data ?? res;
}

export default {
  getMentorOverview,
};
