
import React, { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Tilt from 'react-parallax-tilt'
import { SubjectService, GoalService, LearningPathService, LanguageSelection, SubjectCategory } from '../../../services'
import type { Subject, SubjectCategoryType } from '../../../services/SubjectService'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import ConfirmDialog from '../../../components/ConfirmDialog'
import Toast from '../../../components/Toast'
import { useNavigate } from 'react-router-dom'
import ROUTER from '../../../router/ROUTER'
import StepHeader from './components/StepHeader'
import { MagneticButton } from '../../../components/ui/MagneticButton'
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
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1)
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
  
  // New state for goal priorities (1-100, higher = more important)
  const [goalPriorities, setGoalPriorities] = useState<Record<string, number>>(() => {
    try {
      const raw = sessionStorage.getItem('plans.goalPriorities')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
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
  const [selectedCategory, setSelectedCategory] = useState<SubjectCategoryType>(SubjectCategory.ProgrammingLanguage)
  // Load goals from API + generation states
  const [systemGoals, setSystemGoals] = useState<any[]>([])
  const [myGoals, setMyGoals] = useState<any[]>([])
  const [goalsLoading, setGoalsLoading] = useState<boolean>(true)
  const [myGoalsLoading, setMyGoalsLoading] = useState<boolean>(true)
  // Enable Live auto-update for goals
  const [goalsError, setGoalsError] = useState<string | null>(null)
  const [myGoalsError, setMyGoalsError] = useState<string | null>(null)
  const [generating, setGenerating] = useState<boolean>(false)
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [generationProgress, setGenerationProgress] = useState<number>(0)
  const [planError, setPlanError] = useState<string | null>(null)
  const [skeleton, setSkeleton] = useState<any | null>(null)

  // Chapter skeleton generation states
  const [generatingChapters, setGeneratingChapters] = useState<Set<string>>(new Set())
  const [chapterErrors, setChapterErrors] = useState<Map<string, string>>(new Map())

  // Lesson content and quiz generation states
  const [generatingLessons, setGeneratingLessons] = useState<Set<string>>(new Set())
  const [lessonErrors, setLessonErrors] = useState<Map<string, string>>(new Map())
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

  // IMPORTANT: initialize navigate for routing
  const navigate = useNavigate()

  // Handle chapter skeleton generation
  const handleChapterClick = async (pathId: string, chapterIndex: number, _chapterId: string) => {
    const chapterKey = `${pathId}-${chapterIndex}`

    // Don't generate if already generating
    if (generatingChapters.has(chapterKey)) {
      return
    }

    // Clear any previous error for this chapter
    setChapterErrors(prev => {
      const newErrors = new Map(prev)
      newErrors.delete(chapterKey)
      return newErrors
    })

    // Add to generating set
    setGeneratingChapters(prev => new Set(prev).add(chapterKey))

    try {
      const chapterSkeleton = await LearningPathService.generateChapterSkeleton(
        pathId,
        chapterIndex,
        {
          useSignalR: true,
          onLoading: () => {}
        }
      )

      // Update skeleton with lesson info
      setSkeleton((prevSkeleton: any) => {
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
        return updated
      })

    } catch (error: any) {
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
    }
  }

  // Handle lesson click - always generate content and quiz
  const handleLessonClick = async (lessonId: string, lessonTitle: string) => {
    // Don't generate if already generating
    if (generatingLessons.has(lessonId)) {
      return
    }

    // Clear any previous error for this lesson
    setLessonErrors(prev => {
      const newErrors = new Map(prev)
      newErrors.delete(lessonId)
      return newErrors
    })

    // Add to generating set
    setGeneratingLessons(prev => new Set(prev).add(lessonId))

    try {
      // Generate lesson content and quiz skeleton together via SignalR
      const result = await LearningPathService.generateLessonContent(
        lessonId,
        undefined,
        // Quiz skeleton callback - called when quiz skeleton is received
        (quizSkeleton: any) => {
          // Update skeleton immediately when quiz skeleton is received
          setSkeleton((prevSkeleton: any) => {
            if (!prevSkeleton?.chapters && !prevSkeleton?.chapterDtos) return prevSkeleton

            const chaptersArray = prevSkeleton.chapters || prevSkeleton.chapterDtos || []
            const updatedChapters = chaptersArray.map((ch: any) => {
              if (Array.isArray(ch.lessons)) {
                const updatedLessons = ch.lessons.map((ls: any) => {
                  const currentLessonId = ls.lessonId || ls.id
                  if (currentLessonId === lessonId) {
                    return {
                      ...ls,
                      quizzes: quizSkeleton?.Quizzes || quizSkeleton?.quizzes || [],
                      quizCount: (quizSkeleton?.Quizzes || quizSkeleton?.quizzes || []).length
                    }
                  }
                  return ls
                })
                return { ...ch, lessons: updatedLessons }
              }
              return ch
            })

            return {
              ...prevSkeleton,
              chapters: prevSkeleton.chapters ? updatedChapters : undefined,
              chapterDtos: prevSkeleton.chapterDtos ? updatedChapters : undefined
            }
          })
        }
      )

      // Update skeleton with lesson content
      setSkeleton((prevSkeleton: any) => {
        if (!prevSkeleton?.chapters && !prevSkeleton?.chapterDtos) return prevSkeleton

        // Handle both chapters and chapterDtos
        const chaptersArray = prevSkeleton.chapters || prevSkeleton.chapterDtos || []
        const updatedChapters = chaptersArray.map((ch: any) => {
          if (Array.isArray(ch.lessons)) {
            const updatedLessons = ch.lessons.map((ls: any) => {
              const currentLessonId = ls.lessonId || ls.id
              if (currentLessonId === lessonId) {
                return {
                  ...ls,
                  content: result.content,
                  hasContent: true,
                  // Include quiz skeleton if it was in the initial result
                  quizzes: result.quizSkeleton?.Quizzes || result.quizSkeleton?.quizzes || ls.quizzes || [],
                  quizCount: (result.quizSkeleton?.Quizzes || result.quizSkeleton?.quizzes || ls.quizzes || []).length
                }
              }
              return ls
            })
            return { ...ch, lessons: updatedLessons }
          }
          return ch
        })

        const updated = {
          ...prevSkeleton,
          chapters: prevSkeleton.chapters ? updatedChapters : undefined,
          chapterDtos: prevSkeleton.chapterDtos ? updatedChapters : undefined
        }
        return updated
      })

    } catch (error: any) {
      setLessonErrors(prev => {
        const newErrors = new Map(prev)
        newErrors.set(lessonId, error.message || 'Failed to generate lesson content and quiz')
        return newErrors
      })
    } finally {
      // Remove from generating set
      setGeneratingLessons(prev => {
        const newSet = new Set(prev)
        newSet.delete(lessonId)
        return newSet
      })
    }
  }

  // Persist selections
  useEffect(() => {
    try {
      if (language) {
        sessionStorage.setItem('plans.language', language)
      } else {
        sessionStorage.removeItem('plans.language')
      }
    } catch { }
  }, [language])

  useEffect(() => {
    try {
      sessionStorage.setItem('plans.goals', JSON.stringify(selectedGoals))
      sessionStorage.setItem('plans.goalPriorities', JSON.stringify(goalPriorities))
    } catch { }
  }, [selectedGoals, goalPriorities])

  useEffect(() => {
    try {
      if (level) sessionStorage.setItem('plans.level', level)
      else sessionStorage.removeItem('plans.level')
    } catch { }
  }, [level])

  useEffect(() => {
    try {
      if (languageSelection) sessionStorage.setItem('plans.languageSelection', String(languageSelection))
      else sessionStorage.removeItem('plans.languageSelection')
    } catch { }
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
    return () => { try { document.head.removeChild(script) } catch { } }
  }, [])

  useEffect(() => {
    let active = true
      ; (async () => {
        try {
          const params = { category: selectedCategory }
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
      ; (async () => {
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
      ; (async () => {
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
      } catch { }
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
    if (step === 2) return selectedGoals.length > 0 && selectedGoals.length <= 2
    if (step === 3) return selectedGoals.length === 2 // Priority step only for 2 goals
    if (step === 4) return !!level
    if (step === 5) return !!languageSelection
    if (step === 6) return true // Review step
    return true
  }, [step, language, selectedGoals, level, languageSelection])

  const canGenerate = useMemo(() => !!language && selectedGoals.length > 0 && selectedGoals.length <= 2 && !!level && !!languageSelection, [language, selectedGoals, level, languageSelection])

  const isStepValid = (s: number) => {
    if (s === 1) return !!language
    if (s === 2) return selectedGoals.length > 0 && selectedGoals.length <= 2
    if (s === 3) return selectedGoals.length === 2 // Priority step only for 2 goals
    if (s === 4) return !!level
    if (s === 5) return !!languageSelection
    if (s === 6) return true // Review step
    return true
  }

  const handleStepChange = (targetStep: number) => {
    if (targetStep === step) return
    if (targetStep < step) {
      setStep(targetStep as any)
      return
    }
    // Trying to jump forward
    let valid = true
    for (let i = step; i < targetStep; i++) {
      if (!isStepValid(i)) {
        valid = false
        break
      }
    }
    if (valid) setStep(targetStep as any)
  }

  // Helper functions for step navigation
  const getNextStep = (currentStep: number): number => {
    if (currentStep === 2 && selectedGoals.length === 1) {
      return 4 // Skip step 3 (priorities) if only 1 goal
    }
    return Math.min(currentStep + 1, 6)
  }

  const getPrevStep = (currentStep: number): number => {
    if (currentStep === 4 && selectedGoals.length === 1) {
      return 2 // Skip step 3 (priorities) if only 1 goal
    }
    return Math.max(currentStep - 1, 1)
  }

  const toggleGoal = (key: string) => {
    setSelectedGoals((prev) => {
      const isSelected = prev.includes(key)
      
      if (isSelected) {
        // Remove goal and its priority
        setGoalPriorities(prevPriorities => {
          const newPriorities = { ...prevPriorities }
          delete newPriorities[key]
          return newPriorities
        })
        return prev.filter(id => id !== key)
      } else {
        // Add goal if less than 2 selected
        if (prev.length < 2) {
          // Set default priority (50 for first goal, 50 for second)
          setGoalPriorities(prevPriorities => ({
            ...prevPriorities,
            [key]: 50
          }))
          
          const newGoals = [...prev, key]
          
          // If this is the second goal, show toast
          if (newGoals.length === 2) {
            setToast({ 
              message: 'Great! Now set goal priorities in the next step.', 
              type: 'success' 
            })
          }
          
          return newGoals
        }
        return prev // Don't add if already 2 goals selected
      }
    })
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
          <Stepper currentStep={step} totalSteps={6} onChangeStep={handleStepChange} />

          {/* Content */}
          <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <StepHeader
                title={t('plans.step1Title')}
                subtitle={t('plans.step1Subtitle')}
                icon="$"
                selectedValue={language ? subjects.find((l: any) => String(l.id ?? l.subjectId) === language)?.name : undefined}
              />

              {/* Two-column: Category filter sidebar | Subject cards */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

                {/* Left: Category filter */}
                <div style={{
                  width: 180,
                  flexShrink: 0,
                  border: '1px solid var(--border-base)',
                  background: 'var(--bg-surface)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border-base)',
                    textTransform: 'uppercase',
                  }}>
                    {t('plans.filterByCategory')}
                  </div>
                  {Object.entries(SubjectCategory).map(([name, value]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedCategory(value as SubjectCategoryType)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '9px 14px',
                        fontSize: 12,
                        fontWeight: selectedCategory === value ? 700 : 500,
                        border: 'none',
                        borderLeft: selectedCategory === value ? '3px solid #3B82F6' : '3px solid transparent',
                        borderBottom: '1px solid var(--border-base)',
                        background: selectedCategory === value ? 'rgba(59,130,246,0.08)' : 'transparent',
                        color: selectedCategory === value ? '#3B82F6' : 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxSizing: 'border-box',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedCategory !== value) {
                          e.currentTarget.style.background = 'var(--bg-main)'
                          e.currentTarget.style.color = '#3B82F6'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedCategory !== value) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'var(--text-primary)'
                        }
                      }}
                    >
                      {name.replace(/([a-z])([A-Z])/g, '$1 $2')}
                    </button>
                  ))}
                </div>

                {/* Right: Subject cards */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }} aria-label="subject-list">
                    {subjectsLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
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
                </div>

              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <StepHeader
                title={t('plans.step2Title')}
                subtitle={t('plans.step2Subtitle')}
                icon="$"
                selectedValue={selectedGoals.length > 0 ? 
                  selectedGoals.length === 1 
                    ? goalItems.find((x) => String(x.key) === String(selectedGoals[0]))?.label 
                    : `${selectedGoals.length} goals selected`
                  : undefined}
              />

              {/* Instruction Text */}
              <div style={{ 
                marginBottom: 24, 
                padding: 16, 
                background: 'var(--bg-surface)', 
                border: '1px dashed var(--border-base)', 
                borderRadius: 4 
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: 12,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5
                }}>
                  <span style={{ fontSize: 16 }}>💡</span>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Select up to 2 learning goals</strong>
                    <br />
                    Choose 1-2 goals that best match what you want to achieve. If you select 2 goals, 
                    you'll be able to set priority weights to focus more on your primary objective.
                  </div>
                </div>
              </div>

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
                          disabled={!selectedGoals.includes(String(id)) && selectedGoals.length >= 2}
                          onToggle={toggleGoal}
                          onStartEdit={() => { }}
                          onDelete={() => { }}
                          isEditing={false}
                          editingTitle=""
                          setEditingTitle={() => { }}
                          onSaveEdit={() => { }}
                          onCancelEdit={() => { }}
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
                          disabled={!selectedGoals.includes(String(id)) && selectedGoals.length >= 2}
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
                            onMouseEnter={(e) => { if (!creatingGoal) e.currentTarget.style.background = 'var(--text-strong)' }} onMouseLeave={(e) => { if (!creatingGoal) e.currentTarget.style.background = 'var(--text-primary)' }}
                          >{creatingGoal ? t('plans.savingGoal') : t('plans.saveGoal')}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {step === 3 && selectedGoals.length === 2 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <StepHeader
                title="Set Goal Priorities"
                subtitle="Balance the importance of your learning goals"
                icon="⚖️"
                selectedValue={selectedGoals.length === 2 ? 'Priorities set' : undefined}
              />
              
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <div style={{ 
                  marginBottom: 32, 
                  padding: 20, 
                  background: 'var(--bg-surface)', 
                  border: '1px dashed var(--border-base)', 
                  borderRadius: 4 
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: 12,
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6
                  }}>
                    <span style={{ fontSize: 18 }}>💡</span>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Balance your learning focus</strong>
                      <br />
                      Adjust the weight of each goal. The total must equal 100%. The AI will focus more 
                      on the goal with higher weight when generating your learning path.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {selectedGoals.map((goalId, index) => {
                    const goal = goalItems.find(g => String(g.key) === String(goalId))
                    const priority = goalPriorities[goalId] || 50
                    const otherGoalId = selectedGoals.find(id => id !== goalId)
                    const otherPriority = otherGoalId ? (goalPriorities[otherGoalId] || 50) : 50
                    
                    return (
                      <div key={goalId} style={{ 
                        background: 'var(--bg-surface)', 
                        border: '1px solid var(--border-base)', 
                        borderRadius: 4, 
                        padding: 24 
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          marginBottom: 20 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{
                              width: 40,
                              height: 40,
                              borderRadius: 4,
                              background: index === 0 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              color: 'var(--bg-surface)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 18,
                              fontWeight: 700
                            }}>
                              {index + 1}
                            </div>
                            <div>
                              <h4 style={{ 
                                fontSize: 18, 
                                fontWeight: 600, 
                                color: 'var(--text-primary)', 
                                margin: 0 
                              }}>
                                {goal?.label || 'Unknown Goal'}
                              </h4>
                            </div>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 12,
                            fontSize: 24,
                            fontWeight: 700,
                            color: priority >= 60 ? 'var(--success-primary)' : 
                                  priority >= 40 ? 'var(--accent-primary)' : 'var(--text-secondary)'
                          }}>
                            <span>{priority}%</span>
                          </div>
                        </div>
                        
                        <div style={{ position: 'relative' }}>
                          <input
                            type="range"
                            min="10"
                            max="90"
                            value={priority}
                            onChange={(e) => {
                              const newPriority = parseInt(e.target.value)
                              const otherPriority = 100 - newPriority
                              
                              setGoalPriorities(prev => ({
                                ...prev,
                                [goalId]: newPriority,
                                [otherGoalId!]: otherPriority
                              }))
                            }}
                            style={{
                              width: '100%',
                              height: 10,
                              borderRadius: 5,
                              background: `linear-gradient(to right, 
                                ${priority >= 60 ? 'var(--success-primary)' : 
                                  priority >= 40 ? 'var(--accent-primary)' : 'var(--text-secondary)'} 0%, 
                                ${priority >= 60 ? 'var(--success-primary)' : 
                                  priority >= 40 ? 'var(--accent-primary)' : 'var(--text-secondary)'} ${priority}%, 
                                var(--border-base) ${priority}%, 
                                var(--border-base) 100%)`,
                              outline: 'none',
                              appearance: 'none',
                              cursor: 'pointer'
                            }}
                          />
                          <style>
                            {`
                              input[type="range"]::-webkit-slider-thumb {
                                appearance: none;
                                width: 28px;
                                height: 28px;
                                border-radius: 50%;
                                background: ${priority >= 60 ? 'var(--success-primary)' : 
                                             priority >= 40 ? 'var(--accent-primary)' : 'var(--text-secondary)'};
                                cursor: pointer;
                                border: 3px solid var(--bg-surface);
                                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                              }
                              input[type="range"]::-moz-range-thumb {
                                width: 28px;
                                height: 28px;
                                border-radius: 50%;
                                background: ${priority >= 60 ? 'var(--success-primary)' : 
                                             priority >= 40 ? 'var(--accent-primary)' : 'var(--text-secondary)'};
                                cursor: pointer;
                                border: 3px solid var(--bg-surface);
                                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                              }
                            `}
                          </style>
                          
                          {/* Priority scale labels */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            marginTop: 16,
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            fontWeight: 600
                          }}>
                            <span>LOW FOCUS</span>
                            <span>BALANCED</span>
                            <span>HIGH FOCUS</span>
                          </div>
                        </div>
                        
                        {/* Show other goal's weight */}
                        <div style={{ 
                          marginTop: 16, 
                          padding: 12, 
                          background: 'var(--bg-main)', 
                          border: '1px dashed var(--border-base)', 
                          borderRadius: 4,
                          fontSize: 13,
                          color: 'var(--text-secondary)'
                        }}>
                          Other goal will have <strong style={{ color: 'var(--text-primary)' }}>{100 - priority}%</strong> weight
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <StepHeader
                title={t('plans.step3Title')}
                subtitle={t('plans.step3Subtitle')}
                icon="$"
                selectedValue={level || undefined}
              />
              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, maxWidth: 900, margin: '0 auto' }} aria-label="level-list">
                {(['Beginner', 'Intermediate', 'Advanced'] as Level[]).map((lv) => (
                  <Tilt key={lv} tiltMaxAngleX={4} tiltMaxAngleY={4} scale={1.02} transitionSpeed={400} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
                  <button
                    type="button"
                    onClick={() => setLevel(lv)}
                    style={{
                      padding: 20, border: '1px solid var(--border-base)', borderRadius: 2, background: level === lv ? 'var(--bg-blue-hover)' : 'var(--bg-surface)',
                      borderColor: level === lv ? 'var(--accent-primary)' : 'var(--border-base)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                      height: '100%'
                    }}
                    onMouseEnter={(e) => { if (level !== lv) { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--bg-main)' } }}
                    onMouseLeave={(e) => { if (level !== lv) { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.background = 'var(--bg-surface)' } }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{level === lv ? '> ' : '$ '}{lv}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>// {lv === 'Beginner' ? t('plans.beginnerDesc') : lv === 'Intermediate' ? t('plans.intermediateDesc') : t('plans.advancedDesc')}</div>
                  </button>
                  </Tilt>
                ))}
              </section>
            </motion.div>
          )}
          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <StepHeader
                title={t('plans.step4Title')}
                subtitle={t('plans.step4Subtitle')}
                icon="$"
                selectedValue={languageSelection ? (languageSelection === LanguageSelection.Vietnamese ? 'Tiếng Việt' : 'English') : undefined}
              />
              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, maxWidth: 700, margin: '0 auto' }} aria-label="language-selection">
                {/* Vietnamese Option */}
                <Tilt tiltMaxAngleX={4} tiltMaxAngleY={4} scale={1.02} transitionSpeed={400} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
                <button
                  type="button"
                  onClick={() => setLanguageSelection(LanguageSelection.Vietnamese)}
                  style={{
                    padding: 24, border: '1px solid var(--border-base)', borderRadius: 2, background: languageSelection === LanguageSelection.Vietnamese ? 'var(--bg-blue-hover)' : 'var(--bg-surface)',
                    borderColor: languageSelection === LanguageSelection.Vietnamese ? 'var(--accent-primary)' : 'var(--border-base)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    height: '100%'
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
                </Tilt>

                {/* English Option */}
                <Tilt tiltMaxAngleX={4} tiltMaxAngleY={4} scale={1.02} transitionSpeed={400} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
                <button
                  type="button"
                  onClick={() => setLanguageSelection(LanguageSelection.English)}
                  style={{
                    padding: 24, border: '1px solid var(--border-base)', borderRadius: 2, background: languageSelection === LanguageSelection.English ? 'var(--bg-blue-hover)' : 'var(--bg-surface)',
                    borderColor: languageSelection === LanguageSelection.English ? 'var(--accent-primary)' : 'var(--border-base)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    height: '100%'
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
                </Tilt>
              </section>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div key="step6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
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
                    { label: `$ ${t('plans.learningGoal')}`, val: selectedGoals.length > 0 ? 
                        selectedGoals.length === 1 
                          ? goalItems.find((x) => x.key === selectedGoals[0])?.label 
                          : selectedGoals.map(goalId => {
                              const goal = goalItems.find(x => x.key === goalId)
                              const priority = goalPriorities[goalId] || 50
                              return `${goal?.label} (${priority}%)`
                            }).join(', ')
                        : undefined },
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
                <MagneticButton
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
                    if (selectedGoals.length === 0) { setPlanError(t('plans.selectAtLeastOneGoal')); return }
                    if (!level) { setPlanError(t('plans.selectLevel')); return }
                    if (!languageSelection) { setPlanError(t('plans.selectLanguage')); return }
                    setPlanError(null)
                    setGenerating(true)
                    setGenerationProgress(0)
                    try {
                      const payload: any = {
                        subjectId: language,
                        goals: selectedGoals.map(goalId => ({
                          goalId: goalId,
                          weight: goalPriorities[goalId] || (selectedGoals.length === 1 ? 100 : 50)
                        })),
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
                      try { sessionStorage.setItem('learningPathSkeleton', JSON.stringify(sk)) } catch { }
                      
                      // Navigate to detail page if pathId exists, otherwise to result page
                      if (sk?.pathId) {
                        navigate('/my-plans/detail', { state: { pathId: sk.pathId } })
                      } else {
                        navigate(ROUTER.PLANS_RESULT, { state: { skeleton: sk } })
                      }
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
                </MagneticButton>
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--border-base)' }}>
            {step > 1 && (
              <button
                type="button"
                style={{ padding: '8px 24px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray-100)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-short)' }}
                onClick={() => setStep(getPrevStep(step) as any)}
              >
                {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
                {'<'} {t('plans.back')}
              </button>
            )}
            {step < 6 && (
              <button
                type="button"
                style={{ padding: '8px 24px', background: !canNext ? 'var(--text-secondary)' : 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 600, cursor: !canNext ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={(e) => { if (canNext) e.currentTarget.style.background = 'var(--text-strong)' }} onMouseLeave={(e) => { if (canNext) e.currentTarget.style.background = 'var(--text-primary)' }}
                disabled={!canNext}
                onClick={() => setStep(getNextStep(step) as any)}
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
    </div>
  )
}

export default PlansPage
