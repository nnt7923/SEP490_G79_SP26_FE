// '/Auth/me' has been removed from the frontend.
// This module is kept intentionally empty to avoid unused endpoint references.
import api from '../Axios'
import { getProfileUrl, updateProfileUrl, updateAvatarProfile, changePasswordUrl } from './url'
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
export default { getProfile, updateProfile, uploadAvatarProfile, changePassword }