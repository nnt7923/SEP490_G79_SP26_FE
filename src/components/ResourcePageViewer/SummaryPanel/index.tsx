import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Wifi, WifiOff, Loader2 } from 'lucide-react'
import * as signalR from '@microsoft/signalr'
import { useTranslation } from 'react-i18next'
import { useResponsive } from '../../../hook/useResponsive'
import type { SummaryPanelProps, SummarySession, ResourceSummaryDto, SummaryErrorDto } from '../../../types/summary'
import { getSummaryHub } from '../../../services/SignalR'
import ResourceService from '../../../services/ResourceService'
import NewSummaryForm from './NewSummaryForm'
import SummarySessionList from './SummarySessionList'
import SummarySessionItem from './SummarySessionItem'

const toNumberOrNull = (value: unknown): number | null => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const toSessionTimestamp = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const buildRangeKey = (resourceId: string, startPage: number, endPage: number) =>
  `${resourceId}:${startPage}-${endPage}`

const toServerSession = (item: any, fallbackIndex: number): SummarySession | null => {
  const resourceId = String(item?.resourceId ?? '').trim()
  const startPage = toNumberOrNull(item?.startPage)
  const endPage = toNumberOrNull(item?.endPage)
  const summaryId = item?.summaryId ? String(item.summaryId) : undefined

  if (!resourceId || startPage == null || endPage == null) return null

  const generatedAt = item?.generatedAt ?? item?.createdAt ?? item?.timestamp
  const timestamp = toSessionTimestamp(generatedAt, Date.now() - fallbackIndex)

  return {
    id: summaryId ? `summary-${summaryId}` : `summary-${resourceId}-${startPage}-${endPage}-${timestamp}`,
    summaryId,
    resourceId,
    title: item?.title ? String(item.title) : undefined,
    startPage,
    endPage,
    status: 'success',
    summary: item?.summary ? String(item.summary) : '',
    timestamp,
  }
}

const sortSessionsNewestFirst = (sessions: SummarySession[]) =>
  [...sessions].sort((a, b) => b.timestamp - a.timestamp)

const mergeServerWithTransientSessions = (serverSessions: SummarySession[], current: SummarySession[]): SummarySession[] => {
  const serverRanges = new Set(serverSessions.map((session) => buildRangeKey(session.resourceId, session.startPage, session.endPage)))
  const transientSessions = current.filter((session) => {
    if (session.summaryId) return false
    const sessionRange = buildRangeKey(session.resourceId, session.startPage, session.endPage)
    return !serverRanges.has(sessionRange)
  })

  return sortSessionsNewestFirst([...transientSessions, ...serverSessions])
}

/**
 * SummaryPanel Component
 *
 * Main panel component that integrates AI summary functionality into the resource viewer.
 * Manages SignalR connection, summary sessions, and responsive layout.
 *
 * Feature: resource-ai-summary
 */
