import React, { useMemo, useState, useEffect } from 'react'
import { SubjectService, GoalService, LearningPathService } from '../../../services'
import type { Subject } from '../../../services/SubjectService'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import { useNavigate } from 'react-router-dom'
import ROUTER from '../../../router/ROUTER'

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
const GOAL_GROUPS: { key: string; title: string; colorClass: string; icon?: string; items: GoalItem[] }[] = [
  {
    key: 'career',
    title: 'Phát triển sự nghiệp',
    colorClass: 'icon--indigo',
    icon: '💼',
    items: [
      { key: 'get-promo', label: 'Thăng tiến vị trí hiện tại' },
      { key: 'career-switch', label: 'Chuyển đổi nghề nghiệp' },
      { key: 'new-job', label: 'Tìm việc làm mới' },
    ],
  },
  {
    key: 'new-skills',
    title: 'Học kỹ năng mới',
    colorClass: 'icon--emerald',
    icon: '🧠',
    items: [
      { key: 'web-dev', label: 'Lập trình & Phát triển web' },
      { key: 'design', label: 'Thiết kế & Sáng tạo' },
      { key: 'marketing', label: 'Marketing & Kinh doanh' },
    ],
  },
  {
    key: 'self-dev',
    title: 'Phát triển bản thân',
    colorClass: 'icon--violet',
    icon: '🚀',
    items: [
      { key: 'communication', label: 'Kỹ năng giao tiếp' },
      { key: 'time-mgt', label: 'Quản lý thời gian' },
      { key: 'creative', label: 'Tư duy sáng tạo' },
    ],
  },
];

const StepHeader: React.FC<{ title: string; subtitle: string; icon?: string }> = ({
  title,
  subtitle,
  icon,
}) => (
  <div className="step-header">
    <div className="step-header__icon">{icon ?? '🎯'}</div>
    <h1 id="plans-title" className="step-header__title">{title}</h1>
    <p className="step-header__subtitle">{subtitle}</p>
  </div>
);

const LanguageCard: React.FC<{
  active?: boolean;
  name: string;
  tag?: string;
  colorClass: string;
  icon?: string;
  desc?: string;
  onClick?: () => void;
}> = ({ active, name, tag, colorClass, icon, desc, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={!!active}
    className={`card card__pad text-left ${active ? 'card--active' : ''}`}
  >
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`icon-12 ${colorClass}`}>{icon ?? '🔖'}</div>
        <div>
          <div className="font-semibold text-gray-900">{name}</div>
          {desc ? <div className="text-xs text-gray-500">{desc}</div> : null}
        </div>
      </div>
      {tag ? (
        <div className="mt-1">
          <span className="pill"><span className="pill__dot" />{tag}</span>
        </div>
      ) : null}
    </div>
    {active && (
      <span className="badge-selected">Selected</span>
    )}
  </button>
);

const GoalCard: React.FC<{
  active?: boolean;
  title: string;
  colorClass: string;
  icon?: string;
  items: GoalItem[];
  toggleItem: (key: string) => void;
}> = ({ active, title, colorClass, icon, items, toggleItem }) => (
  <div className={`card card__pad ${active ? 'card--active' : ''} text-left`}>
    <div className="flex items-center gap-3 mb-3">
      <div className={`icon-12 ${colorClass}`}>{icon ?? '📦'}</div>
      <div>
        <div className="font-semibold text-gray-900">{title}</div>
      </div>
    </div>
    <ul className="flex flex-col gap-2 p-0 m-0 list-none">
      {items.map((it) => (
        <li key={it.key}>
          <button
            type="button"
            onClick={() => toggleItem(it.key)}
            className="w-full text-left flex items-center gap-2 rounded-[10px] px-3 py-2 border border-transparent btn-outline"
          >
            <span className="inline-block w-5 h-5 rounded-full border border-gray-300 mr-1" />
            <span className="text-sm text-gray-700">{it.label}</span>
          </button>
        </li>
      ))}
    </ul>
  </div>
);

