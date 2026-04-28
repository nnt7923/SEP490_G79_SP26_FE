import React, { useEffect, useState, useCallback } from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import { useTranslation } from 'react-i18next'
import { RefreshCw, ChevronLeft, ChevronRight, Info, X, ClipboardList, Bell } from 'lucide-react'
import AdminMentorReviewService, {
  type AdminMentorReviewItem,
  type MentorReviewDecisionStatus,
} from '../../../../services/AdminMentorReviewService'

const STATUS_OPTIONS: MentorReviewDecisionStatus[] = ['Pending', 'Accepted', 'Rejected', 'WaitingStudentResponse']

const STATUS_STYLE: Record<MentorReviewDecisionStatus, { bg: string; text: string; border: string }> = {
  Pending: { bg: 'var(--tw-yellow-bg, #fef9c3)', text: 'var(--tw-yellow-text, #854d0e)', border: 'var(--tw-yellow-bg-strong, #fde047)' },
  Accepted: { bg: 'var(--tw-green-bg)', text: 'var(--tw-green-text)', border: 'var(--tw-green-bg-strong)' },
  Rejected: { bg: 'var(--tw-red-bg)', text: 'var(--tw-red-text)', border: 'var(--tw-red-bg-strong)' },
  WaitingStudentResponse: { bg: 'var(--tw-blue-bg)', text: 'var(--tw-blue-text)', border: 'var(--tw-blue-bg-strong)' },
}

function StatusBadge({ status, t }: { status: MentorReviewDecisionStatus; t: (k: string) => string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.Pending
  return (
    <span
      className="px-2 py-0.5 text-xs font-semibold border inline-block whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
    >
      {t(`mentorReviews.status_${status}`)}
    </span>
  )
}

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return '-'
  // Ensure the string is parsed as UTC (append Z if no timezone info present)
  const normalized = /[Zz]$|[+-]\d{2}:\d{2}$/.test(value) ? value : value + 'Z'
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })
}

