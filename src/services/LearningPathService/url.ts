export const basePath = '/learningpaths'
export const skeletonUrl = `${basePath}`
export const aiDraftUrl = `${basePath}/ai-draft`
export const manualDraftUrl = `${basePath}/manual-draft`
export const manualDraftDetailUrl = (pathId: string) => `${manualDraftUrl}/${pathId}`
export const myDraftsUrl = `${basePath}/my-drafts`
export const myDraftDetailUrl = (pathId: string) => `${myDraftsUrl}/${pathId}`
export const lessonContentUrl = (lessonId: string) => `${basePath}/lessons/${lessonId}/content`
export const userLearningPathsUrl = (userId: string | number) => `${basePath}/user/${userId}`
export const learningPathProgressUrl = (pathId: string) => `${basePath}/${pathId}/progress`
