import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import ROUTER from '../../router/ROUTER'
import useAuthStore from '../../store/useAuthStore'

const ProtectedRoute: React.FC<{ role?: string }> = ({ role }) => {
  const { token, user } = useAuthStore()

  if (!token) {
    return <Navigate to={ROUTER.LOGIN} replace />
  }

  if (role) {
    const actual = String((user as any)?.role?.name || '').toLowerCase()
    const expected = String(role).toLowerCase()
    if (actual !== expected) {
      return <Navigate to={ROUTER.HOME} replace />
    }
  }

  return <Outlet />
}

export default ProtectedRoute