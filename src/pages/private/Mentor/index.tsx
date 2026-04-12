import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../../store/useAuthStore'
import Layout from '../../../components/Layout'
import { useMentorSidebarConfig } from './components/MentorSideBar'
import { SubjectService, DashboardService, LearningPathService } from '../../../services'
import { useChatHub } from '../../../hooks/useChatHub'
import { useTranslation } from 'react-i18next'
import { Settings, Users, BookOpen, TrendingUp, Star, LayoutDashboard, PlaySquare, Folder, PieChart, Zap, User as UserIcon } from 'lucide-react'

const MentorDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const { t } = useTranslation('mentor')
  const name = user?.name || user?.username || 'Mentor'
  const role = user?.role?.name || 'Mentor'

  // Subject modal state
  const [showSubjectModal, setShowSubjectModal] = React.useState(false)
  const [newSubjectName, setNewSubjectName] = React.useState('')
  const [newSubjectSlug, setNewSubjectSlug] = React.useState('')
  const [creatingSubject, setCreatingSubject] = React.useState(false)
  const [subjectError, setSubjectError] = React.useState<string | null>(null)
  const [subjectSuccess, setSubjectSuccess] = React.useState<string | null>(null)

  // Overview data
  const [loadingOverview, setLoadingOverview] = React.useState(true)
  const [overviewData, setOverviewData] = React.useState<any>(null)
  const [recentMessages, setRecentMessages] = React.useState<any[]>([])
  const [recentDrafts, setRecentDrafts] = React.useState<any[]>([])
  const [loadingDrafts, setLoadingDrafts] = React.useState(true)

  const sidebarConfig = {
    navItems: useMentorSidebarConfig() as any,
    actions: [],
    brand: { name: 'Overview', subtitle: 'Mentor' },
  }

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const slugify = (v: string) => v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  const fetchOverview = async () => {
    setLoadingOverview(true)
    try {
      const data = await DashboardService.getMentorOverview()
      setOverviewData(data)
      setRecentMessages(data.recentStudentMessages || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingOverview(false)
    }
  }

  const fetchDrafts = async () => {
    setLoadingDrafts(true)
    try {
      const data = await LearningPathService.getMyDrafts({ pageSize: 5, sortDescending: true })
      setRecentDrafts(data.items || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDrafts(false)
    }
  }

  React.useEffect(() => {
    fetchOverview()
    fetchDrafts()
  }, [])

  useChatHub({
    onMentorDashboardRecentMessageReceived: React.useCallback((payload) => {
      setRecentMessages((prev) => {
        const existingIdx = prev.findIndex((m) => m.studentId === payload.studentId)
        const newList = [...prev]
        if (existingIdx !== -1) {
          newList.splice(existingIdx, 1)
        }
        newList.unshift(payload)
        return newList.slice(0, 5)
      })
    }, [])
  })

  const openSubjectModal = () => {
    setShowSubjectModal(true)
    setSubjectError(null)
    setSubjectSuccess(null)
    setNewSubjectName('')
    setNewSubjectSlug('')
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubjectError(null)
    setSubjectSuccess(null)
    const name = newSubjectName.trim()
    if (!name) {
      setSubjectError(t('dashboard.enterSubjectName'))
      return
    }
    const slug = newSubjectSlug.trim() || slugify(name)

    try {
      setCreatingSubject(true)
      const created = await SubjectService.createSubject({ name, slug } as any)
      setSubjectSuccess(t('dashboard.createSuccess', { name: created?.name || name }))
      // Đóng modal sau một chút để người dùng thấy thông báo
      setTimeout(() => setShowSubjectModal(false), 800)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || t('dashboard.createFailed')
      setSubjectError(msg)
    } finally {
      setCreatingSubject(false)
    }
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-8 bg-[var(--gray-100)] min-h-screen font-mono">
        {/* ========== MENTOR PROFILE HEADER ========== */}
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="mb-6 border-b border-bd pb-4">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-24 h-24 bg-th-card border border-bd-strong flex items-center justify-center flex-shrink-0">
                <span className="text-heading font-bold text-3xl">{getInitials(name)}</span>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold text-heading mb-2 border-none bg-transparent flex items-center justify-center md:justify-start">
                  <span className="text-status-blue mr-2"><UserIcon size={24} /></span>
                  {slugify(name)}
                </h1>
                <p className="text-muted mb-1">
                  email: {user?.email ?? '—'}
                </p>
                <p className="text-muted text-sm">
                  role: {role.toLowerCase()}
                </p>
              </div>

              <button
                className="hidden md:inline-flex items-center gap-2 px-4 py-2 border border-bd-strong bg-th-card text-body font-bold hover:bg-th-page transition-colors cursor-pointer rounded-sm"
                title={t('dashboard.settings')}
              >
                <Settings size={18} /> {t('dashboard.settings').toLowerCase()}
              </button>
            </div>
          </div>

        {/* ========== OVERVIEW GRID ========== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { icon: <Users size={18} />, label: t('dashboard.totalStudents'), value: loadingOverview ? '...' : (overviewData?.supportedStudentsCount || 0), iconColor: 'text-status-blue' },
            { icon: <BookOpen size={18} />, label: t('dashboard.myCourses'), value: loadingOverview ? '...' : (overviewData?.createdSubjectsCount || 0), iconColor: 'text-status-blue' },
            { icon: <TrendingUp size={18} />, label: t('dashboard.draftPaths', 'Draft Paths'), value: loadingOverview ? '...' : (overviewData?.draftLearningPathsCount || 0), iconColor: 'text-status-green' },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.09, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -4, scale: 1.01 }}
              className="bg-th-card border border-bd-strong p-4"
            >
              <div className="flex items-center gap-3 mb-4 border-b border-bd-muted pb-2">
                <span className={`${card.iconColor} font-bold flex`}>{card.icon}</span>
                <h3 className="text-sm font-bold text-heading uppercase">{card.label}</h3>
              </div>
              <div>
                <div className="text-3xl font-bold text-heading mb-1">{card.value}</div>
              </div>
            </motion.div>
          ))}
        </div>


        {/* ========== MAIN CONTENT SECTIONS ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* RECENT MESSAGES */}
          <div className="lg:col-span-2 bg-th-card border border-bd-strong">
            <div className="p-4 border-b border-bd bg-th-page flex items-center gap-3">
              <span className="text-status-blue font-bold flex"><LayoutDashboard size={18} /></span>
              <div>
                <h2 className="text-sm font-bold text-heading uppercase">{t('dashboard.recentMessages', 'Recent Messages')}</h2>
                <p className="text-xs text-muted">{t('dashboard.latestFromStudents', 'Latest messages from students')}</p>
              </div>
            </div>
            
            <div className="p-4">
              {loadingOverview ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm font-bold text-muted">{t('dashboard.loadingData', 'Loading...')}</span>
                </div>
              ) : recentMessages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-heading font-bold text-lg mb-1">{t('dashboard.noMessagesFound', 'No messages')}</p>
                  <p className="text-xs text-muted">{t('dashboard.messagesWillAppear', 'Incoming messages will appear here')}</p>
                </div>
              ) : (
                <div className="space-y-0 divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
                  {recentMessages.map((msg, i) => {
                    const initials = getInitials(msg.studentName || 'Student')
                    const dateStr = msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(msg.sentAt).toLocaleDateString() : ''
                    return (
                      <motion.div
                        key={msg.messageId || i}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className="flex items-center gap-4 py-3 hover:bg-th-page transition-colors"
                      >
                        <div className="w-10 h-10 bg-th-card border border-bd-strong flex items-center justify-center flex-shrink-0">
                          <span className="text-heading font-bold text-sm">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-heading text-sm truncate">{msg.studentName}</p>
                          <p className="text-xs text-muted truncate">{msg.content}</p>
                        </div>
                        {dateStr && (
                          <div className="text-[10px] text-muted whitespace-nowrap self-start mt-1">
                            {dateStr}
                          </div>
                        )}

                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RECENT DRAFTS */}
          <div className="lg:col-span-3 bg-th-card border border-bd-strong">
            <div className="p-4 border-b border-bd bg-th-page flex items-center gap-3">
              <span className="text-status-blue font-bold flex"><Folder size={18} /></span>
              <div>
                <h2 className="text-sm font-bold text-heading uppercase">{t('dashboard.recentDrafts', 'Recent Drafts')}</h2>
                <p className="text-xs text-muted">{t('dashboard.recentDraftsSub', 'Recently created or updated learning paths')}</p>
              </div>
            </div>
            
            <div className="p-4">
              {loadingDrafts ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm font-bold text-muted">{t('dashboard.loadingData', 'Loading...')}</span>
                </div>
              ) : recentDrafts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-heading font-bold text-lg mb-1">{t('dashboard.noDraftsYet', 'No drafts found')}</p>
                  <p className="text-xs text-muted">{t('dashboard.createDraftToSee', 'Create a new draft learning path to see it here')}</p>
                </div>
              ) : (
                <div className="space-y-0 divide-y divide-gray-200">
                  {recentDrafts.map((draft, i) => {
                    const dateStr = draft.createdAt ? new Date(draft.createdAt).toLocaleDateString() : ''
                    return (
                      <div key={draft.pathId || i} className="flex items-center gap-4 py-3 hover:bg-th-page transition-colors px-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-heading text-sm truncate">{draft.title || t('dashboard.untitledDraft', 'Untitled Draft')}</p>
                          <p className="text-xs text-muted truncate">{draft.description || '—'}</p>
                        </div>
                        <div className="text-xs text-muted whitespace-nowrap hidden sm:block">
                          ver {draft.version || 1}
                        </div>
                        {dateStr && (
                          <div className="text-[10px] text-muted whitespace-nowrap">
                            {dateStr}
                          </div>
                        )}
                        <button 
                          className="px-3 py-1 border border-bd-strong text-xs font-bold hover:bg-th-input transition-colors rounded-sm ml-2 cursor-pointer"
                          onClick={() => window.location.href = `/mentor/drafts/${draft.pathId}`}
                        >
                          {t('dashboard.open', 'Open')}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* ========== SUBJECT CREATE MODAL ========== */}
        <AnimatePresence>
        {showSubjectModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="bg-th-card border-2 border-bd-dark w-full max-w-md mx-4 p-6 shadow-2xl font-mono"
              initial={{ scale: 0.93, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 12 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <h3 className="text-xl font-bold text-heading mb-4 border-b border-bd pb-2 flex items-center gap-2">
                <BookOpen size={20} className="text-status-blue" />
                {t('dashboard.createNewSubject')}
              </h3>
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">{t('dashboard.subjectName')}</label>
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    onBlur={() => {
                      if (!newSubjectSlug.trim() && newSubjectName.trim()) {
                        setNewSubjectSlug(slugify(newSubjectName))
                      }
                    }}
                    placeholder="e.g. JavaScript"
                    className="w-full border border-bd-strong px-3 py-2 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">{t('dashboard.slugOptional')}</label>
                  <input
                    type="text"
                    value={newSubjectSlug}
                    onChange={(e) => setNewSubjectSlug(slugify(e.target.value))}
                    placeholder="e.g. javascript"
                    className="w-full border border-bd-strong px-3 py-2 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {subjectError && (
                  <div className="text-sm font-bold text-status-red border border-red-500 bg-status-red-bg px-3 py-2 text-center rounded-sm">
                    {subjectError}
                  </div>
                )}
                {subjectSuccess && (
                  <div className="text-sm font-bold text-status-green-dark border border-green-500 bg-status-green-bg px-3 py-2 text-center rounded-sm">
                    {subjectSuccess}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-bd">
                  <button
                    type="button"
                    className="px-6 py-2 border border-bd-strong bg-th-card text-body font-bold hover:bg-th-input transition-colors rounded-sm"
                    onClick={() => setShowSubjectModal(false)}
                    disabled={creatingSubject}
                  >
                    {t('dashboard.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 border border-blue-600 bg-status-blue-solid text-white font-bold hover:bg-status-blue-solid-hover transition-colors rounded-sm disabled:opacity-60"
                    disabled={creatingSubject}
                  >
                    {creatingSubject ? t('dashboard.creating') : t('dashboard.create')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>
        </div>
      </div>
    </Layout>
  )
}

export default MentorDashboard