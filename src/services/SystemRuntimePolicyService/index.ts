import api from '../Axios'

export interface SystemRuntimePolicyDto {
  systemRuntimePolicyId: string | null
  policyKey: string
  description: string | null
  configJson: Record<string, unknown>
  isActive: boolean
  updatedAt: string
}

export interface CreatePolicyPayload {
  policyKey: string
  description?: string | null
  configJson?: Record<string, unknown>
  isActive?: boolean
}

export interface UpdatePolicyPayload {
  description?: string | null
  configJson?: Record<string, unknown>
  isActive?: boolean
}

// NOTE: The Axios response interceptor unwraps response.data automatically,
// so api.get/post/put/delete already resolves to the response body directly.

export async function getAllPolicies(): Promise<SystemRuntimePolicyDto[]> {
  const data = await api.get('/admin/system-runtime-policy') as unknown
  return Array.isArray(data) ? (data as SystemRuntimePolicyDto[]) : []
}

export async function getPolicyByKey(policyKey: string): Promise<SystemRuntimePolicyDto> {
  const data = await api.get(`/admin/system-runtime-policy/${encodeURIComponent(policyKey)}`) as unknown
  return data as SystemRuntimePolicyDto
}

export async function createPolicy(payload: CreatePolicyPayload): Promise<SystemRuntimePolicyDto> {
  const data = await api.post('/admin/system-runtime-policy', payload) as unknown
  return data as SystemRuntimePolicyDto
}

export async function updatePolicy(policyKey: string, payload: UpdatePolicyPayload): Promise<SystemRuntimePolicyDto> {
  const data = await api.put(`/admin/system-runtime-policy/${encodeURIComponent(policyKey)}`, payload) as unknown
  return data as SystemRuntimePolicyDto
}
