
import React, { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Tilt from 'react-parallax-tilt'
import { SubjectService, GoalService, LearningPathService, LanguageSelection, SubjectCategory } from '../../../services'
import type { Subject, SubjectCategoryType } from '../../../services/SubjectService'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import Toast from '../../../components/Toast'
import { useNavigate } from 'react-router-dom'
import ROUTER from '../../../router/ROUTER.js'
import StepHeader from './components/StepHeader'
import LanguageCard from './components/LanguageCard'
import SingleGoalCard from './components/SingleGoalCard'
import Stepper from './components/Stepper'
import { useTranslation } from 'react-i18next'
import { getGoalTitle } from '../../../utils/goalTranslation'
import useAuthStore from '../../../store/useAuthStore'

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
export type PlansVariant = 'student' | 'mentorAiDraft'

interface PlansPageProps {
  variant?: PlansVariant
}

export const PlansPage: React.FC<PlansPageProps> = ({ variant = 'student' }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1)
  const stepContentRef = useRef<HTMLDivElement | null>(null)
  const prevStepRef = useRef<number>(1)
  const { t } = useTranslation('student')
  const { t: tm } = useTranslation('mentor')
  const isMentorVariant = variant === 'mentorAiDraft'
  const totalSteps = isMentorVariant ? 6 : 7
  const storagePrefix = isMentorVariant ? 'mentorAiPlans' : 'plans'
  const storageKey = (key: string) => `${storagePrefix}.${key}`
  const [language, setLanguage] = useState<string | null>(() => {
    try {
      const v = sessionStorage.getItem(storageKey('language')) || null
      return isGuid(v) ? v : null
    } catch {
      return null
    }
  })
  const [selectedGoals, setSelectedGoals] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey('goals'))
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  
  // New state for goal priorities (1-100, higher = more important)
  const [goalPriorities, setGoalPriorities] = useState<Record<string, number>>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey('goalPriorities'))
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })
  const [level, setLevel] = useState<Level | null>(() => {
    try {
      return (sessionStorage.getItem(storageKey('level')) as Level | null) || null
    } catch {
      return null
    }
  })
  const [languageSelection, setLanguageSelection] = useState<LanguageSelection | null>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey('languageSelection'))
      return stored ? Number(stored) as LanguageSelection : null
    } catch {
      return null
    }
  })
  // Load subjects from API
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(true)
  const [subjectsError, setSubjectsError] = useState<string | null>(null)
  // Subject category filter
  const [selectedCategory, setSelectedCategory] = useState<SubjectCategoryType>(SubjectCategory.ProgrammingLanguage)
  // Store goals from selected subject (no longer separate API calls)
  const [subjectGoals, setSubjectGoals] = useState<any[]>([])
  const [goalsLoading, setGoalsLoading] = useState<boolean>(false)
  const [goalsError, setGoalsError] = useState<string | null>(null)
  // Pagination for system goals and my goals separately
  const [currentSystemGoalPage, setCurrentSystemGoalPage] = useState<number>(1)
  const [currentMyGoalPage, setCurrentMyGoalPage] = useState<number>(1)
  const [myGoalsPanelOpen, setMyGoalsPanelOpen] = useState<boolean>(false)
  const goalsPerPage = 12
  const [generating, setGenerating] = useState<boolean>(false)
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [generationProgress, setGenerationProgress] = useState<number>(0)
  const [planError, setPlanError] = useState<string | null>(null)
  const [skeleton, setSkeleton] = useState<any | null>(null)
  const refreshProfile = useAuthStore((state) => state.fetchProfile)

  // Chapter skeleton generation states
  const [generatingChapters, setGeneratingChapters] = useState<Set<string>>(new Set())
  const [chapterErrors, setChapterErrors] = useState<Map<string, string>>(new Map())

  // Lesson content and quiz generation states
  const [generatingLessons, setGeneratingLessons] = useState<Set<string>>(new Set())
  const [lessonErrors, setLessonErrors] = useState<Map<string, string>>(new Map())
  // Batch generation states
  const [generatingAllLessons, setGeneratingAllLessons] = useState<boolean>(false)
  const [generatingAllTasks, setGeneratingAllTasks] = useState<boolean>(false)
  
  // New goal creation states
  const [showAddGoal, setShowAddGoal] = useState<boolean>(false)
  const [newGoalTitle, setNewGoalTitle] = useState<string>('')
  const [newGoalDesc, setNewGoalDesc] = useState<string>('')
  const [newGoalDuration, setNewGoalDuration] = useState<string>('OneMonth')
  const [creatingGoal, setCreatingGoal] = useState<boolean>(false)
  const [createGoalError, setCreateGoalError] = useState<string | null>(null)

  // Learning path suggestions states
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false)

  // Goal editing states
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [editingGoalTitle, setEditingGoalTitle] = useState<string>('')
  const [editingGoalDesc, setEditingGoalDesc] = useState<string>('')
  const [editingGoalDuration, setEditingGoalDuration] = useState<string>('OneMonth')
  const [editingGoalActive, setEditingGoalActive] = useState<boolean>(true)
  const [editingGoalSubject, setEditingGoalSubject] = useState<string>('')
  const [updatingGoal, setUpdatingGoal] = useState<boolean>(false)
  const [updateGoalError, setUpdateGoalError] = useState<string | null>(null)
  const [showEditGoal, setShowEditGoal] = useState<boolean>(false)

  // IMPORTANT: initialize navigate for routing
  const navigate = useNavigate()

  // Function to reload goals for the current subject
  const reloadSubjectGoals = async () => {
    if (!language) return

    try {
      setGoalsLoading(true)
      setGoalsError(null)
      
      const params = { category: selectedCategory }
      const data = await SubjectService.listSubjects(params)
      const normalized = (Array.isArray(data) ? data : []).map((s: any) => ({ 
        ...s, 
        id: s?.id ?? s?.subjectId,
        goals: s?.goals || []
      }))
      
      const selectedSubject = normalized.find((s: any) => String(s.id ?? s.subjectId) === language)
      if (selectedSubject && Array.isArray(selectedSubject.goals)) {
        setSubjectGoals(selectedSubject.goals)
        // Update subjects list as well
        setSubjects(normalized as any)
      }
    } catch (e: any) {
      const d = e?.response?.data
      const msg = d?.message || d?.error || d?.title || d?.detail || e?.message || t('plans.failedLoadSubjects')
      setGoalsError(msg)
    } finally {
      setGoalsLoading(false)
    }
  }

  // Handle goal creation
  const handleCreateGoalModal = async () => {
    const title = newGoalTitle.trim()
    const description = newGoalDesc.trim()
    const duration = newGoalDuration
    
    if (!title) {
      setCreateGoalError(t('plans.enterGoalTitle'))
      return
    }
    if (!language) {
      setCreateGoalError(t('plans.selectSubjectFirst'))
      return
    }
    
    setCreatingGoal(true)
    setCreateGoalError(null)
    
    try {
      const payload = {
        subjectId: language,
        title: title,
        description: description,
        duration: duration
      }
      
      const created = await GoalService.createGoal(payload)
      
      setToast({ message: t('plans.goalCreated'), type: 'success' })
      setShowAddGoal(false)
      setNewGoalTitle('')
      setNewGoalDesc('')
      setNewGoalDuration('OneMonth')
      
      // Reload goals to get updated list
      await reloadSubjectGoals()
    } catch (e: any) {
      const d = e?.response?.data
      const errorCode = d?.errorCode || d?.code
      const errorMessage = d?.errorMessage || d?.message || d?.error || e?.message
      
      let displayMessage = errorMessage || t('plans.goalCreateFailed')
      
      // Handle specific error codes with translated messages
      if (errorCode === 'GOAL_SUBJECT_MISMATCH') {
        displayMessage = t('plans.goalSubjectMismatch')
      } else if (errorCode === 'INVALID_SUBJECT') {
        displayMessage = t('plans.invalidSubject')
      } else if (errorCode === 'DUPLICATE_GOAL') {
        displayMessage = t('plans.duplicateGoal')
      } else if (errorCode === 'VALIDATION_ERROR') {
        displayMessage = t('plans.validationError')
      } else if (errorCode === 'UNAUTHORIZED') {
        displayMessage = t('plans.unauthorized')
      } else if (errorCode === 'RATE_LIMIT_EXCEEDED') {
        displayMessage = t('plans.rateLimitExceeded')
      }
      
      setCreateGoalError(displayMessage)
    } finally {
      setCreatingGoal(false)
    }
  }

  // Handle goal editing
  const handleStartEditGoal = (goalId: string) => {
    const goal = subjectGoals.find(g => String(g?.id ?? g?.goalId ?? g?.key) === goalId)
    if (goal) {
      setEditingGoalId(goalId)
      setEditingGoalTitle(goal.title || goal.name || '')
      setEditingGoalDesc(goal.description || '')
      setEditingGoalDuration(goal.duration || 'OneMonth')
      setEditingGoalActive(goal.isActive ?? true)
      setEditingGoalSubject(goal.subjectId || language || '') // Use goal's subjectId or current language
      setUpdateGoalError(null)
      setShowEditGoal(true)
    }
  }

  const handleUpdateGoalModal = async () => {
    const title = editingGoalTitle.trim()
    const description = editingGoalDesc.trim()
    const duration = editingGoalDuration
    const isActive = editingGoalActive
    const subjectId = editingGoalSubject
    
    if (!title) {
      setUpdateGoalError(t('plans.enterGoalTitle'))
      return
    }
    if (!subjectId) {
      setUpdateGoalError(t('plans.selectSubjectFirst'))
      return
    }
    if (!editingGoalId) {
      setUpdateGoalError('Goal ID is missing')
      return
    }
    
    setUpdatingGoal(true)
    setUpdateGoalError(null)
    
    try {
      const payload = {
        subjectId: subjectId,
        title: title,
        description: description,
        duration: duration,
        isActive: isActive
      }
      
      await GoalService.updateGoal(editingGoalId, payload)
      
      setToast({ message: t('plans.goalUpdated'), type: 'success' })
      setShowEditGoal(false)
      setEditingGoalId(null)
      setEditingGoalTitle('')
      setEditingGoalDesc('')
      setEditingGoalDuration('OneMonth')
      setEditingGoalActive(true)
      setEditingGoalSubject('')
      
      // Reload goals to get updated list
      await reloadSubjectGoals()
    } catch (e: any) {
      const d = e?.response?.data
      const errorCode = d?.errorCode || d?.code
      const errorMessage = d?.errorMessage || d?.message || d?.error || e?.message
      
      let displayMessage = errorMessage || t('plans.goalUpdateFailed')
      
      // Handle specific error codes with translated messages
      if (errorCode === 'GOAL_SUBJECT_MISMATCH') {
        displayMessage = t('plans.goalSubjectMismatch')
      } else if (errorCode === 'INVALID_SUBJECT') {
        displayMessage = t('plans.invalidSubject')
      } else if (errorCode === 'DUPLICATE_GOAL') {
        displayMessage = t('plans.duplicateGoal')
      } else if (errorCode === 'VALIDATION_ERROR') {
        displayMessage = t('plans.validationError')
      } else if (errorCode === 'UNAUTHORIZED') {
        displayMessage = t('plans.unauthorized')
      } else if (errorCode === 'RATE_LIMIT_EXCEEDED') {
        displayMessage = t('plans.rateLimitExceeded')
      }
      
      setUpdateGoalError(displayMessage)
    } finally {
      setUpdatingGoal(false)
    }
  }

  const handleCancelEditGoal = () => {
    setShowEditGoal(false)
    setEditingGoalId(null)
    setEditingGoalTitle('')
    setEditingGoalDesc('')
    setEditingGoalDuration('OneMonth')
    setEditingGoalActive(true)
    setEditingGoalSubject('')
    setUpdateGoalError(null)
  }

  // Handle next click from step 6 (summary)
  const handleNextFromSummary = async () => {
    // Basic validation
    if (!language || selectedGoals.length === 0 || !level || !languageSelection) {
      setStep(getNextStep(step) as any)
      return
    }

    setLoadingSuggestions(true)
    try {
      const payload = {
        subjectId: language,
        goals: selectedGoals.map(goalId => ({
          goalId: goalId,
          weight: goalPriorities[goalId] || (selectedGoals.length === 1 ? 100 : 50)
        })),
        complexityLevel: level,
        languageSelection: languageSelection
      }

      let tempSuggestions: any[] = []

      const result = await LearningPathService.getSuggestions(payload, {
        useSignalR: true,
        onLoading: () => {},
        onSuggestionsLoaded: (suggestionsData: any[]) => {
          tempSuggestions = suggestionsData
        }
      })

      const finalSuggestions = (result?.suggestions && result.suggestions.length > 0) 
          ? result.suggestions 
          : tempSuggestions

      if (finalSuggestions && finalSuggestions.length > 0) {
        setSuggestions(finalSuggestions)
        setStep(getNextStep(step) as any)
        setShowSuggestions(true) // Automatically pop it open
      } else {
        setStep(getNextStep(step) as any)
      }
    } catch (e: any) {
      console.error('Auto-suggestion failed:', e)
      setStep(getNextStep(step) as any)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  // Handle learning path suggestions
  const handleGetSuggestions = async () => {
    if (!language) {
      setSuggestionsError(t('plans.selectLanguage'))
      return
    }
    if (selectedGoals.length === 0) {
      setSuggestionsError(t('plans.selectAtLeastOneGoal'))
      return
    }
    if (!level) {
      setSuggestionsError(t('plans.selectLevel'))
      return
    }
    if (!languageSelection) {
      setSuggestionsError(t('plans.selectLanguage'))
      return
    }

    setSuggestionsError(null)
    setLoadingSuggestions(true)
    setSuggestions([])
    setShowSuggestions(true)

    try {
      const payload = {
        subjectId: language,
        goals: selectedGoals.map(goalId => ({
          goalId: goalId,
          weight: goalPriorities[goalId] || (selectedGoals.length === 1 ? 100 : 50)
        })),
        complexityLevel: level,
        languageSelection: languageSelection
      }

      const result = await LearningPathService.getSuggestions(payload, {
        useSignalR: true,
        onLoading: () => {
          setLoadingSuggestions(true)
        },
        onSuggestionsLoaded: (suggestionsData: any[]) => {
          setSuggestions(suggestionsData)
        }
      })

      // If suggestions weren't set via callback, set them from result
      if (result?.suggestions && suggestions.length === 0) {
        setSuggestions(result.suggestions)
      }
    } catch (e: any) {
      const d = e?.response?.data
      const serverMsg = d?.errorMessage || d?.message || d?.msg || d?.error || d?.title || d?.detail
      const code = d?.errorCode || d?.code
      let msg = code ? `${code}: ${serverMsg || 'Unknown error'}` : (serverMsg || e?.message || t('plans.unableToGetSuggestions'))
      setSuggestionsError(msg)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const buildGenerationPayload = () => ({
    subjectId: language,
    goals: selectedGoals.map(goalId => ({
      goalId,
      weight: goalPriorities[goalId] || (selectedGoals.length === 1 ? 100 : 50),
    })),
    complexityLevel: level,
    languageSelection,
  })

  const validateGenerationInput = () => {
    if (!language) {
      setPlanError(t('plans.selectLanguage'))
      return false
    }
    if (selectedGoals.length === 0) {
      setPlanError(t('plans.selectAtLeastOneGoal'))
      return false
    }
    if (!level) {
      setPlanError(t('plans.selectLevel'))
      return false
    }
    if (!languageSelection) {
      setPlanError(t('plans.selectLanguage'))
      return false
    }
    return true
  }

  const getGenerationErrorMessage = (e: any) => {
    const d = e?.response?.data
    const serverMsg = d?.errorMessage || d?.message || d?.msg || d?.error || d?.title || d?.detail
    const code = d?.errorCode || d?.code
    let msg = code ? `${code}: ${serverMsg || 'Unknown error'}` : (serverMsg || e?.message || t('plans.unableToGenerate'))
    const lower = String(serverMsg || e?.message || '').toLowerCase()
    if (code === 'AI_GENERATION_FAILED' && (lower.includes('invalid api key') || lower.includes('invalid_api_key') || lower.includes('unauthorized'))) {
      msg = t('plans.aiKeyError')
    }
    return msg
  }

  const syncWalletAfterGeneration = async () => {
    try {
      await refreshProfile()
      await new Promise((resolve) => window.setTimeout(resolve, 1200))
      await refreshProfile()
    } catch {
      // Keep generation success flow even when profile sync fails.
    }
  }

  const handleGenerateStudentPlan = async () => {
    if (!validateGenerationInput()) return

    setPlanError(null)
    setGenerating(true)
    setGenerationProgress(0)

    try {
      const payload = buildGenerationPayload()
      const sk = await LearningPathService.generateSkeleton(payload, {
        useSignalR: true,
        onLoading: () => {
          setGenerationProgress(10)
        },
        onProgress: (progress: number) => {
          setGenerationProgress(progress)
        }
      })

      setSkeleton(sk)
      setGenerationProgress(100)
      try { sessionStorage.setItem('learningPathSkeleton', JSON.stringify(sk)) } catch { }

      if (sk?.pathId) {
        void syncWalletAfterGeneration()
        navigate('/my-plans/detail', { state: { pathId: sk.pathId } })
      } else {
        void syncWalletAfterGeneration()
        navigate(ROUTER.PLANS_RESULT, { state: { skeleton: sk } })
      }
    } catch (e: any) {
      setPlanError(getGenerationErrorMessage(e))
    } finally {
      setGenerating(false)
      setGenerationProgress(0)
    }
  }

  const handleGenerateMentorDraft = async () => {
    if (!validateGenerationInput()) return

    setPlanError(null)
    setGenerating(true)
    setGenerationProgress(15)

    try {
      const payload = buildGenerationPayload()
      const sk = await LearningPathService.generateAiDraft(payload)

      setSkeleton(sk)
      setGenerationProgress(100)

      if (!sk?.pathId) {
        setPlanError(tm('aiPlans.missingDraftId'))
        return
      }

      navigate('/mentor/drafts/' + sk.pathId, {
        state: { pathId: sk.pathId, draft: sk },
      })
    } catch (e: any) {
      setPlanError(getGenerationErrorMessage(e))
    } finally {
      setGenerating(false)
      setGenerationProgress(0)
    }
  }

  const handleGenerateClick = async () => {
    if (isMentorVariant) {
      await handleGenerateMentorDraft()
      return
    }
    await handleGenerateStudentPlan()
  }

  const handleSelectSuggestion = async (suggestion: any) => {
    if (!suggestion?.pathId) {
      setToast({ message: t('plans.invalidSuggestion'), type: 'error' })
      return
    }

    // Validate required data
    if (!language) {
      setToast({ message: t('plans.selectSubject'), type: 'error' })
      return
    }
    if (selectedGoals.length === 0) {
      setToast({ message: t('plans.selectAtLeastOneGoal'), type: 'error' })
      return
    }
    if (!level) {
      setToast({ message: t('plans.selectLevel'), type: 'error' })
      return
    }
    if (languageSelection === null || languageSelection === undefined) {
      setToast({ message: t('plans.selectLanguage'), type: 'error' })
      return
    }

    setGenerating(true)
    setGenerationProgress(0)
    setPlanError(null)
    setShowSuggestions(false) // Close suggestions modal

    try {
      // Prepare goals array with weights using goalPriorities
      const goalsWithWeights = selectedGoals.map(goalId => {
        // Use goalPriorities for weight, or calculate equal weight if not set
        const priority = goalPriorities[goalId] || 50 // Default to 50 if not set
        // Convert priority (1-100) to weight (0.0-1.0), normalize across all goals
        const weight = priority / 100
        return {
          goalId: goalId,
          weight: weight
        }
      })

      // Normalize weights so they sum to 1.0
      const totalWeight = goalsWithWeights.reduce((sum, g) => sum + g.weight, 0)
      if (totalWeight > 0) {
        goalsWithWeights.forEach(g => {
          g.weight = g.weight / totalWeight
        })
      } else {
        // Fallback to equal weights
        const equalWeight = 1.0 / goalsWithWeights.length
        goalsWithWeights.forEach(g => {
          g.weight = equalWeight
        })
      }

      // Import SignalR function
      const { requestAdoptSuggestedLearningPath } = await import('../../../services/SignalR')

      const result = await requestAdoptSuggestedLearningPath(
        suggestion.pathId, // suggestedPathId
        language, // subjectId
        goalsWithWeights, // goals with weights
        level, // complexityLevel
        languageSelection, // languageSelection (0 = English, 1 = Vietnamese)
        () => {
          // onLoading
          setGenerationProgress(20)
        },
        (data: any) => {
          // onAdopted
          setGenerationProgress(90)
        }
      )

      setGenerationProgress(100)
      setGenerating(false)

      // Navigate to the adopted learning path
      if (result?.pathId) {
        void syncWalletAfterGeneration()
        navigate('/my-plans/detail', { state: { pathId: result.pathId } })
        setToast({ message: t('plans.suggestionAdoptedSuccess'), type: 'success' })
      } else {
        setToast({ message: t('plans.suggestionAdoptedButNoPath'), type: 'warning' })
      }

    } catch (e: any) {
      setGenerating(false)
      setGenerationProgress(0)
      const errorMessage = e?.message || t('plans.errorAdoptingSuggestion')
      setPlanError(errorMessage)
      setToast({ message: errorMessage, type: 'error' })
    }
  }

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

  // ── Batch: generate ALL lesson contents concurrently ──────────────────────
  const handleGenerateAllLessons = async () => {
    if (!skeleton || generatingAllLessons) return

    // Collect every lessonId from all chapters
    const chaptersArray = skeleton.chapters || skeleton.chapterDtos || []
    const allLessonIds: string[] = []
    chaptersArray.forEach((ch: any) => {
      (ch.lessons || []).forEach((ls: any) => {
        const id = ls.lessonId || ls.id
        if (id && !generatingLessons.has(id)) allLessonIds.push(id)
      })
    })

    if (allLessonIds.length === 0) return

    setGeneratingAllLessons(true)
    // Mark all as loading immediately
    setGeneratingLessons(new Set(allLessonIds))
    setLessonErrors(new Map())

    const updateLessonInSkeleton = (lessonId: string, patch: Record<string, any>) => {
      setSkeleton((prev: any) => {
        if (!prev) return prev
        const arr = prev.chapters || prev.chapterDtos || []
        const updated = arr.map((ch: any) => {
          if (!Array.isArray(ch.lessons)) return ch
          return {
            ...ch,
            lessons: ch.lessons.map((ls: any) => {
              const id = ls.lessonId || ls.id
              if (id !== lessonId) return ls
              return { ...ls, ...patch }
            }),
          }
        })
        return {
          ...prev,
          chapters: prev.chapters ? updated : undefined,
          chapterDtos: prev.chapterDtos ? updated : undefined,
        }
      })
    }

    await LearningPathService.generateMultipleLessonContents(allLessonIds, {
      onItemLoading: (lessonId) => {
        setGeneratingLessons(prev => new Set(prev).add(lessonId))
      },
      onItemSuccess: (lessonId, result) => {
        updateLessonInSkeleton(lessonId, {
          content: result.content,
          hasContent: true,
          quizzes: result.quizSkeleton?.Quizzes || result.quizSkeleton?.quizzes || [],
          quizCount: (result.quizSkeleton?.Quizzes || result.quizSkeleton?.quizzes || []).length,
        })
        setGeneratingLessons(prev => {
          const next = new Set(prev)
          next.delete(lessonId)
          return next
        })
      },
      onItemError: (lessonId, err) => {
        setLessonErrors(prev => {
          const next = new Map(prev)
          next.set(lessonId, err.message || 'Failed to generate lesson content')
          return next
        })
        setGeneratingLessons(prev => {
          const next = new Set(prev)
          next.delete(lessonId)
          return next
        })
      },
      onQuizEvent: {
        onSuccess: (lessonId, quizData) => {
          updateLessonInSkeleton(lessonId, {
            quizzes: quizData?.Quizzes || quizData?.quizzes || [],
            quizCount: (quizData?.Quizzes || quizData?.quizzes || []).length,
          })
        },
      },
    })

    setGeneratingAllLessons(false)
  }

  // ── Batch: generate ALL chapter tasks concurrently ─────────────────────────
  const handleGenerateAllChapterTasks = async () => {
    if (!skeleton || generatingAllTasks) return

    const chaptersArray = skeleton.chapters || skeleton.chapterDtos || []
    const chapterIds: string[] = chaptersArray
      .map((ch: any) => ch.chapterId || ch.id)
      .filter(Boolean)

    if (chapterIds.length === 0) return

    setGeneratingAllTasks(true)

    await LearningPathService.generateMultipleChapterTasks(chapterIds, {
      onItemSuccess: (chapterId, result) => {
        setSkeleton((prev: any) => {
          if (!prev) return prev
          const arr = prev.chapters || prev.chapterDtos || []
          const updated = arr.map((ch: any) => {
            const id = ch.chapterId || ch.id
            if (id !== chapterId) return ch
            return {
              ...ch,
              tasks: result.tasks || result.Tasks || ch.tasks || [],
            }
          })
          return {
            ...prev,
            chapters: prev.chapters ? updated : undefined,
            chapterDtos: prev.chapterDtos ? updated : undefined,
          }
        })
      },
    })

    setGeneratingAllTasks(false)
  }

  // Persist selections
  useEffect(() => {
    try {
      if (language) {
        sessionStorage.setItem(storageKey('language'), language)
      } else {
        sessionStorage.removeItem(storageKey('language'))
      }
    } catch { }
  }, [language, storagePrefix])

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey('goals'), JSON.stringify(selectedGoals))
      sessionStorage.setItem(storageKey('goalPriorities'), JSON.stringify(goalPriorities))
    } catch { }
  }, [selectedGoals, goalPriorities, storagePrefix])

  useEffect(() => {
    try {
      if (level) sessionStorage.setItem(storageKey('level'), level)
      else sessionStorage.removeItem(storageKey('level'))
    } catch { }
  }, [level, storagePrefix])

  useEffect(() => {
    try {
      if (languageSelection) sessionStorage.setItem(storageKey('languageSelection'), String(languageSelection))
      else sessionStorage.removeItem(storageKey('languageSelection'))
    } catch { }
  }, [languageSelection, storagePrefix])

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
            const normalized = (Array.isArray(data) ? data : []).map((s: any) => ({ 
              ...s, 
              id: s?.id ?? s?.subjectId,
              // Extract goals from subject if available
              goals: s?.goals || []
            }))
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
  // Load goals from selected subject when language changes
  useEffect(() => {
    if (!language) {
      setSubjectGoals([])
      setGoalsLoading(false)
      setGoalsError(null)
      // Clear selected goals when no language is selected
      setSelectedGoals([])
      setGoalPriorities({})
      setCurrentSystemGoalPage(1) // Reset pagination
      setCurrentMyGoalPage(1) // Reset pagination
      return
    }

    const selectedSubject = subjects.find((s: any) => String(s.id ?? s.subjectId) === language)
    if (selectedSubject && Array.isArray(selectedSubject.goals)) {
      setSubjectGoals(selectedSubject.goals)
      setGoalsLoading(false)
      setGoalsError(null)
      // Clear selected goals when switching subjects since goals are different
      setSelectedGoals([])
      setGoalPriorities({})
      setCurrentSystemGoalPage(1) // Reset pagination
      setCurrentMyGoalPage(1) // Reset pagination
    } else {
      setSubjectGoals([])
      setGoalsLoading(false)
      setGoalsError(null)
      setSelectedGoals([])
      setGoalPriorities({})
      setCurrentSystemGoalPage(1) // Reset pagination
      setCurrentMyGoalPage(1) // Reset pagination
    }
  }, [language, subjects])

  const canNext = useMemo(() => {
    if (step === 1) return !!language
    if (step === 2) return selectedGoals.length > 0 && selectedGoals.length <= 2
    if (step === 3) return selectedGoals.length === 2 // Priority step only for 2 goals
    if (step === 4) return !!level
    if (step === 5) return !!languageSelection
    if (step === 6) return true // Review step
    if (!isMentorVariant && step === 7) return true // Generation options step
    return true
  }, [step, language, selectedGoals, level, languageSelection, isMentorVariant])

  const canGenerate = useMemo(
    () => !!language && selectedGoals.length > 0 && selectedGoals.length <= 2 && !!level && !!languageSelection && !generating,
    [language, selectedGoals, level, languageSelection, generating]
  )

  useEffect(() => {
    const previousStep = prevStepRef.current
    if (step >= 2 && previousStep !== step) {
      requestAnimationFrame(() => {
        const target = stepContentRef.current
        if (!target) return

        const rect = target.getBoundingClientRect()
        const targetCenter = window.scrollY + rect.top + rect.height / 2
        const viewportCenter = window.innerHeight / 2
        const nextTop = Math.max(targetCenter - viewportCenter, 0)
        const reducedMotion =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches

        window.scrollTo({
          top: 121,
          behavior: reducedMotion ? 'auto' : 'smooth',
        })
      })
    }

    prevStepRef.current = step
  }, [step])

  const isStepValid = (s: number) => {
    if (s === 1) return !!language
    if (s === 2) return selectedGoals.length > 0 && selectedGoals.length <= 2
    if (s === 3) return selectedGoals.length === 2 // Priority step only for 2 goals
    if (s === 4) return !!level
    if (s === 5) return !!languageSelection
    if (s === 6) return true // Review step
    if (!isMentorVariant && s === 7) return true // Generation options step
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
    return Math.min(currentStep + 1, totalSteps)
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

  // Map subject goals to GoalCard items and separate system vs my goals
  const systemGoals = Array.isArray(subjectGoals) 
    ? subjectGoals.filter((g: any) => g.isSystemDefined === true)
    : []
  
  const myGoals = Array.isArray(subjectGoals) 
    ? subjectGoals.filter((g: any) => g.isSystemDefined === false)
    : []

  const goalItems: GoalItem[] = Array.isArray(subjectGoals)
    ? subjectGoals
      .map((g: any) => ({
        key: g?.id ?? g?.goalId ?? g?.key,
        label: getGoalTitle(t, String(g?.id ?? g?.goalId ?? g?.key), g?.title ?? g?.name ?? g?.label ?? 'Goal'),
      }))
      .filter((it) => !!it.key)
    : []

  // Pagination calculations for system goals
  const totalSystemGoals = systemGoals.length
  const totalSystemPages = Math.ceil(totalSystemGoals / goalsPerPage)
  const systemStartIndex = (currentSystemGoalPage - 1) * goalsPerPage
  const systemEndIndex = systemStartIndex + goalsPerPage
  const currentPageSystemGoals = systemGoals.slice(systemStartIndex, systemEndIndex)

  // Pagination calculations for my goals
  const totalMyGoals = myGoals.length
  const totalMyPages = Math.ceil(totalMyGoals / goalsPerPage)
  const myStartIndex = (currentMyGoalPage - 1) * goalsPerPage
  const myEndIndex = myStartIndex + goalsPerPage
  const currentPageMyGoals = myGoals.slice(myStartIndex, myEndIndex)

  // Pagination component
  const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    label 
  }: { 
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    label: string
  }) => {
    if (totalPages <= 1) return null

    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 8, 
        marginTop: 16,
        padding: '12px 0'
      }}>
        {/* Previous button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          style={{
            padding: '6px 10px',
            border: '1px solid var(--border-base)',
            borderRadius: 4,
            background: currentPage === 1 ? 'var(--bg-surface)' : 'var(--bg-main)',
            color: currentPage === 1 ? 'var(--text-disabled)' : 'var(--text-primary)',
            fontSize: 11,
            fontWeight: 600,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 1) {
              e.currentTarget.style.background = 'var(--bg-blue-hover)'
              e.currentTarget.style.borderColor = 'var(--accent-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== 1) {
              e.currentTarget.style.background = 'var(--bg-main)'
              e.currentTarget.style.borderColor = 'var(--border-base)'
            }
          }}
        >
          ← Prev
        </button>

        {/* Page numbers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            const isCurrentPage = pageNum === currentPage
            const shouldShow = pageNum === 1 || 
                             pageNum === totalPages || 
                             Math.abs(pageNum - currentPage) <= 1

            if (!shouldShow) {
              // Show ellipsis for gaps
              if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                return (
                  <span key={`ellipsis-${pageNum}`} style={{ 
                    padding: '6px 3px', 
                    color: 'var(--text-secondary)',
                    fontSize: 11
                  }}>
                    ...
                  </span>
                )
              }
              return null
            }

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                style={{
                  padding: '6px 10px',
                  border: '1px solid var(--border-base)',
                  borderRadius: 4,
                  background: isCurrentPage ? 'var(--accent-primary)' : 'var(--bg-main)',
                  color: isCurrentPage ? 'var(--bg-surface)' : 'var(--text-primary)',
                  fontSize: 11,
                  fontWeight: isCurrentPage ? 700 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minWidth: 28
                }}
                onMouseEnter={(e) => {
                  if (!isCurrentPage) {
                    e.currentTarget.style.background = 'var(--bg-blue-hover)'
                    e.currentTarget.style.borderColor = 'var(--accent-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrentPage) {
                    e.currentTarget.style.background = 'var(--bg-main)'
                    e.currentTarget.style.borderColor = 'var(--border-base)'
                  }
                }}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        {/* Next button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          style={{
            padding: '6px 10px',
            border: '1px solid var(--border-base)',
            borderRadius: 4,
            background: currentPage === totalPages ? 'var(--bg-surface)' : 'var(--bg-main)',
            color: currentPage === totalPages ? 'var(--text-disabled)' : 'var(--text-primary)',
            fontSize: 11,
            fontWeight: 600,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentPage !== totalPages) {
              e.currentTarget.style.background = 'var(--bg-blue-hover)'
              e.currentTarget.style.borderColor = 'var(--accent-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== totalPages) {
              e.currentTarget.style.background = 'var(--bg-main)'
              e.currentTarget.style.borderColor = 'var(--border-base)'
            }
          }}
        >
          Next →
        </button>

        {/* Page info */}
        <div style={{ 
          marginLeft: 12, 
          fontSize: 10, 
          color: 'var(--text-secondary)',
          fontWeight: 500
        }}>
          {currentPage}/{totalPages}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-surface)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '40px 24px', maxWidth: 1200, margin: '0 auto', width: '100%' }} role="main" aria-labelledby="plans-title">
        <div ref={stepContentRef} style={{ width: '100%' }}>
          {/* Stepper */}
          <Stepper currentStep={step} totalSteps={totalSteps} onChangeStep={handleStepChange} />

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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '180px minmax(0, 1fr)',
                  gap: 16,
                  alignItems: 'start',
                }}
              >

                {/* Left: Category filter */}
                <div style={{
                  width: 180,
                  border: '1px solid var(--border-base)',
                  background: 'var(--bg-surface)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  alignSelf: 'start',
                  boxSizing: 'border-box',
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
                <div style={{ minWidth: 0, width: '100%', alignSelf: 'start' }}>
                  <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, width: '100%', margin: 0 }} aria-label="subject-list">
                    {subjectsLoading ? (
                      <div
                        className="col-span-full"
                        style={{
                          minHeight: 108,
                          padding: 24,
                          border: '1px solid var(--border-base)',
                          borderRadius: 2,
                          background: 'var(--bg-surface)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-secondary)',
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {t('plans.loading', { defaultValue: 'Loading...' })}
                      </div>
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
                    : t('plans.step2GoalsSelected', { count: selectedGoals.length })
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
                    <strong style={{ color: 'var(--text-primary)' }}>{t('plans.step2InstructionTitle')}</strong>
                    <br />
                    {t('plans.step2InstructionDesc')}{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {language
                        ? subjects.find((l: any) => String(l.id ?? l.subjectId) === language)?.name
                        : t('plans.step2SelectedSubjectFallback')}
                    </strong>
                    . {t('plans.step2InstructionHint')}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, position: 'relative' }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {t('plans.suggestGoals')}
                      {totalSystemGoals > 0 && (
                        <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
                          {t('plans.goalsCount', { count: totalSystemGoals })}
                        </span>
                      )}
                    </h3>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setMyGoalsPanelOpen((prev) => !prev)}
                      style={{
                        minWidth: 220,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '8px 12px',
                        border: '1px solid var(--border-base)',
                        borderRadius: 2,
                        background: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <span>{t('plans.myGoals')} ({totalMyGoals})</span>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{myGoalsPanelOpen ? '▲' : '▼'}</span>
                    </button>

                    {myGoalsPanelOpen ? (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          right: 0,
                          width: 360,
                          border: '1px solid var(--border-base)',
                          borderRadius: 2,
                          background: 'var(--bg-surface)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                          zIndex: 30,
                          padding: 10,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => { setShowAddGoal(true); setCreateGoalError(null) }}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            marginBottom: 8,
                            background: 'var(--text-primary)',
                            color: 'var(--bg-surface-short)',
                            border: '1px solid var(--text-primary)',
                            borderRadius: 2,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {'>'} {t('plans.addGoal')}
                        </button>

                        {!language ? (
                          <div className="text-center py-5 text-muted" style={{ fontSize: 12 }}>
                            {t('plans.selectSubjectFirst')}
                          </div>
                        ) : (
                          <>
                            <section
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr',
                                gap: 8,
                                maxHeight: 360,
                                overflowY: 'auto',
                                paddingRight: 2,
                              }}
                              aria-label="my-goals"
                            >
                              {goalsLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                  <div
                                    key={`my-skel-${i}`}
                                    className="animate-pulse border border-bd-muted bg-th-card"
                                    style={{ padding: '10px 12px', borderRadius: 2, minHeight: 40 }}
                                  >
                                    <div className="w-32 h-4 bg-th-hover rounded" />
                                  </div>
                                ))
                              ) : goalsError ? (
                                <div className="text-center py-5 text-status-red" style={{ fontSize: 12 }}>
                                  {t('plans.failedLoadYourGoals')}: {goalsError}
                                </div>
                              ) : currentPageMyGoals.length > 0 ? (
                                currentPageMyGoals.map((g: any) => {
                                  const id = g?.id ?? g?.goalId ?? g?.key
                                  const rawTitle = g?.title ?? g?.name ?? g?.label ?? 'Goal'
                                  const title = getGoalTitle(t, String(id), rawTitle)
                                  const isSelected = selectedGoals.includes(String(id))
                                  const isDisabled = !isSelected && selectedGoals.length >= 2

                                  return (
                                    <div
                                      key={String(id)}
                                      role="button"
                                      aria-pressed={isSelected}
                                      aria-disabled={isDisabled}
                                      onClick={() => {
                                        if (!isDisabled) toggleGoal(String(id))
                                      }}
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'auto minmax(0,1fr) auto',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '8px 10px',
                                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-base)'}`,
                                        background: isSelected ? 'var(--bg-blue-hover)' : 'var(--bg-surface)',
                                        borderRadius: 2,
                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        opacity: isDisabled ? 0.55 : 1,
                                        minHeight: 40,
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: 7,
                                          height: 7,
                                          borderRadius: 999,
                                          background: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                        }}
                                      />
                                      <div
                                        style={{
                                          fontSize: 12,
                                          fontWeight: isSelected ? 700 : 600,
                                          color: 'var(--text-primary)',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                        title={title}
                                      >
                                        {isSelected ? `> ${title}` : `$ ${title}`}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          handleStartEditGoal(String(id))
                                        }}
                                        style={{
                                          padding: '3px 7px',
                                          border: '1px solid var(--border-base)',
                                          borderRadius: 2,
                                          background: 'var(--bg-main)',
                                          color: 'var(--text-secondary)',
                                          fontSize: 10,
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        edit
                                      </button>
                                    </div>
                                  )
                                })
                              ) : (
                                <div className="text-center py-5 text-muted" style={{ fontSize: 12 }}>
                                  {t('plans.noPersonalGoals')}
                                </div>
                              )}
                            </section>

                            <PaginationControls
                              currentPage={currentMyGoalPage}
                              totalPages={totalMyPages}
                              onPageChange={setCurrentMyGoalPage}
                              label={t('plans.myGoals')}
                            />
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                  {!language ? (
                    <div className="col-span-full text-center py-8 text-muted bg-th-card rounded-2xl border-2 border-bd-muted">
                      {t('plans.selectSubjectFirst')}
                    </div>
                  ) : (
                    <>
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
                        ) : currentPageSystemGoals.length > 0 ? (
                          currentPageSystemGoals.map((g: any, idx: number) => {
                            const id = g?.id ?? g?.goalId ?? g?.key
                            const rawTitle = g?.title ?? g?.name ?? g?.label ?? 'Goal'
                            const title = getGoalTitle(t, String(id), rawTitle)
                            const globalIndex = systemStartIndex + idx
                            return (
                              <SingleGoalCard
                                key={String(id)}
                                id={String(id)}
                                title={title}
                                colorClass={palette[globalIndex % palette.length]}
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
                        ) : totalSystemGoals === 0 ? (
                          <div className="col-span-full text-center py-8 text-muted bg-th-card rounded-2xl border-2 border-bd-muted">
                            {t('plans.noSystemGoals')}
                          </div>
                        ) : null}
                      </section>

                      <PaginationControls
                        currentPage={currentSystemGoalPage}
                        totalPages={totalSystemPages}
                        onPageChange={setCurrentSystemGoalPage}
                        label={t('plans.suggestGoals')}
                      />
                    </>
                  )}
              </div>
                
                {/* Add Goal Modal */}
                {showAddGoal && (
                  <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                    <div style={{ background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 2, maxWidth: 500, width: '100%', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: 20, borderBottom: '1px solid var(--border-base)' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{'>'} {t('plans.addNewGoal')}</h3>
                      </div>
                      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {createGoalError && (
                          <div style={{ 
                            padding: 12, 
                            border: '1px solid var(--danger-primary)', 
                            borderRadius: 4, 
                            color: 'var(--danger-primary)', 
                            fontSize: 13, 
                            background: 'var(--bg-red-tint)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8
                          }}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}></span>
                            <div>
                              <strong style={{ display: 'block', marginBottom: 4 }}>{t('plans.errorCreatingGoal')}</strong>
                              {createGoalError}
                            </div>
                          </div>
                        )}
                        
                        {/* Title Field */}
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>$ {t('plans.titleLabel')}</label>
                          <input
                            type="text"
                            value={newGoalTitle}
                            onChange={(e) => setNewGoalTitle(e.target.value)}
                            placeholder={t('plans.titlePlaceholder')}
                            style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} 
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                          />
                        </div>
                        
                        {/* Description Field */}
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>$ {t('plans.descriptionLabel')}</label>
                          <textarea
                            value={newGoalDesc}
                            onChange={(e) => setNewGoalDesc(e.target.value)}
                            rows={3}
                            placeholder={t('plans.descriptionPlaceholder')}
                            style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} 
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                          />
                        </div>
                        
                        {/* Duration Field */}
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>$ Duration</label>
                          <select
                            value={newGoalDuration}
                            onChange={(e) => setNewGoalDuration(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} 
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                          >
                            <option value="OneWeek">One Week</option>
                            <option value="OneMonth">One Month</option>
                            <option value="ThreeMonths">Three Months</option>
                            <option value="SixMonths">Six Months</option>
                            <option value="OneYear">One Year</option>
                          </select>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 12, paddingTop: 16 }}>
                          <button
                            type="button"
                            onClick={() => { 
                              setShowAddGoal(false); 
                              setNewGoalTitle(''); 
                              setNewGoalDesc(''); 
                              setNewGoalDuration('OneMonth');
                              setCreateGoalError(null) 
                            }}
                            style={{ flex: 1, padding: '8px 16px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray-100)' }} 
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-short)' }}
                          >{t('plans.cancel')}</button>
                          <button
                            type="button"
                            disabled={creatingGoal}
                            onClick={handleCreateGoalModal}
                            style={{ flex: 1, padding: '8px 16px', background: creatingGoal ? 'var(--text-secondary)' : 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: creatingGoal ? 'not-allowed' : 'pointer' }}
                            onMouseEnter={(e) => { if (!creatingGoal) e.currentTarget.style.background = 'var(--text-strong)' }} 
                            onMouseLeave={(e) => { if (!creatingGoal) e.currentTarget.style.background = 'var(--text-primary)' }}
                          >{creatingGoal ? t('plans.savingGoal') : t('plans.saveGoal')}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Edit Goal Modal */}
                {showEditGoal && (
                  <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                    <div style={{ background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 2, maxWidth: 500, width: '100%', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: 20, borderBottom: '1px solid var(--border-base)' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{'>'} {t('plans.editGoal')}</h3>
                      </div>
                      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {updateGoalError && (
                          <div style={{ 
                            padding: 12, 
                            border: '1px solid var(--danger-primary)', 
                            borderRadius: 4, 
                            color: 'var(--danger-primary)', 
                            fontSize: 13, 
                            background: 'var(--bg-red-tint)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8
                          }}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                            <div>
                              <strong style={{ display: 'block', marginBottom: 4 }}>{t('plans.errorUpdatingGoal')}</strong>
                              {updateGoalError}
                            </div>
                          </div>
                        )}
                        
                        {/* Title Field */}
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>$ {t('plans.titleLabel')}</label>
                          <input
                            type="text"
                            value={editingGoalTitle}
                            onChange={(e) => setEditingGoalTitle(e.target.value)}
                            placeholder={t('plans.titlePlaceholder')}
                            style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} 
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                          />
                        </div>
                        
                        {/* Description Field */}
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>$ {t('plans.descriptionLabel')}</label>
                          <textarea
                            value={editingGoalDesc}
                            onChange={(e) => setEditingGoalDesc(e.target.value)}
                            rows={3}
                            placeholder={t('plans.descriptionPlaceholder')}
                            style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} 
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                          />
                        </div>
                        
                        {/* Subject Field */}
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>$ {t('plans.subjectLabel')}</label>
                          <select
                            value={editingGoalSubject}
                            onChange={(e) => setEditingGoalSubject(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} 
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                          >
                            <option value="">{t('plans.selectSubject')}</option>
                            {subjects.map((subject: any) => (
                              <option key={subject.id ?? subject.subjectId} value={subject.id ?? subject.subjectId}>
                                {subject.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Duration Field */}
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>$ Duration</label>
                          <select
                            value={editingGoalDuration}
                            onChange={(e) => setEditingGoalDuration(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} 
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                          >
                            <option value="OneWeek">One Week</option>
                            <option value="OneMonth">One Month</option>
                            <option value="ThreeMonths">Three Months</option>
                            <option value="SixMonths">Six Months</option>
                            <option value="OneYear">One Year</option>
                          </select>
                        </div>
                        
                        {/* Active Status Field */}
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={editingGoalActive}
                              onChange={(e) => setEditingGoalActive(e.target.checked)}
                              style={{ width: 16, height: 16 }}
                            />
                            {t('plans.activeGoal')}
                          </label>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 12, paddingTop: 16 }}>
                          <button
                            type="button"
                            onClick={handleCancelEditGoal}
                            style={{ flex: 1, padding: '8px 16px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray-100)' }} 
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-short)' }}
                          >{t('plans.cancel')}</button>
                          <button
                            type="button"
                            disabled={updatingGoal}
                            onClick={handleUpdateGoalModal}
                            style={{ flex: 1, padding: '8px 16px', background: updatingGoal ? 'var(--text-secondary)' : 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: updatingGoal ? 'not-allowed' : 'pointer' }}
                            onMouseEnter={(e) => { if (!updatingGoal) e.currentTarget.style.background = 'var(--text-strong)' }} 
                            onMouseLeave={(e) => { if (!updatingGoal) e.currentTarget.style.background = 'var(--text-primary)' }}
                          >{updatingGoal ? t('plans.updatingGoal') : t('plans.updateGoal')}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

            </motion.div>
          )}

          {step === 3 && selectedGoals.length === 2 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <StepHeader
                title="Set Goal Priorities"
                subtitle="Balance the importance of your learning goals"
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
                selectedValue={languageSelection ? (languageSelection === LanguageSelection.Vietnamese ? t('plans.languageVietnamese') : t('plans.languageEnglish')) : undefined}
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
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{languageSelection === LanguageSelection.Vietnamese ? '> ' : '$ '}{t('plans.languageVietnamese')}</div>
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
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{languageSelection === LanguageSelection.English ? '> ' : '$ '}{t('plans.languageEnglish')}</div>
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
                selectedValue={isMentorVariant ? tm('aiPlans.generateByAi') : t('plans.readyToGenerate')}
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
                    { label: `$ ${t('plans.contentLanguage')}`, val: languageSelection ? (languageSelection === LanguageSelection.Vietnamese ? t('plans.languageVietnamese') : t('plans.languageEnglish')) : undefined }
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

              {isMentorVariant && generating && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 32, padding: 20, background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4 }}>
                  <div className="animate-spin" style={{ width: 20, height: 20, border: '2px solid var(--text-secondary)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', marginRight: 12 }} />
                  <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                    {tm('aiPlans.generatingDraft')} ({generationProgress}%)
                  </span>
                </div>
              )}

              {isMentorVariant && planError && (
                <div style={{ marginTop: 32, maxWidth: 600, margin: '32px auto 0', padding: 16, background: 'var(--bg-red-tint)', border: '1px solid var(--danger-primary)', borderRadius: 4, color: 'var(--danger-primary)', textAlign: 'center' }}>
                  {planError}
                </div>
              )}
              </motion.div>
            )}

          {!isMentorVariant && step === 7 && (
            <motion.div key="step7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <StepHeader
                title={t('plans.step7Title')}
                subtitle={t('plans.step7Subtitle')}
                icon="$"
                selectedValue={t('plans.chooseGenerationMethod')}
              />

              {/* Generation Options */}
              <section style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: 18, 
                maxWidth: 1080, 
                margin: '0 auto',
                padding: '0 8px'
              }} aria-label="generation-options">
                
                {/* Option 1: AI Generation */}
                <Tilt tiltMaxAngleX={4} tiltMaxAngleY={4} scale={1.01} transitionSpeed={350} style={{ height: '100%', width: '100%', display: 'flex' }}>
                <button
                  type="button"
                  style={{
                    padding: 22,
                    border: '1px solid var(--border-base)',
                    borderRadius: 6,
                    background: 'var(--bg-surface)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)'
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.borderColor = 'var(--accent-primary)'
                    e.currentTarget.style.background = 'var(--bg-main)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.12)'
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.borderColor = 'var(--border-base)'
                    e.currentTarget.style.background = 'var(--bg-surface)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.08)'
                  }}
                  onClick={handleGenerateClick}
                >
                  <div style={{ height: 2, width: 42, background: 'var(--accent-primary)', borderRadius: 999, marginBottom: 12 }} />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                      $ {t('plans.aiGeneration')}
                    </span>
                    <span style={{ padding: '2px 8px', border: '1px solid var(--color-blue-300)', color: 'var(--accent-primary)', fontSize: 10, fontWeight: 700, borderRadius: 2 }}>
                      {t('plans.recommended')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                    <div style={{ 
                      border: '1px solid var(--color-blue-300)',
                      background: 'var(--bg-blue-hover)',
                      borderRadius: 2,
                      padding: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 44,
                      height: 44,
                      color: 'var(--accent-primary)',
                      fontWeight: 700
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 8v8" />
                        <path d="M8 12h8" />
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        fontSize: 18,
                        fontWeight: 700, 
                        color: 'var(--text-primary)', 
                        margin: '0 0 6px 0',
                        lineHeight: 1.3
                      }}>
                        {t('plans.aiGeneration')}
                      </h3>
                      <p style={{ 
                        fontSize: 13,
                        color: 'var(--text-secondary)', 
                        margin: 0,
                        lineHeight: 1.5
                      }}>
                        {t('plans.aiGenerationDesc')}
                      </p>
                    </div>
                  </div>

                  <div style={{ 
                    marginTop: 'auto',
                    paddingTop: 14,
                    borderTop: '1px solid var(--border-base)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: 'var(--accent-primary)',
                    fontWeight: 600
                  }}>
                    <span>→</span>
                    {t('plans.fastAndPersonalized')}
                  </div>
                </button>
                </Tilt>

                {/* Option 2: Similar Learning Paths */}
                <Tilt tiltMaxAngleX={4} tiltMaxAngleY={4} scale={1.01} transitionSpeed={350} style={{ height: '100%', width: '100%', display: 'flex' }}>
                <button
                  type="button"
                  style={{
                    padding: 22,
                    border: '1px solid var(--border-base)',
                    borderRadius: 6,
                    background: 'var(--bg-surface)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)'
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.borderColor = 'var(--success-primary)'
                    e.currentTarget.style.background = 'var(--bg-main)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.12)'
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.borderColor = 'var(--border-base)'
                    e.currentTarget.style.background = 'var(--bg-surface)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.08)'
                  }}
                  onClick={handleGetSuggestions}
                >
                  <div style={{ height: 2, width: 42, background: 'var(--success-primary)', borderRadius: 999, marginBottom: 12 }} />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                      $ {t('plans.similarPaths')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                    <div style={{ 
                      border: '1px solid var(--success-primary)',
                      background: 'var(--bg-green-tint)',
                      borderRadius: 2,
                      padding: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 44,
                      height: 44,
                      color: 'var(--success-primary)',
                      fontWeight: 700
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 5h7v14H3z" />
                        <path d="M14 5h7v14h-7z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        fontSize: 18,
                        fontWeight: 700, 
                        color: 'var(--text-primary)', 
                        margin: '0 0 6px 0',
                        lineHeight: 1.3
                      }}>
                        {t('plans.similarPaths')}
                      </h3>
                      <p style={{ 
                        fontSize: 13,
                        color: 'var(--text-secondary)', 
                        margin: 0,
                        lineHeight: 1.5
                      }}>
                        {t('plans.similarPathsDesc')}
                      </p>
                    </div>
                  </div>

                  <div style={{ 
                    marginTop: 'auto',
                    paddingTop: 14,
                    borderTop: '1px solid var(--border-base)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: 'var(--success-primary)',
                    fontWeight: 600
                  }}>
                    <span>→</span>
                    {t('plans.browseExisting')}
                  </div>
                </button>
                </Tilt>

                {/* Option 3: Ask Mentor */}
                <Tilt tiltMaxAngleX={4} tiltMaxAngleY={4} scale={1.01} transitionSpeed={350} style={{ height: '100%', width: '100%', display: 'flex' }}>
                <button
                  type="button"
                  style={{
                    padding: 22,
                    border: '1px solid var(--border-base)',
                    borderRadius: 6,
                    background: 'var(--bg-surface)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)'
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.borderColor = 'var(--warning-primary)'
                    e.currentTarget.style.background = 'var(--bg-main)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.10)'
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.borderColor = 'var(--border-base)'
                    e.currentTarget.style.background = 'var(--bg-surface)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.08)'
                  }}
                  onClick={() => {
                    navigate(ROUTER.CHAT, { state: { activeTab: 'contacts' } })
                  }}
                >
                  <div style={{ height: 2, width: 42, background: 'var(--warning-primary)', borderRadius: 999, marginBottom: 12 }} />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                      $ {t('plans.askMentor')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                    <div style={{ 
                      border: '1px solid var(--warning-primary)',
                      background: 'var(--bg-yellow-tint)',
                      borderRadius: 2,
                      padding: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 44,
                      height: 44,
                      color: 'var(--warning-primary)',
                      fontWeight: 700
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="8" r="3" />
                        <path d="M3 19a6 6 0 0 1 12 0" />
                        <path d="M16 9h5" />
                        <path d="M18.5 6.5v5" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        fontSize: 18,
                        fontWeight: 700, 
                        color: 'var(--text-primary)', 
                        margin: '0 0 6px 0',
                        lineHeight: 1.3
                      }}>
                        {t('plans.askMentor')}
                      </h3>
                      <p style={{ 
                        fontSize: 13,
                        color: 'var(--text-secondary)', 
                        margin: 0,
                        lineHeight: 1.5
                      }}>
                        {t('plans.askMentorDesc')}
                      </p>
                    </div>
                  </div>

                  <div style={{ 
                    marginTop: 'auto',
                    paddingTop: 14,
                    borderTop: '1px solid var(--border-base)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: 'var(--warning-primary)',
                    fontWeight: 600
                  }}>
                    <span>→</span>
                    {t('plans.personalGuidance')}
                  </div>
                </button>
                </Tilt>

              </section>

              {/* Loading and Error States */}
              {generating && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginTop: 40, 
                  padding: 24, 
                  background: 'var(--bg-surface)', 
                  border: '2px solid var(--border-base)', 
                  borderRadius: 12,
                  maxWidth: 500,
                  margin: '40px auto 0'
                }}>
                  <div className="animate-spin" style={{ 
                    width: 24, 
                    height: 24, 
                    border: '3px solid var(--border-base)', 
                    borderTopColor: 'var(--accent-primary)', 
                    borderRadius: '50%', 
                    marginRight: 16 
                  }} />
                  <span style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {isMentorVariant ? tm('aiPlans.generatingDraft') : t('plans.generatingPath')} ({generationProgress}%)
                  </span>
                </div>
              )}

              {planError && (
                <div style={{ 
                  marginTop: 40, 
                  maxWidth: 600, 
                  margin: '40px auto 0', 
                  padding: 20, 
                  background: 'var(--bg-red-tint)', 
                  border: '2px solid var(--danger-primary)', 
                  borderRadius: 12, 
                  color: 'var(--danger-primary)', 
                  textAlign: 'center',
                  fontSize: 14,
                  lineHeight: 1.5
                }}>
                  {planError}
                </div>
              )}

              {/* Suggestions Modal */}
              {!isMentorVariant && showSuggestions && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                  <div style={{ background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 2, maxWidth: 900, width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: 20, borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        📚 {t('plans.suggestedLearningPaths')}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSuggestions(false)
                          setSuggestions([])
                          setSuggestionsError(null)
                        }}
                        style={{ 
                          padding: '6px 12px', 
                          background: 'transparent', 
                          border: '1px solid var(--border-base)', 
                          borderRadius: 2, 
                          color: 'var(--text-secondary)', 
                          fontSize: 12, 
                          cursor: 'pointer' 
                        }}
                      >
                        ✕ Close
                      </button>
                    </div>
                    
                    <div style={{ padding: 20, flex: 1, overflow: 'auto' }}>
                      {loadingSuggestions ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                          <div className="animate-spin" style={{ width: 20, height: 20, border: '2px solid var(--text-secondary)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', marginRight: 12 }} />
                          <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                            {t('plans.loadingSuggestions')}
                          </span>
                        </div>
                      ) : suggestionsError ? (
                        <div style={{ padding: 20, background: 'var(--bg-red-tint)', border: '1px solid var(--danger-primary)', borderRadius: 4, color: 'var(--danger-primary)', textAlign: 'center' }}>
                          <strong>{t('plans.errorLoadingSuggestions')}</strong>
                          <br />
                          {suggestionsError}
                        </div>
                      ) : suggestions.length > 0 ? (
                        <div style={{ display: 'grid', gap: 16 }}>
                          {suggestions.map((suggestion, index) => (
                            <div
                              key={suggestion.pathId || index}
                              style={{
                                padding: 20,
                                border: '1px solid var(--border-base)',
                                borderRadius: 4,
                                background: 'var(--bg-surface)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--accent-primary)'
                                e.currentTarget.style.background = 'var(--bg-main)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-base)'
                                e.currentTarget.style.background = 'var(--bg-surface)'
                              }}
                              onClick={() => handleSelectSuggestion(suggestion)}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div style={{ flex: 1 }}>
                                  <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                                    {suggestion.title}
                                  </h4>
                                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                                    {suggestion.description}
                                  </p>
                                </div>
                                <div style={{ 
                                  padding: '4px 12px', 
                                  background: 'var(--accent-primary)', 
                                  color: 'white', 
                                  borderRadius: 12, 
                                  fontSize: 12, 
                                  fontWeight: 600,
                                  marginLeft: 16
                                }}>
                                  {t('plans.matchScore')}: {Math.round((suggestion.score || 0) * 100)}%
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 12, color: 'var(--text-secondary)' }}>
                                <span>📚 {suggestion.chapterCount} chapters</span>
                                {suggestion.goals && suggestion.goals.length > 0 && (
                                  <span>🎯 {suggestion.goals.length} goals</span>
                                )}
                              </div>
                              
                              {suggestion.goals && suggestion.goals.length > 0 && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-base)' }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
                                    Goals Coverage:
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {suggestion.goals.map((goal: any, goalIndex: number) => (
                                      <div
                                        key={goalIndex}
                                        style={{
                                          padding: '4px 8px',
                                          background: 'var(--bg-main)',
                                          border: '1px solid var(--border-base)',
                                          borderRadius: 2,
                                          fontSize: 11,
                                          color: 'var(--text-primary)'
                                        }}
                                      >
                                        {getGoalTitle(t, goal.goalId || goal.id, goal.title)} ({goal.weight}% • {goal.durationInDays} days)
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div style={{ 
                                marginTop: 16, 
                                paddingTop: 12, 
                                borderTop: '1px solid var(--border-base)', 
                                fontSize: 11, 
                                color: 'var(--accent-primary)', 
                                fontWeight: 600 
                              }}>
                                → Click to select this learning path
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                          <div style={{ fontSize: 32, marginBottom: 16 }}>📚</div>
                          <p style={{ fontSize: 14, margin: 0 }}>
                            {t('plans.noSuggestionsFound')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
            {step < totalSteps && (
              <button
                type="button"
                style={{ 
                  padding: '8px 24px', 
                  background: !canNext || (step === 6 && loadingSuggestions) ? 'var(--text-secondary)' : 'var(--text-primary)', 
                  color: 'var(--bg-surface-short)', 
                  border: 'none', 
                  borderRadius: 2, 
                  fontSize: 13, 
                  fontWeight: 600, 
                  cursor: !canNext || (step === 6 && loadingSuggestions) ? 'not-allowed' : 'pointer', 
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8 
                }}
                onMouseEnter={(e) => { if (canNext && !(step === 6 && loadingSuggestions)) e.currentTarget.style.background = 'var(--text-strong)' }} 
                onMouseLeave={(e) => { if (canNext && !(step === 6 && loadingSuggestions)) e.currentTarget.style.background = 'var(--text-primary)' }}
                disabled={!canNext || (step === 6 && loadingSuggestions)}
                onClick={() => {
                  if (step === 6 && !isMentorVariant) {
                    handleNextFromSummary()
                  } else {
                    setStep(getNextStep(step) as any)
                  }
                }}
              >
                {(step === 6 && loadingSuggestions) ? (
                  <>
                    <div className="animate-spin" style={{ width: 14, height: 14, border: '2px solid var(--bg-surface-short)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                    {t('plans.checkingSuggestions') || 'Checking...'}
                  </>
                ) : (
                  <>{t('plans.continue')} {'>'}</>
                )}
              </button>
            )}
            {isMentorVariant && step === totalSteps && (
              <button
                type="button"
                style={{ padding: '8px 24px', background: !canGenerate ? 'var(--text-secondary)' : 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 600, cursor: !canGenerate ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={(e) => { if (canGenerate) e.currentTarget.style.background = 'var(--text-strong)' }}
                onMouseLeave={(e) => { if (canGenerate) e.currentTarget.style.background = 'var(--text-primary)' }}
                disabled={!canGenerate}
                onClick={handleGenerateClick}
              >
                {tm('aiPlans.generateByAi')}
              </button>
            )}
          </div>
        </div>
      </main>
      <Footer />

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

const StudentPlansPage: React.FC = () => <PlansPage variant="student" />

export default StudentPlansPage
