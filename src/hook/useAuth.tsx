import React, { createContext, useContext, useState, useEffect } from 'react'
import * as AuthService from '../services/AuthService'

type User = {
  id: number
  username: string
  name: string
  email?: string
}

type AuthContextValue = {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const stored = AuthService.getStoredAuth()
    if (stored) setUser(stored.user)
  }, [])

  const login = async (username: string, password: string) => {
    const { user } = await AuthService.login(username, password)
    setUser(user)
  }

  const logout = () => {
    AuthService.logout()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
