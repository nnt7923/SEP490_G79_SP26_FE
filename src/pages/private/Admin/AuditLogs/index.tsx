import React, { useEffect, useState, useCallback, useRef } from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import { Activity, RefreshCw, X, Search, ChevronRight, ChevronLeft, Database, User, Clock, Info, FilterX } from 'lucide-react'
import useAuthStore from '../../../../store/useAuthStore'
import { useTranslation } from 'react-i18next'
import * as signalR from '@microsoft/signalr'
import api from '../../../../services/Axios'

// Compute Base URL identical to Axios/index.ts, but adapted for /hubs
const rawBase = (import.meta.env.VITE_API_BASE_URL as string)
  || (import.meta.env.VITE_BASE_URL as string)
  || (import.meta.env.PROD ? 'https://pplp.click/api' : '')
const trimmed = (rawBase || '').replace(/\/+$/, '')
const isDev = typeof window !== 'undefined' && import.meta.env.DEV
const isVercel = typeof window !== 'undefined' && /vercel\.app$/i.test(window.location.hostname)
const HUB_URL = (isDev || isVercel)
  ? '/hubs/audit-log'
  : trimmed
    ? trimmed.replace(/\/api$/, '') + '/hubs/audit-log'
    : 'https://pplp.click/hubs/audit-log'

interface AuditLogResponse {
  logId: string;
  userId: string | null;
  username: string | null;
  action: "Added" | "Modified" | "Deleted";
  tableName: string | null;
  recordId: string | null;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
  ipAddress: string | null;
}

interface PaginatedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

type AuditLogsCacheEntry = {
  expiresAt: number
  data: PaginatedResult<AuditLogResponse>
}

const AUDIT_LOGS_CACHE_PREFIX = 'admin:audit-logs:'
const AUDIT_LOGS_CACHE_TTL_MS = 2 * 60 * 1000
const auditLogsMemoryCache = new Map<string, AuditLogsCacheEntry>()

function isTransientAuditConnectionMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('disconnected')
    || normalized.includes('retrying')
    || normalized.includes('reconnecting')
    || normalized.includes('connection')
}

function buildAuditLogsCacheKey(params: {
  page: number
  pageSize: number
  actionFilter: string
  tableFilter: string
  fromDate: string
  toDate: string
  sortBy: number
  sortDescending: boolean
}): string {
  return JSON.stringify(params)
}

function readAuditLogsStorageCache(cacheKey: string): AuditLogsCacheEntry | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(`${AUDIT_LOGS_CACHE_PREFIX}${cacheKey}`)
    if (!raw) return null

    const parsed = JSON.parse(raw) as AuditLogsCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now() || !Array.isArray(parsed?.data?.items)) {
      window.sessionStorage.removeItem(`${AUDIT_LOGS_CACHE_PREFIX}${cacheKey}`)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeAuditLogsStorageCache(cacheKey: string, entry: AuditLogsCacheEntry): void {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(`${AUDIT_LOGS_CACHE_PREFIX}${cacheKey}`, JSON.stringify(entry))
  } catch {
    // ignore cache write errors
  }
}

