import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore'
import ROUTER from '../../router/ROUTER'

export type RequireRoleProps = {
  role: string | string[]
}

const RequireRole: React.FC<RequireRoleProps> = ({ role }) => {
  const { user } = useAuthStore()
  const userRole = String((user as any)?.role?.name || '').trim().toLowerCase()
  
  const allowedRoles = Array.isArray(role)
    ? role.map((r) => String(r).trim().toLowerCase())
    : [String(role).trim().toLowerCase()]

  // If user doesn't have one of the allowed roles, redirect based on their actual role
  if (!userRole || !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on user's role
    if (userRole === 'admin') {
      return <Navigate to={ROUTER.ADMIN_DASHBOARD} replace />
    } else if (userRole === 'mentor') {
      return <Navigate to={ROUTER.MENTOR_DASHBOARD} replace />
    } else {
      return <Navigate to={ROUTER.STUDENT_DASHBOARD} replace />
    }
  }

  // User has correct role, allow access
  return <Outlet />
}

export default RequireRole
