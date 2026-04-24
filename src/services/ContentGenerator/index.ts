import LearningPathService from '../LearningPathService'

export const generateAllContent = async (
  skeleton: any,
  options?: {
    concurrency?: number
    onStarted?: (data: any) => void
    onProgress?: (data: any) => void
    onCompleted?: (data: any) => void
    onError?: (data: any) => void
    onCancelled?: (data: any) => void
    onLessonSuccess?: (lesson: any) => void
    onLessonError?: (data: any) => void
    onQuizSuccess?: (data: any) => void
    onQuizError?: (data: any) => void
  }
): Promise<any> => {
  const pathId = skeleton?.pathId || skeleton?.id
  if (!pathId) return { status: 'skipped', reason: 'no pathId' }

  return LearningPathService.generateBulkLearningPathContent(pathId, {
    lessonConcurrency: options?.concurrency ?? 4,
    quizConcurrency: 6,
    onStarted: options?.onStarted,
    onProgress: options?.onProgress,
    onCompleted: options?.onCompleted,
    onError: options?.onError,
    onCancelled: options?.onCancelled,
    onLessonSuccess: options?.onLessonSuccess,
    onLessonError: options?.onLessonError,
    onQuizSuccess: options?.onQuizSuccess,
    onQuizError: options?.onQuizError,
  })
}

export default { generateAllContent }
