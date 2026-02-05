import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import ROUTER from '../../router/ROUTER'
import useAuthStore from '../../store/useAuthStore'

const ProtectedRoute: React.FC<{ role?: string }> = ({ role }) => {
  const { token, user } = useAuthStore()

  if (!token) {
    return <Navigate to={ROUTER.LOGIN} replace />
  }

  if (role && (user as any)?.role?.name !== role) {
    return <Navigate to={ROUTER.HOME} replace />
  }

  return <Outlet />
}

export default ProtectedRoute