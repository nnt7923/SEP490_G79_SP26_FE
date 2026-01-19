type User = {
       id: number
       username: string
       name: string
       email?: string
}

const STORAGE_KEY = 'mock_auth'

const mockUsers: Array<{ id: number; username: string; password: string; name: string; email?: string }> = [
       { id: 1, username: 'user', password: 'password', name: 'Demo User', email: 'user@example.com' },
       { id: 2, username: 'admin', password: 'admin', name: 'Administrator', email: 'admin@example.com' },
]

export async function login(username: string, password: string): Promise<{ user: User; token: string }> {
       await new Promise((r) => setTimeout(r, 300))

       const found = mockUsers.find((u) => u.username === username && u.password === password)
       if (!found) {
              return Promise.reject(new Error('Invalid username or password'))
       }

       const token = `mock-token-${found.id}-${Date.now()}`
       const user: User = { id: found.id, username: found.username, name: found.name, email: found.email }

       const payload = { token, user }
       try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
       } catch (e) {
              // ignore storage errors
       }

       return { user, token }
}

export function logout() {
       try {
              localStorage.removeItem(STORAGE_KEY)
       } catch (e) {
              // ignore
       }
}

export function getStoredAuth(): { user: User; token: string } | null {
       try {
              const raw = localStorage.getItem(STORAGE_KEY)
              if (!raw) return null
              return JSON.parse(raw)
       } catch (e) {
              return null
       }
}

export function isAuthenticated(): boolean {
       return getStoredAuth() !== null
}

export default { login, logout, getStoredAuth, isAuthenticated }
