import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Loader2, Clock, Award, HelpCircle, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import { useTranslation } from 'react-i18next'
import api from '../../../services/Axios'
import { requestQuizQuestions } from '../../../services/SignalR'

/* ── Types ─────────────────────────────────────────── */
interface QuizQuestion {
  questionId: string
  questionText: string
  type: 'TrueFalse' | 'SingleChoice' | 'MultipleChoice' | 'Matching' | 'FillInTheBlank' | 'Ordering'
  options: string[]
  points: number
  orderIndex: number
}

interface QuizAttempt {
  attemptId: string
  quizId: string
  title: string
  timeLimit: number
  passingScore: number
  remainingSeconds: number
  startTime: string
  questions: QuizQuestion[]
}

/* ── Session helpers ───────────────────────────────── */
const STORAGE_KEY = (id: string) => `quiz_attempt_${id}`

function saveAttempt(quizId: string, attempt: QuizAttempt, answers: Record<string, string>) {
  try {
    sessionStorage.setItem(STORAGE_KEY(quizId), JSON.stringify({ attempt, answers }))
  } catch { /* ignore */ }
}
function loadAttempt(quizId: string): { attempt: QuizAttempt; answers: Record<string, string> } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY(quizId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function clearAttempt(quizId: string) {
  try { sessionStorage.removeItem(STORAGE_KEY(quizId)) } catch { /* ignore */ }
}

/* ── Component ─────────────────────────────────────── */
const QuizPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const location = useLocation() as any
  const { t } = useTranslation('student')

  const quizTitle = location.state?.quizTitle || 'Quiz'

  // Phases: 'start' | 'quiz' | 'submitted'
  const [phase, setPhase] = useState<'start' | 'quiz' | 'submitted'>('start')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<any>(null)

  // SignalR Generation State
  const [signalRData, setSignalRData] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Quiz data
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIdx, setCurrentIdx] = useState(0)

  // Timer
  const [remainingSec, setRemainingSec] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasAutoSubmittedRef = useRef(false)

  /* ── Restore session or Generate Questions ─────── */
  useEffect(() => {
    if (!quizId) return
    const stored = loadAttempt(quizId)
    if (stored?.attempt) {
      // Calculate remaining time from startTime
      const elapsed = (Date.now() - new Date(stored.attempt.startTime).getTime()) / 1000
      const remaining = Math.max(0, stored.attempt.timeLimit * 60 - elapsed)
      if (remaining > 0) {
        setAttempt(stored.attempt)
        setAnswers(stored.answers || {})
        setRemainingSec(Math.floor(remaining))
        setPhase('quiz')
        return
      } else {
        // Time expired while away — auto-submit
        clearAttempt(quizId)
      }
    }

    // If no active attempt, generate questions via SignalR for the Start screen
    if (phase === 'start') {
      let isMounted = true
      setGenerating(true)
      setGenError(null)
      requestQuizQuestions(quizId)
        .then((res) => {
          if (isMounted) {
            setSignalRData(res)
          }
        })
        .catch((err) => {
          if (isMounted) {
            setGenError(err.message || t('quiz.error'))
          }
        })
        .finally(() => {
          if (isMounted) {
            setGenerating(false)
          }
        })
      return () => { isMounted = false }
    }
  }, [quizId, phase, t])

  /* ── Timer tick ─────────────────────────────────── */
  useEffect(() => {
    if (phase !== 'quiz' || !attempt) return
    timerRef.current = setInterval(() => {
      setRemainingSec(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, attempt])

  /* ── Auto-submit when time runs out ────────────── */
  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    if (!attempt || submitting || hasAutoSubmittedRef.current) return
    if (isAutoSubmit) hasAutoSubmittedRef.current = true
    setSubmitting(true)
    try {
      const body = attempt.questions.map(q => ({
        questionId: q.questionId,
        answer: answers[q.questionId] || ''
      }))
      const res = await api.post(`/quizzes/attempts/${attempt.attemptId}/submit`, body)
      setSubmitResult(res)
      if (quizId) clearAttempt(quizId)
      setPhase('submitted')
    } catch {
      setError(t('quiz.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }, [attempt, answers, submitting, quizId, t])

  useEffect(() => {
    if (remainingSec === 0 && phase === 'quiz' && attempt && !submitting) {
      handleSubmit(true)
    }
  }, [remainingSec, phase, attempt, submitting, handleSubmit])

  /* ── Persist answers ───────────────────────────── */
  useEffect(() => {
    if (quizId && attempt && phase === 'quiz') {
      saveAttempt(quizId, attempt, answers)
    }
  }, [answers, quizId, attempt, phase])

  /* ── Start quiz ────────────────────────────────── */
  const startQuiz = async () => {
    if (!quizId) return
    setStarting(true)
    setError(null)
    try {
      const data: QuizAttempt = await api.post(`/quizzes/${quizId}/start`) as any
      setAttempt(data)
      setAnswers({})
      setCurrentIdx(0)
      // Calculate remaining from server
      const elapsed = (Date.now() - new Date(data.startTime).getTime()) / 1000
      const remaining = Math.max(0, data.timeLimit * 60 - elapsed)
      setRemainingSec(Math.floor(remaining))
      saveAttempt(quizId, data, {})
      setPhase('quiz')
    } catch (e: any) {
      // Parse backend error response
      const errData = e?.response?.data
      if (errData?.errorCode === 'QUIZ_NO_QUESTIONS') {
        setError(t('quiz.noQuestions'))
      } else {
        setError(errData?.errorMessage || errData?.message || e?.message || t('quiz.error'))
      }
    } finally {
      setStarting(false)
    }
  }

  /* ── Answer helpers ────────────────────────────── */
  const setAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  /* ── Derived ───────────────────────────────────── */
  const questions = attempt?.questions || []
  const currentQ = questions[currentIdx]
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const questionTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      TrueFalse: t('quiz.trueFalse'),
      SingleChoice: t('quiz.singleChoice'),
      MultipleChoice: t('quiz.multipleChoice'),
      Matching: t('quiz.matching'),
      FillInTheBlank: t('quiz.fillInTheBlank'),
      Ordering: t('quiz.ordering'),
    }
    return map[type] || type
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  /* ── RENDER ── */

  const shell = (children: React.ReactNode) => (
    <div style={{ background: 'var(--bg-main)', minHeight: '100vh', fontFamily: 'monospace' }}>
      <Header />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px 80px' }}>
        {children}
      </main>
      <Footer />
    </div>
  )

  /* ── Loading / Error states ──────────────────── */
  if (loading) {
    return shell(
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Loader2 style={{ width: 40, height: 40, color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', marginTop: 16 }}>{t('quiz.loading')}</p>
      </div>
    )
  }

  /* ── Phase: START ────────────────────────────── */
  if (phase === 'start') {
    return shell(
      <>
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, marginBottom: 24, padding: 0,
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          {t('quiz.goBack')}
        </button>

        {/* Start Card */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4,
          overflow: 'hidden',
        }}>
          {/* Accent bar */}
          <div style={{ height: 4, background: 'linear-gradient(90deg, var(--accent-primary) 0%, transparent 100%)' }} />

          <div style={{ padding: 32 }}>
            <h1 style={{
              color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, margin: '0 0 8px 0',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ color: 'var(--accent-primary)' }}>{'>'}</span>
              {signalRData?.title || quizTitle}
              <span style={{ animation: 'blink 1s step-end infinite', color: 'var(--accent-primary)', fontWeight: 300 }}>_</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 32px 0' }}>
              // {t('quiz.startTitle')}
            </p>

            {generating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 32px 0', color: 'var(--accent-primary)' }}>
                <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, fontFamily: 'monospace' }}>{t('quiz.loading', { defaultValue: '// generating questions...' })}</span>
              </div>
            )}

            {genError && (
              <div style={{
                background: 'var(--bg-main)', border: '1px solid var(--danger-primary)', borderRadius: 2,
                padding: '12px 16px', marginBottom: 16, color: 'var(--danger-primary)', fontSize: 13,
              }}>
                [ ERROR ]: {genError}
              </div>
            )}

            {/* Info grid — only show items when data is available */}
            {!generating && (() => {
              const sr = signalRData
              const loc = location.state

              const tLimit = sr?.timeLimit || loc?.timeLimit
              let pScore = sr?.passingScore || loc?.passingScore
              const tQuestions = sr?.questions?.length || loc?.totalQuestions

              // Calculate total points for percentage if available
              if (pScore !== undefined && sr?.questions && sr.questions.length > 0) {
                const totalPoints = sr.questions.reduce((sum: number, q: any) => sum + (q.points || 0), 0)
                if (totalPoints > 0) {
                  const percent = Math.round((pScore / totalPoints) * 100)
                  pScore = `${pScore} (${percent}%)`
                }
              }

              const infoItems = [
                tLimit ? { icon: <Clock style={{ width: 18, height: 18 }} />, label: t('quiz.timeLimit'), value: `${tLimit} ${t('quiz.minutes')}` } : null,
                pScore ? { icon: <Award style={{ width: 18, height: 18 }} />, label: t('quiz.passingScore'), value: String(pScore).includes('%') ? pScore : `${pScore} ${t('quiz.points')}` } : null,
                tQuestions ? { icon: <HelpCircle style={{ width: 18, height: 18 }} />, label: t('quiz.totalQuestions'), value: `${tQuestions} ${t('quiz.questions')}` } : null,
              ].filter(Boolean)
              if (infoItems.length === 0) return null
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
                  {infoItems.map((item: any, i: number) => (
                    <div key={i} style={{
                      background: 'var(--bg-main)', border: '1px dashed var(--border-base)', borderRadius: 2, padding: 16,
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{ color: 'var(--accent-primary)' }}>{item.icon}</div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: 1 }}>{item.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Error */}
            {error && (
              <div style={{
                background: 'var(--bg-main)', border: '1px solid var(--danger-primary)', borderRadius: 2,
                padding: '12px 16px', marginBottom: 16, color: 'var(--danger-primary)', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* Start button */}
            <button
              onClick={startQuiz}
              disabled={starting || generating || !!genError}
              style={{
                background: (starting || generating || !!genError) ? 'var(--bg-main)' : 'var(--accent-primary)',
                color: (starting || generating || !!genError) ? 'var(--text-disabled)' : '#fff',
                border: (starting || generating || !!genError) ? '1px dashed var(--border-base)' : '1px solid var(--accent-primary)',
                padding: '16px 32px', borderRadius: 4, width: '100%',
                fontSize: 14, fontWeight: 700, cursor: (starting || generating || !!genError) ? 'not-allowed' : 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                transition: 'all 0.2s ease', textTransform: 'uppercase', letterSpacing: 1
              }}
            >
              {starting ? (
                <>
                  <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  {t('quiz.starting', { defaultValue: 'ĐANG BẮT ĐẦU...' })}
                </>
              ) : (
                <>
                  <span style={{ color: (starting || generating || !!genError) ? 'inherit' : 'var(--bg-surface)' }}>{'>'}</span>
                  {t('quiz.startTitle', { defaultValue: 'BẮT ĐẦU LÀM BÀI' })}
                </>
              )}
            </button>
          </div>
        </div>

        <style>{`@keyframes blink { 50% { opacity: 0; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </>
    )
  }

  /* ── Phase: SUBMITTED ──────────────────────────── */
  if (phase === 'submitted') {
    return shell(
      <div style={{ fontFamily: 'monospace' }}>
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, marginBottom: 32, padding: 0,
            textTransform: 'uppercase', letterSpacing: 1
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          [ {t('quiz.goBack')} ]
        </button>

        {/* Global Result Card */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 2,
          padding: 32, marginBottom: 32, position: 'relative'
        }}>
          {submitResult?.passed ? (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, var(--success-primary) 0%, transparent 100%)' }} />
          ) : (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, var(--danger-primary) 0%, transparent 100%)' }} />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ color: submitResult?.passed ? 'var(--success-primary)' : 'var(--danger-primary)', fontWeight: 700, fontSize: 18 }}>
                  {submitResult?.passed ? t('quiz.resultSuccess', { defaultValue: '[ SUCCESS ]' }) : t('quiz.resultFailed', { defaultValue: '[ FAILED ]' })}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  // {new Date(submitResult?.endTime || new Date()).toLocaleString()}
                </span>
              </div>
              <h2 style={{
                fontSize: 24, fontWeight: 700, margin: '0 0 8px 0',
                color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 12
              }}>
                <span style={{ color: submitResult?.passed ? 'var(--success-primary)' : 'var(--danger-primary)' }}>{'>'}</span>
                {submitResult?.passed ? t('quiz.passedMsg', { defaultValue: 'CHÚC MỪNG! BẠN ĐẠT YÊU CẦU' }) : t('quiz.failedMsg', { defaultValue: 'RẤT TIẾC! BẠN CHƯA ĐẠT YÊU CẦU' })}
                <span style={{ animation: 'blink 1s step-end infinite', color: submitResult?.passed ? 'var(--success-primary)' : 'var(--danger-primary)', fontWeight: 300 }}>_</span>
              </h2>
            </div>

            {submitResult && (
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ background: 'var(--bg-main)', border: '1px dashed var(--border-base)', padding: '16px 24px', borderRadius: 2, minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{t('quiz.scoreLabel', { defaultValue: 'SCORE' })}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {submitResult.score} <span style={{ fontSize: 14, color: 'var(--text-disabled)' }}>/ {submitResult.totalPoints}</span>
                  </div>
                </div>
                <div style={{ background: 'var(--bg-main)', border: '1px dashed var(--border-base)', padding: '16px 24px', borderRadius: 2, minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{t('quiz.percentageLabel', { defaultValue: 'PERCENTAGE' })}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: submitResult.passed ? 'var(--success-primary)' : 'var(--danger-primary)' }}>
                    {submitResult.percentage}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Question Details List */}
        {submitResult?.questionResults && (
          <div style={{ marginTop: 40 }}>
            <h3 style={{ fontSize: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
              {'//'} {t('quiz.viewDetails', { defaultValue: 'VIEW_DETAILS' })}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {submitResult.questionResults.map((qr: any, idx: number) => {
                const isCorrect = qr.isCorrect
                const qColor = isCorrect ? 'var(--success-primary)' : 'var(--danger-primary)'
                return (
                  <div key={qr.questionId} style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border-base)',
                    borderRadius: 2, padding: 24,
                    borderLeft: `3px solid ${qColor}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>
                        [ {t('quiz.questionPrefix', { defaultValue: 'Q' })}{String(idx + 1).padStart(2, '0')} ]
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--bg-main)', border: '1px dashed var(--border-base)', padding: '4px 12px', borderRadius: 2 }}>
                        {qr.earnedPoints} / {qr.points} pt
                      </div>
                    </div>
                    <p style={{ margin: '0 0 24px 0', fontSize: 15, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {qr.questionText}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12, fontSize: 14 }}>
                      <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'var(--bg-main)', borderRadius: 2, border: '1px dashed var(--border-base)' }}>
                        <span style={{ color: 'var(--text-secondary)', minWidth: 100, fontWeight: 600 }}>{'>'} {t('quiz.userAns', { defaultValue: 'USER_ANS' })}:</span>
                        <span style={{ color: isCorrect ? 'var(--success-primary)' : 'var(--danger-primary)', fontWeight: 700, wordBreak: 'break-word' }}>
                          {qr.userAnswer || t('quiz.nullOrEmpty', { defaultValue: '[ NULL_OR_EMPTY ]' })}
                        </span>
                      </div>
                      {!isCorrect && qr.correctAnswer && (
                        <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'var(--bg-main)', borderRadius: 2, border: `1px dashed var(--success-primary)` }}>
                          <span style={{ color: 'var(--text-secondary)', minWidth: 100, fontWeight: 600 }}>{'>'} {t('quiz.expected', { defaultValue: 'EXPECTED' })}:</span>
                          <span style={{ color: 'var(--success-primary)', fontWeight: 700, wordBreak: 'break-word' }}>
                            {qr.correctAnswer}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    )
  }

  /* ── Phase: QUIZ ───────────────────────────────── */
  if (!currentQ) return shell(<p style={{ color: 'var(--text-disabled)', textAlign: 'center' }}>...</p>)

  const isLastQuestion = currentIdx === questions.length - 1

  return shell(
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .q-opt { transition: all 0.15s ease; }
        .q-opt:hover { border-color: var(--accent-primary) !important; background: var(--bg-main) !important; }
      `}</style>

      {/* Timer bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-base)', padding: '12px 0', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, padding: 0,
            }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            {t('quiz.goBack')}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock style={{ width: 16, height: 16, color: remainingSec < 60 ? 'var(--danger-primary)' : 'var(--accent-primary)' }} />
            <span style={{
              fontSize: 18, fontWeight: 700, letterSpacing: 2,
              color: remainingSec < 60 ? 'var(--danger-primary)' : 'var(--text-primary)',
            }}>
              {formatTime(remainingSec)}
            </span>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {t('quiz.questionOf', { current: currentIdx + 1, total: questions.length })}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--bg-main)', marginTop: 8, borderRadius: 2 }}>
          <div style={{
            height: '100%', background: 'var(--accent-primary)', borderRadius: 2,
            width: `${((currentIdx + 1) / questions.length) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Question card */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4,
        padding: 32, marginBottom: 24,
      }}>
        {/* Question header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {questionTypeLabel(currentQ.type)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600 }}>
            {t('quiz.pointsLabel', { points: currentQ.points })}
          </span>
        </div>

        {/* Question text */}
        <h2 style={{
          color: 'var(--text-primary)', fontSize: 18, fontWeight: 600, margin: '0 0 24px 0',
          lineHeight: 1.6, whiteSpace: 'pre-line',
        }}>
          {currentQ.questionText}
        </h2>

        {/* Question body based on type */}
        {renderQuestion(currentQ, answers[currentQ.questionId] || '', (val) => setAnswer(currentQ.questionId, val), t)}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        {/* Previous */}
        <button
          onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
          disabled={currentIdx === 0}
          style={{
            padding: '10px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-base)',
            borderRadius: 2, color: currentIdx === 0 ? 'var(--text-disabled)' : 'var(--text-primary)',
            cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          {t('quiz.previous')}
        </button>

        {/* Question dots */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {questions.map((q, idx) => {
            const isActive = idx === currentIdx
            const isAnswered = !!answers[q.questionId]
            return (
              <button
                key={q.questionId}
                onClick={() => setCurrentIdx(idx)}
                style={{
                  width: 32, height: 32, borderRadius: 2, border: '1px solid',
                  borderColor: isActive ? 'var(--accent-primary)' : isAnswered ? 'var(--success-primary)' : 'var(--border-base)',
                  background: isActive ? 'var(--accent-primary)' : isAnswered ? 'var(--success-primary)' : 'var(--bg-surface)',
                  color: isActive || isAnswered ? 'var(--bg-surface)' : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>

        {/* Next or Submit */}
        {isLastQuestion ? (
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            style={{
              padding: '10px 24px', background: submitting ? 'var(--text-disabled)' : 'var(--success-primary)',
              color: 'var(--bg-surface)', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing: 1,
            }}
          >
            {submitting ? t('quiz.submitting') : t('quiz.submit')}
          </button>
        ) : (
          <button
            onClick={() => setCurrentIdx(p => Math.min(questions.length - 1, p + 1))}
            style={{
              padding: '10px 20px', background: 'var(--accent-primary)', border: 'none',
              borderRadius: 2, color: 'var(--bg-surface)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t('quiz.next')}
          </button>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--danger-primary)', color: '#fff', padding: '12px 24px', borderRadius: 4,
          fontSize: 13, fontWeight: 600, zIndex: 1000,
        }}>
          {error}
        </div>
      )}
    </>
  )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/* ── Question renderers ─────────────────────────── */

function renderQuestion(
  q: QuizQuestion,
  answer: string,
  setAnswer: (val: string) => void,
  t: (key: string) => string,
) {
  switch (q.type) {
    case 'TrueFalse':
      return <TrueFalseQ options={q.options} answer={answer} setAnswer={setAnswer} />
    case 'SingleChoice':
      return <SingleChoiceQ options={q.options} answer={answer} setAnswer={setAnswer} />
    case 'MultipleChoice':
      return <MultipleChoiceQ options={q.options} answer={answer} setAnswer={setAnswer} />
    case 'Matching':
      return <MatchingQ options={q.options} answer={answer} setAnswer={setAnswer} t={t} />
    case 'FillInTheBlank':
      return <FillInBlankQ answer={answer} setAnswer={setAnswer} t={t} />
    case 'Ordering':
      return <OrderingQ options={q.options} answer={answer} setAnswer={setAnswer} />
    default:
      return <SingleChoiceQ options={q.options} answer={answer} setAnswer={setAnswer} />
  }
}

/* ── TrueFalse ─────────────────────────────────── */
function TrueFalseQ({ options, answer, setAnswer }: { options: string[]; answer: string; setAnswer: (v: string) => void }) {
  const opts = options.length ? options : ['True', 'False']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {opts.map((opt) => (
        <button
          key={opt}
          className="q-opt"
          onClick={() => setAnswer(opt)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
            background: answer === opt ? 'var(--bg-main)' : 'var(--bg-surface)',
            border: `2px solid ${answer === opt ? 'var(--accent-primary)' : 'var(--border-base)'}`,
            borderRadius: 4, cursor: 'pointer', textAlign: 'left', fontSize: 15, color: 'var(--text-primary)',
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: '50%', border: `2px solid ${answer === opt ? 'var(--accent-primary)' : 'var(--border-base)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {answer === opt && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-primary)' }} />}
          </div>
          {opt}
        </button>
      ))}
    </div>
  )
}

/* ── SingleChoice ──────────────────────────────── */
function SingleChoiceQ({ options, answer, setAnswer }: { options: string[]; answer: string; setAnswer: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((opt, i) => (
        <button
          key={i}
          className="q-opt"
          onClick={() => setAnswer(opt)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
            background: answer === opt ? 'var(--bg-main)' : 'var(--bg-surface)',
            border: `2px solid ${answer === opt ? 'var(--accent-primary)' : 'var(--border-base)'}`,
            borderRadius: 4, cursor: 'pointer', textAlign: 'left', fontSize: 15, color: 'var(--text-primary)',
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: '50%', border: `2px solid ${answer === opt ? 'var(--accent-primary)' : 'var(--border-base)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {answer === opt && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-primary)' }} />}
          </div>
          {opt}
        </button>
      ))}
    </div>
  )
}

/* ── MultipleChoice ────────────────────────────── */
function MultipleChoiceQ({ options, answer, setAnswer }: { options: string[]; answer: string; setAnswer: (v: string) => void }) {
  const selected = answer ? answer.split('||') : []
  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]
    setAnswer(next.join('||'))
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((opt, i) => {
        const checked = selected.includes(opt)
        return (
          <button
            key={i}
            className="q-opt"
            onClick={() => toggle(opt)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              background: checked ? 'var(--bg-main)' : 'var(--bg-surface)',
              border: `2px solid ${checked ? 'var(--accent-primary)' : 'var(--border-base)'}`,
              borderRadius: 4, cursor: 'pointer', textAlign: 'left', fontSize: 15, color: 'var(--text-primary)',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 3, border: `2px solid ${checked ? 'var(--accent-primary)' : 'var(--border-base)'}`,
              background: checked ? 'var(--accent-primary)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              color: '#fff', fontSize: 12, fontWeight: 700,
            }}>
              {checked && '✓'}
            </div>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

/* ── Matching ──────────────────────────────────── */
function MatchingQ({ options, answer, setAnswer, t }: { options: string[]; answer: string; setAnswer: (v: string) => void; t: (k: string) => string }) {
  // options format: ["left::right", ...]
  const pairs = options.map(o => {
    const [left, right] = o.split('::')
    return { left: left?.trim() || '', right: right?.trim() || '' }
  })
  const leftItems = pairs.map(p => p.left)
  const rightItems = pairs.map(p => p.right)

  // Current answer: "left1::right1||left2::right2"
  const currentPairs: Record<string, string> = {}
  if (answer) {
    answer.split('||').forEach(pair => {
      const [l, r] = pair.split('::')
      if (l) currentPairs[l.trim()] = r?.trim() || ''
    })
  }

  const updatePair = (left: string, right: string) => {
    const next = { ...currentPairs, [left]: right }
    const str = leftItems.map(l => `${l}::${next[l] || ''}`).join('||')
    setAnswer(str)
  }

  // Determine which right items are already selected
  const usedRights = new Set(Object.values(currentPairs).filter(Boolean))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {leftItems.map((left, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 4,
        }}>
          <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{left}</span>
          <span style={{ color: 'var(--text-disabled)', fontSize: 18 }}>→</span>
          <select
            value={currentPairs[left] || ''}
            onChange={(e) => updatePair(left, e.target.value)}
            style={{
              flex: 1, padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-base)',
              borderRadius: 2, color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">{t('quiz.matchPrompt')}</option>
            {rightItems.map((right, j) => {
              const isUsedByOther = usedRights.has(right) && currentPairs[left] !== right
              return (
                <option key={j} value={right} disabled={isUsedByOther}>
                  {right}
                </option>
              )
            })}
          </select>
        </div>
      ))}
    </div>
  )
}

/* ── FillInTheBlank ────────────────────────────── */
function FillInBlankQ({ answer, setAnswer, t }: { answer: string; setAnswer: (v: string) => void; t: (k: string) => string }) {
  return (
    <input
      type="text"
      value={answer}
      onChange={(e) => setAnswer(e.target.value)}
      placeholder={t('quiz.fillAnswer')}
      style={{
        width: '100%', padding: '14px 16px', background: 'var(--bg-main)',
        border: '2px solid var(--border-base)', borderRadius: 4,
        color: 'var(--text-primary)', fontSize: 15, outline: 'none',
        fontFamily: 'monospace',
      }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }}
      onBlur={(e) => { e.target.style.borderColor = 'var(--border-base)' }}
    />
  )
}

/* ── Ordering ──────────────────────────────────── */
function OrderingQ({ options, answer, setAnswer }: { options: string[]; answer: string; setAnswer: (v: string) => void }) {
  const items = answer ? answer.split('||') : [...options]

  const moveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= items.length) return
    const next = [...items]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    setAnswer(next.join('||'))
  }

  // Drag state
  const [dragIdx, setDragIdx] = React.useState<number | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, idx) => (
        <div
          key={`${item}-${idx}`}
          draggable
          onDragStart={() => setDragIdx(idx)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIdx !== null && dragIdx !== idx) moveItem(dragIdx, idx)
            setDragIdx(null)
          }}
          onDragEnd={() => setDragIdx(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            background: dragIdx === idx ? 'var(--bg-main)' : 'var(--bg-surface)',
            border: `2px solid ${dragIdx === idx ? 'var(--accent-primary)' : 'var(--border-base)'}`,
            borderRadius: 4, cursor: 'grab',
            opacity: dragIdx === idx ? 0.6 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <GripVertical style={{ width: 16, height: 16, color: 'var(--text-disabled)', flexShrink: 0 }} />
          <span style={{
            width: 24, height: 24, borderRadius: 2, background: 'var(--accent-primary)', color: 'var(--bg-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {idx + 1}
          </span>
          <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>{item}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button
              onClick={() => moveItem(idx, idx - 1)}
              disabled={idx === 0}
              style={{
                background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', padding: 0,
                color: idx === 0 ? 'var(--text-disabled)' : 'var(--text-secondary)',
              }}
            >
              <ChevronUp style={{ width: 16, height: 16 }} />
            </button>
            <button
              onClick={() => moveItem(idx, idx + 1)}
              disabled={idx === items.length - 1}
              style={{
                background: 'none', border: 'none', cursor: idx === items.length - 1 ? 'not-allowed' : 'pointer', padding: 0,
                color: idx === items.length - 1 ? 'var(--text-disabled)' : 'var(--text-secondary)',
              }}
            >
              <ChevronDown style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default QuizPage
