import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../../store/useAuthStore'
import Layout from '../../../components/Layout'
import { useMentorSidebarConfig } from './components/MentorSideBar'
import { SubjectService, UserService } from '../../../services'
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

  // Students data
  const [students, setStudents] = React.useState<any[]>([])
  const [loadingStudents, setLoadingStudents] = React.useState(false)

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

  const unwrapUsers = (raw: any): any[] => {
    const value = raw?.data ?? raw
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.items)) return value.items
    if (Array.isArray(value?.results)) return value.results
    if (Array.isArray(value?.records)) return value.records
    return []
  }

  const fetchStudents = async () => {
    setLoadingStudents(true)
    try {
      const data = await UserService.listUsers()
      const allUsers = unwrapUsers(data)
      const activeStudents = allUsers.filter((u) => {
        const userRole = (u?.role?.name || u?.roleName || '').toLowerCase()
        const userStatus = (u?.status || '').toLowerCase()
        return userRole === 'student' && userStatus !== 'banned'
      })
      setStudents(activeStudents)
    } catch (e) {
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  React.useEffect(() => {
    fetchStudents()
  }, [])

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: <Users size={18} />, label: t('dashboard.totalStudents'), value: loadingStudents ? '...' : students.length, sub: t('dashboard.activeLearners'), iconColor: 'text-status-blue' },
            { icon: <BookOpen size={18} />, label: t('dashboard.myCourses'), value: 0, sub: t('dashboard.coursesTaught'), iconColor: 'text-status-blue' },
            { icon: <TrendingUp size={18} />, label: t('dashboard.progress'), value: '0%', sub: t('dashboard.avgCompletion'), iconColor: 'text-status-green' },
            { icon: <Star size={18} />, label: t('dashboard.rating'), value: '—', sub: t('dashboard.studentFeedback'), iconColor: 'text-amber-500' },
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
                <div className="text-xs text-muted">{card.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ========== MAIN CONTENT SECTIONS ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* STUDENT LIST */}
          <div className="bg-th-card border border-bd-strong">
            <div className="p-4 border-b border-bd bg-th-page flex items-center gap-3">
              <span className="text-status-blue font-bold flex"><LayoutDashboard size={18} /></span>
              <div>
                <h2 className="text-sm font-bold text-heading uppercase">{t('dashboard.myStudents')}</h2>
                <p className="text-xs text-muted">{t('dashboard.activeStudentList')}</p>
              </div>
            </div>
            
            <div className="p-4">
              {loadingStudents ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm font-bold text-muted">{t('dashboard.loadingStudents')}</span>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-heading font-bold text-lg mb-1">{t('dashboard.noStudentsFound')}</p>
                  <p className="text-xs text-muted">{t('dashboard.studentsWillAppear')}</p>
                </div>
              ) : (
                <div className="space-y-0 divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
                  {students.map((student, i) => {
                    const studentName = student?.name || [student?.firstName, student?.lastName].filter(Boolean).join(' ') || 'Student'
                    const studentEmail = student?.email || '—'
                    const initials = studentName
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                    
                    return (
                      <motion.div
                        key={student?.id || student?.userId || studentEmail}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className="flex items-center gap-4 py-3 hover:bg-th-page transition-colors"
                      >
                        <div className="w-10 h-10 bg-th-card border border-bd-strong flex items-center justify-center flex-shrink-0">
                          <span className="text-heading font-bold text-sm">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-heading text-sm truncate">{studentName}</p>
                          <p className="text-xs text-muted truncate">email: {studentEmail}</p>
                        </div>
                        <button className="px-3 py-1 border border-bd-strong text-xs font-bold hover:bg-th-input transition-colors rounded-sm">
                          {t('dashboard.view')}
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* MY LESSONS */}
          <div className="bg-th-card border border-bd-strong">
            <div className="p-4 border-b border-bd bg-th-page flex items-center gap-3">
              <span className="text-status-blue font-bold flex"><PlaySquare size={18} /></span>
              <div>
                <h2 className="text-sm font-bold text-heading uppercase">{t('dashboard.myLessons')}</h2>
                <p className="text-xs text-muted">{t('dashboard.trackFeedback')}</p>
              </div>
            </div>
            
            <div className="p-8 text-center">
              <p className="text-heading font-bold text-lg mb-1">{t('dashboard.noLessonsScheduled')}</p>
              <p className="text-xs text-muted">{t('dashboard.createCoursesStart')}</p>
            </div>
          </div>
        </div>

        {/* ========== RESOURCES & MATERIALS ========== */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="bg-th-card border border-bd-strong">
            <div className="p-4 border-b border-bd bg-th-page flex items-center gap-3">
              <span className="text-status-blue font-bold flex"><Folder size={18} /></span>
              <div>
                <h2 className="text-sm font-bold text-heading uppercase">{t('dashboard.resources')}</h2>
                <p className="text-xs text-muted">{t('dashboard.manageMaterials')}</p>
              </div>
            </div>
            
            <div className="p-8 text-center">
              <p className="text-heading font-bold text-lg mb-1">{t('dashboard.noResourcesYet')}</p>
              <p className="text-xs text-muted">{t('dashboard.uploadMaterials')}</p>
            </div>
          </div>
        </div>

        {/* ========== STUDENT PERFORMANCE & ANALYTICS ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* STUDENT REVIEWS */}
          <div className="bg-th-card border border-bd-strong">
            <div className="p-4 border-b border-bd bg-th-page flex items-center gap-3">
              <span className="text-status-blue font-bold flex"><Star size={18} /></span>
              <h2 className="text-sm font-bold text-heading uppercase">{t('dashboard.studentReviews')}</h2>
            </div>
            
            <div className="p-8 text-center">
              <p className="text-heading font-bold text-lg mb-1">{t('dashboard.noReviewsYet')}</p>
              <p className="text-xs text-muted">{t('dashboard.studentsWillRate')}</p>
            </div>
          </div>

          {/* ANALYTICS */}
          <div className="lg:col-span-2 bg-th-card border border-bd-strong">
            <div className="p-4 border-b border-bd bg-th-page flex items-center gap-3">
              <span className="text-status-blue font-bold flex"><PieChart size={18} /></span>
              <div>
                <h2 className="text-sm font-bold text-heading uppercase">{t('dashboard.analytics')}</h2>
                <p className="text-xs text-muted">{t('dashboard.performanceOverview')}</p>
              </div>
            </div>
            
            <div className="p-4 border-t border-bd-muted">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                <div className="px-4 py-2">
                  <div className="text-xs font-bold text-muted mb-1">{t('dashboard.totalTeachingHours')}</div>
                  <div className="text-2xl font-bold text-heading">0h</div>
                </div>
                <div className="px-4 py-2">
                  <div className="text-xs font-bold text-muted mb-1">{t('dashboard.lessonsConducted')}</div>
                  <div className="text-2xl font-bold text-heading">0</div>
                </div>
                <div className="px-4 py-2">
                  <div className="text-xs font-bold text-muted mb-1">{t('dashboard.studentSatisfaction')}</div>
                  <div className="text-2xl font-bold text-heading">—</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== QUICK ACTIONS ========== */}
        <div className="bg-th-card border border-bd-strong">
          <div className="p-4 border-b border-bd bg-th-page flex items-center gap-3">
            <span className="text-status-blue font-bold flex"><Zap size={18} /></span>
            <h2 className="text-sm font-bold text-heading uppercase">{t('dashboard.quickActions')}</h2>
          </div>
          
          <div className="p-4">
            <div className="flex flex-wrap gap-4">
              <button className="px-6 py-2 border border-blue-600 bg-status-blue-solid text-white font-bold hover:bg-status-blue-solid-hover transition-colors rounded-sm shadow-sm flex items-center gap-2">
                {t('dashboard.buildCourse')}
              </button>
              <button className="px-6 py-2 border border-blue-600 text-status-blue bg-th-card font-bold hover:bg-status-blue-bg transition-colors rounded-sm shadow-sm flex items-center gap-2">
                {t('dashboard.viewStudents')}
              </button>
              <button className="px-6 py-2 border border-blue-600 text-status-blue bg-th-card font-bold hover:bg-status-blue-bg transition-colors rounded-sm shadow-sm flex items-center gap-2" onClick={openSubjectModal}>
                {t('dashboard.addSubject')}
              </button>
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