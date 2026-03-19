export const basePath = '/focus-sessions'
export const startSessionUrl = `${basePath}/start`
export const sessionUrl = (id: string | number) => `${basePath}/${id}`
export const stopSessionUrl = (id: string | number) => `${basePath}/${id}/stop`
export const pauseSessionUrl = (id: string | number) => `${basePath}/${id}/pause`
export const resumeSessionUrl = (id: string | number) => `${basePath}/${id}/resume`
export const reviewUrl = (id: string | number) => `${basePath}/${id}/review`
export const completeUrl = (id: string | number) => `${basePath}/${id}/complete`
export const mySessionsUrl = `${basePath}/me`
export const activeSessionsUrl = `${basePath}/active` // Get all active sessions for current user
export const serverTimeUrl = '/server-time' // Add server time endpoint
export const activeSessionUrl = (taskId: string) => `${basePath}/active/${taskId}` // Get active session by taskId