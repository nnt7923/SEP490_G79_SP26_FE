
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
import { Plus } from 'lucide-react'

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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
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
  const [planGenerated, setPlanGenerated] = useState(false)
  // Load subjects from API
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(true)
  const [subjectsError, setSubjectsError] = useState<string | null>(null)
  // Load goals from API + generation states
  const [systemGoals, setSystemGoals] = useState<any[]>([])
  const [myGoals, setMyGoals] = useState<any[]>([])
  const [goalsLoading, setGoalsLoading] = useState<boolean>(true)
  const [myGoalsLoading, setMyGoalsLoading] = useState<boolean>(true)
  // Enable Live auto-update for goals
  const [goalsLive, setGoalsLive] = useState<boolean>(true)
  const [goalsError, setGoalsError] = useState<string | null>(null)
  const [myGoalsError, setMyGoalsError] = useState<string | null>(null)
  const [generating, setGenerating] = useState<boolean>(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [skeleton, setSkeleton] = useState<any | null>(null)
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
      setMyGoals((prev) => prev.map((g: any) => (String(g?.id ?? g?.goalId ?? g?.key) === String(id) ? { ...g, ...updated } : g)))
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
      setMyGoals((prev) => prev.filter((g: any) => String(g?.id ?? g?.goalId ?? g?.key) !== String(id)))
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

  useEffect(() => {
    try {
      if (level) sessionStorage.setItem('plans.level', level)
      else sessionStorage.removeItem('plans.level')
    } catch {}
  }, [level])

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
        const msg = d?.message || d?.error || d?.title || d?.detail || e?.message || 'Unable to load system goals.'
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
        const msg = d?.message || d?.error || d?.title || d?.detail || e?.message || 'Unable to load your goals.'
        if (active) setMyGoalsError(msg)
      } finally {
        if (active) setMyGoalsLoading(false)
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
  }, [goalsLive, step])

  const canNext = useMemo(() => {
    if (step === 1) return !!language
    if (step === 2) return selectedGoals.length > 0
    if (step === 3) return !!level
    return true
  }, [step, language, selectedGoals, level])

  const canGenerate = useMemo(() => !!language && selectedGoals.length > 0 && !!level, [language, selectedGoals, level])

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
      setCreateGoalError('Please enter a goal title')
      return
    }
    setCreatingGoal(true)
    setCreateGoalError(null)
    try {
      const created = await GoalService.createGoal({ title, description })
      const newKey = String(created?.goalId ?? created?.id ?? created?.key ?? '')
      setMyGoals((prev) => [created, ...prev])
      if (newKey) setSelectedGoals([newKey])
      setGoalNotice('Goal created successfully')
      setTimeout(() => setGoalNotice(null), 2500)
      setShowAddGoal(false)
      setNewGoalTitle('')
      setNewGoalDesc('')
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message
      setCreateGoalError(msg || 'Failed to create goal')
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
     <div className="layout min-h-screen bg-blue-50">
       <Header />
       <main className="page-main py-12" role="main" aria-labelledby="plans-title">
         <div className="page-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           {/* Stepper */}
           <Stepper currentStep={step} totalSteps={4} />

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
                 title="Choose Your Goal"
                 subtitle="Select a goal from system goals or your personal goals"
                 icon="📍"
               />
              <div className="flex items-center justify-end mb-4">
                <button
                  type="button"
                  onClick={() => { setShowAddGoal(true); setCreateGoalError(null) }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-blue-400 text-blue-500 hover:bg-blue-50 font-medium"
                >
                  <Plus size={18} /> Add Goal
                </button>
              </div>
               {goalsLive && (
                 <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl" aria-live="polite">
                   <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-sm font-medium text-green-700">Live updates enabled</span>
                 </div>
               )}

               {/* Thông báo hành động goal */}
               {(goalNotice || goalActionError) && (
                 <div className="mb-6">
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

               {/* System Goals Section */}
               <div className="mb-10">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-xl font-semibold text-gray-900">Suggest Goals</h3>
                 </div>
                 <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" aria-label="system-goals">
                   {goalsLoading ? (
                     Array.from({ length: 3 }).map((_, i) => (
                       <div key={`sys-skel-${i}`} className="animate-pulse rounded-2xl border-2 border-gray-200 bg-white p-6">
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
                       Failed to load system goals: {goalsError}
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
                           icon={undefined}
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
                         />
                       )
                     })
                   ) : (
                     <div className="col-span-full text-center py-8 text-gray-500 bg-white rounded-2xl border-2 border-gray-200">
                       No system goals available.
                     </div>
                   )}
                 </section>
               </div>

               {/* My Goals Section */}
               <div>
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-xl font-semibold text-gray-900">My Goals</h3>
                   <button
                     type="button"
                     onClick={() => { setShowAddGoal(true); setCreateGoalError(null) }}
                     className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-teal-500 text-teal-600 hover:bg-teal-50 font-medium"
                   >
                     <Plus size={18} /> Add Goal
                   </button>
                 </div>
                 <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" aria-label="my-goals">
                   {myGoalsLoading ? (
                     Array.from({ length: 3 }).map((_, i) => (
                       <div key={`my-skel-${i}`} className="animate-pulse rounded-2xl border-2 border-gray-200 bg-white p-6">
                         <div className="flex items-center gap-3">
                           <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                           <div className="flex-1">
                             <div className="w-32 h-5 bg-gray-200 rounded" />
                           </div>
                         </div>
                       </div>
                     ))
                   ) : myGoalsError ? (
                     <div className="col-span-full text-center py-8 text-red-600 bg-red-50 rounded-2xl border-2 border-red-200">
                       Failed to load your goals: {myGoalsError}
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
                           colorClass={palette[(systemGoals.length + idx) % palette.length]}
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
                     <div className="col-span-full text-center py-8 text-gray-500 bg-white rounded-2xl border-2 border-gray-200">
                       No personal goals yet. Click "Add Goal" to create one.
                     </div>
                   )}
                 </section>
               </div>

              {/* Add Goal Modal */}
              {showAddGoal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Add New Goal</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {createGoalError && (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{createGoalError}</div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={newGoalTitle}
                          onChange={(e) => setNewGoalTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="e.g., Learn Docker fundamentals"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                        <textarea
                          value={newGoalDesc}
                          onChange={(e) => setNewGoalDesc(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Short description"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                          onClick={() => { setShowAddGoal(false); setNewGoalTitle(''); setNewGoalDesc(''); setCreateGoalError(null) }}
                        >Cancel</button>
                        <button
                          type="button"
                          disabled={creatingGoal}
                          onClick={handleCreateGoalModal}
                          className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
                        >{creatingGoal ? 'Saving…' : 'Save Goal'}</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
             </>
           )}

           {step === 3 && (
             <>
               <StepHeader
                 title="Choose Level"
                 subtitle="Pick your current level to tailor the plan"
                 icon="🎯"
               />
               <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6" aria-label="level-list">
                 {(['Beginner','Intermediate','Advanced'] as Level[]).map((lv) => (
                   <button
                     key={lv}
                     type="button"
                     onClick={() => setLevel(lv)}
                     className={`p-6 rounded-2xl border-2 transition-all shadow-sm hover:shadow-md ${
                       level === lv ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
                     }`}
                   >
                     <div className="text-lg font-semibold text-gray-900">{lv}</div>
                     <div className="text-sm text-gray-600 mt-1">{lv === 'Beginner' ? 'Start from basics' : lv === 'Intermediate' ? 'Build on fundamentals' : 'Master advanced topics'}</div>
                   </button>
                 ))}
               </section>
             </>
           )}

           {step === 4 && (
             <>
               <StepHeader
                 title="Generate Learning Path"
                 subtitle="Confirm selections and generate with the backend"
                 icon="🛠️"
               />
               <section aria-label="summary" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 <div className="p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-sm">
                   <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Language</h2>
                   <div className="flex items-center gap-3">
                     {language ? (
                       <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500 text-white font-medium shadow-md">
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
                           className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-100 border border-blue-300 text-sm font-medium text-gray-800"
                         >
                           {goalItems.find((x) => x.key === g)?.label || 'Selected'}
                         </span>
                       ))
                     ) : (
                       <span className="text-gray-500">Not selected</span>
                     )}
                   </div>
                 </div>
                 <div className="p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-sm">
                   <h2 className="text-lg font-semibold text-gray-900 mb-4">Level</h2>
                   <div className="flex items-center gap-3">
                     {level ? (
                       <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500 text-white font-medium shadow-md">
                         <span className="w-2 h-2 rounded-full bg-white" />
                         {level}
                       </span>
                     ) : (
                       <span className="text-gray-500">Not selected</span>
                     )}
                   </div>
                 </div>
               </section>
               <div className="flex items-center justify-center gap-4">
                 <button
                   type="button"
                   className={`px-8 py-4 bg-blue-500 text-white rounded-xl font-semibold text-lg hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
                     !canGenerate || generating ? 'opacity-50 cursor-not-allowed' : ''
                   }`}
                   disabled={!canGenerate || generating}
                   onClick={async () => {
                     if (!language) {
                       setPlanError('Please select a language')
                       return
                     }
                     if (selectedGoals.length !== 1) {
                       setPlanError('Please select exactly one goal')
                       return
                     }
                     if (!level) {
                       setPlanError('Please select a level')
                       return
                     }
                     setPlanError(null)
                     setGenerating(true)
                     try {
                       const payload: any = { subjectId: language, goalId: selectedGoals[0], complexityLevel: level }
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
                         <li key={ls.id ?? ls.title} className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                           <span className="mt-1 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
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
               onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))}
             >
               Back
             </button>
             <button
               type="button"
               className={`px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all shadow-md hover:shadow-lg ${
                 !canNext ? 'opacity-50 cursor-not-allowed' : ''
               }`}
               disabled={!canNext}
               onClick={() => setStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s))}
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