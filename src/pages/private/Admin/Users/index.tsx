
import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../../../../components/Layout'
import { getAdminSidebarConfig } from '../components/AdminSideBar'
import { UserService } from '../../../../services'
import { Search, RefreshCw, ChevronDown, Mail, Calendar, Shield, Ban, CheckCircle } from 'lucide-react'
import { formatDateTimeVN } from '../../../../utils/dateUtils'

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
    if (normalized === 'admin') return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }
    if (normalized === 'mentor') return { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' }
    return { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' }
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-6 bg-[#F8FAFC] min-h-screen max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]">Users</h1>
              <p className="text-[#64748B] mt-1">Manage system users and permissions</p>
            </div>
             <button
               onClick={fetchUsers}
               disabled={loading}
               className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#2563EB] hover:shadow-lg transition-all duration-200 disabled:opacity-60 cursor-pointer"
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

         {/* Role Filter */}
         <div className="mb-6 flex items-center gap-3">
           <span className="text-sm font-medium text-[#64748B]">Filter by role:</span>
           <div className="flex gap-2">
             {['all', 'Student', 'Mentor', 'Admin'].map((role) => (
               <button
                 key={role}
                 onClick={() => setRoleFilter(role)}
                 className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                   roleFilter === role
                     ? 'bg-[#3B82F6] text-white shadow-md'
                     : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#3B82F6]'
                 }`}
               >
                 {role === 'all' ? 'All Users' : role}
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
              const uid = String(u?.id ?? u?.userId ?? u?.username ?? u?.email ?? '')
              const isExpanded = expandedId === uid
              const roleColor = getRoleColor(role)

              return (
                <div
                  key={uid}
                  className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden hover:shadow-md transition-all duration-200"
                >
                  {/* Main Row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : uid)}
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-[#f9fafb] transition-colors text-left cursor-pointer"
                  >
                   {/* Avatar */}
                   <div className="w-10 h-10 rounded-lg bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
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

                   {/* Banned Badge */}
                   {u?.status?.toLowerCase() === 'banned' && (
                     <div className="px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 bg-red-100 text-red-700 border border-red-300 flex items-center gap-1">
                       <Ban size={12} />
                       <span>Banned</span>
                     </div>
                   )}

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
                           {u?.lastLogin ? formatDateTimeVN(u.lastLogin) : 'Never'}
                         </p>
                       </div>

                       {/* Status */}
                       <div>
                         <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Status</p>
                         <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${u?.status?.toLowerCase() === 'banned' ? 'bg-[#ef4444]' : 'bg-[#10b981]'}`}></div>
                           <span className="text-sm text-[#111827]">{u?.status || 'Active'}</span>
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

                     {/* Action Buttons */}
                     <div className="pt-4 border-t border-[#e5e7eb] flex gap-3">
                       {u?.status?.toLowerCase() === 'banned' ? (
                         <button
                           onClick={() => handleBanUser(uid, true)}
                           disabled={actionLoading === uid}
                           className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-60 cursor-pointer"
                         >
                           {actionLoading === uid ? (
                             <>
                               <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                               <span>Unbanning...</span>
                             </>
                           ) : (
                             <>
                               <span>Unban</span>
                             </>
                           )}
                         </button>
                       ) : (
                         <button
                           onClick={() => handleBanUser(uid, false)}
                           disabled={actionLoading === uid}
                           className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-60 cursor-pointer"
                         >
                           {actionLoading === uid ? (
                             <>
                               <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                               <span>Banning...</span>
                             </>
                           ) : (
                             <>
                               <span>Ban</span>
                             </>
                           )}
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
           <div className="mt-6 text-sm text-[#6b7280]">
             Showing {filtered.length} of {users.length} users
           </div>
         )}

         {/* Toast Notification */}
         {toast && (
           <div className="fixed top-4 right-4 z-[9999] animate-slide-in-right">
             <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[300px] max-w-md ${
               toast.type === 'success' 
                 ? 'bg-green-50 border-green-200 text-green-800' 
                 : 'bg-red-50 border-red-200 text-red-800'
             }`}>
               {toast.type === 'success' ? (
                 <CheckCircle className="w-5 h-5 text-green-500" />
               ) : (
                 <Ban className="w-5 h-5 text-red-500" />
               )}
               <p className="flex-1 text-sm font-medium">{toast.message}</p>
               <button
                 onClick={() => setToast(null)}
                 className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
           </div>
         )}
       </div>
     </Layout>
  )
}

export default AdminUsersPage