const AdminMentorReviews: React.FC = () => {
  const { t, i18n } = useTranslation('admin')
  const navItems = useAdminSidebarConfig()
  const sidebarConfig = { navItems, brand: { name: 'Admin', subtitle: 'Mentor Reviews' } }
  const locale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US'

  const [items, setItems] = useState<AdminMentorReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<MentorReviewDecisionStatus | ''>('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selected, setSelected] = useState<AdminMentorReviewItem | null>(null)
  const [confirmReminder, setConfirmReminder] = useState<AdminMentorReviewItem | null>(null)
  const [confirmMentorReminder, setConfirmMentorReminder] = useState<AdminMentorReviewItem | null>(null)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [reminderSuccess, setReminderSuccess] = useState<string | null>(null)

  const handleSendReminder = async () => {
    if (!confirmReminder) return
    setSendingReminder(true)
    try {
      await AdminMentorReviewService.sendReminder(confirmReminder.reviewId)
      setReminderSuccess(t('mentorReviews.reminderSuccess'))
      setConfirmReminder(null)
    } catch {
      setError(t('mentorReviews.reminderError'))
      setConfirmReminder(null)
    } finally {
      setSendingReminder(false)
    }
  }

  const handleSendMentorReminder = async () => {
    if (!confirmMentorReminder) return
    setSendingReminder(true)
    try {
      await AdminMentorReviewService.sendMentorReminder(confirmMentorReminder.reviewId)
      setReminderSuccess(t('mentorReviews.mentorReminderSuccess'))
      setConfirmMentorReminder(null)
    } catch {
      setError(t('mentorReviews.mentorReminderError'))
      setConfirmMentorReminder(null)
    } finally {
      setSendingReminder(false)
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await AdminMentorReviewService.getReviews({
        status: statusFilter || undefined,
        page,
        pageSize,
      })
      setItems(result.items)
      setTotalPages(result.totalPages)
      setTotalCount(result.totalCount)
    } catch {
      setError(t('mentorReviews.fetchError'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page, pageSize, t])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="p-4 md:p-8 bg-th-page min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-heading flex items-center gap-2">
              <ClipboardList className="text-accent-primary" size={24} />
              {t('mentorReviews.title')}
            </h1>
            <p className="text-muted mt-1">{t('mentorReviews.subtitle')}</p>
          </div>
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-th-card text-heading border border-bd hover:bg-th-input transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {t('mentorReviews.reload')}
          </button>
        </div>

        {/* Filter */}
        <div className="bg-th-card border border-bd p-4 mb-6 flex items-center gap-4 flex-wrap">
          <label className="text-sm font-medium text-body whitespace-nowrap">{t('mentorReviews.filterStatus')}:</label>
          <select
            className="px-3 py-2 bg-th-input border border-bd text-body focus:outline-none focus:border-accent-primary text-sm"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as MentorReviewDecisionStatus | ''); setPage(1) }}
          >
            <option value="">{t('mentorReviews.allStatuses')}</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{t(`mentorReviews.status_${s}`)}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-danger-primary/10 border border-danger-primary text-danger-primary p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2"><Info size={18} /><span>{error}</span></div>
            <button onClick={() => setError(null)}><X size={16} /></button>
          </div>
        )}

        {/* Success */}
        {reminderSuccess && (
          <div className="bg-status-green-bg border border-status-green text-status-green-dark p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2"><Bell size={18} /><span>{reminderSuccess}</span></div>
            <button onClick={() => setReminderSuccess(null)}><X size={16} /></button>
          </div>
        )}

        {/* Table */}
        <div className="bg-th-card border border-bd overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-th-input border-b border-bd text-heading text-sm font-semibold">
                <tr>
                  <th className="p-4">{t('mentorReviews.pathTitle')}</th>
                  <th className="p-4">{t('mentorReviews.student')}</th>
                  <th className="p-4">{t('mentorReviews.mentor')}</th>
                  <th className="p-4">{t('mentorReviews.status')}</th>
                  <th className="p-4">{t('mentorReviews.createdAt')}</th>
                  <th className="p-4 text-center">{t('mentorReviews.details')}</th>
                  <th className="p-4 text-center">{t('mentorReviews.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-layer text-body text-sm">
                {loading && items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="animate-spin" size={24} />
                        {t('mentorReviews.loading')}
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted">{t('mentorReviews.empty')}</td>
                  </tr>
                ) : items.map(item => (
                  <tr key={item.reviewId} className="hover:bg-th-input/50 transition-colors">
                    <td className="p-4 max-w-[220px]">
                      <span className="line-clamp-2 text-heading font-medium" title={item.pathTitle}>{item.pathTitle}</span>
                    </td>
                    <td className="p-4 whitespace-nowrap">{item.studentName}</td>
                    <td className="p-4 whitespace-nowrap">{item.mentorName}</td>
                    <td className="p-4">
                      <StatusBadge status={item.decisionStatus} t={t} />
                    </td>
                    <td className="p-4 whitespace-nowrap text-muted">{formatDate(item.createdAt, locale)}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelected(item)}
                        className="text-accent-primary hover:underline font-medium text-sm"
                      >
                        {t('mentorReviews.viewDetails')}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      {item.decisionStatus === 'WaitingStudentResponse' && (
                        <button
                          onClick={() => setConfirmReminder(item)}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-semibold border border-status-blue text-status-blue hover:bg-status-blue-bg transition-colors mx-auto"
                        >
                          <Bell size={13} />
                          {t('mentorReviews.sendReminder')}
                        </button>
                      )}
                      {item.decisionStatus === 'Pending' && (
                        <button
                          onClick={() => setConfirmMentorReminder(item)}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-semibold border border-status-blue text-status-blue hover:bg-status-blue-bg transition-colors mx-auto"
                        >
                          <Bell size={13} />
                          {t('mentorReviews.sendMentorReminder')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalCount > 0 && (
            <div className="p-4 border-t border-bd flex flex-col md:flex-row items-center justify-between gap-4 bg-th-input/30">
              <span className="text-sm text-muted">
                {t('mentorReviews.showing', {
                  start: (page - 1) * pageSize + 1,
                  end: Math.min(page * pageSize, totalCount),
                  total: totalCount,
                })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 text-body hover:bg-th-card border border-transparent hover:border-bd disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium text-heading min-w-[3rem] text-center">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1 text-body hover:bg-th-card border border-transparent hover:border-bd disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-th-card border border-bd w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-bd">
              <h3 className="text-lg font-bold text-heading flex items-center gap-2">
                <ClipboardList size={20} className="text-accent-primary" />
                {t('mentorReviews.detailTitle')}
              </h3>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-th-input text-muted transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm text-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-th-page border border-bd p-4">
                <div>
                  <p className="text-muted text-xs mb-1">{t('mentorReviews.pathTitle')}</p>
                  <p className="font-semibold text-heading">{selected.pathTitle}</p>
                </div>
                <div>
                  <p className="text-muted text-xs mb-1">{t('mentorReviews.status')}</p>
                  <StatusBadge status={selected.decisionStatus} t={t} />
                </div>
                <div>
                  <p className="text-muted text-xs mb-1">{t('mentorReviews.student')}</p>
                  <p className="font-semibold text-heading">{selected.studentName}</p>
                  <p className="text-muted text-xs">{selected.studentEmail}</p>
                </div>
                <div>
                  <p className="text-muted text-xs mb-1">{t('mentorReviews.mentor')}</p>
                  <p className="font-semibold text-heading">{selected.mentorName}</p>
                  <p className="text-muted text-xs">{selected.mentorEmail}</p>
                </div>
                <div>
                  <p className="text-muted text-xs mb-1">{t('mentorReviews.createdAt')}</p>
                  <p className="font-semibold text-heading">{formatDate(selected.createdAt, locale)}</p>
                </div>
                <div>
                  <p className="text-muted text-xs mb-1">{t('mentorReviews.updatedAt')}</p>
                  <p className="font-semibold text-heading">{formatDate(selected.updatedAt, locale)}</p>
                </div>
                <div>
                  <p className="text-muted text-xs mb-1">{t('mentorReviews.mentorRespondedAt')}</p>
                  <p className="font-semibold text-heading">{formatDate(selected.mentorRespondedAt, locale)}</p>
                </div>
                <div>
                  <p className="text-muted text-xs mb-1">{t('mentorReviews.studentDecidedAt')}</p>
                  <p className="font-semibold text-heading">{formatDate(selected.studentDecidedAt, locale)}</p>
                </div>
              </div>

              {selected.studentRequestNote && (
                <div>
                  <p className="text-muted text-xs mb-1">{t('mentorReviews.studentRequestNote')}</p>
                  <p className="bg-th-page border border-bd p-3 text-body">{selected.studentRequestNote}</p>
                </div>
              )}
              {selected.changeSummary && (
                <div>
                  <p className="text-muted text-xs mb-1">{t('mentorReviews.changeSummary')}</p>
                  <p className="bg-th-page border border-bd p-3 text-body">{selected.changeSummary}</p>
                </div>
              )}
              {selected.changeReason && (
                <div>
                  <p className="text-muted text-xs mb-1">{t('mentorReviews.changeReason')}</p>
                  <p className="bg-th-page border border-bd p-3 text-body">{selected.changeReason}</p>
                </div>
              )}
              {selected.studentDecisionNote && (
                <div>
                  <p className="text-muted text-xs mb-1">{t('mentorReviews.studentDecisionNote')}</p>
                  <p className="bg-th-page border border-bd p-3 text-body">{selected.studentDecisionNote}</p>
                </div>
              )}
            </div>

            {/* Modal footer — trigger button for WaitingStudentResponse or Pending */}
            {(selected.decisionStatus === 'WaitingStudentResponse' || selected.decisionStatus === 'Pending') && (
              <div className="p-4 border-t border-bd flex justify-end">
                {selected.decisionStatus === 'WaitingStudentResponse' && (
                  <button
                    onClick={() => { setConfirmReminder(selected); setSelected(null) }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-status-blue text-status-blue hover:bg-status-blue-bg transition-colors"
                  >
                    <Bell size={15} />
                    {t('mentorReviews.sendReminder')}
                  </button>
                )}
                {selected.decisionStatus === 'Pending' && (
                  <button
                    onClick={() => { setConfirmMentorReminder(selected); setSelected(null) }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-status-blue text-status-blue hover:bg-status-blue-bg transition-colors"
                  >
                    <Bell size={15} />
                    {t('mentorReviews.sendMentorReminder')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Confirm Reminder Dialog */}
      {confirmReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-th-card border border-bd w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-bd">
              <h3 className="text-base font-bold text-heading flex items-center gap-2">
                <Bell size={18} className="text-status-blue" />
                {t('mentorReviews.confirmReminderTitle')}
              </h3>
              <button onClick={() => setConfirmReminder(null)} className="p-1 hover:bg-th-input text-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm text-body">
              <p>{t('mentorReviews.confirmReminderMessage')}</p>
              <div className="bg-th-page border border-bd p-3 space-y-1">
                <p><span className="text-muted">{t('mentorReviews.student')}:</span> <span className="font-semibold text-heading">{confirmReminder.studentName}</span></p>
                <p><span className="text-muted">{t('mentorReviews.pathTitle')}:</span> <span className="font-semibold text-heading">{confirmReminder.pathTitle}</span></p>
              </div>
            </div>
            <div className="p-4 border-t border-bd flex justify-end gap-3">
              <button
                onClick={() => setConfirmReminder(null)}
                disabled={sendingReminder}
                className="px-4 py-2 text-sm border border-bd text-body hover:bg-th-input transition-colors disabled:opacity-50"
              >
                {t('mentorReviews.cancel')}
              </button>
              <button
                onClick={handleSendReminder}
                disabled={sendingReminder}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-status-blue text-status-blue hover:bg-status-blue-bg transition-colors disabled:opacity-50"
              >
                {sendingReminder ? <RefreshCw size={14} className="animate-spin" /> : <Bell size={14} />}
                {sendingReminder ? t('mentorReviews.sending') : t('mentorReviews.confirmSend')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Mentor Reminder Dialog */}
      {confirmMentorReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-th-card border border-bd w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-bd">
              <h3 className="text-base font-bold text-heading flex items-center gap-2">
                <Bell size={18} className="text-status-blue" />
                {t('mentorReviews.confirmMentorReminderTitle')}
              </h3>
              <button onClick={() => setConfirmMentorReminder(null)} className="p-1 hover:bg-th-input text-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm text-body">
              <p>{t('mentorReviews.confirmMentorReminderMessage')}</p>
              <div className="bg-th-page border border-bd p-3 space-y-1">
                <p><span className="text-muted">{t('mentorReviews.mentor')}:</span> <span className="font-semibold text-heading">{confirmMentorReminder.mentorName}</span></p>
                <p><span className="text-muted">{t('mentorReviews.pathTitle')}:</span> <span className="font-semibold text-heading">{confirmMentorReminder.pathTitle}</span></p>
              </div>
            </div>
            <div className="p-4 border-t border-bd flex justify-end gap-3">
              <button
                onClick={() => setConfirmMentorReminder(null)}
                disabled={sendingReminder}
                className="px-4 py-2 text-sm border border-bd text-body hover:bg-th-input transition-colors disabled:opacity-50"
              >
                {t('mentorReviews.cancel')}
              </button>
              <button
                onClick={handleSendMentorReminder}
                disabled={sendingReminder}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-status-blue text-status-blue hover:bg-status-blue-bg transition-colors disabled:opacity-50"
              >
                {sendingReminder ? <RefreshCw size={14} className="animate-spin" /> : <Bell size={14} />}
                {sendingReminder ? t('mentorReviews.sending') : t('mentorReviews.confirmSend')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default AdminMentorReviews
