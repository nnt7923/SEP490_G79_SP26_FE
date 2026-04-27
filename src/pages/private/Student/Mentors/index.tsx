import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import MentorService from '../../../../services/MentorService'
import type { MentorDto } from '../../../../services/MentorService'
import { SubjectService } from '../../../../services'
import type { Subject } from '../../../../services/SubjectService'
import { Search, Star, MessageCircle, Loader2, ChevronLeft, ChevronRight, User, X, ChevronDown } from 'lucide-react'
import ROUTER from '../../../../router/ROUTER'

const PAGE_SIZE = 6

const SUBJECT_CATEGORIES = [
  'ProgrammingLanguage', 'Frontend', 'Backend', 'Database',
  'Cloud', 'DataScience', 'MachineLearning', 'Algorithms',
  'GameDevelopment', 'Mobile', 'Other',
] as const

// ── Profile Modal ────────────────────────────────────────────────────────────
function MentorProfileModal({ mentorId, onClose, onChat }: {
  mentorId: string
  onClose: () => void
  onChat: (mentorId: string) => void
}) {
  const { t } = useTranslation('student')
  const [mentor, setMentor] = useState<MentorDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    MentorService.getMentorById(mentorId)
      .then(setMentor)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mentorId])

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('mentors.profile', 'Mentor Profile')}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex' }}><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            </div>
          )}
          {!loading && mentor && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Avatar + basic info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {mentor.avatarUrl ? (
                  <img src={mentor.avatarUrl} alt={mentor.fullName} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, flexShrink: 0 }}>
                    {mentor.fullName?.charAt(0)?.toUpperCase() || 'M'}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{mentor.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>@{mentor.username}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={13} fill={s <= Math.round(mentor.averageRating) ? 'var(--warning-primary,#f59e0b)' : 'none'} color={s <= Math.round(mentor.averageRating) ? 'var(--warning-primary,#f59e0b)' : 'var(--text-disabled,#cbd5e1)'} strokeWidth={1.5} />
                    ))}
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {mentor.averageRating > 0 ? mentor.averageRating.toFixed(1) : t('mentors.noRating', 'No rating')} · {mentor.totalReviews} {t('mentors.reviews', 'reviews')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {mentor.bio && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t('mentors.bio', 'Biography')}</div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{mentor.bio}</p>
                </div>
              )}

              {/* Specializations */}
              {mentor.specializations?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t('mentors.specializations', 'Specializations')}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {mentor.specializations.map(s => (
                      <span key={s} style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 999, color: 'var(--accent-primary)' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Subjects */}
              {mentor.specializedSubjects?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t('mentors.subjects', 'Subjects')}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {mentor.specializedSubjects.map(s => (
                      <span key={s} style={{ fontSize: 11, padding: '3px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 999, color: 'var(--text-secondary)' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent reviews */}
              {mentor.recentReviews && mentor.recentReviews.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{t('mentors.recentReviews', 'Recent Reviews')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {mentor.recentReviews.slice(0, 3).map(r => (
                      <div key={r.ratingId} style={{ padding: '10px 12px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          {r.studentAvatarUrl ? (
                            <img src={r.studentAvatarUrl} alt={r.studentName} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                              {r.studentName?.charAt(0)?.toUpperCase() || 'S'}
                            </div>
                          )}
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{r.studentName}</span>
                          <div style={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} size={10} fill={s <= r.score ? 'var(--warning-primary,#f59e0b)' : 'none'} color={s <= r.score ? 'var(--warning-primary,#f59e0b)' : 'var(--text-disabled,#cbd5e1)'} strokeWidth={1.5} />
                            ))}
                          </div>
                        </div>
                        {r.comment && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-base)', display: 'flex', gap: 8 }}>
          <button
            onClick={() => { onChat(mentorId); onClose() }}
            style={{ flex: 1, padding: '9px 16px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <MessageCircle size={14} /> {t('mentors.chat', 'Chat')}
          </button>
          <button
            onClick={onClose}
            style={{ padding: '9px 16px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {t('mentors.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ───────────

const MentorsPage: React.FC = () => {
  const { t } = useTranslation('student')
  const navigate = useNavigate()
  const navItems = useStudentSidebarConfig()

  const [mentors, setMentors] = useState<MentorDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubjectName, setSelectedSubjectName] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [profileMentorId, setProfileMentorId] = useState<string | null>(null)

  const sidebarConfig = {
    navItems,
    actions: [],
    brand: { name: t('mentors.title', 'Mentors'), subtitle: 'CodeNexus' },
  }

  // Load subjects for filter
  useEffect(() => {
    SubjectService.listSubjects().then(setSubjects).catch(() => {})
  }, [])

  const filteredSubjects = selectedCategory
    ? subjects.filter(s => String(s.category) === selectedCategory)
    : subjects

  const loadMentors = useCallback(async (page: number, search: string, category: string, subjectName: string) => {
    setLoading(true)
    setError(null)
    try {
      const params: any = { PageNumber: page, PageSize: PAGE_SIZE }
      if (search.trim()) params.SearchTerm = search.trim()
      if (category) params.SubjectCategory = category
      if (subjectName) params.SubjectName = subjectName
      const res = await MentorService.getMentors(params)
      setMentors(res.items || [])
      setTotalPages(res.totalPages || 1)
      setTotalCount(res.totalCount || 0)
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t('mentors.loadFailed', 'Failed to load mentors'))
    } finally {
      setLoading(false)
    }
  }, [t])

  // Load when page changes
  useEffect(() => {
    loadMentors(currentPage, searchQuery, selectedCategory, selectedSubjectName)
  }, [currentPage])

  // Debounce search + filter changes → reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      loadMentors(1, searchQuery, selectedCategory, selectedSubjectName)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedCategory, selectedSubjectName])

  const handleChat = (mentorId: string) => {
    navigate(ROUTER.CHAT, { state: { activeTab: 'contacts', selectedMentorId: mentorId } })
  }

  const renderStars = (rating: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={12}
          fill={s <= Math.round(rating) ? 'var(--warning-primary,#f59e0b)' : 'none'}
          color={s <= Math.round(rating) ? 'var(--warning-primary,#f59e0b)' : 'var(--text-disabled,#cbd5e1)'}
          strokeWidth={1.5} />
      ))}
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>
        {rating > 0 ? rating.toFixed(1) : t('mentors.noRating', 'No rating')}
      </span>
    </div>
  )

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: '32px 24px', background: 'var(--bg-main)', minHeight: '100vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('mentors.title', 'Mentors')}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('mentors.subtitle', 'Find and connect with mentors')}
            </p>
          </div>

          {/* Pagination top */}
          {!loading && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {t('mentors.totalCount', '{{count}} mentors', { count: totalCount })}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid var(--border-base)', borderRadius: 6, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}>
                  <ChevronLeft size={13} /> {t('mentors.prev', 'Prev')}
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid var(--border-base)', borderRadius: 6, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}>
                  {t('mentors.next', 'Next')} <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('mentors.searchPlaceholder', 'Search by name...')}
                style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid var(--border-base)', borderRadius: 6, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
            </div>

            {/* Category */}
            <div style={{ position: 'relative', flex: '0 0 180px' }}>
              <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setSelectedSubjectName('') }}
                style={{ width: '100%', padding: '7px 28px 7px 10px', border: '1px solid var(--border-base)', borderRadius: 6, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                <option value="">{t('mentors.allCategories', 'All Categories')}</option>
                {SUBJECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
            </div>

            {/* Subject */}
            <div style={{ position: 'relative', flex: '0 0 180px' }}>
              <select value={selectedSubjectName} onChange={e => setSelectedSubjectName(e.target.value)}
                style={{ width: '100%', padding: '7px 28px 7px 10px', border: '1px solid var(--border-base)', borderRadius: 6, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                <option value="">{t('mentors.allSubjects', 'All Subjects')}</option>
                {filteredSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
            </div>

            {/* Clear */}
            {(searchQuery || selectedCategory || selectedSubjectName) && (
              <button onClick={() => { setSearchQuery(''); setSelectedCategory(''); setSelectedSubjectName('') }}
                style={{ padding: '7px 12px', border: '1px solid var(--border-base)', borderRadius: 6, background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <X size={12} /> {t('mentors.clearFilters', 'Clear')}
              </button>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.06)', border: '1px solid var(--danger-primary)', borderRadius: 8, color: 'var(--danger-primary)', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Empty */}
          {!loading && !error && mentors.length === 0 && (
            <div style={{ padding: '48px 20px', textAlign: 'center', border: '1px dashed var(--border-base)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 14 }}>
              {t('mentors.empty', 'No mentors found.')}
            </div>
          )}

          {/* Grid */}
          {!loading && !error && mentors.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
              {mentors.map(mentor => (
                <div key={mentor.mentorId}
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, transition: 'box-shadow 0.15s, border-color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border-base)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {mentor.avatarUrl ? (
                      <img src={mentor.avatarUrl} alt={mentor.fullName} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                        {mentor.fullName?.charAt(0)?.toUpperCase() || 'M'}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mentor.fullName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>@{mentor.username}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {renderStars(mentor.averageRating)}
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{mentor.totalReviews} {t('mentors.reviews', 'reviews')}</span>
                  </div>

                  {mentor.bio && (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {mentor.bio}
                    </p>
                  )}

                  {mentor.specializedSubjects?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {mentor.specializedSubjects.slice(0, 3).map(s => (
                        <span key={s} style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 999, color: 'var(--text-secondary)' }}>{s}</span>
                      ))}
                      {mentor.specializedSubjects.length > 3 && (
                        <span style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 999, color: 'var(--text-secondary)' }}>+{mentor.specializedSubjects.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
                    <button onClick={() => handleChat(mentor.mentorId)}
                      style={{ flex: 1, padding: '7px 12px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <MessageCircle size={13} /> {t('mentors.chat', 'Chat')}
                    </button>
                    <button onClick={() => setProfileMentorId(mentor.mentorId)}
                      style={{ flex: 1, padding: '7px 12px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-base)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-base)'}>
                      <User size={13} /> {t('mentors.viewProfile', 'Profile')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination bottom */}
          {!loading && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid var(--border-base)', borderRadius: 6, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={14} /> {t('mentors.prev', 'Prev')}
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid var(--border-base)', borderRadius: 6, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}>
                {t('mentors.next', 'Next')} <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {profileMentorId && (
        <MentorProfileModal
          mentorId={profileMentorId}
          onClose={() => setProfileMentorId(null)}
          onChat={handleChat}
        />
      )}
    </Layout>
  )
}

export default MentorsPage
