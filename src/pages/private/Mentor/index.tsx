import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import Layout from '../../../components/Layout'
import { getMentorSidebarConfig } from './components/MentorSideBar'
import { SubjectService, UserService } from '../../../services'

const MentorDashboard: React.FC = () => {
  const { user } = useAuthStore()
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
    navItems: getMentorSidebarConfig() as any,
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
      setSubjectError('Vui lòng nhập tên subject')
      return
    }
    const slug = newSubjectSlug.trim() || slugify(name)

    try {
      setCreatingSubject(true)
      const created = await SubjectService.createSubject({ name, slug } as any)
      setSubjectSuccess(`Tạo subject "${created?.name || name}" thành công`)
      // Đóng modal sau một chút để người dùng thấy thông báo
      setTimeout(() => setShowSubjectModal(false), 800)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tạo subject'
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
          <div className="mb-6 border-b border-gray-300 pb-4">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-24 h-24 bg-white border border-gray-400 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-900 font-bold text-3xl">[{getInitials(name)}]</span>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold text-gray-900 mb-2 border-none bg-transparent flex items-center justify-center md:justify-start">
                  <span className="text-blue-600 mr-2">{'>_'}</span>
                  {slugify(name)}
                </h1>
                <p className="text-gray-500 mb-1">
                  <span className="text-gray-400 mr-2">{'//'}</span>
                  email: {user?.email ?? '—'}
                </p>
                <p className="text-gray-500 text-sm">
                  <span className="text-gray-400 mr-2">{'//'}</span>
                  role: {role.toLowerCase()}
                </p>
              </div>

              <button
                className="hidden md:inline-flex px-4 py-2 border border-gray-400 bg-white text-gray-700 font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                title="Profile settings"
              >
                [ settings ]
              </button>
            </div>
          </div>

        {/* ========== OVERVIEW GRID ========== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* MY STUDENTS */}
          <div className="bg-white border border-gray-400 p-4">
            <div className="flex items-center gap-3 mb-4 border-b border-gray-200 pb-2">
              <span className="text-blue-600 font-bold">{'>>>'}</span>
              <h3 className="text-sm font-bold text-gray-900 uppercase">Total Students</h3>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {loadingStudents ? '...' : `[${students.length}]`}
              </div>
              <div className="text-xs text-gray-500">{'//'} active learners</div>
            </div>
          </div>

          {/* MY COURSES */}
          <div className="bg-white border border-gray-400 p-4">
            <div className="flex items-center gap-3 mb-4 border-b border-gray-200 pb-2">
              <span className="text-blue-600 font-bold">{'>>>'}</span>
              <h3 className="text-sm font-bold text-gray-900 uppercase">My Courses</h3>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">[0]</div>
              <div className="text-xs text-gray-500">{'//'} courses taught</div>
            </div>
          </div>

          {/* STUDENT PROGRESS */}
          <div className="bg-white border border-gray-400 p-4">
            <div className="flex items-center gap-3 mb-4 border-b border-gray-200 pb-2">
              <span className="text-green-600 font-bold">{'>>>'}</span>
              <h3 className="text-sm font-bold text-gray-900 uppercase">Progress</h3>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">[0%]</div>
              <div className="text-xs text-gray-500">{'//'} avg completion</div>
            </div>
          </div>

          {/* FEEDBACK RATING */}
          <div className="bg-white border border-gray-400 p-4">
            <div className="flex items-center gap-3 mb-4 border-b border-gray-200 pb-2">
              <span className="text-amber-500 font-bold">{'>>>'}</span>
              <h3 className="text-sm font-bold text-gray-900 uppercase">Rating</h3>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">[—]</div>
              <div className="text-xs text-gray-500">{'//'} student feedback</div>
            </div>
          </div>
        </div>

        {/* ========== MAIN CONTENT SECTIONS ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* STUDENT LIST */}
          <div className="bg-white border border-gray-400">
            <div className="p-4 border-b border-gray-300 bg-gray-50 flex items-center gap-3">
              <span className="text-blue-600 font-bold">[*]</span>
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase">My Students</h2>
                <p className="text-xs text-gray-500">{'//'} active student list</p>
              </div>
            </div>
            
            <div className="p-4">
              {loadingStudents ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm font-bold text-gray-500">loading_students...</span>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-900 font-bold text-lg mb-1">no_students_found()</p>
                  <p className="text-xs text-gray-500">{'//'} students will appear here when enrolled</p>
                </div>
              ) : (
                <div className="space-y-0 divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
                  {students.map((student) => {
                    const studentName = student?.name || [student?.firstName, student?.lastName].filter(Boolean).join(' ') || 'Student'
                    const studentEmail = student?.email || '—'
                    const initials = studentName
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                    
                    return (
                      <div
                        key={student?.id || student?.userId || studentEmail}
                        className="flex items-center gap-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-10 h-10 bg-white border border-gray-400 flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-900 font-bold text-sm">[{initials}]</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{studentName}</p>
                          <p className="text-xs text-gray-500 truncate">email: {studentEmail}</p>
                        </div>
                        <button className="px-3 py-1 border border-gray-400 text-xs font-bold hover:bg-gray-100 transition-colors">
                          [ view ]
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* MY LESSONS */}
          <div className="bg-white border border-gray-400">
            <div className="p-4 border-b border-gray-300 bg-gray-50 flex items-center gap-3">
              <span className="text-blue-600 font-bold">[*]</span>
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase">My Lessons</h2>
                <p className="text-xs text-gray-500">{'//'} track & provide feedback</p>
              </div>
            </div>
            
            <div className="p-8 text-center">
              <p className="text-gray-900 font-bold text-lg mb-1">no_lessons_scheduled()</p>
              <p className="text-xs text-gray-500">{'//'} create courses to start teaching</p>
            </div>
          </div>
        </div>

        {/* ========== RESOURCES & MATERIALS ========== */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="bg-white border border-gray-400">
            <div className="p-4 border-b border-gray-300 bg-gray-50 flex items-center gap-3">
              <span className="text-blue-600 font-bold">[*]</span>
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase">Resources</h2>
                <p className="text-xs text-gray-500">{'//'} manage materials & notes</p>
              </div>
            </div>
            
            <div className="p-8 text-center">
              <p className="text-gray-900 font-bold text-lg mb-1">no_resources_yet()</p>
              <p className="text-xs text-gray-500">{'//'} upload learning materials when you create courses</p>
            </div>
          </div>
        </div>

        {/* ========== STUDENT PERFORMANCE & ANALYTICS ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* STUDENT REVIEWS */}
          <div className="bg-white border border-gray-400">
            <div className="p-4 border-b border-gray-300 bg-gray-50 flex items-center gap-3">
              <span className="text-blue-600 font-bold">[*]</span>
              <h2 className="text-sm font-bold text-gray-900 uppercase">Student Reviews</h2>
            </div>
            
            <div className="p-8 text-center">
              <p className="text-gray-900 font-bold text-lg mb-1">no_reviews_yet()</p>
              <p className="text-xs text-gray-500">{'//'} students will rate your teaching</p>
            </div>
          </div>

          {/* ANALYTICS */}
          <div className="lg:col-span-2 bg-white border border-gray-400">
            <div className="p-4 border-b border-gray-300 bg-gray-50 flex items-center gap-3">
              <span className="text-blue-600 font-bold">[*]</span>
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase">Analytics</h2>
                <p className="text-xs text-gray-500">{'//'} teaching performance overview</p>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                <div className="px-4 py-2">
                  <div className="text-xs font-bold text-gray-500 mb-1">total_teaching_hours:</div>
                  <div className="text-2xl font-bold text-gray-900">0h</div>
                </div>
                <div className="px-4 py-2">
                  <div className="text-xs font-bold text-gray-500 mb-1">lessons_conducted:</div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                </div>
                <div className="px-4 py-2">
                  <div className="text-xs font-bold text-gray-500 mb-1">student_satisfaction:</div>
                  <div className="text-2xl font-bold text-gray-900">—</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== QUICK ACTIONS ========== */}
        <div className="bg-white border border-gray-400">
          <div className="p-4 border-b border-gray-300 bg-gray-50 flex items-center gap-3">
            <span className="text-blue-600 font-bold">[*]</span>
            <h2 className="text-sm font-bold text-gray-900 uppercase">Quick Actions</h2>
          </div>
          
          <div className="p-4">
            <div className="flex flex-wrap gap-4">
              <button className="px-6 py-2 border border-blue-600 bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors">
                [ + build_course ]
              </button>
              <button className="px-6 py-2 border border-blue-600 text-blue-600 bg-white font-bold hover:bg-blue-50 transition-colors">
                [ view_students ]
              </button>
              <button className="px-6 py-2 border border-blue-600 text-blue-600 bg-white font-bold hover:bg-blue-50 transition-colors" onClick={openSubjectModal}>
                [ + add_subject ]
              </button>
            </div>
          </div>
        </div>

        {/* ========== SUBJECT CREATE MODAL ========== */}
        {showSubjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white border-2 border-gray-800 w-full max-w-md mx-4 p-6 shadow-2xl font-mono">
              <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">
                <span className="text-blue-600 mr-2">{'>_'}</span>
                create_new_subject
              </h3>
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">subject_name:</label>
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
                    className="w-full border border-gray-400 px-3 py-2 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">slug_optional:</label>
                  <input
                    type="text"
                    value={newSubjectSlug}
                    onChange={(e) => setNewSubjectSlug(slugify(e.target.value))}
                    placeholder="e.g. javascript"
                    className="w-full border border-gray-400 px-3 py-2 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {subjectError && (
                  <div className="text-sm font-bold text-red-600 border border-red-500 bg-red-50 px-3 py-2 text-center">
                    {'//'} {subjectError}
                  </div>
                )}
                {subjectSuccess && (
                  <div className="text-sm font-bold text-green-700 border border-green-500 bg-green-50 px-3 py-2 text-center">
                    {'//'} {subjectSuccess}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-300">
                  <button
                    type="button"
                    className="px-6 py-2 border border-gray-400 bg-white text-gray-700 font-bold hover:bg-gray-100 transition-colors"
                    onClick={() => setShowSubjectModal(false)}
                    disabled={creatingSubject}
                  >
                    [ cancel ]
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 border border-blue-600 bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
                    disabled={creatingSubject}
                  >
                    {creatingSubject ? '[ creating... ]' : '[ create ]'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      </div>
    </Layout>
  )
}

export default MentorDashboard