import api from '../Axios'
import { getMyResourcesUrl, createResourceUrl, updateResourceUrl, deleteResourceUrl, getResourcePagesUrl, generateSummaryUrl } from './url'

export async function getMyResources() {
  const res: any = await api.get(getMyResourcesUrl)
  return res?.data ?? res
}

export async function createResource(formData: FormData) {
  const res: any = await api.post(createResourceUrl, formData)
  return res?.data ?? res
}

export async function updateResource(resourceId: string, formData: FormData) {
  const res: any = await api.put(updateResourceUrl(resourceId), formData)
  return res?.data ?? res
}

export async function deleteResource(resourceId: string) {
  const res: any = await api.delete(deleteResourceUrl(resourceId))
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
