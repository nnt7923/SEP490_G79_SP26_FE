export const basePath = '/focus-sessions'
export const startSessionUrl = `${basePath}/start`
export const sessionUrl = (id: string | number) => `${basePath}/${id}`
export const stopSessionUrl = (id: string | number) => `${basePath}/${id}/stop`
export const reviewUrl = (id: string | number) => `${basePath}/${id}/review`
export const completeUrl = (id: string | number) => `${basePath}/${id}/complete-json`
export const mySessionsUrl = `${basePath}/me`