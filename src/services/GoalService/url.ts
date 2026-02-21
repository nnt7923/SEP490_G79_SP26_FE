export const basePath = '/goals'
export const listGoalsUrl = `${basePath}`
export const createGoalUrl = `${basePath}`
export const goalUrl = (id: string | number) => `${basePath}/${id}`