import React, { useMemo, useState, useEffect } from 'react'
import { SubjectService, GoalService, LearningPathService } from '../../../services'
import type { Subject } from '../../../services/SubjectService'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'

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
    className={`card card__pad ${active ? 'card--active' : ''}`}
    style={{ textAlign: 'left' }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className={`icon-12 ${colorClass}`}>{icon ?? '🔖'}</div>
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>{name}</div>
          {desc ? <div style={{ fontSize: 12, color: '#6b7280' }}>{desc}</div> : null}
        </div>
      </div>
      {tag ? (
        <div style={{ marginTop: 4 }}>
          <span className="pill"><span className="pill__dot" />{tag}</span>
        </div>
      ) : null}
    </div>
    {active && (
      <span className="badge-selected">Chọn</span>
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
  <div className={`card card__pad ${active ? 'card--active' : ''}`} style={{ textAlign: 'left' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <div className={`icon-12 ${colorClass}`}>{icon ?? '📦'}</div>
      <div>
        <div style={{ fontWeight: 600, color: '#111827' }}>{title}</div>
      </div>
    </div>
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 0, margin: 0, listStyle: 'none' }}>
      {items.map((it) => (
        <li key={it.key}>
          <button
            type="button"
            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, padding: '8px 12px', border: '1px solid transparent' }}
            onClick={() => toggleItem(it.key)}
            className="btn-outline"
          >
            <span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: 999, border: '1px solid #d1d5db', marginRight: 4 }} />
            <span style={{ fontSize: 14, color: '#374151' }}>{it.label}</span>
          </button>
        </li>
      ))}
    </ul>
  </div>
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
  // Load goals from API + generation states
  const [goals, setGoals] = useState<any[]>([])
  const [goalsLoading, setGoalsLoading] = useState<boolean>(true)
  const [generating, setGenerating] = useState<boolean>(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [skeleton, setSkeleton] = useState<any | null>(null)

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
    const title = 'Lộ trình học - Chọn ngôn ngữ & mục tiêu | CodeNexus'
    document.title = title

    const desc = 'Chọn ngôn ngữ lập trình, mục tiêu học tập và tạo lộ trình học phù hợp trên CodeNexus.'
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
        if (active) setSubjects(data ?? [])
      } catch (err) {
        console.error('Failed to load subjects', err)
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
      } catch (err) {
        console.error('Failed to load goals', err)
      } finally {
        if (active) setGoalsLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

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
  }
  // Map API goals to GoalCard items
  const goalItems: GoalItem[] = Array.isArray(goals)
    ? goals
        .map((g: any) => ({
          key: g?.id ?? g?.goalId ?? g?.key,
          label: g?.title ?? g?.name ?? g?.label ?? 'Mục tiêu',
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
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
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
                title="Chọn Ngôn Ngữ Lập Trình"
                subtitle="Hãy chọn ngôn ngữ lập trình mà bạn muốn học. Bạn có thể chọn ngôn ngữ để tạo lộ trình học phù hợp."
                icon="🧩"
              />
              <section className="grid-subjects" aria-label="subject-list">
                {subjectsLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="card card__pad">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="icon-12" style={{ background: '#e5e7eb' }} />
                          <div>
                            <div style={{ width: 96, height: 16, background: '#e5e7eb', borderRadius: 6 }} />
                            <div style={{ width: 72, height: 12, background: '#f3f4f6', borderRadius: 6, marginTop: 6 }} />
                          </div>
                        </div>
                        <div style={{ width: 80, height: 12, background: '#f3f4f6', borderRadius: 6 }} />
                      </div>
                    </div>
                  ))
                ) : subjects.length > 0 ? (
                  subjects.map((s, idx) => (
                    <LanguageCard
                      key={`${s.id ?? s.slug ?? idx}`}
                      name={s.name}
                      tag={s.slug ?? undefined}
                      colorClass={palette[idx % palette.length]}
                      icon={undefined}
                      desc={`Khám phá lộ trình học ${s.name}`}
                      active={language === String(s.id ?? (s as any).subjectId)}
                      onClick={() => { console.log('Selected subject:', s); setLanguage(String(s.id ?? (s as any).subjectId)); setStep(2); }}
                    />
                  ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280' }}>
                    Không có môn học nào.
                  </div>
                )}
              </section>
            </>
          )}

          {step === 2 && (
            <>
              <StepHeader
                title="Chọn mục tiêu của bạn"
                subtitle="Chọn một hoặc nhiều mục tiêu từ dữ liệu hệ thống"
                icon="📍"
              />
              <section className="grid-goals" aria-label="goal-list">
                <GoalCard
                  key="goals-all"
                  title={goalsLoading ? 'Đang tải mục tiêu…' : 'Mục tiêu có sẵn'}
                  colorClass="icon--emerald"
                  icon="🧠"
                  items={goalItems}
                  active={selectedGoals.some((s) => goalItems.map((x) => x.key).includes(s))}
                  toggleItem={toggleGoal}
                />
              </section>
            </>
          )}

          {step === 3 && (
            <>
              <StepHeader
                title="Tạo lộ trình học"
                subtitle="Xác nhận lựa chọn và tạo lộ trình với backend"
                icon="🛠️"
              />
              <section aria-label="summary" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
                <div className={`card card__pad`}>
                  <h2 style={{ fontWeight: 600, color: '#111827', marginBottom: 8 }}>Ngôn ngữ đã chọn</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {language ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, background: '#f3f4f6', padding: '6px 12px', fontSize: 14, color: '#374151' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: '#4f46e5' }} />
                        {subjects.find((l: any) => String(l.id ?? l.subjectId) === language)?.name || 'Đã chọn'}
                      </span>
                    ) : (
                      <span style={{ color: '#6b7280', fontSize: 14 }}>Chưa chọn</span>
                    )}
                  </div>
                </div>
                <div className={`card card__pad`}>
                  <h2 style={{ fontWeight: 600, color: '#111827', marginBottom: 8 }}>Mục tiêu của bạn</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedGoals.length > 0 ? (
                      selectedGoals.map((g) => (
                        <span key={g} style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, background: '#f3f4f6', padding: '6px 12px', fontSize: 14, color: '#374151' }}>
                          {goalItems.find((x) => x.key === g)?.label || 'Đã chọn'}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: '#6b7280', fontSize: 14 }}>Chưa chọn</span>
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
                      setPlanError('Vui lòng chọn ngôn ngữ')
                      return
                    }
                    if (selectedGoals.length === 0) {
                      setPlanError('Vui lòng chọn ít nhất một mục tiêu')
                      return
                    }
                    setPlanError(null)
                    setGenerating(true)
                    try {
                      const payload = { subjectIds: language ? [language] : [], goalIds: selectedGoals }
                      const sk = await LearningPathService.generateSkeleton(payload)
                      setSkeleton(sk)
                      setPlanGenerated(true)
                    } catch (e: any) {
                      console.error('generateSkeleton error', e)
                      const serverMsg = e?.response?.data?.message || e?.response?.data?.msg || e?.response?.data?.error
                      setPlanError(serverMsg || e?.message || 'Không thể tạo lộ trình')
                    } finally {
                      setGenerating(false)
                    }
                  }}
                >
                  {generating ? 'Đang tạo…' : 'Tạo lộ trình'}
                </button>
              </div>
              {planError ? (
                <div style={{ marginTop: 12, textAlign: 'center', color: '#dc2626' }}>{planError}</div>
              ) : null}
              {planGenerated && skeleton && (
                <section className="mt-8" aria-label="generated-plan">
                  <div className="card card__pad">
                    <h2 style={{ fontWeight: 600, color: '#111827', marginBottom: 12 }}>Kết quả lộ trình</h2>
                    {Array.isArray(skeleton?.lessons) && skeleton.lessons.length > 0 ? (
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 0, margin: 0, listStyle: 'none' }}>
                        {skeleton.lessons.map((ls: any) => (
                          <li key={ls.id ?? ls.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <span style={{ marginTop: 4, width: 8, height: 8, borderRadius: 999, background: '#4f46e5' }} />
                            <div>
                              <div style={{ fontWeight: 600, color: '#1f2937' }}>{ls.title ?? 'Bài học'}</div>
                              {ls.description ? (<div style={{ fontSize: 14, color: '#6b7280' }}>{ls.description}</div>) : null}
                              {Array.isArray(ls.chapters) && ls.chapters.length > 0 ? (
                                <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                                  {ls.chapters.map((ch: any) => (
                                    <li key={ch.id ?? ch.title} style={{ color: '#4b5563', fontSize: 14 }}>{ch.title ?? 'Chương'}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ color: '#6b7280' }}>Không có dữ liệu lộ trình từ máy chủ.</div>
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