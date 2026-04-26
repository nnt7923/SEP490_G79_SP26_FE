export const basePath = '/learningpaths'
export const skeletonUrl = `${basePath}`
export const aiDraftUrl = `${basePath}/ai-draft`
export const manualDraftUrl = `${basePath}/manual-draft`
export const manualDraftDetailUrl = (pathId: string) => `${manualDraftUrl}/${pathId}`
export const publishManualDraftUrl = (pathId: string) => `${manualDraftUrl}/${pathId}/publish`
export const myDraftsUrl = `${basePath}/my-drafts`
export const myDraftDetailUrl = (pathId: string) => `${myDraftsUrl}/${pathId}`
export const lessonContentUrl = (lessonId: string) => `${basePath}/lessons/${lessonId}/content`
export const lessonReadUrl = (lessonId: string) => `${basePath}/lessons/${lessonId}/read`
export const lessonReadStatusUrl = (lessonId: string) => `${basePath}/lessons/${lessonId}/read-status`
export const userLearningPathsUrl = (userId: string | number) => `${basePath}/user/${userId}`
export const userLearningPathsSummaryUrl = (userId: string | number) => `${basePath}/user/${userId}/summary`
export const userLearningPathDetailUrl = (userId: string | number, pathId: string) => `${basePath}/user/${userId}/${pathId}`
export const learningPathProgressUrl = (pathId: string) => `${basePath}/${pathId}/progress`
export const publishedPathsUrl = `${basePath}/published`
export const publishedPathPreviewUrl = (pathId: string) => `${publishedPathsUrl}/${pathId}/preview`
export const enrollPathUrl = (pathId: string) => `${basePath}/${pathId}/enroll`
export const myPublishedUrl = `${basePath}/my-published`
export const myPublishedDetailUrl = (pathId: string) => `${myPublishedUrl}/${pathId}`
export const unpublishLearningPathUrl = (pathId: string) => `${basePath}/${pathId}/unpublish`
export const republishLearningPathUrl = (pathId: string) => `${basePath}/${pathId}/republish`
export const studentLearningPathUrl = (pathId: string) => `${basePath}/student/${pathId}`
export const mentorReviewUrl = (pathId: string) => `${basePath}/${pathId}/mentor-review`
export const mentorReviewsUrl = (pathId: string) => `${basePath}/${pathId}/mentor-reviews`
export const mentorReviewRequestUrl = (pathId: string) => `${basePath}/${pathId}/mentor-reviews/request`
export const mentorReviewDecisionUrl = (pathId: string, reviewId: string) => `${basePath}/${pathId}/mentor-reviews/${reviewId}/decision`
