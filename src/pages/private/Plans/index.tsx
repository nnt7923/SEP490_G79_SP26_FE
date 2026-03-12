
import React, { useMemo, useState, useEffect } from 'react'
import { SubjectService, GoalService, LearningPathService, LanguageSelection, SubjectCategory, FocusSessionService, SessionType } from '../../../services'
import type { Subject, SubjectCategoryType } from '../../../services/SubjectService'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import ConfirmDialog from '../../../components/ConfirmDialog'
import Toast from '../../../components/Toast'
import FocusSessionDialog from '../../../components/FocusSessionDialog'
import { useNavigate } from 'react-router-dom'
import ROUTER from '../../../router/ROUTER'
import StepHeader from './components/StepHeader'
import LanguageCard from './components/LanguageCard'
import SingleGoalCard from './components/SingleGoalCard'
import Stepper from './components/Stepper'
import { useTranslation } from 'react-i18next'

// Palette classes used for subject icon blocks (defined in global.css)
const palette = [
  'icon--yellow',
  'icon--blue',
  'icon--orange',
  'icon--cyan',
  'icon--indigo',
  'icon--pink',
  'icon--teal',
  'icon--amber',
  'icon--violet',
  'icon--emerald',
]

// Simple GUID validator
const isGuid = (v: any) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v)

// Step 2: Goals
type GoalItem = { key: string; label: string };
type Level = 'Beginner' | 'Intermediate' | 'Advanced'

const PlansPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const { t } = useTranslation('student')
  const [language, setLanguage] = useState<string | null>(() => {
    try {
      const v = sessionStorage.getItem('plans.language') || null
      return isGuid(v) ? v : null
    } catch {
      return null
    }
  })
  const [selectedGoals, setSelectedGoals] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem('plans.goals')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [level, setLevel] = useState<Level | null>(() => {
    try {
      return (sessionStorage.getItem('plans.level') as Level | null) || null
    } catch {
      return null
    }
  })
  const [languageSelection, setLanguageSelection] = useState<LanguageSelection | null>(() => {
    try {
      const stored = sessionStorage.getItem('plans.languageSelection')
      return stored ? Number(stored) as LanguageSelection : null
    } catch {
      return null
    }
  })
  const [planGenerated, setPlanGenerated] = useState(false)
  // Load subjects from API
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(true)
  const [subjectsError, setSubjectsError] = useState<string | null>(null)
  // Subject category filter
  const [selectedCategory, setSelectedCategory] = useState<SubjectCategoryType | null>(null)
  // Load goals from API + generation states
  const [systemGoals, setSystemGoals] = useState<any[]>([])
  const [myGoals, setMyGoals] = useState<any[]>([])
  const [goalsLoading, setGoalsLoading] = useState<boolean>(true)
  const [myGoalsLoading, setMyGoalsLoading] = useState<boolean>(true)
  // Enable Live auto-update for goals
  const [goalsError, setGoalsError] = useState<string | null>(null)
  const [myGoalsError, setMyGoalsError] = useState<string | null>(null)
  const [generating, setGenerating] = useState<boolean>(false)
  const [generationProgress, setGenerationProgress] = useState<number>(0)
  const [planError, setPlanError] = useState<string | null>(null)
  const [skeleton, setSkeleton] = useState<any | null>(null)
  
  // Chapter skeleton generation states
  const [generatingChapters, setGeneratingChapters] = useState<Set<string>>(new Set())
  const [chapterErrors, setChapterErrors] = useState<Map<string, string>>(new Map())
  // New goal creation states
  const [showAddGoal, setShowAddGoal] = useState<boolean>(false)
  const [newGoalTitle, setNewGoalTitle] = useState<string>('')
  const [newGoalDesc, setNewGoalDesc] = useState<string>('')
  const [creatingGoal, setCreatingGoal] = useState<boolean>(false)
  const [createGoalError, setCreateGoalError] = useState<string | null>(null)
  // Duration for each selected goal (days)
  // 

  // Added: goal edit/delete states and handlers
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string>('')
  const [savingGoal, setSavingGoal] = useState<boolean>(false)
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null)
  const [goalActionError, setGoalActionError] = useState<string | null>(null)

  // Confirm dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)
  const [goalToDelete, setGoalToDelete] = useState<{ id: string; title: string } | null>(null)

  // Toast states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  // Focus session dialog states
  const [showFocusDialog, setShowFocusDialog] = useState<boolean>(false)
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null)
  const [creatingSession, setCreatingSession] = useState<boolean>(false)

  const startEditGoal = (id: string, currTitle: string) => {
    setEditingGoalId(id)
    setEditingTitle(currTitle)
    setGoalActionError(null)
  }

  const cancelEditGoal = () => {
    setEditingGoalId(null)
    setEditingTitle('')
    setGoalActionError(null)
  }

  const saveEditGoal = async () => {
    const id = editingGoalId
    const title = editingTitle.trim()
    if (!id) return
    if (!title) {
      setGoalActionError(t('plans.titleEmpty'))
      return
    }
    setSavingGoal(true)
    setGoalActionError(null)
    try {
      const updated = await GoalService.updateGoal(id, { title })
      setMyGoals((prev) => prev.map((g: any) => (String(g?.id ?? g?.goalId ?? g?.key) === String(id) ? { ...g, ...updated } : g)))
      setToast({ message: t('plans.goalUpdated'), type: 'success' })
      setEditingGoalId(null)
      setEditingTitle('')
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || t('plans.goalUpdateFailed')
      setGoalActionError(msg)
    } finally {
      setSavingGoal(false)
    }
  }

  const handleDeleteGoal = async (id: string) => {
    const goal = myGoals.find((g: any) => String(g?.id ?? g?.goalId ?? g?.key) === String(id))
    const title = goal?.title ?? goal?.name ?? goal?.label ?? 'this goal'
    
    setGoalToDelete({ id, title })
    setShowDeleteConfirm(true)
  }

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return
    
    const { id } = goalToDelete
    setDeletingGoalId(id)
    setGoalActionError(null)
    setShowDeleteConfirm(false)
    
    try {
      await GoalService.deleteGoal(id)
      setMyGoals((prev) => prev.filter((g: any) => String(g?.id ?? g?.goalId ?? g?.key) !== String(id)))
      setSelectedGoals((prev) => prev.filter((k) => String(k) !== String(id)))
      setToast({ message: t('plans.goalDeleted'), type: 'success' })
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || t('plans.goalDeleteFailed')
      setToast({ message: msg, type: 'error' })
    } finally {
      setDeletingGoalId(null)
      setGoalToDelete(null)
    }
  }

  // Handle focus session creation
  const handleCreateFocusSession = async (sessionType: SessionType, duration: number, title?: string) => {
    if (!selectedTask) return

    setCreatingSession(true)
    try {
      const session = await FocusSessionService.startSession({
        taskId: selectedTask.id,
        sessionType,
        plannedDurationMinutes: duration,
        title: title || selectedTask.title
      })

      setToast({ message: 'Phiên học tập đã được tạo thành công!', type: 'success' })
      setShowFocusDialog(false)
      setSelectedTask(null)

      // Navigate to focus session page
      navigate(ROUTER.FOCUS_SESSION, { state: { session } })
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Không thể tạo phiên học tập'
      setToast({ message: msg, type: 'error' })
    } finally {
      setCreatingSession(false)
    }
  }

  const handleCancelFocusSession = () => {
    setShowFocusDialog(false)
    setSelectedTask(null)
  }

  // IMPORTANT: initialize navigate for routing
  const navigate = useNavigate()

  // Handle chapter skeleton generation
  const handleChapterClick = async (pathId: string, chapterIndex: number, chapterId: string) => {
    console.log('Chapter clicked:', { pathId, chapterIndex, chapterId })
    const chapterKey = `${pathId}-${chapterIndex}`
    
    // Don't generate if already generating
    if (generatingChapters.has(chapterKey)) {
      console.log('Chapter already generating, skipping')
      return
    }
    
    console.log('Starting chapter skeleton generation...')
    
    // Clear any previous error for this chapter
    setChapterErrors(prev => {
      const newErrors = new Map(prev)
      newErrors.delete(chapterKey)
      return newErrors
    })
    
    // Add to generating set
    setGeneratingChapters(prev => new Set(prev).add(chapterKey))
    console.log('Added to generating set:', chapterKey)
    
    try {
      console.log(`Generating skeleton for chapter ${chapterIndex} of path ${pathId}`)
      
      const chapterSkeleton = await LearningPathService.generateChapterSkeleton(
        pathId,
        chapterIndex,
        {
          useSignalR: true,
          onLoading: () => {
            console.log(`Chapter ${chapterIndex} skeleton generation started`)
          }
        }
      )
      
      console.log(`Chapter ${chapterIndex} skeleton generated:`, chapterSkeleton)
      
      // Update skeleton with lesson info
      setSkeleton((prevSkeleton: any) => {
        console.log('Updating skeleton with chapter info:', prevSkeleton)
        if (!prevSkeleton?.chapters && !prevSkeleton?.chapterDtos) return prevSkeleton
        
        // Handle both chapters and chapterDtos
        const chaptersArray = prevSkeleton.chapters || prevSkeleton.chapterDtos || []
        const updatedChapters = chaptersArray.map((ch: any, idx: number) => {
          if (idx === chapterIndex) {
            return {
              ...ch,
              lessonCount: chapterSkeleton.lessonCount || 0,
              quizCount: chapterSkeleton.quizCount || 0,
              hasLessons: (chapterSkeleton.lessonCount || 0) > 0
            }
          }
          return ch
        })
        
        const updated = {
          ...prevSkeleton,
          chapters: prevSkeleton.chapters ? updatedChapters : undefined,
          chapterDtos: prevSkeleton.chapterDtos ? updatedChapters : undefined
        }
        console.log('Updated skeleton:', updated)
        return updated
      })
      
    } catch (error: any) {
      console.error(`Failed to generate chapter ${chapterIndex} skeleton:`, error)
      setChapterErrors(prev => {
        const newErrors = new Map(prev)
        newErrors.set(chapterKey, error.message || 'Failed to generate chapter skeleton')
        return newErrors
      })
    } finally {
      // Remove from generating set
      setGeneratingChapters(prev => {
        const newSet = new Set(prev)
        newSet.delete(chapterKey)
        return newSet
      })
      console.log('Removed from generating set:', chapterKey)
    }
  }

  // Handle lesson click - show focus session dialog
  const handleLessonClick = async (lessonId: string, lessonTitle: string) => {
    console.log('Lesson clicked:', { lessonId, lessonTitle })
    
    // Show focus session dialog instead of generating content
    setSelectedTask({ id: lessonId, title: lessonTitle })
    setShowFocusDialog(true)
  }

  // Persist selections
  useEffect(() => {
    try {
      if (language) {
        sessionStorage.setItem('plans.language', language)
      } else {
        sessionStorage.removeItem('plans.language')
      }
    } catch {}
  }, [language])

  useEffect(() => {
    try {
      sessionStorage.setItem('plans.goals', JSON.stringify(selectedGoals))
    } catch {}
  }, [selectedGoals])

  useEffect(() => {
    try {
      if (level) sessionStorage.setItem('plans.level', level)
      else sessionStorage.removeItem('plans.level')
    } catch {}
  }, [level])

  useEffect(() => {
    try {
      if (languageSelection) sessionStorage.setItem('plans.languageSelection', String(languageSelection))
      else sessionStorage.removeItem('plans.languageSelection')
    } catch {}
  }, [languageSelection])

  // SEO: title, meta description, canonical & JSON-LD
  useEffect(() => {
    const title = 'Learning Path - Choose language & goals | CodeNexus'
    document.title = title

    const desc = 'Select a programming language, choose your goals, and generate a personalized learning path on CodeNexus.'
    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.setAttribute('name', 'description')
      document.head.appendChild(metaDesc)
    }
    metaDesc!.setAttribute('content', desc)

    const canonicalHref = `${location.origin}/plans`
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalHref

    // Open Graph
    const ensureMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}='${key}']`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }
    ensureMeta('property', 'og:title', title)
    ensureMeta('property', 'og:description', desc)
    ensureMeta('property', 'og:url', canonicalHref)
    ensureMeta('property', 'og:type', 'website')

    // Twitter Card
    ensureMeta('name', 'twitter:card', 'summary')
    ensureMeta('name', 'twitter:title', title)
    ensureMeta('name', 'twitter:description', desc)

    const ld = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Plans',
      description: desc,
      url: canonicalHref,
    }
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify(ld)
    document.head.appendChild(script)
    return () => { try { document.head.removeChild(script) } catch {} }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const params = selectedCategory !== null ? { category: selectedCategory } : undefined
        const data = await SubjectService.listSubjects(params)
        if (active) {
          const normalized = (Array.isArray(data) ? data : []).map((s: any) => ({ ...s, id: s?.id ?? s?.subjectId }))
          setSubjects(normalized as any)
        }
      } catch (e: any) {
        const d = e?.response?.data
        const msg = d?.message || d?.error || d?.title || d?.detail || e?.message || t('plans.failedLoadSubjects')
        if (active) setSubjectsError(msg)
      } finally {
        if (active) setSubjectsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [selectedCategory])
  // Load system goals from backend (isSystemDefined = true)
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await GoalService.listGoals()
        if (active) {
          const filtered = (Array.isArray(data) ? data : []).filter((g: any) => g.isSystemDefined === true)
          setSystemGoals(filtered)
        }
      } catch (e: any) {
        const d = e?.response?.data
        const msg = d?.message || d?.error || d?.title || d?.detail || e?.message || t('plans.failedLoadSystemGoals')
        if (active) setGoalsError(msg)
      } finally {
        if (active) setGoalsLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  // Load my goals from backend
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await GoalService.getMyGoals()
        if (active) setMyGoals(Array.isArray(data) ? data : [])
      } catch (e: any) {
        const d = e?.response?.data
        const msg = d?.message || d?.error || d?.title || d?.detail || e?.message || t('plans.failedLoadYourGoals')
        if (active) setMyGoalsError(msg)
      } finally {
        if (active) setMyGoalsLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  // Background polling to keep goals in sync (realtime-like)
  useEffect(() => {
    if (step !== 2) return
    let disposed = false

    const fetchGoals = async () => {
      try {
        const [systemData, myData] = await Promise.all([
          GoalService.listGoals(),
          GoalService.getMyGoals()
        ])
        if (!disposed) {
          const filtered = (Array.isArray(systemData) ? systemData : []).filter((g: any) => g.isSystemDefined === true)
          setSystemGoals(filtered)
          setMyGoals(Array.isArray(myData) ? myData : [])
        }
      } catch {}
    }

    // initial fetch then interval
    fetchGoals()
    const id = setInterval(fetchGoals, 8000)

    return () => {
      disposed = true
      clearInterval(id)
    }
  }, [step])

  const canNext = useMemo(() => {
    if (step === 1) return !!language
    if (step === 2) return selectedGoals.length > 0
    if (step === 3) return !!level
    if (step === 4) return !!languageSelection
    return true
  }, [step, language, selectedGoals, level, languageSelection])

  const canGenerate = useMemo(() => !!language && selectedGoals.length > 0 && !!level && !!languageSelection, [language, selectedGoals, level, languageSelection])

  const toggleGoal = (key: string) => {
    setSelectedGoals((prev) => {
      // Single-select: toggle same id off, otherwise replace with the new id
      if (prev.length === 1 && prev[0] === key) return []
      return [key]
    })
    // durationDay removed; no extra state to update
  }

  const handleCreateGoalModal = async () => {
    const title = newGoalTitle.trim()
    const description = newGoalDesc.trim()
    if (!title) {
      setCreateGoalError(t('plans.enterGoalTitle'))
      return
    }
    setCreatingGoal(true)
    setCreateGoalError(null)
    try {
      const created = await GoalService.createGoal({ title, description })
      const newKey = String(created?.goalId ?? created?.id ?? created?.key ?? '')
      setMyGoals((prev) => [created, ...prev])
      if (newKey) setSelectedGoals([newKey])
      setToast({ message: t('plans.goalCreated'), type: 'success' })
      setShowAddGoal(false)
      setNewGoalTitle('')
      setNewGoalDesc('')
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message
      setCreateGoalError(msg || t('plans.goalCreateFailed'))
    } finally {
      setCreatingGoal(false)
    }
  }

   // Map API goals to GoalCard items
   const allGoals = [...systemGoals, ...myGoals]
   const goalItems: GoalItem[] = Array.isArray(allGoals)
     ? allGoals
         .map((g: any) => ({
           key: g?.id ?? g?.goalId ?? g?.key,
           label: g?.title ?? g?.name ?? g?.label ?? 'Goal',
         }))
         .filter((it) => !!it.key)
     : []

   return (
     <div style={{ background: 'var(--bg-surface)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '40px 24px', maxWidth: 1200, margin: '0 auto', width: '100%' }} role="main" aria-labelledby="plans-title">
        <div style={{ width: '100%' }}>
          {/* Stepper */}
          <Stepper currentStep={step} totalSteps={5} />

           {/* Content */}
          {step === 1 && (
            <>
              <StepHeader
                title={t('plans.step1Title')}
                subtitle={t('plans.step1Subtitle')}
                icon="$"
                selectedValue={language ? subjects.find((l: any) => String(l.id ?? l.subjectId) === language)?.name : undefined}
              />
              
              {/* Category Filter */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>// {t('plans.filterByCategory')}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    style={{
                      padding: '8px 16px',
                      fontSize: 12,
                      fontWeight: 600,
                      border: '1px solid var(--border-base)',
                      borderRadius: 2,
                      background: selectedCategory === null ? '#3B82F6' : 'var(--bg-surface)',
                      color: selectedCategory === null ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCategory !== null) {
                        e.currentTarget.style.borderColor = '#3B82F6'
                        e.currentTarget.style.background = '#EFF6FF'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCategory !== null) {
                        e.currentTarget.style.borderColor = 'var(--border-base)'
                        e.currentTarget.style.background = 'var(--bg-surface)'
                      }
                    }}
                  >
                    All Categories
                  </button>
                  {Object.entries(SubjectCategory).map(([name, value]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedCategory(value)}
                      style={{
                        padding: '8px 16px',
                        fontSize: 12,
                        fontWeight: 600,
                        border: '1px solid var(--border-base)',
                        borderRadius: 2,
                        background: selectedCategory === value ? '#3B82F6' : 'var(--bg-surface)',
                        color: selectedCategory === value ? 'white' : 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedCategory !== value) {
                          e.currentTarget.style.borderColor = '#3B82F6'
                          e.currentTarget.style.background = '#EFF6FF'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedCategory !== value) {
                          e.currentTarget.style.borderColor = 'var(--border-base)'
                          e.currentTarget.style.background = 'var(--bg-surface)'
                        }
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }} aria-label="subject-list">
                 {subjectsLoading ? (
                   Array.from({ length: 8 }).map((_, i) => (
                     <div key={i} className="animate-pulse rounded-xl border border-bd-muted bg-th-card p-5">
                       <div className="flex flex-col gap-3">
                         <div className="flex items-center gap-3">
                           <div className="w-12 h-12 bg-th-hover rounded-lg" />
                           <div className="flex-1">
                             <div className="w-24 h-4 bg-th-hover rounded" />
                             <div className="w-20 h-3 bg-th-input rounded mt-2" />
                           </div>
                         </div>
                       </div>
                     </div>
                   ))
                 ) : subjectsError ? (
                   <div className="col-span-full text-center py-6 text-status-red bg-status-red-bg rounded-xl border border-red-200">
                     {t('plans.failedLoadSubjects')}: {subjectsError}
                   </div>
                 ) : subjects.length > 0 ? (
                   subjects.map((s, idx) => (
                     <LanguageCard
                       key={s.slug ?? idx}
                       name={s.name}
                       tag={s.slug ?? undefined}
                       icon={s.icon}
                       desc={t('plans.explorePathFor', { name: s.name })}
                       active={language === String((s as any).id ?? (s as any).subjectId)}
                       onClick={() => {
                         setLanguage(String((s as any).id ?? (s as any).subjectId))
                       }}
                     />
                   ))
                 ) : (
                   <div className="col-span-full text-center py-8 text-muted">
                     {t('plans.noSubjectsAvailable')}
                   </div>
                 )}
               </section>
             </>
           )}

           {step === 2 && (
            <>
              <StepHeader
                title={t('plans.step2Title')}
                subtitle={t('plans.step2Subtitle')}
                icon="$"
                selectedValue={selectedGoals.length > 0 ? goalItems.find((x) => String(x.key) === String(selectedGoals[0]))?.label : undefined}
              />

              {/* Thông báo hành động goal */}
              {goalActionError && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ padding: 12, border: '1px solid var(--danger-primary)', borderRadius: 2, color: 'var(--danger-primary)', fontSize: 13, background: 'var(--bg-red-tint)' }}>// {goalActionError}</div>
                </div>
              )}

              {/* System Goals Section */}
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>// {t('plans.suggestGoals')}</h3>
                </div>
                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }} aria-label="system-goals">
                   {goalsLoading ? (
                     Array.from({ length: 3 }).map((_, i) => (
                       <div key={`sys-skel-${i}`} className="animate-pulse rounded-2xl border-2 border-bd-muted bg-th-card p-6">
                         <div className="flex items-center gap-3">
                           <div className="w-12 h-12 bg-th-hover rounded-xl" />
                           <div className="flex-1">
                             <div className="w-32 h-5 bg-th-hover rounded" />
                           </div>
                         </div>
                       </div>
                     ))
                   ) : goalsError ? (
                     <div className="col-span-full text-center py-8 text-status-red bg-status-red-bg rounded-2xl border-2 border-red-200">
                       {t('plans.failedLoadSystemGoals')}: {goalsError}
                     </div>
                   ) : systemGoals.length > 0 ? (
                     systemGoals.map((g: any, idx: number) => {
                       const id = g?.id ?? g?.goalId ?? g?.key
                       const title = g?.title ?? g?.name ?? g?.label ?? 'Goal'
                       return (
                         <SingleGoalCard
                           key={String(id)}
                           id={String(id)}
                           title={title}
                           colorClass={palette[idx % palette.length]}
                           icon='🔖'
                           active={selectedGoals.includes(String(id))}
                           onToggle={toggleGoal}
                           onStartEdit={() => {}}
                           onDelete={() => {}}
                           isEditing={false}
                           editingTitle=""
                           setEditingTitle={() => {}}
                           onSaveEdit={() => {}}
                           onCancelEdit={() => {}}
                           saving={false}
                           deleting={false}
                           isSystemGoal={true}
                         />
                       )
                     })
                   ) : (
                     <div className="col-span-full text-center py-8 text-muted bg-th-card rounded-2xl border-2 border-bd-muted">
                       {t('plans.noSystemGoals')}
                     </div>
                   )}
                 </section>
               </div>

              {/* My Goals Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>// {t('plans.myGoals')}</h3>
                  <button
                    type="button"
                    onClick={() => { setShowAddGoal(true); setCreateGoalError(null) }}
                    style={{ padding: '6px 16px', background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: '1px solid var(--text-primary)', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--text-strong)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--text-primary)' }}
                  >
                    {'>'} {t('plans.addGoal')}
                  </button>
                </div>
                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }} aria-label="my-goals">
                   {myGoalsLoading ? (
                     Array.from({ length: 3 }).map((_, i) => (
                       <div key={`my-skel-${i}`} className="animate-pulse rounded-2xl border-2 border-bd-muted bg-th-card p-6">
                         <div className="flex items-center gap-3">
                           <div className="w-12 h-12 bg-th-hover rounded-xl" />
                           <div className="flex-1">
                             <div className="w-32 h-5 bg-th-hover rounded" />
                           </div>
                         </div>
                       </div>
                     ))
                   ) : myGoalsError ? (
                     <div className="col-span-full text-center py-8 text-status-red bg-status-red-bg rounded-2xl border-2 border-red-200">
                       {t('plans.failedLoadYourGoals')}: {myGoalsError}
                     </div>
                   ) : myGoals.length > 0 ? (
                     myGoals.map((g: any, idx: number) => {
                       const id = g?.id ?? g?.goalId ?? g?.key
                       const title = g?.title ?? g?.name ?? g?.label ?? 'Goal'
                       return (
                         <SingleGoalCard
                           key={String(id)}
                           id={String(id)}
                           title={title}
                           colorClass={palette[idx % palette.length]}
                           icon='🔖'
                           active={selectedGoals.includes(String(id))}
                           onToggle={toggleGoal}
                           onStartEdit={startEditGoal}
                           onDelete={handleDeleteGoal}
                           isEditing={String(editingGoalId) === String(id)}
                           editingTitle={editingTitle}
                           setEditingTitle={setEditingTitle}
                           onSaveEdit={saveEditGoal}
                           onCancelEdit={cancelEditGoal}
                           saving={savingGoal}
                           deleting={String(deletingGoalId) === String(id)}
                         />
                       )
                     })
                   ) : (
                     <div className="col-span-full text-center py-8 text-muted bg-th-card rounded-2xl border-2 border-bd-muted">
                       {t('plans.noPersonalGoals')}
                     </div>
                   )}
                 </section>
                        {/* Add Goal Modal */}
             {showAddGoal && (
               <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                 <div style={{ background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 2, maxWidth: 448, width: '100%', display: 'flex', flexDirection: 'column' }}>
                   <div style={{ padding: 20, borderBottom: '1px solid var(--border-base)' }}>
                     <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{'>'} {t('plans.addNewGoal')}</h3>
                   </div>
                   <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                     {createGoalError && (
                       <div style={{ padding: 12, border: '1px solid var(--danger-primary)', borderRadius: 2, color: 'var(--danger-primary)', fontSize: 13, background: 'var(--bg-red-tint)' }}>// {createGoalError}</div>
                     )}
                     <div>
                       <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>$ {t('plans.titleLabel')}</label>
                       <input
                         type="text"
                         value={newGoalTitle}
                         onChange={(e) => setNewGoalTitle(e.target.value)}
                         placeholder={t('plans.titlePlaceholder')}
                         style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                         onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                       />
                     </div>
                     <div>
                       <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>$ {t('plans.descriptionLabel')}</label>
                       <textarea
                         value={newGoalDesc}
                         onChange={(e) => setNewGoalDesc(e.target.value)}
                         rows={3}
                         placeholder={t('plans.descriptionPlaceholder')}
                         style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                         onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                       />
                     </div>
                     <div style={{ display: 'flex', gap: 12, paddingTop: 16 }}>
                       <button
                         type="button"
                         onClick={() => { setShowAddGoal(false); setNewGoalTitle(''); setNewGoalDesc(''); setCreateGoalError(null) }}
                         style={{ flex: 1, padding: '8px 16px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                         onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray-100)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-short)' }}
                       >{t('plans.cancel')}</button>
                       <button
                         type="button"
                         disabled={creatingGoal}
                         onClick={handleCreateGoalModal}
                         style={{ flex: 1, padding: '8px 16px', background: creatingGoal ? 'var(--text-secondary)' : 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: creatingGoal ? 'not-allowed' : 'pointer' }}
                         onMouseEnter={(e) => { if(!creatingGoal) e.currentTarget.style.background = 'var(--text-strong)' }} onMouseLeave={(e) => { if(!creatingGoal) e.currentTarget.style.background = 'var(--text-primary)' }}
                       >{creatingGoal ? t('plans.savingGoal') : t('plans.saveGoal')}</button>
                     </div>
                   </div>
                 </div>
               </div>
             )}
            </div>
            </>
          )}

           {step === 3 && (
            <>
              <StepHeader
                title={t('plans.step3Title')}
                subtitle={t('plans.step3Subtitle')}
                icon="$"
                selectedValue={level || undefined}
              />
              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, maxWidth: 900, margin: '0 auto' }} aria-label="level-list">
                {(['Beginner','Intermediate','Advanced'] as Level[]).map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setLevel(lv)}
                    style={{
                      padding: 20, border: '1px solid var(--border-base)', borderRadius: 2, background: level === lv ? 'var(--bg-blue-hover)' : 'var(--bg-surface)',
                      borderColor: level === lv ? 'var(--accent-primary)' : 'var(--border-base)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { if (level !== lv) { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--bg-main)' } }}
                    onMouseLeave={(e) => { if (level !== lv) { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.background = 'var(--bg-surface)' } }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{level === lv ? '> ' : '$ '}{lv}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>// {lv === 'Beginner' ? t('plans.beginnerDesc') : lv === 'Intermediate' ? t('plans.intermediateDesc') : t('plans.advancedDesc')}</div>
                  </button>
                ))}
              </section>
            </>
          )}
           {step === 4 && (
            <>
              <StepHeader
                title={t('plans.step4Title')}
                subtitle={t('plans.step4Subtitle')}
                icon="$"
                selectedValue={languageSelection ? (languageSelection === LanguageSelection.Vietnamese ? 'Tiếng Việt' : 'English') : undefined}
              />
              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, maxWidth: 700, margin: '0 auto' }} aria-label="language-selection">
                {/* Vietnamese Option */}
                <button
                  type="button"
                  onClick={() => setLanguageSelection(LanguageSelection.Vietnamese)}
                  style={{
                    padding: 24, border: '1px solid var(--border-base)', borderRadius: 2, background: languageSelection === LanguageSelection.Vietnamese ? 'var(--bg-blue-hover)' : 'var(--bg-surface)',
                    borderColor: languageSelection === LanguageSelection.Vietnamese ? 'var(--accent-primary)' : 'var(--border-base)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (languageSelection !== LanguageSelection.Vietnamese) { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--bg-main)' } }}
                  onMouseLeave={(e) => { if (languageSelection !== LanguageSelection.Vietnamese) { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.background = 'var(--bg-surface)' } }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{languageSelection === LanguageSelection.Vietnamese ? '> ' : '$ '}Tiếng Việt</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>// {t('plans.vietnameseDesc')}</div>
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${languageSelection === LanguageSelection.Vietnamese ? 'var(--color-blue-300)' : 'var(--gray-200)'}`, fontSize: 11, fontWeight: 600, color: languageSelection === LanguageSelection.Vietnamese ? 'var(--accent-primary)' : 'var(--text-disabled)' }}>
                    {languageSelection === LanguageSelection.Vietnamese ? `[${t('plans.selected')}]` : `[${t('plans.clickToSelect')}]`}
                  </div>
                </button>

                {/* English Option */}
                <button
                  type="button"
                  onClick={() => setLanguageSelection(LanguageSelection.English)}
                  style={{
                    padding: 24, border: '1px solid var(--border-base)', borderRadius: 2, background: languageSelection === LanguageSelection.English ? 'var(--bg-blue-hover)' : 'var(--bg-surface)',
                    borderColor: languageSelection === LanguageSelection.English ? 'var(--accent-primary)' : 'var(--border-base)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (languageSelection !== LanguageSelection.English) { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--bg-main)' } }}
                  onMouseLeave={(e) => { if (languageSelection !== LanguageSelection.English) { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.background = 'var(--bg-surface)' } }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{languageSelection === LanguageSelection.English ? '> ' : '$ '}English</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>// {t('plans.englishDesc')}</div>
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${languageSelection === LanguageSelection.English ? 'var(--color-blue-300)' : 'var(--gray-200)'}`, fontSize: 11, fontWeight: 600, color: languageSelection === LanguageSelection.English ? 'var(--accent-primary)' : 'var(--text-disabled)' }}>
                    {languageSelection === LanguageSelection.English ? `[${t('plans.selected')}]` : `[${t('plans.clickToSelect')}]`}
                  </div>
                </button>
              </section>
            </>
          )}

           {step === 5 && (
            <>
              <StepHeader
                title={t('plans.step5Title')}
                subtitle={t('plans.step5Subtitle')}
                icon="$"
                selectedValue={t('plans.readyToGenerate')}
              />
              
              {/* Summary Cards */}
              <section aria-label="summary" style={{ maxWidth: 800, margin: '0 auto 40px auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                  {[
                    { label: `$ ${t('plans.programmingLanguage')}`, val: language ? subjects.find((l: any) => String(l.id ?? l.subjectId) === language)?.name : undefined },
                    { label: `$ ${t('plans.learningGoal')}`, val: selectedGoals.length > 0 ? goalItems.find((x) => x.key === selectedGoals[0])?.label : undefined },
                    { label: `$ ${t('plans.difficultyLevel')}`, val: level },
                    { label: `$ ${t('plans.contentLanguage')}`, val: languageSelection ? (languageSelection === LanguageSelection.Vietnamese ? 'Tiếng Việt' : 'English') : undefined }
                  ].map((sum, i) => (
                    <div key={i} style={{ padding: 16, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)' }}>
                      <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px 0' }}>{sum.label}</h3>
                      {sum.val ? (
                         <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{sum.val}</p>
                      ) : (
                         <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-disabled)', margin: 0 }}>// {t('plans.notSelected')}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Generate Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                 <button
                  type="button"
                  style={{
                    padding: '12px 32px', background: (!canGenerate || generating) ? 'var(--text-secondary)' : 'var(--text-primary)', color: 'var(--bg-surface-short)',
                    border: 'none', borderRadius: 2, fontSize: 14, fontWeight: 700,
                    cursor: (!canGenerate || generating) ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
                    display: 'flex', alignItems: 'center', gap: 12
                  }}
                  onMouseEnter={(e) => { if (canGenerate && !generating) e.currentTarget.style.background = 'var(--text-strong)' }}
                  onMouseLeave={(e) => { if (canGenerate && !generating) e.currentTarget.style.background = 'var(--text-primary)' }}
                  disabled={!canGenerate || generating}
                  onClick={async () => {
                    if (!language) { setPlanError(t('plans.selectLanguage')); return }
                    if (selectedGoals.length !== 1) { setPlanError(t('plans.selectOneGoal')); return }
                    if (!level) { setPlanError(t('plans.selectLevel')); return }
                    if (!languageSelection) { setPlanError(t('plans.selectLanguage')); return }
                    setPlanError(null)
                    setGenerating(true)
                    setGenerationProgress(0)
                    try {
                      const payload: any = { 
                        subjectId: language, 
                        goalId: selectedGoals[0], 
                        complexityLevel: level, 
                        languageSelection: languageSelection 
                      }
                      
                      // Use SignalR for real-time progress updates
                      const sk = await LearningPathService.generateSkeleton(payload, {
                        useSignalR: true,
                        onLoading: () => {
                          setGenerationProgress(10) // Initial loading
                        },
                        onProgress: (progress: number) => {
                          setGenerationProgress(progress)
                        }
                      })
                      
                      setSkeleton(sk)
                      setPlanGenerated(true)
                      setGenerationProgress(100)
                      console.log('Final skeleton set in state:', sk)
                      try { sessionStorage.setItem('learningPathSkeleton', JSON.stringify(sk)) } catch {}
                      navigate(ROUTER.PLANS_RESULT, { state: { skeleton: sk } })
                    } catch (e: any) {
                      const d = e?.response?.data
                      const serverMsg = d?.errorMessage || d?.message || d?.msg || d?.error || d?.title || d?.detail
                      const code = d?.errorCode || d?.code
                      let msg = code ? `${code}: ${serverMsg || 'Unknown error'}` : (serverMsg || e?.message || t('plans.unableToGenerate'))
                      const lower = String(serverMsg || e?.message || '').toLowerCase()
                      if (code === 'AI_GENERATION_FAILED' && (lower.includes('invalid api key') || lower.includes('invalid_api_key') || lower.includes('unauthorized'))) {
                        msg = t('plans.aiKeyError')
                      }
                      setPlanError(msg)
                    } finally {
                      setGenerating(false)
                      setGenerationProgress(0)
                    }
                  }}
                >
                  {generating ? (
                    <>
                      <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid var(--bg-surface-short)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                      <span>// {t('plans.generatingPath')} ({generationProgress}%)</span>
                    </>
                  ) : (
                    <>
                      <span>{'>_'}</span>
                      <span>{t('plans.generateLearningPath')}</span>
                    </>
                  )}
                </button>
              </div>

               {planError && (
                 <div className="mt-8 max-w-2xl mx-auto px-5 py-4 bg-status-red-bg border-2 border-red-200 rounded-2xl text-status-red-dark font-medium text-center shadow-sm">
                   {planError}
                 </div>
               )}
               {planGenerated && skeleton && (
                 <section className="mt-8 p-6 bg-th-card rounded-2xl border-2 border-bd-muted shadow-sm" aria-label="generated-plan">
                   <h2 className="text-xl font-semibold text-heading mb-4">{t('plans.learningPathResult')}</h2>
                   
                   {/* Display chapters if available */}
                   {(Array.isArray(skeleton?.chapters) && skeleton.chapters.length > 0) || (Array.isArray(skeleton?.chapterDtos) && skeleton.chapterDtos.length > 0) ? (
                     <div>
                       <h3 className="text-lg font-semibold text-heading mb-3">Chapters</h3>
                       <p className="text-sm text-muted mb-4">Click on a chapter to generate lesson titles</p>
                       <ul className="space-y-4">
                         {(skeleton.chapters || skeleton.chapterDtos || []).map((ch: any, idx: number) => {
                           const chapterKey = `${skeleton.pathId}-${idx}`
                           const isGenerating = generatingChapters.has(chapterKey)
                           const error = chapterErrors.get(chapterKey)
                           const chapterId = ch.chapterId || ch.id
                           
                           return (
                             <li key={chapterId ?? ch.title} className="relative">
                               <button
                                 type="button"
                                 onClick={() => handleChapterClick(skeleton.pathId, idx, chapterId)}
                                 disabled={isGenerating}
                                 className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                                   isGenerating 
                                     ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                                     : 'bg-status-blue-bg border-blue-200 hover:border-blue-300 hover:bg-blue-100'
                                 }`}
                               >
                                 <span className="mt-1 w-2 h-2 rounded-full bg-status-blue-solid-muted flex-shrink-0" />
                                 <div className="flex-1">
                                   <div className="flex items-center gap-2">
                                     <div className="font-semibold text-heading">{ch.title ?? `Chapter ${idx + 1}`}</div>
                                     {isGenerating && (
                                       <div className="flex items-center gap-1 text-xs text-muted">
                                         <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full"></div>
                                         <span>Generating...</span>
                                       </div>
                                     )}
                                     {ch.lessonCount && (
                                       <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                         {ch.lessonCount} lessons
                                       </span>
                                     )}
                                     {ch.quizCount && ch.quizCount > 0 && (
                                       <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                                         {ch.quizCount} quizzes
                                       </span>
                                     )}
                                   </div>
                                   {ch.content && <div className="text-sm text-label mt-1">{ch.content}</div>}
                                   {error && (
                                     <div className="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded">
                                       Error: {error}
                                     </div>
                                   )}
                                   {Array.isArray(ch.lessons) && ch.lessons.length > 0 && (
                                     <div className="mt-3">
                                       <h4 className="text-sm font-semibold text-heading mb-2">Lessons:</h4>
                                       <ul className="ml-4 space-y-2">
                                         {ch.lessons.map((ls: any) => {
                                           const lessonId = ls.lessonId || ls.id
                                           
                                           return (
                                             <li key={lessonId} className="relative">
                                               <button
                                                 type="button"
                                                 onClick={() => handleLessonClick(lessonId, ls.title)}
                                                 className="w-full text-left p-2 rounded-lg border transition-all text-sm bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
                                               >
                                                 <div className="flex items-center gap-2">
                                                   <span className="text-body">• {ls.title ?? 'Lesson'}</span>
                                                   {ls.hasContent && (
                                                     <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                                       Content ready
                                                     </span>
                                                   )}
                                                   {ls.quizCount && ls.quizCount > 0 && (
                                                     <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                                                       {ls.quizCount} quiz{ls.quizCount > 1 ? 'zes' : ''}
                                                     </span>
                                                   )}
                                                 </div>
                                               </button>
                                             </li>
                                           )
                                         })}
                                       </ul>
                                     </div>
                                   )}
                                 </div>
                               </button>
                             </li>
                           )
                         })}
                       </ul>
                     </div>
                   ) : Array.isArray(skeleton?.lessons) && skeleton.lessons.length > 0 ? (
                     <div>
                       <h3 className="text-lg font-semibold text-heading mb-3">Lessons</h3>
                       <ul className="space-y-4">
                         {skeleton.lessons.map((ls: any) => (
                           <li key={ls.id ?? ls.title} className="flex items-start gap-3 p-4 rounded-xl bg-status-blue-bg border border-blue-200">
                             <span className="mt-1 w-2 h-2 rounded-full bg-status-blue-solid-muted flex-shrink-0" />
                             <div className="flex-1">
                               <div className="font-semibold text-heading">{ls.title ?? 'Lesson'}</div>
                               {ls.description && <div className="text-sm text-label mt-1">{ls.description}</div>}
                               {Array.isArray(ls.chapters) && ls.chapters.length > 0 && (
                                 <ul className="mt-2 ml-4 space-y-1">
                                   {ls.chapters.map((ch: any) => (
                                     <li key={ch.id ?? ch.title} className="text-sm text-body">
                                       • {ch.title ?? 'Chapter'}
                                     </li>
                                   ))}
                                 </ul>
                               )}
                             </div>
                           </li>
                         ))}
                       </ul>
                     </div>
                   ) : (
                     <div>
                       <div className="text-muted text-center py-4">{t('plans.noPathData')}</div>
                       <div className="text-xs text-muted text-center mt-2">
                         Debug: {JSON.stringify(skeleton, null, 2)}
                       </div>
                     </div>
                   )}
                 </section>
               )}
             </>
           )}

            {/* Footer actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--border-base)' }}>
              {step > 1 && (
                <button
                  type="button"
                  style={{ padding: '8px 24px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray-100)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-short)' }}
                  onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5) : s))}
                >
                  {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
                  {'<'} {t('plans.back')}
                </button>
              )}
              {step < 5 && (
                <button
                  type="button"
                  style={{ padding: '8px 24px', background: !canNext ? 'var(--text-secondary)' : 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 600, cursor: !canNext ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => { if (canNext) e.currentTarget.style.background = 'var(--text-strong)' }} onMouseLeave={(e) => { if (canNext) e.currentTarget.style.background = 'var(--text-primary)' }}
                  disabled={!canNext}
                  onClick={() => setStep((s) => (s < 5 ? ((s + 1) as 1 | 2 | 3 | 4 | 5) : s))}
                >
                  {t('plans.continue')} {'>'}
                </button>
              )}
            </div>
          </div>
      </main>
      <Footer />

       {/* Confirm Delete Dialog */}
       <ConfirmDialog
         isOpen={showDeleteConfirm}
         title={t('plans.deleteGoal')}
         message={t('plans.deleteGoalConfirm', { title: goalToDelete?.title })}
         confirmText={t('plans.delete')}
         cancelText={t('plans.cancel')}
         variant="danger"
         onConfirm={confirmDeleteGoal}
         onCancel={() => {
           setShowDeleteConfirm(false)
           setGoalToDelete(null)
         }}
       />

       {/* Toast Notification */}
       {toast && (
         <Toast
           message={toast.message}
           type={toast.type}
           onClose={() => setToast(null)}
         />
       )}

       {/* Focus Session Dialog */}
       {showFocusDialog && selectedTask && (
         <FocusSessionDialog
           isOpen={showFocusDialog}
           taskTitle={selectedTask.title}
           onConfirm={handleCreateFocusSession}
           onCancel={handleCancelFocusSession}
           loading={creatingSession}
         />
       )}
     </div>
   )
 }

 export default PlansPage