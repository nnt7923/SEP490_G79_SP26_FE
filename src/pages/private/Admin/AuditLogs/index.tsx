import React, { useEffect, useState, useCallback, useMemo } from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import { Activity, RefreshCw, X, Search, ChevronRight, ChevronLeft, Database, User, Clock, Info, FilterX } from 'lucide-react'
import useAuthStore from '../../../../store/useAuthStore'
import { useTranslation } from 'react-i18next'
import api from '../../../../services/Axios'

const AUDIT_MAX_RANGE_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000
const VN_OFFSET_MS = 7 * 60 * 60 * 1000

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

type AuditLogSortBy = 'Timestamp' | 'Action' | 'TableName'

const AUDIT_LOGS_CACHE_PREFIX = 'admin:audit-logs:'
const AUDIT_LOGS_CACHE_TTL_MS = 2 * 60 * 1000
const auditLogsMemoryCache = new Map<string, AuditLogsCacheEntry>()

function buildAuditLogsCacheKey(params: {
  page: number
  pageSize: number
  actionFilter: string
  tableFilter: string
  fromDate: string
  toDate: string
  sortBy: AuditLogSortBy
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

function parseDateTimeLocal(value: string): { year: number; month: number; day: number; hour: number; minute: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null

  const [, year, month, day, hour, minute] = match
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  }
}

function parseVnDateTimeLocalToUtcMs(value: string): number | null {
  if (!value) return null
  const parsed = parseDateTimeLocal(value)
  if (!parsed) return null

  const { year, month, day, hour, minute } = parsed
  return Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0)
}

function toUtcIsoFromVnDateTimeLocal(value: string): string | null {
  const utcMs = parseVnDateTimeLocalToUtcMs(value)
  if (utcMs === null) return null
  return new Date(utcMs).toISOString()
}

function formatVnDateTimeLocalFromUtcMs(utcMs: number): string {
  const vnMs = utcMs + VN_OFFSET_MS
  const date = new Date(vnMs)
  const pad = (value: number) => String(value).padStart(2, '0')

  const year = date.getUTCFullYear()
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hour = pad(date.getUTCHours())
  const minute = pad(date.getUTCMinutes())

  return `${year}-${month}-${day}T${hour}:${minute}`
}

function buildDefaultVnDateRange(): { fromDate: string; toDate: string } {
  const nowUtcMs = Date.now()
  return {
    fromDate: formatVnDateTimeLocalFromUtcMs(nowUtcMs - (3 * DAY_MS)),
    toDate: formatVnDateTimeLocalFromUtcMs(nowUtcMs),
  }
}

function normalizeAuditLogsResult(data: any, fallbackPage: number, fallbackPageSize: number): PaginatedResult<AuditLogResponse> {
  const totalCount = Number(data?.totalCount ?? 0)
  const pageNumber = Number(data?.pageNumber ?? fallbackPage)
  const pageSize = Number(data?.pageSize ?? fallbackPageSize)
  const totalPages = Number(data?.totalPages ?? 1)

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    totalCount,
    pageNumber,
    pageSize,
    totalPages,
    hasPreviousPage: Boolean(data?.hasPreviousPage ?? pageNumber > 1),
    hasNextPage: Boolean(data?.hasNextPage ?? pageNumber < totalPages),
  }
}

function formatAuditTimestamp(timestamp: string, locale: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })
}

