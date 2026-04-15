export const getMyResourcesUrl = '/users/me/resources'
export const createResourceUrl = '/resources'
export const updateResourceUrl = (resourceId: string) => `/resources/${resourceId}`
export const deleteResourceUrl = (resourceId: string) => `/resources/${resourceId}`
export const getResourcePagesUrl = (resourceId: string) => `/resources/${resourceId}/pages`
export const generateSummaryUrl = (resourceId: string) => `/resources/${resourceId}/summary`
export const getResourceSummariesUrl = (resourceId: string) => `/resources/${resourceId}/summaries`
export const deleteResourceSummaryUrl = (summaryId: string) => `/resources/summaries/${summaryId}`
