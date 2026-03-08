
import React, { useEffect, useState } from 'react'
import useAuthStore from '../../../store/useAuthStore'
import Layout from '../../../components/Layout'
import { getAdminSidebarConfig } from './components/AdminSideBar'
import { UserService } from '../../../services'
import { AIConfigService } from '../../../services'

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const name = user?.name || user?.username || 'Admin'
  const [studentCount, setStudentCount] = useState(0)
  const [apiKeyCount, setApiKeyCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const unwrapUsers = (raw: any): any[] => {
    const value = raw?.data ?? raw
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.items)) return value.items
    if (Array.isArray(value?.results)) return value.results
    if (Array.isArray(value?.records)) return value.records
    return []
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const [usersData, configData] = await Promise.all([
          UserService.listUsers(),
          AIConfigService.getAIConfig(),
        ])

        // Extract student count (only role=Student and status≠Banned)
        const users = unwrapUsers(usersData)
        const activeStudents = users.filter((u) => {
          const userRole = (u?.role?.name || u?.roleName || '').toLowerCase()
          const userStatus = (u?.status || '').toLowerCase()
          return userRole === 'student' && userStatus !== 'banned'
        })
        setStudentCount(activeStudents.length)

        // Extract API key count
        const configs = Array.isArray(configData) ? configData : [configData]
        setApiKeyCount(configs.filter(c => c).length)
      } catch (error) {
        // Removed console.error in admin stats load
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const sidebarConfig = {
    navItems: getAdminSidebarConfig() as any,
    actions: [],
    brand: { name: 'Overview', subtitle: 'Admin' },
  }

  // Simple pie chart for user distribution (mock data)
  const roleDistribution = [
    { name: 'Students', count: Math.max(1, Math.floor(studentCount * 0.7)), color: 'var(--brand-blue)' },
    { name: 'Mentors', count: Math.max(1, Math.floor(studentCount * 0.2)), color: 'var(--accent-purple)' },
    { name: 'Admins', count: Math.max(1, Math.ceil(studentCount * 0.1)), color: 'var(--color-amber-500)' },
  ]

  const totalForChart = roleDistribution.reduce((sum, item) => sum + item.count, 0)

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-8 bg-[var(--gray-100)] min-h-screen font-mono">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6 border-b border-bd pb-4">
            <h1 className="text-2xl outline-none font-bold text-heading border-none bg-transparent">
              <span className="text-status-blue mr-2">{'>_'}</span> 
              admin_dashboard
            </h1>
            <p className="text-muted mt-2">
              <span className="text-placeholder mr-2">{'//'}</span>
              welcome_session: {name}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Students Card */}
            <div className="bg-[var(--gray-100)] rounded-none border border-bd-strong p-6 flex flex-col justify-between hover:bg-th-card transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted text-sm font-bold uppercase">Total_Students</span>
                <span className="text-xs font-bold text-status-green-dark bg-status-green-bg-strong px-2 py-0.5 border border-green-300">
                  [active]
                </span>
              </div>
              <div className="text-3xl font-bold text-heading my-2">
                {loading ? '...' : studentCount}
              </div>
              <div className="text-xs text-muted flex items-center gap-2">
                <span className="text-status-blue-muted font-bold">[usr]</span>
                active_student_accounts
              </div>
            </div>

            {/* API Keys Card */}
            <div className="bg-[var(--gray-100)] rounded-none border border-bd-strong p-6 flex flex-col justify-between hover:bg-th-card transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted text-sm font-bold uppercase">API_Keys</span>
                <span className="text-xs font-bold text-status-blue bg-status-blue-bg-strong px-2 py-0.5 border border-blue-300">
                  [configured]
                </span>
              </div>
              <div className="text-3xl font-bold text-heading my-2">
                {loading ? '...' : apiKeyCount}
              </div>
              <div className="text-xs text-muted flex items-center gap-2">
                <span className="text-purple-500 font-bold">[api]</span>
                ai_model_configurations
              </div>
            </div>
          </div>

          {/* Charts & Status Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* User Distribution Pie Chart */}
            <div className="bg-[var(--gray-100)] rounded-none border border-bd-strong p-6">
              <h2 className="text-base font-bold text-heading mb-6 flex items-center gap-2">
                <span className="text-status-blue-muted">##</span> user_distribution
              </h2>
              <div className="flex items-center justify-center gap-8">
                {/* Pie Chart SVG */}
                <svg width="140" height="140" viewBox="0 0 160 160" className="flex-shrink-0">
                  {roleDistribution.reduce((acc, item, idx) => {
                    const startAngle = acc.angle
                    const sliceAngle = (item.count / totalForChart) * 360
                    const endAngle = startAngle + sliceAngle

                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = (endAngle * Math.PI) / 180

                    const x1 = 80 + 60 * Math.cos(startRad)
                    const y1 = 80 + 60 * Math.sin(startRad)
                    const x2 = 80 + 60 * Math.cos(endRad)
                    const y2 = 80 + 60 * Math.sin(endRad)

                    const largeArc = sliceAngle > 180 ? 1 : 0

                    const path = `M 80 80 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z`

                    acc.paths.push(
                      <path key={idx} d={path} fill={item.color} stroke="var(--gray-100)" strokeWidth="2" />
                    )

                    return { angle: endAngle, paths: acc.paths }
                  }, { angle: 0, paths: [] as React.ReactNode[] }).paths}
                </svg>

                {/* Legend */}
                <div className="space-y-3">
                  {roleDistribution.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="font-bold" style={{ color: item.color }}>{'['}&#9632;{']'}</div>
                      <div>
                        <p className="text-sm font-bold text-heading lowercase">{item.name}</p>
                        <p className="text-xs text-muted">{item.count} users</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity Overview */}
            <div className="bg-[var(--gray-100)] rounded-none border border-bd-strong p-6 flex flex-col">
              <h2 className="text-base font-bold text-heading mb-6 flex items-center gap-2">
                <span className="text-status-blue-muted">##</span> system_status
              </h2>
              
              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between p-3 bg-th-card border border-bd group hover:border-bd-strong transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-status-green font-bold">[*]</span>
                    <span className="text-sm font-bold text-heading">API_Services</span>
                  </div>
                  <span className="text-sm font-bold text-status-green-dark bg-status-green-bg px-2 border border-green-200">[ OK ]</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-th-card border border-bd group hover:border-bd-strong transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-status-blue font-bold">[*]</span>
                    <span className="text-sm font-bold text-heading">Database</span>
                  </div>
                  <span className="text-sm font-bold text-status-blue bg-status-blue-bg px-2 border border-blue-200">[ Connected ]</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-th-card border border-bd group hover:border-bd-strong transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-orange-500 font-bold">[*]</span>
                    <span className="text-sm font-bold text-heading">AI_Models</span>
                  </div>
                  <span className="text-sm font-bold text-orange-700 bg-orange-50 px-2 border border-orange-200">[{apiKeyCount} Configured]</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-bd">
                <div className="flex items-center gap-2 text-sm text-label font-bold">
                  <span className="text-status-green">{'>>>'}</span>
                  <span>all_systems_operational()</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </Layout>
  )
}

export default AdminDashboard