const AuditLogs: React.FC = () => {
  const { t } = useTranslation('admin')
  const { token } = useAuthStore()

  const navItems = useAdminSidebarConfig()
  const sidebarConfig = {
    navItems,
    brand: { name: 'Admin', subtitle: 'Audit Logs' },
  }

  // State
  const [logs, setLogs] = useState<AuditLogResponse[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [tableNames, setTableNames] = useState<string[]>([])

  // Pagination & Filters
  const [page, setPage] = useState<number>(1)
  const [pageSize] = useState<number>(15)
  const [totalItems, setTotalItems] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [actionFilter, setActionFilter] = useState<string>('')
  const [tableFilter, setTableFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('') // Can be used to filter locally or send as parameter if supported

  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [sortBy, setSortBy] = useState<number>(0)
  const [sortDescending, setSortDescending] = useState<boolean>(true)

  // SignalR Connection Ref
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const lastRequestCacheKeyRef = useRef<string>('')
  const hasReceivedLogsRef = useRef<boolean>(false)

  const fetchLogs = useCallback(async (forceRefresh: boolean = false) => {
    const cacheKey = buildAuditLogsCacheKey({
      page,
      pageSize,
      actionFilter,
      tableFilter,
      fromDate,
      toDate,
      sortBy,
      sortDescending,
    })

    let hasCachedData = false

    if (!forceRefresh) {
      const memoryEntry = auditLogsMemoryCache.get(cacheKey)
      if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
        hasCachedData = true
        setLogs(memoryEntry.data.items)
        setTotalPages(memoryEntry.data.totalPages)
        setTotalItems(memoryEntry.data.totalCount)
        setLoading(false)
        setError(null)
      }

      if (!hasCachedData) {
        const storageEntry = readAuditLogsStorageCache(cacheKey)
        if (storageEntry) {
          hasCachedData = true
          auditLogsMemoryCache.set(cacheKey, storageEntry)
          setLogs(storageEntry.data.items)
          setTotalPages(storageEntry.data.totalPages)
          setTotalItems(storageEntry.data.totalCount)
          setLoading(false)
          setError(null)
        }
      }
    }

    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      try {
        lastRequestCacheKeyRef.current = cacheKey
        if (forceRefresh || !hasCachedData) {
          setLoading(true)
        }
        // param signature: pageNumber, pageSize, action, tableName, userId, fromDate, toDate, sortBy, sortDescending
        await connectionRef.current.invoke(
          "RequestAuditLogs",
          page,
          pageSize,
          actionFilter || null,
          tableFilter || null,
          null, // userId
          fromDate ? new Date(fromDate).toISOString() : null, // fromDate
          toDate ? new Date(toDate).toISOString() : null, // toDate
          sortBy, // sortBy Timestamp
          sortDescending // sortDescending
        )
      } catch (err) {
        setError(t('auditLogs.error'))
        if (!hasCachedData || forceRefresh) {
          setLoading(false)
        }
      }
    }
  }, [page, pageSize, actionFilter, tableFilter, fromDate, toDate, sortBy, sortDescending, t])

  useEffect(() => {
    const fetchTableNames = async () => {
      try {
        const response: any = await api.get('/admin/audit-logs/table-names')
        const data = response?.data || response;
        if (Array.isArray(data)) {
          setTableNames(data)
        }
      } catch (err) {
        console.error("Failed to fetch table names:", err)
      }
    }
    fetchTableNames()
  }, [])

  useEffect(() => {
    if (!token) return

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build()

    connectionRef.current = newConnection

    newConnection.on("AuditLogsLoading", () => {
      setLoading(true)
    })

    newConnection.on("ReceiveAuditLogs", (data: PaginatedResult<AuditLogResponse>) => {
      setLoading(false)
      hasReceivedLogsRef.current = true
      setLogs(data.items)
      setTotalPages(data.totalPages)
      setTotalItems(data.totalCount)
      setError(null)

      const cacheKey = lastRequestCacheKeyRef.current
      if (cacheKey) {
        const cacheEntry: AuditLogsCacheEntry = {
          data,
          expiresAt: Date.now() + AUDIT_LOGS_CACHE_TTL_MS,
        }
        auditLogsMemoryCache.set(cacheKey, cacheEntry)
        writeAuditLogsStorageCache(cacheKey, cacheEntry)
      }
    })

    newConnection.on("AuditLogsError", (err: { errorCode: string; errorMessage: string }) => {
      setLoading(false)
      const message = String(err?.errorMessage || t('auditLogs.error'))
      if (isTransientAuditConnectionMessage(message) && !hasReceivedLogsRef.current) {
        return
      }
      setError(message)
    })

    newConnection.on("ReceiveNewAuditLog", (newLog: AuditLogResponse) => {
      // Real-time update: Add to top of the list if we are on the first page
      setLogs((prev) => {
        // If filters are active, conditionally add only if matching
        if (actionFilter && newLog.action !== actionFilter) return prev
        if (tableFilter && newLog.tableName !== tableFilter) return prev

        const newLogs = [newLog, ...prev]
        if (newLogs.length > pageSize) newLogs.pop() // keep pageSize limit
        return newLogs
      })
      setTotalItems(prev => prev + 1)
    })

    const startConnection = async () => {
      try {
        await newConnection.start()
        fetchLogs()
      } catch (err) {
        setError(t('auditLogs.error'))
        setLoading(false)
      }
    }

    startConnection()

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop()
      }
    }
  }, [token]) // Re-run only if token changes

  // Fetch when page or filters change
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleRefresh = () => {
    fetchLogs(true)
  }

  const resetFilters = () => {
    setSearchQuery('')
    setTableFilter('')
    setActionFilter('')
    setFromDate('')
    setToDate('')
    setSortBy(0)
    setSortDescending(true)
    setPage(1)
  }

  // For Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null)

  const formatJSON = (jsonString: string | null) => {
    if (!jsonString) return null
    try {
      const parsed = JSON.parse(jsonString)
      return <pre className="text-sm overflow-x-auto p-4 bg-th-card text-body border border-bd" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(parsed, null, 2)}</pre>
    } catch {
      return <div className="text-sm p-4 bg-th-card text-body border border-bd">{jsonString}</div>
    }
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="p-4 md:p-8 bg-th-page min-h-screen">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-heading flex items-center gap-2">
              <Activity className="text-accent-primary" size={24} />
              {t('auditLogs.title')}
            </h1>
            <p className="text-muted mt-1">{t('auditLogs.subtitle')}</p>
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-th-card text-heading border border-bd hover:bg-th-input transition-colors disabled:opacity-50"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {t('auditLogs.refresh')}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-th-card border border-bd p-4 mb-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input
                type="text"
                placeholder={t('auditLogs.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 bg-th-input border border-bd text-body focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <select
                className="px-4 py-2 bg-th-input border border-bd text-body focus:outline-none focus:border-accent-primary"
                value={tableFilter}
                onChange={(e) => { setTableFilter(e.target.value); setPage(1); }}
              >
                <option value="">{t('auditLogs.allTables')}</option>
                {tableNames.map(table => (
                  <option key={table} value={table}>{table}</option>
                ))}
              </select>
              <select
                className="px-4 py-2 bg-th-input border border-bd text-body focus:outline-none focus:border-accent-primary"
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              >
                <option value="">{t('auditLogs.allActions')}</option>
                <option value="Added">{t('auditLogs.added')}</option>
                <option value="Modified">{t('auditLogs.modified')}</option>
                <option value="Deleted">{t('auditLogs.deleted')}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-bd pt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-body font-medium whitespace-nowrap">{t('auditLogs.fromDate', { defaultValue: 'From Date' })}:</label>
              <input
                type="datetime-local"
                className="px-3 py-1.5 bg-th-input border border-bd text-body focus:outline-none focus:border-accent-primary text-sm rounded-sm"
                value={fromDate}
                onChange={e => { setFromDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-body font-medium whitespace-nowrap">{t('auditLogs.toDate', { defaultValue: 'To Date' })}:</label>
              <input
                type="datetime-local"
                className="px-3 py-1.5 bg-th-input border border-bd text-body focus:outline-none focus:border-accent-primary text-sm rounded-sm"
                value={toDate}
                onChange={e => { setToDate(e.target.value); setPage(1); }}
              />
            </div>

            <div className="flex items-center gap-2 md:ml-auto">
              <label className="text-sm text-body font-medium whitespace-nowrap">{t('auditLogs.sortBy', { defaultValue: 'Sort By' })}:</label>
              <select
                className="px-3 py-1.5 bg-th-input border border-bd text-body focus:outline-none focus:border-accent-primary text-sm rounded-sm"
                value={sortBy}
                onChange={e => { setSortBy(Number(e.target.value)); setPage(1); }}
              >
                <option value={0}>Timestamp</option>
                <option value={1}>Action</option>
                <option value={2}>Table Name</option>
              </select>
              <select
                className="px-3 py-1.5 bg-th-input border border-bd text-body focus:outline-none focus:border-accent-primary text-sm rounded-sm"
                value={sortDescending ? 'desc' : 'asc'}
                onChange={e => { setSortDescending(e.target.value === 'desc'); setPage(1); }}
              >
                <option value="desc">{t('auditLogs.descending', { defaultValue: 'Newest First' })}</option>
                <option value="asc">{t('auditLogs.ascending', { defaultValue: 'Oldest First' })}</option>
              </select>
            </div>

            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-3 py-1.5 bg-th-card text-muted hover:text-heading border border-bd hover:bg-th-input transition-colors rounded-sm text-sm"
              title={t('auditLogs.resetFilters', { defaultValue: 'Reset Filters' })}
            >
              <FilterX size={16} />
              <span className="hidden md:inline">{t('auditLogs.reset', { defaultValue: 'Reset' })}</span>
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-danger-primary/10 border border-danger-primary text-danger-primary p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info size={18} />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)}><X size={16} /></button>
          </div>
        )}

        {/* Table */}
        <div className="bg-th-card border border-bd overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-th-input border-b border-bd text-heading text-sm font-semibold">
                <tr>
                  <th className="p-4">{t('auditLogs.timestamp')}</th>
                  <th className="p-4">{t('auditLogs.action')}</th>
                  <th className="p-4">{t('auditLogs.tableName')}</th>
                  <th className="p-4">{t('auditLogs.user')}</th>
                  <th className="p-4 text-center">{t('auditLogs.details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-layer text-body text-sm">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="animate-spin" size={24} />
                        {t('auditLogs.loading')}
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted">
                      {t('auditLogs.noLogs')}
                    </td>
                  </tr>
                ) : (
                  logs.filter(log => {
                    if (!searchQuery) return true;
                    const query = searchQuery.toLowerCase();
                    return (
                      (log.tableName && log.tableName.toLowerCase().includes(query)) ||
                      (log.username && log.username.toLowerCase().includes(query)) ||
                      (log.action && log.action.toLowerCase().includes(query))
                    );
                  }).map(log => (
                    <tr key={log.logId} className="hover:bg-th-input/50 transition-colors">
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-muted" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className="px-2 py-1 text-xs font-semibold border inline-block"
                          style={{
                            backgroundColor: log.action === 'Added' ? 'var(--tw-green-bg)' :
                              log.action === 'Deleted' ? 'var(--tw-red-bg)' :
                                'var(--tw-blue-bg)',
                            color: log.action === 'Added' ? 'var(--tw-green-text)' :
                              log.action === 'Deleted' ? 'var(--tw-red-text)' :
                                'var(--tw-blue-text)',
                            borderColor: log.action === 'Added' ? 'var(--tw-green-bg-strong)' :
                              log.action === 'Deleted' ? 'var(--tw-red-bg-strong)' :
                                'var(--tw-blue-bg-strong)'
                          }}
                        >
                          {log.action === 'Added' ? t('auditLogs.added') :
                            log.action === 'Deleted' ? t('auditLogs.deleted') :
                              t('auditLogs.modified')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 font-medium">
                          <Database size={14} className="text-muted" />
                          {log.tableName || '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-muted" />
                          {log.username || '-'}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-accent-primary hover:underline font-medium"
                        >
                          {t('auditLogs.viewDetails')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalItems > 0 && (
            <div className="p-4 border-t border-bd flex flex-col md:flex-row items-center justify-between gap-4 bg-th-input/30">
              <span className="text-sm text-muted">
                {t('auditLogs.showing', {
                  start: (page - 1) * pageSize + 1,
                  end: Math.min(page * pageSize, totalItems),
                  total: totalItems
                })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 text-body hover:bg-th-card border border-transparent hover:border-bd disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium text-heading min-w-[3rem] text-center">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1 text-body hover:bg-th-card border border-transparent hover:border-bd disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-th-card border border-bd shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-bd bg-th-card">
              <h3 className="text-lg font-bold text-heading flex items-center gap-2">
                <Activity size={20} className="text-accent-primary" />
                {t('auditLogs.viewDetails')}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 hover:bg-th-input text-muted transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 text-body bg-th-card">
              <div className="grid grid-cols-2 gap-y-5 gap-x-8 mb-8 bg-th-card p-5 border border-bd">
                <div><span className="text-muted text-sm">{t('auditLogs.timestamp')}</span><p className="font-semibold text-heading mt-1">{new Date(selectedLog.timestamp).toLocaleString()}</p></div>
                <div><span className="text-muted text-sm">{t('auditLogs.action')}</span>
                  <p className="mt-1">
                    <span
                      className="px-2 py-0.5 text-xs font-semibold border inline-block"
                      style={{
                        backgroundColor: selectedLog.action === 'Added' ? 'var(--tw-green-bg)' :
                          selectedLog.action === 'Deleted' ? 'var(--tw-red-bg)' :
                            'var(--tw-blue-bg)',
                        color: selectedLog.action === 'Added' ? 'var(--tw-green-text)' :
                          selectedLog.action === 'Deleted' ? 'var(--tw-red-text)' :
                            'var(--tw-blue-text)',
                        borderColor: selectedLog.action === 'Added' ? 'var(--tw-green-bg-strong)' :
                          selectedLog.action === 'Deleted' ? 'var(--tw-red-bg-strong)' :
                            'var(--tw-blue-bg-strong)'
                      }}
                    >
                      {selectedLog.action === 'Added' ? t('auditLogs.added') :
                        selectedLog.action === 'Deleted' ? t('auditLogs.deleted') :
                          t('auditLogs.modified')}
                    </span>
                  </p>
                </div>
                <div><span className="text-muted text-sm">{t('auditLogs.tableName')}</span><p className="font-semibold text-heading mt-1">{selectedLog.tableName || '-'}</p></div>
                <div><span className="text-muted text-sm">{t('auditLogs.user')}</span><p className="font-semibold text-heading mt-1">{selectedLog.username || '-'}</p></div>
                <div className="col-span-2"><span className="text-muted text-sm">IP Address</span><p className="font-semibold text-heading mt-1">{selectedLog.ipAddress || '-'}</p></div>
              </div>

              {selectedLog.action === 'Added' && (
                <div>
                  <h4 className="font-semibold text-heading mb-2 flex items-center gap-2"><span className="text-success-primary">+</span> {t('auditLogs.newValue')}</h4>
                  {formatJSON(selectedLog.newValue)}
                </div>
              )}

              {selectedLog.action === 'Deleted' && (
                <div>
                  <h4 className="font-semibold text-heading mb-2 flex items-center gap-2"><span className="text-danger-primary">-</span> {t('auditLogs.oldValue')}</h4>
                  {formatJSON(selectedLog.oldValue)}
                </div>
              )}

              {selectedLog.action === 'Modified' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-heading mb-2 flex items-center gap-2"><span className="text-danger-primary">-</span> {t('auditLogs.oldValue')}</h4>
                    {formatJSON(selectedLog.oldValue)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-heading mb-2 flex items-center gap-2"><span className="text-success-primary">+</span> {t('auditLogs.newValue')}</h4>
                    {formatJSON(selectedLog.newValue)}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-bd flex justify-end bg-th-card">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-th-card text-heading font-medium border border-bd hover:bg-th-input transition-colors"
              >
                {t('auditLogs.close')}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  )
}

export default AuditLogs
