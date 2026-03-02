export const basePath = '/goals'
export const listGoalsUrl = `${basePath}`
export const myGoalsUrl = `${basePath}/me`
export const createGoalUrl = `${basePath}`
export const goalUrl = (id: string | number) => `${basePath}/${id}`
export const userGoalsUrl = (userId: string | number) => `/users/${userId}/goals`

// Mock goals data - in a real app, this would come from the backend
export const mockGoals = [
       {
              goalId: '3ac20000-3e79-fa16-838f-08de73b44ba4',
              title: 'zero work',
              description: null,
              durationDays: 0,
              isCompleted: false,
              completedAt: null,
              createdAt: '2026-02-24T06:52:13.3569456',
       },
       {
              goalId: '3ac20000-3e79-fa16-0ea6-08de73b43f4d',
              title: 'Zero to work',
              description: null,
              durationDays: 0,
              isCompleted: false,
              completedAt: null,
              createdAt: '2026-02-24T06:51:52.6512654',
       },
       {
              goalId: '3ac20000-3e79-fa16-d173-08de72249743',
              title: 'Zero to Hero',
              description: null,
              durationDays: 30,
              isCompleted: false,
              completedAt: null,
              createdAt: '2026-02-22T07:11:01.5382403',
       },
       {
              goalId: '3ac20000-3e79-fa16-0056-08de721a1ec9',
              title: 'Tester',
              description: null,
              durationDays: 30,
              isCompleted: false,
              completedAt: null,
              createdAt: '2026-02-22T05:56:04.4395837',
       },
]