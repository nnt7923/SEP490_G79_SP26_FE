import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../../../../components/Layout'
import { getAdminSidebarConfig } from '../components/AdminSideBar'
import { UserService } from '../../../../services'
import { Search, RefreshCw } from 'lucide-react'

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

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Users</h1>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-50 disabled:opacity-60"
            title="Reload"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Reload
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, username, email, or role"
            className="pl-9 pr-3 py-2 w-full rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error ? (
          <div className="rounded-md border border-red-300 bg-red-50 text-red-700 p-3 text-sm">{error}</div>
        ) : null}

        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Username</th>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">Loading users...</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">No users found</td>
                </tr>
              )}
              {!loading && filtered.map((u) => {
                const name = u?.name || [u?.firstName, u?.lastName].filter(Boolean).join(' ') || '—'
                const role = u?.role?.name || u?.roleName || '—'
                return (
                  <tr key={u?.id ?? u?.userId} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{name}</td>
                    <td className="px-4 py-2">{u?.username ?? '—'}</td>
                    <td className="px-4 py-2">{u?.email ?? '—'}</td>
                    <td className="px-4 py-2">{role}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}

export default AdminUsersPage