
import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../../../../components/Layout'
import { getAdminSidebarConfig } from '../components/AdminSideBar'
import { UserService } from '../../../../services'
import { Search, RefreshCw, Ban, CheckCircle } from 'lucide-react'
import { formatDateTimeVN } from '../../../../utils/dateUtils'

const AdminUsersPage: React.FC = () => {
  const sidebarConfig = useMemo(() => ({
    navItems: getAdminSidebarConfig() as any,
    actions: [],
    brand: { name: 'Users', subtitle: 'Admin' },
  }), [])

  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>('all')

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

  const handleBanUser = async (userId: string, currentlyBanned: boolean) => {
    setActionLoading(userId)
    try {
      if (currentlyBanned) {
        await UserService.unbanUser(userId)
        setToast({ message: 'User unbanned successfully', type: 'success' })
      } else {
        await UserService.banUser(userId)
        setToast({ message: 'User banned successfully', type: 'success' })
      }
      // Refresh users list
      await fetchUsers()
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to update user status'
      setToast({ message: msg, type: 'error' })
    } finally {
      setActionLoading(null)
      setTimeout(() => setToast(null), 3000)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = users
    
    // Filter by role
    if (roleFilter !== 'all') {
      result = result.filter((u) => {
        const role = (u?.role?.name || u?.roleName || '').toLowerCase()
        return role === roleFilter.toLowerCase()
      })
    }
    
    // Filter by search query
    if (q) {
      result = result.filter((u) => {
        const name = (u?.name || `${u?.firstName || ''} ${u?.lastName || ''}` || '').toLowerCase()
        const email = (u?.email || '').toLowerCase()
        const username = (u?.username || '').toLowerCase()
        const role = (u?.role?.name || u?.roleName || '').toLowerCase()
        return name.includes(q) || email.includes(q) || username.includes(q) || role.includes(q)
      })
    }
    
    return result
  }, [users, query, roleFilter])

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
    if (normalized === 'admin') return { bg: 'var(--bg-surface-short)', text: 'var(--color-hex-83)', border: 'var(--color-hex-83)' }
    if (normalized === 'mentor') return { bg: 'var(--bg-surface-short)', text: 'var(--color-hex-84)', border: 'var(--color-hex-84)' }
    return { bg: 'var(--bg-surface-short)', text: 'var(--color-hex-47)', border: 'var(--color-hex-47)' }
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-8 bg-[var(--gray-100)] min-h-screen font-mono">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6 border-b border-gray-300 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 border-none bg-transparent">
                  <span className="text-blue-600 mr-2">{'>_'}</span>
                  admin_users
                </h1>
                <p className="text-gray-500 mt-2">
                  <span className="text-gray-400 mr-2">{'//'}</span>
                  manage users and permissions
                </p>
              </div>
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 bg-white text-blue-600 text-sm font-bold hover:bg-blue-50 transition-colors cursor-pointer"
                title="Reload"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                [ reload ]
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6 relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="grep 'name|username|email|role'..."
              className="pl-11 pr-4 py-3 w-full bg-white border border-gray-400 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
            />
          </div>

         {/* Role Filter */}
         <div className="mb-6 flex items-center gap-3">
           <span className="text-sm font-bold text-gray-500">filter_by:</span>
           <div className="flex gap-2">
             {['all', 'Student', 'Mentor', 'Admin'].map((role) => (
               <button
                 key={role}
                 onClick={() => setRoleFilter(role)}
                 className={`px-3 py-1 text-sm font-bold transition-colors border cursor-pointer ${
                   roleFilter === role
                     ? 'bg-blue-600 text-white border-blue-600'
                     : 'bg-white text-gray-600 border-gray-400 hover:border-gray-600'
                 }`}
               >
                 {role === 'all' ? '[ * ]' : `[ ${role.toLowerCase()} ]`}
               </button>
             ))}
           </div>
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
               <div className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                 <div className="w-4 h-4 rounded-full border-2 border-[var(--color-hex-48)] border-t-transparent animate-spin"></div>
                 <span>Loading users...</span>
               </div>
             </div>
           )}

           {!loading && filtered.length === 0 && (
             <div className="text-center py-12 bg-white rounded-lg border border-[var(--gray-200)]">
               <p className="text-[var(--text-secondary)]">No users found</p>
             </div>
           )}

           {!loading && filtered.map((u) => {
              const name = u?.name || [u?.firstName, u?.lastName].filter(Boolean).join(' ') || '—'
              const role = u?.role?.name || u?.roleName || '—'
              const uid = String(u?.id ?? u?.userId ?? u?.username ?? u?.email ?? '')
              const isExpanded = expandedId === uid
              const roleColor = getRoleColor(role)

              return (
                <div
                  key={uid}
                  className="bg-white border border-gray-400 transition-colors"
                >
                  {/* Main Row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : uid)}
                    className="w-full px-4 py-3 flex flex-wrap items-center gap-4 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                  >
                   {/* Avatar */}
                   <div className="flex-shrink-0">
                     <span className="text-gray-900 font-bold text-sm">[{getInitials(name)}]</span>
                   </div>

                   {/* Info */}
                   <div className="flex-1 min-w-0">
                     <p className="font-bold text-gray-900 truncate">{name}</p>
                     <p className="text-xs text-gray-500 truncate">{u?.email ?? '—'}</p>
                   </div>

                   {/* Role Badge */}
                   <div
                     className="px-2 py-0.5 text-xs font-bold flex-shrink-0"
                     style={{
                       color: roleColor.text,
                       border: `1px solid ${roleColor.border}`,
                     }}
                   >
                     [{role.toLowerCase()}]
                   </div>

                   {/* Banned Badge */}
                   {u?.status?.toLowerCase() === 'banned' && (
                     <div className="px-2 py-0.5 text-xs font-bold flex-shrink-0 bg-red-50 text-red-700 border border-red-300">
                       [banned]
                     </div>
                   )}

                   {/* Expand Icon */}
                   <div className="text-gray-500 font-bold text-sm w-12 text-right flex-shrink-0">
                     {isExpanded ? '[-]' : '[+]'}
                   </div>
                 </button>

                 {/* Expanded Details */}
                 {isExpanded && (
                   <div className="border-t border-gray-300 bg-gray-50 px-4 py-4 space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                       {/* Username */}
                       <div>
                         <p className="text-xs font-bold text-gray-500 lowercase">username:</p>
                         <p className="text-sm text-gray-900">{u?.username ?? '—'}</p>
                       </div>

                       {/* Email */}
                       <div>
                         <p className="text-xs font-bold text-gray-500 lowercase">email_address:</p>
                         <p className="text-sm text-gray-900">{u?.email ?? '—'}</p>
                       </div>

                       {/* Created Date */}
                       <div>
                         <p className="text-xs font-bold text-gray-500 lowercase">created_at:</p>
                         <p className="text-sm text-gray-900">
                           {u?.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                         </p>
                       </div>

                       {/* Last Login */}
                       <div>
                         <p className="text-xs font-bold text-gray-500 lowercase">last_login:</p>
                         <p className="text-sm text-gray-900">
                           {u?.lastLogin ? formatDateTimeVN(u.lastLogin) : 'Never'}
                         </p>
                       </div>

                       {/* Status */}
                       <div>
                         <p className="text-xs font-bold text-gray-500 lowercase">status:</p>
                         <div className="flex items-center gap-2">
                           <span className="text-sm font-bold text-gray-900">
                             [{u?.status?.toLowerCase() || 'active'}]
                           </span>
                         </div>
                       </div>

                       {/* First Name */}
                       <div>
                         <p className="text-xs font-bold text-gray-500 lowercase">first_name:</p>
                         <p className="text-sm text-gray-900">{u?.firstName ?? '—'}</p>
                       </div>

                       {/* Last Name */}
                       <div>
                         <p className="text-xs font-bold text-gray-500 lowercase">last_name:</p>
                         <p className="text-sm text-gray-900">{u?.lastName ?? '—'}</p>
                       </div>
                     </div>

                     {/* Action Buttons */}
                     <div className="pt-4 border-t border-gray-300 flex gap-3">
                       {u?.status?.toLowerCase() === 'banned' ? (
                         <button
                           onClick={() => handleBanUser(uid, true)}
                           disabled={actionLoading === uid}
                           className="flex items-center gap-2 px-3 py-1.5 border border-green-600 text-green-700 bg-white hover:bg-green-50 text-sm font-bold transition-colors disabled:opacity-60 cursor-pointer"
                         >
                           {actionLoading === uid ? '[ unbanning... ]' : '[ unban ]'}
                         </button>
                       ) : (
                         <button
                           onClick={() => handleBanUser(uid, false)}
                           disabled={actionLoading === uid}
                           className="flex items-center gap-2 px-3 py-1.5 border border-red-600 text-red-700 bg-white hover:bg-red-50 text-sm font-bold transition-colors disabled:opacity-60 cursor-pointer"
                         >
                           {actionLoading === uid ? '[ banning... ]' : '[ ban ]'}
                         </button>
                       )}
                     </div>
                   </div>
                 )}
               </div>
             )
           })}
         </div>

          {/* Summary */}
          {!loading && filtered.length > 0 && (
            <div className="mt-6 text-sm text-gray-500 font-bold">
              [showing: {filtered.length}/{users.length}]
            </div>
          )}

          {/* Toast Notification */}
          {toast && (
            <div className="fixed top-4 right-4 z-[9999] animate-slide-in-right">
              <div className={`flex items-center gap-3 px-4 py-3 border shadow-none font-mono min-w-[300px] max-w-md ${
                toast.type === 'success' 
                  ? 'bg-green-50 border-green-600 text-green-800' 
                  : 'bg-red-50 border-red-600 text-red-800'
              }`}>
                {toast.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Ban className="w-5 h-5 text-red-600" />
                )}
                <p className="flex-1 text-sm font-bold">{toast.message}</p>
                <button
                  onClick={() => setToast(null)}
                  className="text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <span className="font-bold">[x]</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default AdminUsersPage