// Card hiển thị một goal duy nhất
const SingleGoalCard: React.FC<{
  active?: boolean;
  title: string;
  colorClass: string;
  icon?: string;
  goalKey: string;
  onToggle: (key: string) => void;
}> = ({ active, title, colorClass, icon, goalKey, onToggle }) => (
  <button
    type="button"
    onClick={() => onToggle(goalKey)}
    aria-pressed={!!active}
    className={`card card__pad ${active ? 'card--active' : ''} text-left`}
    style={{ textAlign: 'left' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div className={`icon-12 ${colorClass}`}>{icon ?? '🧠'}</div>
      <div>
        <div style={{ fontWeight: 600, color: '#111827' }}>{title}</div>
      </div>
    </div>
    {active && (
      <span className="badge-selected">Selected</span>
    )}
  </button>
);

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
        const msg = d?.message || d?.error || d?.title || d?.detail || e?.message || 'Không thể tải danh sách subject.'
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
        const msg = d?.message || d?.error || d?.title || d?.detail || e?.message || 'Không thể tải danh sách goals.'
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
    <div className="layout">
      <Header />
      <main className="page-main" role="main" aria-labelledby="plans-title">
        <div className="page-container">
          {/* Stepper */}
          <nav className="stepper" aria-label="progress">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`stepper__dot ${step >= i ? 'stepper__dot--active' : ''}`}
                  aria-current={step === i ? 'step' : undefined}
                >
                  {i}
                </div>
                {i !== 3 && (
                  <div className={`stepper__line ${step > i ? 'stepper__line--active' : ''}`} />
                )}
              </div>
            ))}
          </nav>

          {/* Content */}
          {step === 1 && (
            <>
              <StepHeader
                title="Choose Programming Language"
                subtitle="Select the programming language you want to learn."
                icon="🧩"
              />
              <section className="grid-subjects" aria-label="subject-list">
                {subjectsLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="card card__pad">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="icon-12 bg-gray-200" />
                          <div>
                            <div className="w-24 h-4 bg-gray-200 rounded-[6px]" />
                            <div className="w-[72px] h-3 bg-gray-100 rounded-[6px] mt-1.5" />
                          </div>
                        </div>
                        <div className="w-20 h-3 bg-gray-100 rounded-[6px]" />
                      </div>
                    </div>
                  ))
                ) : subjectsError ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#dc2626' }}>
                    Không tải được danh sách subject: {subjectsError}
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
                      onClick={() => { setLanguage(String((s as any).id ?? (s as any).subjectId)); setStep(2); }}
                    />
                  ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }} aria-live="polite">
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: '#22c55e', display: 'inline-block', animation: 'pulse 1.6s infinite' }} />
                  <span style={{ fontSize: 12, color: '#16a34a' }}>Live updates enabled</span>
                </div>
              )}
              {selectedGoals.length > 0 && (
                <div className="card card__pad" style={{ marginBottom: 12 }}>
                  <h3 style={{ fontWeight: 600, color: '#111827', marginBottom: 8, fontSize: 14 }}>Thời lượng mục tiêu (ngày)</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedGoals.map((gId) => (
                      <label key={gId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 8px' }}>
                        <span style={{ fontSize: 12, color: '#374151' }}>{goalItems.find((x) => x.key === gId)?.label || 'Goal'}</span>
                        <input
                          type="number"
                          min={1}
                          value={goalDurations[gId] ?? 30}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10)
                            setGoalDurations((prev) => ({ ...prev, [gId]: isNaN(v) || v <= 0 ? 1 : v }))
                          }}
                          title="Số ngày"
                          style={{ width: 64 }}
                          className="input"
                        />
                        <span style={{ fontSize: 12, color: '#6b7280' }}>ngày</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <section className="grid-goals" aria-label="goal-list">

                {/* Create goal card */}
                <div className="card card__pad" style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div className={`icon-12 icon--blue`}>➕</div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#111827' }}>Add New Goal</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Create a goal and include it in your plan</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Goal title"
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateGoal() }}
                      className="input"
                    />
                    <button
                      type="button"
                      className={`btn btn-primary ${creatingGoal ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={creatingGoal}
                      onClick={handleCreateGoal}
                    >
                      {creatingGoal ? 'Creating…' : 'Add Goal'}
                    </button>
                  </div>
                  {createGoalError ? (
                    <div style={{ marginTop: 8, color: '#dc2626' }}>{createGoalError}</div>
                  ) : null}
                </div>
                
                {/* Render each goal as its own card */}
                {goalsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={`goal-skel-${i}`} className="card card__pad">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="icon-12" style={{ background: '#e5e7eb' }} />
                        <div>
                          <div style={{ width: 120, height: 16, background: '#e5e7eb', borderRadius: 6 }} />
                        </div>
                      </div>
                    </div>
                  ))
                ) : goalsError ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#dc2626' }}>
                    Không tải được goals: {goalsError}
                  </div>
                ) : goalItems.length > 0 ? (
                  goalItems.map((it, idx) => (
                    <SingleGoalCard
                      key={String(it.key)}
                      title={it.label}
                      colorClass={palette[idx % palette.length]}
                      icon={undefined}
                      goalKey={String(it.key)}
                      active={selectedGoals.includes(String(it.key))}
                      onToggle={toggleGoal}
                    />
                  ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280' }}>
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
              <section aria-label="summary" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
                <div className={`card card__pad`}>
                  <h2 style={{ fontWeight: 600, color: '#111827', marginBottom: 8 }}>Selected Language</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {language ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, background: '#f3f4f6', padding: '6px 12px', fontSize: 14, color: '#374151' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: '#4f46e5' }} />
                        {subjects.find((l: any) => String(l.id ?? l.subjectId) === language)?.name || 'Selected'}
                      </span>
                    ) : (
                      <span style={{ color: '#6b7280', fontSize: 14 }}>Not selected</span>
                    )}
                  </div>
                </div>
                <div className={`card card__pad`}>
                  <h2 style={{ fontWeight: 600, color: '#111827', marginBottom: 8 }}>Your Goals</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedGoals.length > 0 ? (
                      selectedGoals.map((g) => (
                        <span key={g} style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, background: '#f3f4f6', padding: '6px 12px', fontSize: 14, color: '#374151' }}>
                          {goalItems.find((x) => x.key === g)?.label || 'Selected'}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: '#6b7280', fontSize: 14 }}>Not selected</span>
                    )}
                  </div>
                </div>
              </section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <button
                  type="button"
                  className={`btn btn-primary ${generating ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                        msg = 'AI service chưa được cấu hình hợp lệ (Invalid API Key). Vui lòng cấu hình GROQ_API_KEY trên backend và thử lại.'
                      }
                      setPlanError(msg)
                    } finally {
                      setGenerating(false)
                    }
                  }}
                >
                  {generating ? 'Generating…' : 'Generate Learning Path'}
                </button>
              </div>
              {planError ? (
                <div style={{ marginTop: 12, textAlign: 'center', color: '#dc2626' }}>{planError}</div>
              ) : null}
              {planGenerated && skeleton && (
                <section className="mt-8" aria-label="generated-plan">
                  <div className="card card__pad">
                    <h2 style={{ fontWeight: 600, color: '#111827', marginBottom: 12 }}>Learning Path Result</h2>
                    {Array.isArray(skeleton?.lessons) && skeleton.lessons.length > 0 ? (
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 0, margin: 0, listStyle: 'none' }}>
                        {skeleton.lessons.map((ls: any) => (
                          <li key={ls.id ?? ls.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <span style={{ marginTop: 4, width: 8, height: 8, borderRadius: 999, background: '#4f46e5' }} />
                            <div>
                              <div style={{ fontWeight: 600, color: '#1f2937' }}>{ls.title ?? 'Lesson'}</div>
                              {ls.description ? (<div style={{ fontSize: 14, color: '#6b7280' }}>{ls.description}</div>) : null}
                              {Array.isArray(ls.chapters) && ls.chapters.length > 0 ? (
                                <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                                  {ls.chapters.map((ch: any) => (
                                    <li key={ch.id ?? ch.title} style={{ color: '#4b5563', fontSize: 14 }}>{ch.title ?? 'Chapter'}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ color: '#6b7280' }}>No learning path data from server.</div>
                    )}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Footer actions */}
          <div className="actions">
            <button
              type="button"
              className="btn"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
            >
              Quay lại
            </button>
            <button
              type="button"
              className={`btn btn-primary ${!canNext ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!canNext}
              onClick={() => setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))}
            >
              Tiếp tục
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default PlansPage