const SummaryPanel: React.FC<SummaryPanelProps> = ({
  resourceId,
  totalPages,
  isVisible,
  onToggle,
}) => {
  const { t } = useTranslation('admin')
  const [sessions, setSessions] = useState<SummarySession[]>([])
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected')
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [isHistoryVisible, setIsHistoryVisible] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [deletingSummaryIds, setDeletingSummaryIds] = useState<string[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const { isMobile } = useResponsive()

  const panelRef = React.useRef<HTMLDivElement>(null)
  const previousFocusRef = React.useRef<HTMLElement | null>(null)

  const fetchResourceSummaries = useCallback(async (silent = false) => {
    if (!resourceId) return

    if (!silent) {
      setLoadingHistory(true)
      setHistoryError(null)
    }

    try {
      const response: any = await ResourceService.getResourceSummaries(resourceId)
      const rawItems = Array.isArray(response)
        ? response
        : Array.isArray(response?.items)
          ? response.items
          : []

      const serverSessions = rawItems
        .map((item, index) => toServerSession(item, index))
        .filter((item): item is SummarySession => item !== null)

      setSessions((current) => mergeServerWithTransientSessions(serverSessions, current))
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || t('resources.summaryPanel.failedToLoadSummaries')
      setHistoryError(message)
    } finally {
      if (!silent) {
        setLoadingHistory(false)
      }
    }
  }, [resourceId, t])

  const activeLoadingRanges = useMemo(
    () => new Set(
      sessions
        .filter((session) => session.status === 'loading')
        .map((session) => buildRangeKey(session.resourceId, session.startPage, session.endPage)),
    ),
    [sessions],
  )

  const selectedSession = useMemo(() => {
    if (sessions.length === 0) return null
    const sorted = sortSessionsNewestFirst(sessions)
    if (!selectedSessionId) return sorted[0]
    return sorted.find((session) => session.id === selectedSessionId) ?? sorted[0]
  }, [sessions, selectedSessionId])

  useEffect(() => {
    setSessions([])
    setDeletingSummaryIds([])
    setSelectedSessionId(null)
    setHistoryError(null)
    if (resourceId) {
      void fetchResourceSummaries()
    }
  }, [resourceId, fetchResourceSummaries])

  useEffect(() => {
    if (sessions.length === 0) {
      if (selectedSessionId !== null) {
        setSelectedSessionId(null)
      }
      return
    }

    if (!selectedSessionId || !sessions.some((session) => session.id === selectedSessionId)) {
      const newest = sortSessionsNewestFirst(sessions)[0]
      if (newest) {
        setSelectedSessionId(newest.id)
      }
    }
  }, [sessions, selectedSessionId])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobile && isVisible && onToggle) {
        event.preventDefault()
        onToggle()
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'k' && onToggle) {
        event.preventDefault()
        onToggle()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobile, isVisible, onToggle])

  useEffect(() => {
    if (isMobile && isVisible) {
      previousFocusRef.current = document.activeElement as HTMLElement
      if (panelRef.current) {
        const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusableElements.length > 0) {
          focusableElements[0].focus()
        }
      }
    } else if (isMobile && !isVisible && previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [isMobile, isVisible])

  useEffect(() => {
    if (!isMobile || !isVisible) return

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )

      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => {
      document.removeEventListener('keydown', handleTabKey)
    }
  }, [isMobile, isVisible])

  useEffect(() => {
    let hub: signalR.HubConnection | null = null
    let mounted = true
    let summaryLoadingHandler: ((payload: any) => void) | null = null
    let receiveSummaryHandler: ((dto: ResourceSummaryDto) => void) | null = null
    let summaryErrorHandler: ((error: SummaryErrorDto) => void) | null = null

    const updateMatchingLoadingSession = (
      startPage: number,
      endPage: number,
      updater: (session: SummarySession) => SummarySession,
    ) => {
      setSessions((current) => {
        const index = current.findIndex(
          (session) =>
            session.resourceId === resourceId &&
            session.startPage === startPage &&
            session.endPage === endPage &&
            session.status === 'loading',
        )

        if (index < 0) return current

        const next = [...current]
        next[index] = updater(next[index])
        return sortSessionsNewestFirst(next)
      })
    }

    const initializeConnection = async () => {
      try {
        hub = await getSummaryHub()

        if (!mounted) return

        setConnectionState(
          hub.state === signalR.HubConnectionState.Connected
            ? 'connected'
            : hub.state === signalR.HubConnectionState.Reconnecting
              ? 'reconnecting'
              : 'disconnected',
        )

        const handleReconnecting = () => {
          if (mounted) setConnectionState('reconnecting')
        }

        const handleReconnected = () => {
          if (mounted) setConnectionState('connected')
        }

        const handleClose = () => {
          if (mounted) setConnectionState('disconnected')
        }

        summaryLoadingHandler = (payload: any) => {
          if (!mounted) return
          if (payload?.resourceId && payload.resourceId !== resourceId) return

          const startPage = toNumberOrNull(payload?.startPage)
          const endPage = toNumberOrNull(payload?.endPage)
          if (startPage == null || endPage == null) return

          updateMatchingLoadingSession(startPage, endPage, (session) => ({
            ...session,
            status: 'loading',
            errorCode: undefined,
            errorMessage: undefined,
          }))
        }

        receiveSummaryHandler = (dto: ResourceSummaryDto) => {
          if (!mounted || dto.resourceId !== resourceId) return

          const timestamp = toSessionTimestamp(dto.generatedAt, Date.now())
          const incomingSummary: SummarySession = {
            id: dto.summaryId ? `summary-${dto.summaryId}` : `summary-${dto.resourceId}-${dto.startPage}-${dto.endPage}-${timestamp}`,
            summaryId: dto.summaryId,
            resourceId: dto.resourceId,
            title: dto.title,
            startPage: dto.startPage,
            endPage: dto.endPage,
            status: 'success',
            summary: dto.summary,
            timestamp,
          }

          setSessions((current) => {
            const index = current.findIndex(
              (session) =>
                session.resourceId === dto.resourceId &&
                session.startPage === dto.startPage &&
                session.endPage === dto.endPage &&
                session.status === 'loading',
            )

            let next: SummarySession[]
            if (index >= 0) {
              next = [...current]
              next[index] = {
                ...next[index],
                ...incomingSummary,
                id: incomingSummary.id,
              }
            } else {
              next = [incomingSummary, ...current]
            }

            return sortSessionsNewestFirst(next)
          })

          void fetchResourceSummaries(true)
        }

        summaryErrorHandler = (error: SummaryErrorDto) => {
          if (!mounted) return
          if (error.resourceId && error.resourceId !== resourceId) return

          const startPage = toNumberOrNull(error.startPage)
          const endPage = toNumberOrNull(error.endPage)

          if (startPage == null || endPage == null) {
            if (error.errorMessage) {
              setHistoryError(error.errorMessage)
            }
            return
          }

          updateMatchingLoadingSession(startPage, endPage, (session) => ({
            ...session,
            status: 'error',
            errorCode: error.errorCode,
            errorMessage: error.errorMessage || t('resources.summaryPanel.failedToGenerateSummary'),
          }))
        }

        hub.onreconnecting(handleReconnecting)
        hub.onreconnected(handleReconnected)
        hub.onclose(handleClose)
        hub.on('SummaryLoading', summaryLoadingHandler)
        hub.on('ReceiveSummary', receiveSummaryHandler)
        hub.on('SummaryError', summaryErrorHandler)
      } catch {
        if (mounted) {
          setConnectionState('disconnected')
        }
      }
    }

    initializeConnection()

    return () => {
      mounted = false
      if (!hub) return
      if (summaryLoadingHandler) {
        hub.off('SummaryLoading', summaryLoadingHandler)
      }
      if (receiveSummaryHandler) {
        hub.off('ReceiveSummary', receiveSummaryHandler)
      }
      if (summaryErrorHandler) {
        hub.off('SummaryError', summaryErrorHandler)
      }
    }
  }, [resourceId, fetchResourceSummaries, t])

  const handleRequestSummary = async (startPage: number, endPage: number) => {
    const rangeKey = buildRangeKey(resourceId, startPage, endPage)
    if (activeLoadingRanges.has(rangeKey)) return

    const timestamp = Date.now()
    const pendingSession: SummarySession = {
      id: `pending-${resourceId}-${startPage}-${endPage}-${timestamp}`,
      resourceId,
      title: t('resources.summaryPanel.pagesTitle', { start: startPage, end: endPage }),
      startPage,
      endPage,
      status: 'loading',
      timestamp,
    }

    setSessions((current) => sortSessionsNewestFirst([pendingSession, ...current]))
    setSelectedSessionId(pendingSession.id)

    try {
      const hub = await getSummaryHub()
      await hub.invoke('RequestResourceSummary', resourceId, startPage, endPage)
    } catch {
      setSessions((current) => {
        const index = current.findIndex((session) => session.id === pendingSession.id)
        if (index < 0) return current

        const next = [...current]
        next[index] = {
          ...next[index],
          status: 'error',
          errorCode: 'REQUEST_SEND_FAILED',
          errorMessage: t('resources.summaryPanel.failedToSendRequest'),
        }
        return next
      })
    }
  }

  const handleRetry = (sessionId: string) => {
    const session = sessions.find((item) => item.id === sessionId)
    if (!session) return
    setSelectedSessionId(sessionId)
    void handleRequestSummary(session.startPage, session.endPage)
  }

  const handleDelete = async (sessionId: string) => {
    const target = sessions.find((item) => item.id === sessionId)
    if (!target?.summaryId) return

    setHistoryError(null)
    setDeletingSummaryIds((current) =>
      current.includes(target.summaryId!) ? current : [...current, target.summaryId!],
    )

    try {
      await ResourceService.deleteResourceSummary(target.summaryId)
      setSessions((current) => current.filter((item) => item.id !== sessionId && item.summaryId !== target.summaryId))
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || t('resources.summaryPanel.failedToDeleteSummary')
      setHistoryError(message)
    } finally {
      setDeletingSummaryIds((current) => current.filter((summaryId) => summaryId !== target.summaryId))
    }
  }

  const renderConnectionStatus = () => {
    if (connectionState === 'connected') {
      return (
        <div
          className="flex items-center space-x-2 text-status-green"
          role="status"
          aria-live="polite"
          aria-label={t('resources.summaryPanel.connection.connectedAria')}
        >
          <Wifi className="w-4 h-4" aria-hidden="true" />
          <span className="text-xs font-medium">{t('resources.summaryPanel.connection.connected')}</span>
        </div>
      )
    }

    if (connectionState === 'reconnecting') {
      return (
        <div
          className="flex items-center space-x-2 text-yellow-600"
          role="status"
          aria-live="polite"
          aria-label={t('resources.summaryPanel.connection.reconnectingAria')}
        >
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span className="text-xs font-medium">{t('resources.summaryPanel.connection.reconnecting')}</span>
        </div>
      )
    }

    return (
      <div
        className="flex items-center space-x-2 text-status-red"
        role="status"
        aria-live="polite"
        aria-label={t('resources.summaryPanel.connection.disconnectedAria')}
      >
        <WifiOff className="w-4 h-4" aria-hidden="true" />
        <span className="text-xs font-medium">{t('resources.summaryPanel.connection.disconnected')}</span>
      </div>
    )
  }

  const renderHeader = () => (
    <div className="pb-3 border-b border-sl-200">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-sl-900">
          {t('resources.summaryPanel.title')}
        </h2>
        {isMobile && onToggle && (
          <button
            onClick={onToggle}
            className="p-1 hover:bg-sl-100 transition-colors"
            title={t('resources.summaryPanel.closePanel')}
            aria-label={t('resources.summaryPanel.closePanel')}
          >
            <X className="w-4 h-4 text-sl-600" />
          </button>
        )}
      </div>
      {renderConnectionStatus()}
    </div>
  )

  const renderContent = () => (
    <div className="flex-1 overflow-y-auto space-y-4">
      <div>
        <button
          onClick={() => setIsFormVisible(!isFormVisible)}
          className="w-full flex items-center justify-between text-xs font-medium text-sl-600 hover:text-sl-900 transition-colors mb-2"
        >
          <span>{t('resources.summaryPanel.newSummary')}</span>
          <span className="text-sl-400">{isFormVisible ? '-' : '+'}</span>
        </button>
        {isFormVisible && (
          <NewSummaryForm
            totalPages={totalPages}
            onSubmit={handleRequestSummary}
            disabled={connectionState !== 'connected'}
            existingSessions={sessions}
          />
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setIsHistoryVisible((prev) => !prev)}
            className="flex items-center gap-1 text-xs font-medium text-sl-600 hover:text-sl-900"
          >
            <span>{t('resources.summaryPanel.history')}</span>
            <span className="text-sl-400">{isHistoryVisible ? '-' : '+'}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { void fetchResourceSummaries(true) }}
              className="text-[11px] text-status-blue hover:underline disabled:opacity-60"
              disabled={loadingHistory}
            >
              {t('resources.summaryPanel.refresh')}
            </button>
          </div>
        </div>

        {historyError && (
          <div className="mb-3 text-xs text-status-red bg-status-red-bg px-2.5 py-1.5">
            {historyError}
          </div>
        )}

        {loadingHistory && sessions.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-sl-500 py-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t('resources.summaryPanel.loadingSummaries')}
          </div>
        ) : isHistoryVisible ? (
          <SummarySessionList
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSelect={setSelectedSessionId}
          />
        ) : null}
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-sl-600">
          {t('resources.summaryPanel.summaryDetail')}
        </div>
        {selectedSession ? (
          <SummarySessionItem
            session={selectedSession}
            onRetry={() => handleRetry(selectedSession.id)}
            onDelete={() => handleDelete(selectedSession.id)}
            canDelete={selectedSession.status === 'success' && !!selectedSession.summaryId}
            isDeleting={!!(selectedSession.summaryId && deletingSummaryIds.includes(selectedSession.summaryId))}
          />
        ) : (
          <div className="text-center py-6 text-xs text-sl-500 border border-sl-200 bg-th-card">
            {t('resources.summaryPanel.pickSummary')}
          </div>
        )}
      </div>
    </div>
  )

  if (!isVisible) {
    return null
  }

  if (!isMobile) {
    return (
      <div
        ref={panelRef}
        className="flex flex-col h-full bg-th-card border-l border-sl-200"
        style={{ width: '384px' }}
        role="complementary"
        aria-label={t('resources.summaryPanel.ariaLabel')}
      >
        <div className="p-4 flex flex-col h-full">
          {renderHeader()}
          {renderContent()}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={panelRef}
      className="fixed inset-0 z-50 bg-th-card"
      role="dialog"
      aria-modal="true"
      aria-label={t('resources.summaryPanel.ariaLabel')}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 flex flex-col h-full">
          {renderHeader()}
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default SummaryPanel
