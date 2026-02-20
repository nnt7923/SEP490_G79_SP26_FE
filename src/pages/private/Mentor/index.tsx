import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import Layout from '../../../components/Layout'
import { getMentorSidebarConfig } from './components/MentorSideBar'

const MentorDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const name = user?.name || user?.username || 'Mentor'
  const role = user?.role?.name || 'Mentor'

  const sidebarConfig = {
    navItems: getMentorSidebarConfig(),
    actions: [
      { label: 'Profile', icon: <></>, onClick: () => {} },
    ],
    brand: { name: 'Overview', subtitle: 'Mentor' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Mentor Dashboard</h1>
        <p className="text-gray-600">Welcome, {name} ({role})</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h2 className="font-medium mb-1">My Lessons</h2>
            <p className="text-sm text-gray-500">Track lessons and provide feedback.</p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="font-medium mb-1">Students</h2>
            <p className="text-sm text-gray-500">Review student progress and submissions.</p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="font-medium mb-1">Resources</h2>
            <p className="text-sm text-gray-500">Manage learning resources and notes.</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default MentorDashboard