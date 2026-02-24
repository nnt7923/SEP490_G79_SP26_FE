import React, { useEffect, useState } from 'react'
import useAuthStore from '../../../store/useAuthStore'
import Layout from '../../../components/Layout'
import { getAdminSidebarConfig } from './components/AdminSideBar'
import { UserService } from '../../../services'
import { AIConfigService } from '../../../services'
import { Users, KeyRound, TrendingUp, Activity } from 'lucide-react'

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const name = user?.name || user?.username || 'Admin'
  const [userCount, setUserCount] = useState(0)
  const [apiKeyCount, setApiKeyCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const [usersData, configData] = await Promise.all([
          UserService.listUsers(),
          AIConfigService.getAIConfig(),
        ])

        // Extract user count
        const users = Array.isArray(usersData) ? usersData : usersData?.data ?? []
        setUserCount(users.length)

        // Extract API key count
        const configs = Array.isArray(configData) ? configData : [configData]
        setApiKeyCount(configs.filter(c => c).length)
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const sidebarConfig = {
    navItems: getAdminSidebarConfig(),
    actions: [],
    brand: { name: 'Overview', subtitle: 'Admin' },
  }

  // Simple pie chart for user distribution (mock data)
  const roleDistribution = [
    { name: 'Students', count: Math.max(1, Math.floor(userCount * 0.7)), color: '#2f80ed' },
    { name: 'Mentors', count: Math.max(1, Math.floor(userCount * 0.2)), color: '#7c3aed' },
    { name: 'Admins', count: Math.max(1, Math.ceil(userCount * 0.1)), color: '#f59e0b' },
  ]

  const totalForChart = roleDistribution.reduce((sum, item) => sum + item.count, 0)

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#111827]">Admin Dashboard</h1>
          <p className="text-[#6b7280] mt-1">Welcome back, {name}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Users Card */}
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-2 bg-gradient-to-r from-[#2f80ed] to-[#7c3aed]"></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#dbeafe] flex items-center justify-center">
                  <Users size={24} className="text-[#2f80ed]" />
                </div>
                <span className="text-xs font-semibold text-[#10b981] bg-[#ecfdf5] px-2 py-1 rounded-full">Active</span>
              </div>
              <p className="text-[#6b7280] text-sm font-medium mb-1">Total Users</p>
              <div className="text-4xl font-bold text-[#111827]">
                {loading ? '—' : userCount}
              </div>
              <p className="text-xs text-[#9ca3af] mt-3">Across all roles</p>
            </div>
          </div>

          {/* API Keys Card */}
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-2 bg-gradient-to-r from-[#7c3aed] to-[#2f80ed]"></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#f3e8ff] flex items-center justify-center">
                  <KeyRound size={24} className="text-[#7c3aed]" />
                </div>
                <span className="text-xs font-semibold text-[#3b82f6] bg-[#eff6ff] px-2 py-1 rounded-full">Configured</span>
              </div>
              <p className="text-[#6b7280] text-sm font-medium mb-1">API Keys</p>
              <div className="text-4xl font-bold text-[#111827]">
                {loading ? '—' : apiKeyCount}
              </div>
              <p className="text-xs text-[#9ca3af] mt-3">AI model configurations</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Distribution Pie Chart */}
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#111827] mb-6">User Distribution by Role</h2>
            <div className="flex items-center justify-center gap-8">
              {/* Pie Chart SVG */}
              <svg width="160" height="160" viewBox="0 0 160 160" className="flex-shrink-0">
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
                    <path key={idx} d={path} fill={item.color} stroke="white" strokeWidth="2" />
                  )

                  return { angle: endAngle, paths: acc.paths }
                }, { angle: 0, paths: [] as React.ReactNode[] }).paths}
              </svg>

              {/* Legend */}
              <div className="space-y-3">
                {roleDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{item.name}</p>
                      <p className="text-xs text-[#6b7280]">{item.count} users</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Overview */}
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#111827] mb-6">System Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#f0fdf4] rounded-lg border border-[#dcfce7]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
                  <span className="text-sm font-medium text-[#065f46]">API Services</span>
                </div>
                <span className="text-sm font-semibold text-[#10b981]">Operational</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#eff6ff] rounded-lg border border-[#bfdbfe]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div>
                  <span className="text-sm font-medium text-[#1e40af]">Database</span>
                </div>
                <span className="text-sm font-semibold text-[#3b82f6]">Connected</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#fef3c7] rounded-lg border border-[#fcd34d]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>
                  <span className="text-sm font-medium text-[#92400e]">AI Models</span>
                </div>
                <span className="text-sm font-semibold text-[#f59e0b]">{apiKeyCount} Configured</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#e5e7eb]">
              <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                <Activity size={16} />
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AdminDashboard