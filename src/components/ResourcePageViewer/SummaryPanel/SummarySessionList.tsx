import React from 'react'
import { useTranslation } from 'react-i18next'
import type { SummarySessionListProps, SummarySession } from '../../../types/summary'

const getSessionTitle = (session: SummarySession, fallbackTitle: string) =>
  session.title?.trim() || fallbackTitle

const getStatusLabel = (session: SummarySession, loadingLabel: string, errorLabel: string, successLabel: string) => {
  if (session.status === 'loading') return loadingLabel
  if (session.status === 'error') return errorLabel
  return successLabel
}

const getStatusClass = (session: SummarySession) => {
  if (session.status === 'loading') return 'text-status-blue'
  if (session.status === 'error') return 'text-status-red'
  return 'text-status-green'
}

/**
 * SummarySessionList Component
 *
 * Displays summary history as a compact title list (chat-like history).
 */
const SummarySessionList: React.FC<SummarySessionListProps> = ({
  sessions,
  selectedSessionId,
  onSelect,
}) => {
  const { t } = useTranslation('admin')
  const sortedSessions = [...sessions].sort((a, b) => b.timestamp - a.timestamp)

  if (sortedSessions.length === 0) {
    return (
      <div className="text-center py-6 text-sl-500">
        <p className="text-sm">{t('resources.summaryPanel.historyEmptyTitle')}</p>
        <p className="text-xs mt-1">{t('resources.summaryPanel.historyEmptyHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto border border-sl-200 bg-th-card p-1.5">
      {sortedSessions.map((session) => {
        const isActive = selectedSessionId === session.id
        const fallbackTitle = t('resources.summaryPanel.pagesTitle', {
          start: session.startPage,
          end: session.endPage,
        })
        const sessionTitle = getSessionTitle(session, fallbackTitle)
        const statusLabel = getStatusLabel(
          session,
          t('resources.summaryPanel.status.generating'),
          t('resources.summaryPanel.status.failed'),
          t('resources.summaryPanel.status.done'),
        )
        return (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelect(session.id)}
            className={`w-full text-left px-2.5 py-2 border transition-colors ${
              isActive
                ? 'border-status-blue bg-status-blue-bg'
                : 'border-transparent hover:border-sl-200 hover:bg-sl-50'
            }`}
            title={sessionTitle}
          >
            <div className="text-xs font-medium text-sl-900 truncate">
              {sessionTitle}
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <span className={`text-[11px] ${getStatusClass(session)}`}>
                {statusLabel}
              </span>
              <span className="text-[10px] text-sl-500 truncate">
                {session.startPage}-{session.endPage}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default SummarySessionList
