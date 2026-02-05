import React, { createContext, useContext } from 'react'
import useAuthStore from '../store/useAuthStore'

// Context type dùng theo store thực tế
type AuthContextValue = {
  user: ReturnType<typeof useAuthStore>['user']
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useAuthStore()

  // Gọi API thật qua store, không dùng mock/getStoredAuth
  const login = async (username: string, password: string) => {
    const res = await store.login(username, password)
    if (!res.isOk) throw new Error(res.msg || 'Đăng nhập thất bại.')
  }

  const logout = () => {
    store.logout()
  }

  return <AuthContext.Provider value={{ user: store.user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
