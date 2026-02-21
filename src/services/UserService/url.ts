export const getProfileUrl = '/users/me'
export const updateProfileUrl = '/users/me'
export const updateAvatarProfile = '/users/me/avatar'
export const changePasswordUrl = '/users/change-password'

// New: admin/browse endpoints
export const listUsersUrl = '/users'
export const userUrl = (userId: string | number) => `/users/${userId}`