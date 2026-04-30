import React, { useState, useEffect, useMemo } from 'react'
import { X, Star, MessageCircle, User, Search, Loader2, ChevronDown, Eye, ArrowLeft, Send, BookOpen } from 'lucide-react'
import MentorService from '../../services/MentorService'
import type { MentorDto, MentorReviewDto } from '../../services/MentorService'
import { SubjectService, SubjectCategory } from '../../services'
import type { Subject, SubjectCategoryType } from '../../services/SubjectService'
import SubscriptionService from '../../services/SubscriptionService'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import ROUTER from '../../router/ROUTER'
import LearningPathService from '../../services/LearningPathService'

interface SelectMentorModalProps {
  isOpen: boolean
  onClose: () => void
  askMentorContext?: any
  onMentorSelected?: (mentor: MentorDto) => void
}

const SelectMentorModal: React.FC<SelectMentorModalProps> = ({
  isOpen,
  onClose,
  askMentorContext,
  onMentorSelected,
}) => {
  const { t } = useTranslation('student')
  const navigate = useNavigate()

  // Review request state (when reviewPathId is present)
  const reviewPathId: string | undefined = (askMentorContext as any)?.reviewPathId
  const reviewPathTitle: string | undefined = (askMentorContext as any)?.reviewPathTitle
  const [confirmMentor, setConfirmMentor] = useState<MentorDto | null>(null)
  const [requestNote, setRequestNote] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const [mentors, setMentors] = useState<MentorDto[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingShareQuota, setCheckingShareQuota] = useState<boolean>(false)
  const [hasCheckedShareQuota, setHasCheckedShareQuota] = useState<boolean>(false)
  const [shareQuotaRemaining, setShareQuotaRemaining] = useState<number | null>(null)

  // Subject data from API
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState<boolean>(false)

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<SubjectCategoryType | ''>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [minRating, setMinRating] = useState<number>(0)

  // Profile view
  const [profileMentor, setProfileMentor] = useState<MentorDto | null>(null)
  const [profileDetail, setProfileDetail] = useState<MentorDto | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number>(0)
  const pageSize = 6
  const isShareQuotaExceeded = shareQuotaRemaining === 0

  // Get category name helper
  const getCategoryName = (categoryValue: SubjectCategoryType): string => {
    const entry = Object.entries(SubjectCategory).find(([_, val]) => val === categoryValue)
    return entry ? entry[0] : String(categoryValue)
  }

  // Load subjects from API
  useEffect(() => {
    if (!isOpen) return

    const loadSubjects = async () => {
      setLoadingSubjects(true)
      try {
        const data = await SubjectService.listSubjects()
        setSubjects(data || [])
      } catch (e: any) {
        console.error('Failed to load subjects:', e)
      } finally {
        setLoadingSubjects(false)
      }
    }

    loadSubjects()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setShareQuotaRemaining(null)
      setCheckingShareQuota(false)
      setHasCheckedShareQuota(false)
      return
    }

    let active = true
    const loadMentorQuota = async () => {
      setHasCheckedShareQuota(false)
      setCheckingShareQuota(true)
      try {
        const quota = await SubscriptionService.getMentorQuota()
        const limit = Number(quota?.sharesFromMentorLimit ?? 0)
        const used = Number(quota?.sharesFromMentorUsed ?? 0)
        const remaining = limit === -1 ? -1 : Math.max(0, limit - Math.max(0, used))
        if (active) setShareQuotaRemaining(remaining)
      } catch {
        if (active) setShareQuotaRemaining(null)
      } finally {
        if (active) {
          setCheckingShareQuota(false)
          setHasCheckedShareQuota(true)
        }
      }
    }

    void loadMentorQuota()
    return () => {
      active = false
    }
  }, [isOpen])

  // Get unique categories from subjects
  const availableCategories = useMemo(() => {
    const cats = new Set<SubjectCategoryType>()
    subjects.forEach(subject => {
      if (subject.category !== undefined && subject.category !== null) {
        cats.add(subject.category)
      }
    })
    return Array.from(cats).sort((a, b) => a - b)
  }, [subjects])

  // Filter subjects by selected category
  const filteredSubjects = useMemo(() => {
    if (selectedCategory === '') return subjects
    return subjects.filter(s => s.category === selectedCategory)
  }, [subjects, selectedCategory])

  // Load mentors
  const loadMentors = async () => {
    setLoading(true)
    setError(null)

    try {
      const params: any = {
        PageNumber: currentPage,
        PageSize: pageSize,
      }

      // SearchTerm - combine search query
      if (searchQuery.trim()) {
        params.SearchTerm = searchQuery.trim()
      }

      // SubjectCategory - use category name
      if (selectedCategory !== '') {
        params.SubjectCategory = getCategoryName(selectedCategory)
      }
      
      // SubjectName - use subject name
      if (selectedSubject) {
        const subject = subjects.find(s => s.id === selectedSubject)
        if (subject) {
          params.SubjectName = subject.name
        }
      }

      console.log('Loading mentors with params:', params)

      const response = await MentorService.getMentors(params)
      
      // Client-side filter by minRating if needed
      let filteredMentors = response.items || []
      if (minRating > 0) {
        filteredMentors = filteredMentors.filter(m => m.averageRating >= minRating)
      }
      
      setMentors(filteredMentors)
      setTotalPages(response.totalPages || 1)
      setTotalCount(response.totalCount || 0)
    } catch (e: any) {
      console.error('Failed to load mentors:', e)
      const errorData = e?.response?.data
      const errorMessage = errorData?.message || errorData?.errorMessage || errorData?.title || e?.message || t('plans.failedLoadMentors')
      setError(errorMessage)
      
      // If 400 error, show more details
      if (e?.response?.status === 400) {
        console.error('400 Bad Request details:', errorData)
        setError(`${errorMessage} (Vui lòng kiểm tra API endpoint hoặc params)`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Load mentors when modal opens or filters change
  useEffect(() => {
    if (isOpen && hasCheckedShareQuota && !checkingShareQuota && !isShareQuotaExceeded) {
      loadMentors()
    }
  }, [isOpen, currentPage, selectedCategory, selectedSubject, minRating, hasCheckedShareQuota, checkingShareQuota, isShareQuotaExceeded])

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [selectedCategory, selectedSubject, minRating])

  // Load mentor detail when profile opens
  useEffect(() => {
    if (!profileMentor) {
      setProfileDetail(null)
      return
    }
    setProfileLoading(true)
    MentorService.getMentorById(profileMentor.mentorId)
      .then((data) => setProfileDetail(data))
      .catch(() => setProfileDetail(profileMentor))
      .finally(() => setProfileLoading(false))
  }, [profileMentor])

  // Filter mentors by search query (client-side)
  const displayedMentors = useMemo(() => {
    if (!searchQuery.trim()) return mentors

    const query = searchQuery.toLowerCase()
    return mentors.filter(mentor => 
      mentor.fullName?.toLowerCase().includes(query) ||
      mentor.username?.toLowerCase().includes(query) ||
      mentor.bio?.toLowerCase().includes(query)
    )
  }, [mentors, searchQuery])

  const handleSelectMentor = (mentor: MentorDto) => {
    if (onMentorSelected) {
      onMentorSelected(mentor)
      return
    }
    if (reviewPathId) {
      setConfirmMentor(mentor)
      setRequestNote('')
      setRequestError(null)
      return
    }
    // Default: navigate to chat
    const ctx = askMentorContext as any
    navigate(ROUTER.CHAT, {
      state: {
        activeTab: 'contacts',
        selectedMentorId: mentor.mentorId,
        askMentorContext: (ctx?.subject || ctx?.goals) ? askMentorContext : undefined,
        reviewPathId: ctx?.reviewPathId ?? undefined,
        reviewPathTitle: ctx?.reviewPathTitle ?? undefined,
      },
    })
    onClose()
  }

  const handleSendReviewRequest = async () => {
    if (!confirmMentor || !reviewPathId) return
    setRequesting(true)
    setRequestError(null)
    try {
      const result = await LearningPathService.requestMentorReview(reviewPathId, {
        mentorId: confirmMentor.mentorId,
        studentRequestNote: requestNote.trim() || null,
      })

      // Gửi chat message cho mentor để thông báo
      try {
        const { createOrGetConversation } = await import('../../services/DirectChatService')
        const { sendMessageRest } = await import('../../services/DirectChatService')
        const conv = await createOrGetConversation(confirmMentor.mentorId)
        if (conv?.conversationId) {
          const note = requestNote.trim()
          const revisedPathId = (result as any)?.revisedPathId || ''
          const msg = `[REVIEW_REQUEST] pathId=${reviewPathId} revisedPathId=${revisedPathId} studentId=${result.studentId || ''} title=${reviewPathTitle || reviewPathId} note=${note || 'Nhờ bạn review lộ trình học của tôi.'}`
          await sendMessageRest(conv.conversationId, msg, 'Text', null)
        }
      } catch {
        // chat message thất bại không block flow chính
      }

      onClose()
      setConfirmMentor(null)
      navigate(`/learning-paths/${reviewPathId}/mentor-review`, {
        state: { review: result },
      })
    } catch (e: any) {
      const status = e?.response?.status
      const data = e?.response?.data
      const code = data?.errorCode || data?.ErrorCode
      const msgs: Record<string, string> = {
        SELF_REVIEW_NOT_ALLOWED: 'Không thể nhờ chính mình review.',
        LEARNING_PATH_NOT_FOUND: 'Không tìm thấy lộ trình.',
        ACCESS_DENIED: 'Bạn không có quyền thực hiện thao tác này.',
        LEARNING_PATH_NOT_AI_GENERATED: 'Chỉ có thể nhờ review lộ trình AI.',
        REVIEW_ALREADY_EXISTS: 'Bạn đã gửi yêu cầu review cho mentor này rồi.',
      }
      const serverMsg = data?.message || data?.title || data?.detail || e?.message
      setRequestError(msgs[code] || serverMsg || `Gửi yêu cầu thất bại (${status || 'unknown'}).`)
    } finally {
      setRequesting(false)
    }
  }

  const handleClearFilters = () => {
    setSelectedCategory('')
    setSelectedSubject('')
    setMinRating(0)
    setSearchQuery('')
    setCurrentPage(1)
  }

  if (!isOpen) return null

  // ── Confirm review request form ──────────────────────────────────────────
  if (confirmMentor && reviewPathId) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }} onClick={() => setConfirmMentor(null)}>
        <div style={{ background: 'var(--bg-surface)', borderRadius: 2, maxWidth: 460, width: '100%', border: '1px solid var(--border-base)', fontFamily: 'monospace' }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Gửi yêu cầu review</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{reviewPathTitle || reviewPathId}</div>
            </div>
            <button onClick={() => setConfirmMentor(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}><X size={14} /></button>
          </div>
          <div style={{ padding: 18 }}>
            {/* Mentor info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 2, marginBottom: 16 }}>
              {confirmMentor.avatarUrl ? (
                <img src={confirmMentor.avatarUrl} alt={confirmMentor.fullName} style={{ width: 32, height: 32, borderRadius: 2, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 2, background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {confirmMentor.fullName?.charAt(0)?.toUpperCase() || 'M'}
                </div>
              )}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{confirmMentor.fullName}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>@{confirmMentor.username}</div>
              </div>
            </div>
            {/* Note */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Lời nhắn cho mentor</label>
              <textarea
                value={requestNote}
                onChange={e => setRequestNote(e.target.value)}
                rows={3}
                placeholder="Nhờ mentor tối ưu roadmap theo backend thực tế..."
                style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 2, color: 'var(--text-primary)', fontSize: 12, fontFamily: 'monospace', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
              />
            </div>
            {requestError && <div style={{ fontSize: 11, color: 'var(--danger-primary)', marginBottom: 12, padding: '6px 10px', background: 'rgba(220,38,38,0.06)', borderRadius: 2 }}>{requestError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmMentor(null)} style={{ padding: '7px 16px', background: 'transparent', border: '1px solid var(--border-base)', borderRadius: 2, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase' }}>Huỷ</button>
              <button onClick={handleSendReviewRequest} disabled={requesting}
                style={{ padding: '7px 16px', background: 'var(--accent-primary)', border: 'none', borderRadius: 2, fontSize: 11, fontWeight: 700, color: 'white', cursor: requesting ? 'not-allowed' : 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, opacity: requesting ? 0.7 : 1 }}>
                <Send size={11} />{requesting ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
      onClick={profileMentor ? () => setProfileMentor(null) : onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 2,
          maxWidth: 1000,
          width: '100%',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--border-base)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-base)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {t('plans.selectMentor')}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {t('plans.selectMentorDesc')}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-main)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Filters - 2 column layout like Plans page */}
        <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr)', gap: 0, borderBottom: '1px solid var(--border-base)' }}>
          {/* Left sidebar - Category filter */}
          <div style={{
            borderRight: '1px solid var(--border-base)',
            background: 'var(--bg-main)',
            overflowY: 'auto',
            maxHeight: 200,
          }}>
            <div style={{
              padding: '8px 12px',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--text-secondary)',
              borderBottom: '1px solid var(--border-base)',
              textTransform: 'uppercase',
              fontFamily: 'monospace',
            }}>
              {t('plans.filterByCategory')}
            </div>
            
            {/* All categories option */}
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('')
                setSelectedSubject('')
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                border: 'none',
                background: selectedCategory === '' ? 'var(--bg-surface)' : 'transparent',
                color: selectedCategory === '' ? 'var(--accent-primary)' : 'var(--text-primary)',
                fontSize: 11,
                fontWeight: selectedCategory === '' ? 600 : 400,
                cursor: 'pointer',
                borderLeft: selectedCategory === '' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                transition: 'all 0.15s',
                fontFamily: 'monospace',
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== '') {
                  e.currentTarget.style.background = 'var(--bg-surface)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== '') {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
            >
              {t('plans.allSpecializations')}
            </button>

            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat)
                  setSelectedSubject('')
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  border: 'none',
                  background: selectedCategory === cat ? 'var(--bg-surface)' : 'transparent',
                  color: selectedCategory === cat ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontSize: 11,
                  fontWeight: selectedCategory === cat ? 600 : 400,
                  cursor: 'pointer',
                  borderLeft: selectedCategory === cat ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  transition: 'all 0.15s',
                  fontFamily: 'monospace',
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== cat) {
                    e.currentTarget.style.background = 'var(--bg-surface)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== cat) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
              >
                {getCategoryName(cat)}
              </button>
            ))}
          </div>

          {/* Right side - Subject filter and other filters */}
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Search bar */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                }}
              />
              <input
                type="text"
                placeholder={t('plans.searchMentors')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 32px',
                  border: '1px solid var(--border-base)',
                  borderRadius: 2,
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  fontSize: 11,
                  outline: 'none',
                  fontFamily: 'monospace',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-base)')}
              />
            </div>

            {/* Filters row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {/* Subject filter */}
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                  {t('plans.subject')}
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    disabled={loadingSubjects}
                    style={{
                      width: '100%',
                      padding: '6px 24px 6px 10px',
                      border: '1px solid var(--border-base)',
                      borderRadius: 2,
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: 11,
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                      fontFamily: 'monospace',
                    }}
                  >
                    <option value="">{t('plans.allSubjects')}</option>
                    {filteredSubjects.map((subj) => (
                      <option key={subj.id} value={subj.id}>
                        {subj.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
                </div>
              </div>

              {/* Min rating filter */}
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                  {t('plans.minRating')}
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '6px 24px 6px 10px',
                      border: '1px solid var(--border-base)',
                      borderRadius: 2,
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: 11,
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                      fontFamily: 'monospace',
                    }}
                  >
                    <option value={0}>{t('plans.anyRating')}</option>
                    <option value={3}>3+ ⭐</option>
                    <option value={4}>4+ ⭐</option>
                    <option value={4.5}>4.5+ ⭐</option>
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
                </div>
              </div>

              {/* Clear filters button */}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  onClick={handleClearFilters}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-base)',
                    borderRadius: 2,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-main)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  {t('plans.clearFilters')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {(!hasCheckedShareQuota || checkingShareQuota) && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40, gap: 10 }}>
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                {t('plans.checkingMentorQuota', { defaultValue: 'Checking mentor quota...' })}
              </span>
            </div>
          )}

          {hasCheckedShareQuota && !checkingShareQuota && isShareQuotaExceeded && (
            <div
              style={{
                padding: 16,
                background: 'var(--bg-main)',
                border: '1px solid var(--danger-primary)',
                borderRadius: 2,
                color: 'var(--text-primary)',
                display: 'grid',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {t('plans.askMentorShareQuotaExceeded', {
                  defaultValue: 'Số lượt nhận trợ giúp tạo lộ trình learning path đã hết.',
                })}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    navigate(`${ROUTER.SHOP}?tab=mentor`)
                  }}
                  style={{
                    borderRadius: 2,
                    border: '1px solid var(--accent-primary)',
                    background: 'var(--accent-primary)',
                    color: 'var(--bg-surface)',
                    padding: '8px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {t('plans.goToShop', { defaultValue: 'Go to Pricing' })}
                </button>
              </div>
            </div>
          )}

          {hasCheckedShareQuota && !checkingShareQuota && !isShareQuotaExceeded && loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            </div>
          )}

          {hasCheckedShareQuota && !checkingShareQuota && !isShareQuotaExceeded && error && (
            <div
              style={{
                padding: 12,
                background: 'var(--bg-main)',
                border: '1px solid var(--danger-primary)',
                borderRadius: 2,
                color: 'var(--danger-primary)',
                fontSize: 11,
                fontFamily: 'monospace',
              }}
            >
              {error}
            </div>
          )}

          {hasCheckedShareQuota && !checkingShareQuota && !isShareQuotaExceeded && !loading && !error && displayedMentors.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
              <User size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 12, fontFamily: 'monospace' }}>
                {t('plans.noMentorsFound')}
              </p>
            </div>
          )}

          {hasCheckedShareQuota && !checkingShareQuota && !isShareQuotaExceeded && !loading && !error && displayedMentors.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
              }}
            >
              {displayedMentors.map((mentor) => (
                <div
                  key={mentor.mentorId}
                  style={{
                    padding: 16,
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-base)',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-base)'
                  }}
                >
                  {/* Avatar and name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    {mentor.avatarUrl ? (
                      <img
                        src={mentor.avatarUrl}
                        alt={mentor.fullName}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          objectFit: 'cover',
                          border: '1px solid var(--border-base)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          background: 'var(--accent-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: 16,
                          fontWeight: 700,
                          fontFamily: 'monospace',
                        }}
                      >
                        {mentor.fullName?.charAt(0)?.toUpperCase() || 'M'}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {mentor.fullName}
                      </h3>
                      <p
                        style={{
                          margin: '2px 0 0 0',
                          fontSize: 10,
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily: 'monospace',
                        }}
                      >
                        @{mentor.username}
                      </p>
                    </div>
                  </div>

                  {/* Rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Star size={12} fill="var(--warning-primary)" color="var(--warning-primary)" />
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {mentor.averageRating > 0 ? mentor.averageRating.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      ({mentor.totalReviews} {t('plans.reviews')})
                    </span>
                  </div>

                  {/* Bio */}
                  {mentor.bio && (
                    <p
                      style={{
                        margin: '0 0 10px 0',
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontFamily: 'monospace',
                      }}
                    >
                      {mentor.bio}
                    </p>
                  )}
                  {!mentor.bio && (
                    <div style={{ marginBottom: 10 }} />
                  )}

                  {/* Specializations */}
                  {mentor.specializations && mentor.specializations.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                      {mentor.specializations.slice(0, 3).map((spec) => (
                        <span
                          key={spec}
                          style={{
                            padding: '2px 6px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-base)',
                            borderRadius: 2,
                            fontSize: 9,
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            fontFamily: 'monospace',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                          }}
                        >
                          {spec}
                        </span>
                      ))}
                      {mentor.specializations.length > 3 && (
                        <span
                          style={{
                            padding: '2px 6px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-base)',
                            borderRadius: 2,
                            fontSize: 9,
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            fontFamily: 'monospace',
                          }}
                        >
                          +{mentor.specializations.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                    <button
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-base)',
                        borderRadius: 2,
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        transition: 'all 0.15s',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--text-secondary)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-base)'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setProfileMentor(mentor)
                      }}
                    >
                      <Eye size={11} />
                      {t('plans.viewProfile')}
                    </button>
                    <button
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 2,
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'all 0.2s',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMentor(mentor)
                      }}
                    >
                      <MessageCircle size={12} />
                      {t('plans.chatWithMentor')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {hasCheckedShareQuota && !checkingShareQuota && !isShareQuotaExceeded && !loading && !error && totalPages > 1 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-main)',
            }}
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                color: currentPage === 1 ? 'var(--text-disabled)' : 'var(--text-primary)',
                border: '1px solid var(--border-base)',
                borderRadius: 2,
                fontSize: 10,
                fontWeight: 600,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t('plans.previous')}
            </button>

            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {t('plans.pageOf', { current: currentPage, total: totalPages })} • {totalCount} mentors
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                color: currentPage === totalPages ? 'var(--text-disabled)' : 'var(--text-primary)',
                border: '1px solid var(--border-base)',
                borderRadius: 2,
                fontSize: 10,
                fontWeight: 600,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t('plans.next')}
            </button>
          </div>
        )}
      </div>

      {/* Profile Detail Panel - overlay inside modal */}
      {profileMentor && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'var(--bg-surface)',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1,
          }}
        >
          {/* Profile header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-base)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <button
              onClick={() => setProfileMentor(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontFamily: 'monospace',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <ArrowLeft size={14} />
              {t('plans.backToList')}
            </button>
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              / {t('plans.mentorProfile')}
            </span>
          </div>

          {/* Profile content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {/* Avatar + basic info */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
              {profileMentor.avatarUrl ? (
                <img
                  src={profileMentor.avatarUrl}
                  alt={profileMentor.fullName}
                  style={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover', border: '1px solid var(--border-base)', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 80, height: 80, borderRadius: 2,
                  background: 'var(--accent-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 28, fontWeight: 700, fontFamily: 'monospace', flexShrink: 0,
                }}>
                  {profileMentor.fullName?.charAt(0)?.toUpperCase() || 'M'}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {profileMentor.fullName}
                </h2>
                <p style={{ margin: '0 0 12px 0', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  @{profileMentor.username}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={13} fill="var(--warning-primary)" color="var(--warning-primary)" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {profileMentor.averageRating > 0 ? profileMentor.averageRating.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    ({profileMentor.totalReviews} {t('plans.reviews')})
                  </span>
                </div>
              </div>
            </div>

            {/* Specializations */}
            {profileMentor.specializations && profileMentor.specializations.length > 0 && (
              <div style={{
                marginBottom: 20,
                padding: 16,
                background: 'var(--bg-main)',
                border: '1px solid var(--border-base)',
                borderLeft: '3px solid var(--accent-primary)',
                borderRadius: 3,
              }}>
                <div style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: 'var(--accent-primary)',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <BookOpen size={11} />
                  {t('plans.specializations')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {profileMentor.specializations.map((spec) => (
                    <span key={spec} style={{
                      padding: '4px 10px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--accent-primary)',
                      borderRadius: 2,
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--accent-primary)',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}>
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bio - modern card */}
            {profileMentor.bio && (
              <div style={{ 
                marginBottom: 24,
                padding: 16,
                background: 'var(--bg-main)',
                border: '1px solid var(--border-base)',
                borderRadius: 4,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{ 
                  fontSize: 9, 
                  fontWeight: 700, 
                  letterSpacing: '0.08em', 
                  color: 'var(--text-secondary)', 
                  textTransform: 'uppercase', 
                  fontFamily: 'monospace', 
                  marginBottom: 10,
                }}>
                  {t('plans.biography')}
                </div>
                <p style={{ 
                  margin: 0, 
                  fontSize: 12, 
                  color: 'var(--text-primary)', 
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                }}>
                  "{profileMentor.bio}"
                </p>
              </div>
            )}

            {/* Reviews section */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                fontFamily: 'monospace',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <Star size={12} />
                {t('plans.reviews')} ({(profileDetail ?? profileMentor).totalReviews})
              </div>

              {profileLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                  <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                </div>
              ) : (profileDetail?.recentReviews ?? []).length === 0 ? (
                <div style={{
                  padding: 16,
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 3,
                  textAlign: 'center',
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  fontFamily: 'monospace',
                }}>
                  {t('plans.noReviews')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(profileDetail?.recentReviews ?? []).slice(0, 5).map((review: MentorReviewDto) => (
                    <div key={review.ratingId} style={{
                      padding: 12,
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-base)',
                      borderRadius: 3,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                            {review.studentName}
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            {new Date(review.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={10}
                              fill={i < review.score ? 'var(--warning-primary)' : 'none'}
                              color={i < review.score ? 'var(--warning-primary)' : 'var(--text-disabled)'}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Profile footer action */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-base)', background: 'var(--bg-main)' }}>
            <button
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 2,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              onClick={() => handleSelectMentor(profileMentor)}
            >
              <MessageCircle size={14} />
              {t('plans.chatWithMentor')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SelectMentorModal
