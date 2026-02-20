import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER_META from '../../../router/ROUTER_META'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { getStudentSidebarConfig } from './components/StudentSideBar'
import { LogOut, Settings, HelpCircle } from 'lucide-react'

const StudentIndex: React.FC = () => {
  const { user, logout } = useAuthStore()
  const displayName = user?.name || user?.username || 'Student'
  // Robust role handling: backend may return role as string or object
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name ?? '—'
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate(ROUTER.LOGIN)
  }

  const handleSettings = () => {
    navigate(ROUTER.PROFILE)
  }

  const sidebarConfig = {
    navItems: getStudentSidebarConfig(),
    actions: [
      {
        label: 'Settings',
        icon: <Settings className="w-5 h-5" />,
        onClick: handleSettings,
      },
      {
        label: 'Help',
        icon: <HelpCircle className="w-5 h-5" />,
        onClick: () => {
          console.log('Help clicked')
        },
      },
      {
        label: 'Logout',
        icon: <LogOut className="w-5 h-5" />,
        onClick: handleLogout,
        variant: 'danger' as const,
      },
    ],
    brand: {
      name: 'Dashboard',
      subtitle: 'Learning',
    },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold mb-3">{ROUTER_META[ROUTER.STUDENT_DASHBOARD]?.title || 'Dashboard'}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(ROUTER.HOME)}
              className="px-3 py-2 rounded-md border border-gray-200 bg-white text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back Home
            </button>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-6">Hello, {displayName}! This is the basic Student dashboard.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <section className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900">
            <h2 className="text-lg font-medium mb-2">Profile Summary</h2>
            <ul className="m-0 pl-4 text-sm text-gray-700 dark:text-gray-300">
              <li>Name: {user?.name ?? '—'}</li>
              <li>Username: {user?.username ?? '—'}</li>
              <li>Email: {user?.email ?? '—'}</li>
              <li>Role: {roleName}</li>
            </ul>
          </section>

          <section className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900">
            <h2 className="text-lg font-medium mb-2">Upcoming Classes</h2>
            <p className="text-sm text-gray-500">No data yet. Coming soon.</p>
          </section>

          <section className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900">
            <h2 className="text-lg font-medium mb-2">Study Progress</h2>
            <p className="text-sm text-gray-500">Updating. You will see statistics here.</p>
          </section>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-medium mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <a href="#" className="inline-block px-3 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Enroll in class</a>
            <a href="#" className="inline-block px-3 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">View schedule</a>
            <a href="#" className="inline-block px-3 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Update profile</a>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default StudentIndex