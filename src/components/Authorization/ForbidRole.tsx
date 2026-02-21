import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore'
import ROUTER from '../../router/ROUTER'

export type ForbidRoleProps = {
  forbid: string | string[]
}

const ForbidRole: React.FC<ForbidRoleProps> = ({ forbid }) => {
  const { user } = useAuthStore()
  const roleName = String((user as any)?.role?.name || '').trim().toLowerCase()
  const forbidden = Array.isArray(forbid)
    ? forbid.map((r) => String(r).trim().toLowerCase())
    : [String(forbid).trim().toLowerCase()]

  if (roleName && forbidden.includes(roleName)) {
    return <Navigate to={ROUTER.HOME} replace />
  }

  // Allow access: render nested child routes
  return <Outlet />
}

export default ForbidRole