const AuditLogs: React.FC = () => {
  const { t, i18n } = useTranslation('admin')
  const { token } = useAuthStore()
  const initialDateRange = useMemo(() => buildDefaultVnDateRange(), [])

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

  const [fromDate, setFromDate] = useState<string>(initialDateRange.fromDate)
  const [toDate, setToDate] = useState<string>(initialDateRange.toDate)
  const [sortBy, setSortBy] = useState<AuditLogSortBy>('Timestamp')
  const [sortDescending, setSortDescending] = useState<boolean>(true)
  const displayLocale = i18n.language?.toLowerCase().startsWith('vi') ? 'vi-VN' : 'en-US'

  const fetchLogs = useCallback(async (forceRefresh: boolean = false) => {
    if (!token) return

    const fromDateUtcMs = parseVnDateTimeLocalToUtcMs(fromDate)
    const toDateUtcMs = parseVnDateTimeLocalToUtcMs(toDate)

    if ((fromDate && fromDateUtcMs === null) || (toDate && toDateUtcMs === null)) {
      setError(t('auditLogs.invalidDateFormat', { defaultValue: 'Invalid date format.' }))
      setLoading(false)
      return
    }

    if (fromDateUtcMs !== null && toDateUtcMs !== null) {
      if (toDateUtcMs < fromDateUtcMs) {
        setError(t('auditLogs.invalidDateRange', { defaultValue: '`To Date` must be later than or equal to `From Date`.' }))
        setLoading(false)
        return
      }

      if ((toDateUtcMs - fromDateUtcMs) > (AUDIT_MAX_RANGE_DAYS * DAY_MS)) {
        setError(t('auditLogs.maxDateRangeExceeded', { days: AUDIT_MAX_RANGE_DAYS, defaultValue: 'Date range must not exceed {{days}} days.' }))
        setLoading(false)
        return
      }
    }

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

    try {
      if (forceRefresh || !hasCachedData) {
        setLoading(true)
      }

      const response: any = await api.get('/admin/audit-logs', {
        params: {
          pageNumber: page,
          pageSize,
          action: actionFilter || undefined,
          tableName: tableFilter || undefined,
          fromDate: fromDate ? toUtcIsoFromVnDateTimeLocal(fromDate) : undefined,
          toDate: toDate ? toUtcIsoFromVnDateTimeLocal(toDate) : undefined,
          sortBy,
          sortDescending,
        },
      })

      const data = normalizeAuditLogsResult(response?.data || response, page, pageSize)
      setLogs(data.items)
      setTotalPages(data.totalPages)
      setTotalItems(data.totalCount)
      setError(null)
      setLoading(false)

      const cacheEntry: AuditLogsCacheEntry = {
        data,
        expiresAt: Date.now() + AUDIT_LOGS_CACHE_TTL_MS,
      }
      auditLogsMemoryCache.set(cacheKey, cacheEntry)
      writeAuditLogsStorageCache(cacheKey, cacheEntry)
    } catch (err: any) {
      const errorCode = err?.response?.data?.errorCode
      const errorMessage = err?.response?.data?.errorMessage

      if (errorCode === 'DATE_RANGE_TOO_LARGE') {
        setError(t('auditLogs.maxDateRangeExceeded', { days: AUDIT_MAX_RANGE_DAYS, defaultValue: 'Date range must not exceed {{days}} days.' }))
      } else if (errorCode === 'INVALID_DATE_RANGE') {
        setError(t('auditLogs.invalidDateRange', { defaultValue: '`To Date` must be later than or equal to `From Date`.' }))
      } else {
        setError(String(errorMessage || t('auditLogs.fetchError', { defaultValue: 'Failed to load audit logs. Please try again.' })))
      }

      if (!hasCachedData || forceRefresh) {
        setLoading(false)
      }
    }
  }, [token, page, pageSize, actionFilter, tableFilter, fromDate, toDate, sortBy, sortDescending, t])

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
    fetchLogs()
  }, [token, fetchLogs])

  const handleRefresh = () => {
    fetchLogs(true)
  }

  const resetFilters = () => {
    const defaultDateRange = buildDefaultVnDateRange()
    setSearchQuery('')
    setTableFilter('')
    setActionFilter('')
    setFromDate(defaultDateRange.fromDate)
    setToDate(defaultDateRange.toDate)
    setSortBy('Timestamp')
    setSortDescending(true)
    setPage(1)
    setError(null)
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
            <p className="text-muted mt-1">{t('auditLogs.subtitleApi', { defaultValue: 'Track system events and modifications.' })}</p>
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
                onChange={e => { setSortBy(e.target.value as AuditLogSortBy); setPage(1); }}
              >
                <option value="Timestamp">{t('auditLogs.sortTimestamp')}</option>
                <option value="Action">{t('auditLogs.sortAction')}</option>
                <option value="TableName">{t('auditLogs.sortTableName')}</option>
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
                        {t('auditLogs.loadingApi', { defaultValue: 'Loading audit logs...' })}
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
                          {formatAuditTimestamp(log.timestamp, displayLocale)}
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
                title={t('auditLogs.close')}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 text-body bg-th-card">
              <div className="grid grid-cols-2 gap-y-5 gap-x-8 mb-8 bg-th-card p-5 border border-bd">
                <div><span className="text-muted text-sm">{t('auditLogs.timestamp')}</span><p className="font-semibold text-heading mt-1">{formatAuditTimestamp(selectedLog.timestamp, displayLocale)}</p></div>
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
                <div className="col-span-2"><span className="text-muted text-sm">{t('auditLogs.ipAddress')}</span><p className="font-semibold text-heading mt-1">{selectedLog.ipAddress || '-'}</p></div>
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
