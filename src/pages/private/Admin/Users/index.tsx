
import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import { UserService } from '../../../../services'
import { Search, RefreshCw, Ban, CheckCircle, Users as UsersIcon, ChevronDown, ChevronUp, X } from 'lucide-react'
import { formatDateTimeVN } from '../../../../utils/dateUtils'
import { useTranslation } from 'react-i18next'

const AdminUsersPage: React.FC = () => {
  const adminNavItems = useAdminSidebarConfig()
  const sidebarConfig = {
    navItems: adminNavItems as any,
    actions: [],
    brand: { name: 'Admin', subtitle: 'Users' },
  }
  const { t } = useTranslation('admin')

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
      const msg = e?.response?.data?.message || e?.message || t('users.failedToLoad')
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
        setToast({ message: t('users.unbanSuccess'), type: 'success' })
      } else {
        await UserService.banUser(userId)
        setToast({ message: t('users.banSuccess'), type: 'success' })
      }
      // Refresh users list
      await fetchUsers()
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('users.banFailed')
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
    if (normalized === 'admin') return { bg: 'var(--bg-surface-short)', text: 'var(--text-amber-deep)', border: 'var(--text-amber-deep)' }
    if (normalized === 'mentor') return { bg: 'var(--bg-surface-short)', text: 'var(--text-purple-deep)', border: 'var(--text-purple-deep)' }
    return { bg: 'var(--bg-surface-short)', text: 'var(--brand-blue-deep)', border: 'var(--brand-blue-deep)' }
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-8 bg-[var(--gray-100)] min-h-screen font-mono">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6 border-b border-bd pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-heading border-none bg-transparent flex items-center gap-2">
                  <UsersIcon className="text-status-blue flex-shrink-0" size={28} />
                   {t('users.title')}
                </h1>
                <p className="text-muted mt-2">
                   {t('users.subtitle')}
                </p>
              </div>
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 bg-th-card text-status-blue text-sm font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm"
                title="Reload"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {t('users.reload')}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6 relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-placeholder" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('users.searchPlaceholder')}
              className="pl-11 pr-4 py-3 w-full bg-th-card border border-bd-strong focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
            />
          </div>

         {/* Role Filter */}
         <div className="mb-6 flex items-center gap-3">
           <span className="text-sm font-bold text-muted">{t('users.filterBy')}</span>
           <div className="flex gap-2">
             {['all', 'Student', 'Mentor', 'Admin'].map((role) => (
               <button
                 key={role}
                 onClick={() => setRoleFilter(role)}
                 className={`px-3 py-1 text-sm font-bold transition-colors border cursor-pointer rounded-sm ${
                   roleFilter === role
                     ? 'bg-status-blue-solid text-white border-blue-600'
                     : 'bg-th-card text-label border-bd-strong hover:border-bd-input'
                 }`}
               >
                 {role === 'all' ? t('users.all', 'All') : role}
               </button>
             ))}
           </div>
         </div>

         {/* Error Message */}
         {error ? (
           <div className="mb-6 rounded-lg border border-red-300 bg-status-red-bg text-status-red-dark p-4 text-sm flex items-start gap-3">
             <div className="w-1 h-1 rounded-full bg-status-red-solid-dark mt-2 flex-shrink-0"></div>
             <span>{error}</span>
           </div>
         ) : null}

         {/* Users List */}
         <div className="space-y-3">
           {loading && (
             <div className="text-center py-12">
               <div className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                 <div className="w-4 h-4 rounded-full border-2 border-[var(--brand-blue)] border-t-transparent animate-spin"></div>
                 <span>{t('users.loading')}</span>
               </div>
             </div>
           )}

           {!loading && filtered.length === 0 && (
             <div className="text-center py-12 bg-th-card rounded-lg border border-[var(--gray-200)]">
                <p className="text-[var(--text-secondary)]">{t('users.noUsersFound')}</p>
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
                  className="bg-th-card border border-bd-strong transition-colors"
                >
                  {/* Main Row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : uid)}
                    className="w-full px-4 py-3 flex flex-wrap items-center gap-4 hover:bg-th-page transition-colors text-left cursor-pointer"
                  >
                   {/* Avatar */}
                   <div className="flex-shrink-0">
                     <span className="text-heading font-bold text-sm">{getInitials(name)}</span>
                   </div>

                   {/* Info */}
                   <div className="flex-1 min-w-0">
                     <p className="font-bold text-heading truncate">{name}</p>
                     <p className="text-xs text-muted truncate">{u?.email ?? '—'}</p>
                   </div>

                   {/* Role Badge */}
                   <div
                     className="px-2 py-0.5 text-xs font-bold flex-shrink-0 rounded-sm"
                     style={{
                       color: roleColor.text,
                       border: `1px solid ${roleColor.border}`,
                     }}
                   >
                     {role}
                   </div>

                   {/* Banned Badge */}
                   {u?.status?.toLowerCase() === 'banned' && (
                     <div className="px-2 py-0.5 text-xs font-bold flex-shrink-0 bg-status-red-bg text-status-red-dark border border-red-300 rounded-sm">
                       {t('users.banned', 'Banned')}
                     </div>
                   )}

                   {/* Expand Icon */}
                   <div className="text-muted font-bold text-sm w-12 text-right flex-shrink-0 flex justify-end">
                     {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                   </div>
                 </button>

                 {/* Expanded Details */}
                 {isExpanded && (
                   <div className="border-t border-bd bg-th-page px-4 py-4 space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                       {/* Username */}
                       <div>
                         <p className="text-xs font-bold text-muted lowercase">username:</p>
                         <p className="text-sm text-heading">{u?.username ?? '—'}</p>
                       </div>

                       {/* Email */}
                       <div>
                         <p className="text-xs font-bold text-muted lowercase">email_address:</p>
                         <p className="text-sm text-heading">{u?.email ?? '—'}</p>
                       </div>

                       {/* Created Date */}
                       <div>
                         <p className="text-xs font-bold text-muted lowercase">created_at:</p>
                         <p className="text-sm text-heading">
                           {u?.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                         </p>
                       </div>

                       {/* Last Login */}
                       <div>
                         <p className="text-xs font-bold text-muted lowercase">last_login:</p>
                         <p className="text-sm text-heading">
                            {u?.lastLogin ? formatDateTimeVN(u.lastLogin) : t('users.never')}
                         </p>
                       </div>

                       {/* Status */}
                       <div>
                         <p className="text-xs font-bold text-muted lowercase">status:</p>
                         <div className="flex items-center gap-2">
                           <span className="text-sm font-bold text-heading">
                             {u?.status || 'Active'}
                           </span>
                         </div>
                       </div>

                       {/* First Name */}
                       <div>
                         <p className="text-xs font-bold text-muted lowercase">first_name:</p>
                         <p className="text-sm text-heading">{u?.firstName ?? '—'}</p>
                       </div>

                       {/* Last Name */}
                       <div>
                         <p className="text-xs font-bold text-muted lowercase">last_name:</p>
                         <p className="text-sm text-heading">{u?.lastName ?? '—'}</p>
                       </div>
                     </div>

                     {/* Action Buttons */}
                     <div className="pt-4 border-t border-bd flex gap-3">
                       {u?.status?.toLowerCase() === 'banned' ? (
                         <button
                           onClick={() => handleBanUser(uid, true)}
                           disabled={actionLoading === uid}
                           className="flex items-center gap-2 px-3 py-1.5 border border-green-600 text-status-green-dark bg-th-card hover:bg-status-green-bg text-sm font-bold transition-colors disabled:opacity-60 cursor-pointer rounded-sm"
                         >
                            {actionLoading === uid ? t('users.unbanning') : t('users.unban')}
                         </button>
                       ) : (
                         <button
                           onClick={() => handleBanUser(uid, false)}
                           disabled={actionLoading === uid}
                           className="flex items-center gap-2 px-3 py-1.5 border border-red-600 text-status-red-dark bg-th-card hover:bg-status-red-bg text-sm font-bold transition-colors disabled:opacity-60 cursor-pointer rounded-sm"
                         >
                            {actionLoading === uid ? t('users.banning') : t('users.ban')}
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
            <div className="mt-6 text-sm text-muted font-bold">
              Showing: {filtered.length}/{users.length}
            </div>
          )}

          {/* Toast Notification */}
          {toast && (
            <div className="fixed top-4 right-4 z-[9999] animate-slide-in-right">
              <div className={`flex items-center gap-3 px-4 py-3 border shadow-none font-mono min-w-[300px] max-w-md ${
                toast.type === 'success' 
                  ? 'bg-status-green-bg border-green-600 text-status-green-darker' 
                  : 'bg-status-red-bg border-red-600 text-status-red-darker'
              }`}>
                {toast.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-status-green" />
                ) : (
                  <Ban className="w-5 h-5 text-status-red" />
                )}
                <p className="flex-1 text-sm font-bold">{toast.message}</p>
                <button
                  onClick={() => setToast(null)}
                  className="text-muted hover:text-heading transition-colors cursor-pointer"
                >
                  <X size={16} />
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