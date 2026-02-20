import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import Layout from '../../../components/Layout'
import { getAdminSidebarConfig } from './components/AdminSideBar'

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const name = user?.name || user?.username || 'Admin'
  const role = user?.role?.name || 'Admin'

  const sidebarConfig = {
    navItems: getAdminSidebarConfig(),
    actions: [
      { label: 'Settings', icon: <></>, onClick: () => {} },
    ],
    brand: { name: 'Overview', subtitle: 'Admin' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome, {name} ({role})</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="font-medium mb-1">Users</h2>
            <p className="text-sm text-gray-500">Manage users, roles and permissions.</p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="font-medium mb-1">Content</h2>
            <p className="text-sm text-gray-500">Review generated lessons and chapters.</p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="font-medium mb-1">System</h2>
            <p className="text-sm text-gray-500">Monitor system health and logs.</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AdminDashboard