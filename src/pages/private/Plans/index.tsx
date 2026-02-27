
import React, { useMemo, useState, useEffect } from 'react'
import { SubjectService, GoalService, LearningPathService } from '../../../services'
import type { Subject } from '../../../services/SubjectService'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import { useNavigate } from 'react-router-dom'
import ROUTER from '../../../router/ROUTER'
import StepHeader from './components/StepHeader'
import LanguageCard from './components/LanguageCard'
import SingleGoalCard from './components/SingleGoalCard'
import Stepper from './components/Stepper'

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

// Step 2: Goals
type GoalItem = { key: string; label: string };

const PlansPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [language, setLanguage] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('plans.language') || null
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
  const [planGenerated, setPlanGenerated] = useState(false)
  // Load subjects from API
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(true)
  const [subjectsError, setSubjectsError] = useState<string | null>(null)
  // Load goals from API + generation states
  const [goals, setGoals] = useState<any[]>([])
  const [goalsLoading, setGoalsLoading] = useState<boolean>(true)
  // Enable Live auto-update for goals
  const [goalsLive, setGoalsLive] = useState<boolean>(true)
  const [goalsError, setGoalsError] = useState<string | null>(null)
  const [generating, setGenerating] = useState<boolean>(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [skeleton, setSkeleton] = useState<any | null>(null)
  // New goal creation states
  const [newGoalTitle, setNewGoalTitle] = useState<string>('')
  const [creatingGoal, setCreatingGoal] = useState<boolean>(false)
  const [createGoalError, setCreateGoalError] = useState<string | null>(null)
  // Duration for each selected goal (days)
  const [goalDurations, setGoalDurations] = useState<Record<string, number>>({})

  // Added: goal edit/delete states and handlers
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string>('')
  const [savingGoal, setSavingGoal] = useState<boolean>(false)
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null)
  const [goalNotice, setGoalNotice] = useState<string | null>(null)
  const [goalActionError, setGoalActionError] = useState<string | null>(null)

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
      setGoalActionError('Title cannot be empty')
      return
    }
    setSavingGoal(true)
    setGoalActionError(null)
    try {
      const updated = await GoalService.updateGoal(id, { title })
      setGoals((prev) => prev.map((g: any) => (String(g?.id ?? g?.goalId ?? g?.key) === String(id) ? { ...g, ...updated } : g)))
      setGoalNotice('Goal updated successfully')
      setTimeout(() => setGoalNotice(null), 2500)
      setEditingGoalId(null)
      setEditingTitle('')
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to update goal'
      setGoalActionError(msg)
    } finally {
      setSavingGoal(false)
    }
  }

  const handleDeleteGoal = async (id: string) => {
    setDeletingGoalId(id)
    setGoalActionError(null)
    try {
      await GoalService.deleteGoal(id)
      setGoals((prev) => prev.filter((g: any) => String(g?.id ?? g?.goalId ?? g?.key) !== String(id)))
      setSelectedGoals((prev) => prev.filter((k) => String(k) !== String(id)))
      setGoalNotice('Goal deleted successfully')
      setTimeout(() => setGoalNotice(null), 2500)
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to delete goal'
      setGoalActionError(msg)
    } finally {
      setDeletingGoalId(null)
    }
  }

  // IMPORTANT: initialize navigate for routing
  const navigate = useNavigate()

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
        const data = await SubjectService.listSubjects()
        if (active) {
          const normalized = (Array.isArray(data) ? data : []).map((s: any) => ({ ...s, id: s?.id ?? s?.subjectId }))
          setSubjects(normalized as any)
        }
      } catch (e: any) {
        const d = e?.response?.data
        const msg = d?.message || d?.error || d?.title || d?.detail || e?.message || 'Unable to load subjects.'
        if (active) setSubjectsError(msg)
      } finally {
        if (active) setSubjectsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])
  // Load goals from backend
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await GoalService.listGoals()
        if (active) setGoals(Array.isArray(data) ? data : [])
      } catch (e: any) {
        const d = e?.response?.data
        const msg = d?.message || d?.error || d?.title || d?.detail || e?.message || 'Unable to load goals.'
        if (active) setGoalsError(msg)
      } finally {
        if (active) setGoalsLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  // Background polling to keep goals in sync (realtime-like)
  useEffect(() => {
    if (!goalsLive || step !== 2) return
    let disposed = false

    const fetchGoals = async () => {
      try {
        const data = await GoalService.listGoals()
        if (!disposed) setGoals(Array.isArray(data) ? data : [])
      } catch {}
    }

    // initial fetch then interval
    fetchGoals()
    const id = setInterval(fetchGoals, 8000)

    return () => {
      disposed = true
      clearInterval(id)
    }
  }, [goalsLive, step])

  const canNext = useMemo(() => {
    if (step === 1) return !!language
    if (step === 2) return selectedGoals.length > 0
    return true
  }, [step, language, selectedGoals])

  const canGenerate = useMemo(() => !!language && selectedGoals.length > 0, [language, selectedGoals])

  const toggleGoal = (key: string) => {
    setSelectedGoals((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    )
    setGoalDurations((prev) => {
      const exists = selectedGoals.includes(key)
      if (exists) {
        const { [key]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [key]: prev[key] ?? 30 }
    })
  }

  // Create new goal via API and select it
  const handleCreateGoal = async () => {
    const title = newGoalTitle.trim()
    if (!title) {
      setCreateGoalError('Please enter a goal title')
      return
    }
    setCreatingGoal(true)
    setCreateGoalError(null)
    try {
      const created = await GoalService.createGoal({ title })
      setGoals((prev) => [created, ...prev])
      const newKey = String(created?.id ?? created?.goalId ?? created?.key ?? '')
      if (newKey) {
        setSelectedGoals((prev) => Array.from(new Set([...prev, newKey])))
      }
      setNewGoalTitle('')
      // Refresh list from backend to ensure we have stable IDs and latest data
      try {
        const latest = await GoalService.listGoals()
        setGoals(Array.isArray(latest) ? latest : [])
      } catch {}
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message
      setCreateGoalError(msg || 'Failed to create goal')
    } finally {
      setCreatingGoal(false)
    }
  }

  // Map API goals to GoalCard items
  const goalItems: GoalItem[] = Array.isArray(goals)
    ? goals
        .map((g: any) => ({
          key: g?.id ?? g?.goalId ?? g?.key,
          label: g?.title ?? g?.name ?? g?.label ?? 'Goal',
        }))
        .filter((it) => !!it.key)
    : []

  return (
    <div className="layout min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      <Header />
      <main className="page-main py-12" role="main" aria-labelledby="plans-title">
        <div className="page-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stepper */}
          <Stepper currentStep={step} totalSteps={3} />

          {/* Content */}
          {step === 1 && (
            <>
              <StepHeader
                title="Choose Programming Language"
                subtitle="Select the programming language you want to learn."
                icon="🧩"
              />
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6" aria-label="subject-list">
                {subjectsLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-2xl border-2 border-gray-200 bg-white p-6">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 bg-gray-200 rounded-xl" />
                          <div className="flex-1">
                            <div className="w-24 h-5 bg-gray-200 rounded" />
                            <div className="w-20 h-3 bg-gray-100 rounded mt-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : subjectsError ? (
                  <div className="col-span-full text-center py-8 text-red-600 bg-red-50 rounded-2xl border-2 border-red-200">
                    Failed to load subjects: {subjectsError}
                  </div>
                ) : subjects.length > 0 ? (
                  subjects.map((s, idx) => (
                    <LanguageCard
                      key={`${(s as any).id ?? (s as any).subjectId ?? s.slug ?? idx}`}
                      name={s.name}
                      tag={s.slug ?? undefined}
                      colorClass={palette[idx % palette.length]}
                      icon={undefined}
                      desc={`Explore the learning path for ${s.name}`}
                      active={language === String((s as any).id ?? (s as any).subjectId)}
                      onClick={() => {
                        setLanguage(String((s as any).id ?? (s as any).subjectId))
                        setStep(2)
                      }}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No subjects available.
                  </div>
                )}
              </section>
            </>
          )}

          {step === 2 && (
            <>
              <StepHeader
                title="Choose Your Goals"
                subtitle="Select one or more goals from system data"
                icon="📍"
              />
              {goalsLive && (
                <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl" aria-live="polite">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-700">Live updates enabled</span>
                </div>
              )}
              {selectedGoals.length > 0 && (
                <div className="mb-6 p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Goal duration (days)</h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedGoals.map((gId) => (
                      <label
                        key={gId}
                        className="inline-flex items-center gap-2 bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl px-3 py-2"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {goalItems.find((x) => x.key === gId)?.label || 'Goal'}
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={goalDurations[gId] ?? 30}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10)
                            setGoalDurations((prev) => ({
                              ...prev,
                              [gId]: isNaN(v) || v <= 0 ? 1 : v,
                            }))
                          }}
                          title="Days"
                          className="w-16 px-2 py-1 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none text-center font-medium"
                        />
                        <span className="text-sm text-gray-600">days</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" aria-label="goal-list">

                {/* Create goal card */}
                <div className="rounded-2xl border-2 border-dashed border-teal-300 bg-gradient-to-br from-teal-50 to-cyan-50 p-6 hover:border-teal-400 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white text-xl shadow-md">
                      ➕
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Add New Goal</div>
                      <div className="text-sm text-gray-600">Create a goal and include it in your plan</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Goal title"
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateGoal()
                      }}
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      className={`px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg font-medium hover:from-teal-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg ${
                        creatingGoal ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={creatingGoal}
                      onClick={handleCreateGoal}
                    >
                      {creatingGoal ? 'Creating…' : 'Add'}
                    </button>
                  </div>
                  {createGoalError && (
                    <div className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                      {createGoalError}
                    </div>
                  )}
                </div>
                
                {/* Thông báo hành động goal */}
                {(goalNotice || goalActionError) && (
                  <div className="col-span-full">
                    {goalNotice && (
                      <div className="px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-700 font-medium">
                        {goalNotice}
                      </div>
                    )}
                    {goalActionError && (
                      <div className="px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 font-medium mt-3">
                        {goalActionError}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Render each goal as its own card */}
                {goalsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={`goal-skel-${i}`} className="animate-pulse rounded-2xl border-2 border-gray-200 bg-white p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                        <div className="flex-1">
                          <div className="w-32 h-5 bg-gray-200 rounded" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : goalsError ? (
                  <div className="col-span-full text-center py-8 text-red-600 bg-red-50 rounded-2xl border-2 border-red-200">
                    Failed to load goals: {goalsError}
                  </div>
                ) : goalItems.length > 0 ? (
                  goals.map((g: any, idx: number) => {
                    const id = g?.id ?? g?.goalId ?? g?.key
                    const title = g?.title ?? g?.name ?? g?.label ?? 'Goal'
                    return (
                      <SingleGoalCard
                        key={String(id)}
                        id={String(id)}
                        title={title}
                        colorClass={palette[idx % palette.length]}
                        icon={undefined}
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
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No goals available.
                  </div>
                )}
              </section>
            </>
          )}

          {step === 3 && (
            <>
              <StepHeader
                title="Generate Learning Path"
                subtitle="Confirm selections and generate with the backend"
                icon="🛠️"
              />
              <section aria-label="summary" className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Language</h2>
                  <div className="flex items-center gap-3">
                    {language ? (
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium shadow-md">
                        <span className="w-2 h-2 rounded-full bg-white" />
                        {subjects.find((l: any) => String(l.id ?? l.subjectId) === language)?.name || 'Selected'}
                      </span>
                    ) : (
                      <span className="text-gray-500">Not selected</span>
                    )}
                  </div>
                </div>
                <div className="p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Goals</h2>
                  <div className="flex flex-wrap gap-2">
                    {selectedGoals.length > 0 ? (
                      selectedGoals.map((g) => (
                        <span
                          key={g}
                          className="inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-100 to-teal-100 border border-teal-300 text-sm font-medium text-gray-800"
                        >
                          {goalItems.find((x) => x.key === g)?.label || 'Selected'}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">Not selected</span>
                    )}
                  </div>
                </div>
              </section>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  className={`px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold text-lg hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
                    !canGenerate || generating ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!canGenerate || generating}
                  onClick={async () => {
                    if (!language) {
                      setPlanError('Please select a language')
                      return
                    }
                    if (selectedGoals.length === 0) {
                      setPlanError('Please select at least one goal')
                      return
                    }
                    setPlanError(null)
                    setGenerating(true)
                    try {
                      const goalsWithDurations = selectedGoals.map((id) => ({ goalId: id, durationDay: goalDurations[id] ?? 30 }))
                      const payload = { subjectIds: language ? [language] : [], goalIds: selectedGoals, goals: goalsWithDurations }
                      const sk = await LearningPathService.generateSkeleton(payload)
                      setSkeleton(sk)
                      setPlanGenerated(true)
                      try { sessionStorage.setItem('learningPathSkeleton', JSON.stringify(sk)) } catch {}
                      navigate(ROUTER.PLANS_RESULT, { state: { skeleton: sk } })
                    } catch (e: any) {
                      const d = e?.response?.data
                      const serverMsg = d?.errorMessage || d?.message || d?.msg || d?.error || d?.title || d?.detail
                      const code = d?.errorCode || d?.code
                      let msg = code ? `${code}: ${serverMsg || 'Unknown error'}` : (serverMsg || e?.message || 'Unable to generate learning path')
                      const lower = String(serverMsg || e?.message || '').toLowerCase()
                      if (code === 'AI_GENERATION_FAILED' && (lower.includes('invalid api key') || lower.includes('invalid_api_key') || lower.includes('unauthorized'))) {
                        msg = 'AI service is not configured properly (Invalid API Key). Please set GROQ_API_KEY on the backend and try again.'
                      }
                      setPlanError(msg)
                    } finally {
                      setGenerating(false)
                    }
                  }}
                >
                  {generating ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating…
                    </span>
                  ) : (
                    'Generate Learning Path'
                  )}
                </button>
              </div>
              {planError && (
                <div className="mt-6 text-center px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 font-medium">
                  {planError}
                </div>
              )}
              {planGenerated && skeleton && (
                <section className="mt-8 p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-sm" aria-label="generated-plan">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Learning Path Result</h2>
                  {Array.isArray(skeleton?.lessons) && skeleton.lessons.length > 0 ? (
                    <ul className="space-y-4">
                      {skeleton.lessons.map((ls: any) => (
                        <li key={ls.id ?? ls.title} className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200">
                          <span className="mt-1 w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{ls.title ?? 'Lesson'}</div>
                            {ls.description && <div className="text-sm text-gray-600 mt-1">{ls.description}</div>}
                            {Array.isArray(ls.chapters) && ls.chapters.length > 0 && (
                              <ul className="mt-2 ml-4 space-y-1">
                                {ls.chapters.map((ch: any) => (
                                  <li key={ch.id ?? ch.title} className="text-sm text-gray-700">
                                    • {ch.title ?? 'Chapter'}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500 text-center py-4">No learning path data from server.</div>
                  )}
                </section>
              )}
            </>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              type="button"
              className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
> 
              Back
            </button>
            <button
              type="button"
              className={`px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg ${
                !canNext ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={!canNext}
              onClick={() => setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))}
> 
              Continue
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default PlansPage