import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../../../../components/Layout'
import { getAdminSidebarConfig } from '../components/AdminSideBar'
import { UserService } from '../../../../services'
import { Search, RefreshCw, ChevronDown, Mail, Calendar, Shield } from 'lucide-react'

const AdminUsersPage: React.FC = () => {
  const sidebarConfig = useMemo(() => ({
    navItems: getAdminSidebarConfig(),
    actions: [],
    brand: { name: 'Users', subtitle: 'Admin' },
  }), [])

  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const unwrapUsers = (raw: any): any[] => {
    const value = raw?.data ?? raw
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.items)) return value.items
    if (Array.isArray(value?.results)) return value.results
    if (Array.isArray(value?.records)) return value.records
    return []
  }

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await UserService.listUsers()
      const list = unwrapUsers(data)
      setUsers(list)
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load users'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const name = (u?.name || `${u?.firstName || ''} ${u?.lastName || ''}` || '').toLowerCase()
      const email = (u?.email || '').toLowerCase()
      const username = (u?.username || '').toLowerCase()
      const role = (u?.role?.name || u?.roleName || '').toLowerCase()
      return name.includes(q) || email.includes(q) || username.includes(q) || role.includes(q)
    })
  }, [users, query])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleColor = (role: string) => {
    const normalized = role?.toLowerCase() || ''
    if (normalized === 'admin') return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }
    if (normalized === 'mentor') return { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' }
    return { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' }
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#111827]">Users</h1>
              <p className="text-[#6b7280] mt-1">Manage system users and permissions</p>
            </div>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#2f80ed] to-[#7c3aed] text-white text-sm font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-60 cursor-pointer"
              title="Reload"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Reload
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, username, email, or role..."
            className="pl-11 pr-4 py-3 w-full rounded-lg border border-[#e5e7eb] bg-white focus:outline-none focus:ring-2 focus:ring-[#2f80ed] focus:border-transparent transition-all"
          />
        </div>

        {/* Error Message */}
        {error ? (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 text-red-700 p-4 text-sm flex items-start gap-3">
            <div className="w-1 h-1 rounded-full bg-red-700 mt-2 flex-shrink-0"></div>
            <span>{error}</span>
          </div>
        ) : null}

        {/* Users List */}
        <div className="space-y-3">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-[#6b7280]">
                <div className="w-4 h-4 rounded-full border-2 border-[#2f80ed] border-t-transparent animate-spin"></div>
                <span>Loading users...</span>
              </div>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-[#e5e7eb]">
              <p className="text-[#6b7280]">No users found</p>
            </div>
          )}

          {!loading && filtered.map((u) => {
            const name = u?.name || [u?.firstName, u?.lastName].filter(Boolean).join(' ') || '—'
            const role = u?.role?.name || u?.roleName || '—'
            const isExpanded = expandedId === u?.id
            const roleColor = getRoleColor(role)

            return (
              <div
                key={u?.id ?? u?.userId}
                className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden hover:shadow-md transition-all duration-200"
              >
                {/* Main Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : u?.id)}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-[#f9fafb] transition-colors text-left cursor-pointer"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2f80ed] to-[#7c3aed] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">{getInitials(name)}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#111827] truncate">{name}</p>
                    <p className="text-sm text-[#6b7280] truncate">{u?.email ?? '—'}</p>
                  </div>

                  {/* Role Badge */}
                  <div
                    className="px-3 py-1 rounded-full text-xs font-medium flex-shrink-0"
                    style={{
                      backgroundColor: roleColor.bg,
                      color: roleColor.text,
                      borderColor: roleColor.border,
                      border: `1px solid ${roleColor.border}`,
                    }}
                  >
                    {role}
                  </div>

                  {/* Expand Icon */}
                  <ChevronDown
                    size={20}
                    className={`text-[#9ca3af] flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-[#e5e7eb] bg-[#f9fafb] px-6 py-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Username */}
                      <div>
                        <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Username</p>
                        <p className="text-sm text-[#111827]">{u?.username ?? '—'}</p>
                      </div>

                      {/* Email */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Mail size={14} className="text-[#6b7280]" />
                          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Email</p>
                        </div>
                        <p className="text-sm text-[#111827]">{u?.email ?? '—'}</p>
                      </div>

                      {/* Created Date */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar size={14} className="text-[#6b7280]" />
                          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Created</p>
                        </div>
                        <p className="text-sm text-[#111827]">
                          {u?.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </p>
                      </div>

                      {/* Last Login */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Shield size={14} className="text-[#6b7280]" />
                          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Last Login</p>
                        </div>
                        <p className="text-sm text-[#111827]">
                          {u?.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                        </p>
                      </div>

                      {/* Status */}
                      <div>
                        <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Status</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${u?.isActive !== false ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}></div>
                          <span className="text-sm text-[#111827]">{u?.isActive !== false ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>

                      {/* First Name */}
                      <div>
                        <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-1">First Name</p>
                        <p className="text-sm text-[#111827]">{u?.firstName ?? '—'}</p>
                      </div>

                      {/* Last Name */}
                      <div>
                        <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Last Name</p>
                        <p className="text-sm text-[#111827]">{u?.lastName ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary */}
        {!loading && filtered.length > 0 && (
          <div className="mt-6 text-sm text-[#6b7280]">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>
    </Layout>
  )
}

export default AdminUsersPage