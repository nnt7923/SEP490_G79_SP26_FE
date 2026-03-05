// '/Auth/me' has been removed from the frontend.
// This module is kept intentionally empty to avoid unused endpoint references.
import api from '../Axios'
import { getProfileUrl, updateProfileUrl, updateAvatarProfile, changePasswordUrl, listUsersUrl, userUrl, banUserUrl, unbanUserUrl } from './url'
export async function getProfile() {
  const res: any = await api.get(getProfileUrl)
  return res?.data ?? res
}
export async function updateProfile(payload: any) {
  const res: any = await api.put(updateProfileUrl, payload)
  return res?.data ?? res
}
export async function uploadAvatarProfile(payload: any) {
  const res: any = await api.post(updateAvatarProfile, payload)
  return res?.data ?? res
}
export async function changePassword(payload: any) {
  const res: any = await api.put(changePasswordUrl, payload)
  return res?.data ?? res
}

// New: GET /api/users
export async function listUsers(): Promise<any[]> {
  const res: any = await api.get(listUsersUrl)
  return res?.data ?? res
}

// New: GET /api/users/{userId}
export async function getUserById(userId: string | number): Promise<any> {
  const res: any = await api.get(userUrl(userId))
  return res?.data ?? res
}

// New: POST /api/users/{userId}/ban
export async function banUser(userId: string): Promise<any> {
  const res: any = await api.post(banUserUrl(userId))
  return res?.data ?? res
}

// New: POST /api/users/{userId}/unban
export async function unbanUser(userId: string): Promise<any> {
  const res: any = await api.post(unbanUserUrl(userId))
  return res?.data ?? res
}

export default { getProfile, updateProfile, uploadAvatarProfile, changePassword, listUsers, getUserById, banUser, unbanUser }