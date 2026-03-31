import api from '../Axios'
import { getMyResourcesUrl, createResourceUrl, updateResourceUrl, deleteResourceUrl, getResourcePagesUrl, generateSummaryUrl } from './url'

const RESOURCES_LIST_CACHE_PREFIX = 'my-resources:list:'
const RESOURCE_PAGES_CACHE_PREFIX = 'resource-pages:'

const removeSessionStorageKeysByPrefix = (prefix: string) => {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove: string[] = []
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index)
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => window.sessionStorage.removeItem(key))
  } catch {
  }
}

export const invalidateMyResourcesListCache = () => {
  removeSessionStorageKeysByPrefix(RESOURCES_LIST_CACHE_PREFIX)
}

export const invalidateResourcePagesCache = (resourceId?: string) => {
  if (typeof window === 'undefined') return

  try {
    if (resourceId) {
      window.sessionStorage.removeItem(`${RESOURCE_PAGES_CACHE_PREFIX}${resourceId}`)
      return
    }

    removeSessionStorageKeysByPrefix(RESOURCE_PAGES_CACHE_PREFIX)
  } catch {
  }
}

export const invalidateResourceCaches = (resourceId?: string) => {
  invalidateMyResourcesListCache()
  if (resourceId) {
    invalidateResourcePagesCache(resourceId)
  }
}

export interface GetMyResourcesParams {
  PageNumber?: number
  PageSize?: number
  SubjectId?: string
  SearchTerm?: string
  SortBy?: string
  SortDescending?: boolean
}

export async function getMyResources(params?: GetMyResourcesParams) {
  const res: any = await api.get(getMyResourcesUrl, { params })
  return res?.data ?? res
}

export async function createResource(formData: FormData, onUploadProgress?: (progressEvent: any) => void) {
  const res: any = await api.post(createResourceUrl, formData, {
    onUploadProgress: onUploadProgress ? (progressEvent: any) => {
      const percentCompleted = progressEvent.total 
        ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
        : 0
      onUploadProgress({ loaded: progressEvent.loaded, total: progressEvent.total, percent: percentCompleted })
    } : undefined,
  })
  invalidateMyResourcesListCache()
  return res?.data ?? res
}

export async function updateResource(resourceId: string, formData: FormData) {
  const res: any = await api.put(updateResourceUrl(resourceId), formData)
  invalidateResourceCaches(resourceId)
  return res?.data ?? res
}

export async function deleteResource(resourceId: string) {
  const res: any = await api.delete(deleteResourceUrl(resourceId))
  invalidateResourceCaches(resourceId)
  return res?.data ?? res
}

export async function getResourcePages(resourceId: string) {
  const res: any = await api.get(getResourcePagesUrl(resourceId))
  return res?.data ?? res
}

export async function generateSummary(resourceId: string, startPage: number, endPage: number) {
  const res: any = await api.post(generateSummaryUrl(resourceId), { startPage, endPage })
  return res?.data ?? res
}

export default { getMyResources, createResource, updateResource, deleteResource, getResourcePages, generateSummary }
