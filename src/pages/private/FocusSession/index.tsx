import React, { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { BookOpen, Code, HelpCircle, Bot, Timer, Flag, CheckCircle, Info, ArrowLeft, Loader2, PlayCircle, Book, Maximize2, Minimize2 } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FocusSessionService, SessionType } from '../../../services'
import type { FocusSession } from '../../../services/FocusSessionService'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import Toast from '../../../components/Toast'
import CompleteSessionDialog from '../../../components/CompleteSessionDialog'
import ROUTER from '../../../router/ROUTER'
import { useTranslation } from 'react-i18next'

interface TaskData {
  id?: string
  taskId?: string
  title?: string
  description?: string
  taskType?: string | number // Can be string ("Practice", "Theory", "Quizz") or number (0, 1, 2)
  quizQuestionsJson?: string // JSON string for quiz questions
}

const FocusSessionPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation('student')

  // Get session data from navigation state
  const sessionData = location.state?.session as FocusSession | undefined
  const taskData = location.state?.task as TaskData | undefined

  const [session] = useState<FocusSession | null>(sessionData || null)
  const [task] = useState<TaskData | null>(taskData || null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isRunning, setIsRunning] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [showCompleteDialog, setShowCompleteDialog] = useState<boolean>(false)
  const [aiReviewLoading, setAiReviewLoading] = useState<boolean>(false)
  const [aiReview, setAiReview] = useState<{ feedback: string, score?: number } | null>(null)
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false)

  // Code editor state for practice tasks
  const [code, setCode] = useState<string>('')
  const [editorLanguage, setEditorLanguage] = useState<string>('javascript')

  // Theory form state
  const [theoryAnswers, setTheoryAnswers] = useState<Record<string, string>>({})

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})

  // Helper function to format quiz answers for API
  const formatQuizAnswers = (): string => {
    try {
      // Convert quizAnswers object to simple array of answer indices
      // Example: {q0: 1, q1: 0, q2: 1} -> "[1, 0, 1]"
      const answersArray: number[] = []

      // Get all question indices and sort them to ensure correct order
      const questionKeys = Object.keys(quizAnswers).sort((a, b) => {
        const aIndex = parseInt(a.replace('q', ''))
        const bIndex = parseInt(b.replace('q', ''))
        return aIndex - bIndex
      })

      // Build array with answer indices in correct order
      questionKeys.forEach(questionKey => {
        const answerIndex = quizAnswers[questionKey]
        answersArray.push(answerIndex)
      })

      const result = JSON.stringify(answersArray)
      return result
    } catch (error) {
      return JSON.stringify([])
    }
  }

  // AI Review Component
  const renderAiReview = () => {
    if (!aiReview) return null

    return (
      <div style={{
        marginTop: 16,
        padding: 16,
        background: 'var(--bg-blue-hover)',
        border: '1px solid var(--accent-primary)',
        borderRadius: 4
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--accent-primary)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bot size={16} /> {t('focusSession.aiFeedback')}
          </span>
          {aiReview.score !== undefined && (
            <span style={{
              padding: '2px 8px',
              background: aiReview.score >= 80 ? 'var(--success-primary)' : aiReview.score >= 60 ? 'var(--warning-primary)' : 'var(--danger-primary)',
              color: 'white',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700
            }}>
              {aiReview.score}/100
            </span>
          )}
        </div>
        <div style={{
          fontSize: 13,
          color: 'var(--text-primary)',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap'
        }}>
          {aiReview.feedback}
        </div>
      </div>
    )
  }

  // Focus mode toggle
  const toggleFocusMode = async () => {
    if (!isFocusMode) {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => { })
      }
      setIsFocusMode(true)
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen().catch(() => { })
      }
      setIsFocusMode(false)
    }
  }

  // Handle ESC key or exiting fullscreen manually
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFocusMode) {
        setIsFocusMode(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [isFocusMode])

  // Calculate initial time remaining
  useEffect(() => {
    if (session) {
      const startTime = new Date(session.startTime).getTime()
      const plannedEndTime = startTime + (session.plannedDurationMinutes * 60 * 1000)
      const now = Date.now()
      const remaining = Math.max(0, plannedEndTime - now)
      setTimeRemaining(Math.floor(remaining / 1000))
    }
  }, [session])

  // Timer countdown
  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsRunning(false)
          setToast({ message: t('focusSession.completed'), type: 'success' })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, timeRemaining])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getSessionTypeLabel = (type: SessionType): string => {
    return type === SessionType.Pomodoro ? t('focusSession.pomodoro') : t('focusSession.study')
  }

  const getSessionTypeIcon = (type: SessionType) => {
    return type === SessionType.Pomodoro ? <Timer size={14} /> : <Book size={14} />
  }

  const getSessionTypeColor = (type: SessionType): string => {
    return type === SessionType.Pomodoro ? 'var(--danger-primary)' : 'var(--accent-primary)'
  }

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString)
    // Convert to UTC+7
    const utc7Date = new Date(date.getTime() + (7 * 60 * 60 * 1000))
    return utc7Date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const handleCompleteNow = async () => {
    setShowCompleteDialog(true)
  }

  const handleCompleteSession = async (submitType: string) => {
    if (!session) return

    setLoading(true)
    try {
      const taskTypeNum = (window as any).currentTaskTypeNum || 0

      // Prepare payload based on submitType and taskType
      const payload: any = {
        submissionType: submitType === 'save_progress' ? 'Progress' : 'Final',
        isEarlyCompletion: true
      }

      // Add task-specific data based on taskType
      if (taskTypeNum === 0) {
        // Practice - send code
        payload.submittedCode = code
      } else if (taskTypeNum === 1) {
        // Theory - send summary
        payload.submittedSummary = theoryAnswers.answer || ''
      } else if (taskTypeNum === 2) {
        // Quiz - send quiz answers
        payload.submittedQuizAnswers = formatQuizAnswers()
      }

      // Call complete session API
      await FocusSessionService.completeSession(session.id, payload)

      setIsRunning(false)
      setTimeRemaining(0)
      setShowCompleteDialog(false)

      const message = submitType === 'save_progress'
        ? t('focusSession.progressSaved')
        : t('focusSession.completed')

      setToast({ message, type: 'success' })

      // Navigate back to my plans after a short delay
      setTimeout(() => {
        navigate(ROUTER.MY_PLANS)
      }, 2000)
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || t('focusSession.completeError')
      setToast({ message: msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelComplete = () => {
    setShowCompleteDialog(false)
  }

  const handleAiReview = async () => {
    if (!session) return

    const taskTypeNum = (window as any).currentTaskTypeNum || 0

    // Validate that we have content to review
    let hasContent = false
    if (taskTypeNum === 0 && code.trim()) {
      hasContent = true
    } else if (taskTypeNum === 1 && theoryAnswers.answer?.trim()) {
      hasContent = true
    } else if (taskTypeNum === 2 && Object.keys(quizAnswers).length > 0) {
      hasContent = true
    }

    if (!hasContent) {
      setToast({
        message: t('focusSession.emptyContentWarning'),
        type: 'warning'
      })
      return
    }

    setAiReviewLoading(true)
    try {
      const payload: any = {}

      if (taskTypeNum === 0) {
        // Practice - send code
        payload.submittedCode = code
      } else if (taskTypeNum === 1) {
        // Theory - send summary
        payload.submittedSummary = theoryAnswers.answer || ''
      } else if (taskTypeNum === 2) {
        // Quiz - send quiz answers
        payload.submittedQuizAnswers = formatQuizAnswers()
      }

      // Use FocusSessionService to call AI review API
      const reviewData = await FocusSessionService.getAiReview(session.id, payload)

      // Extract feedback from response structure based on backend response
      const feedback = reviewData?.aiFeedback || reviewData?.value?.aiFeedback || reviewData?.feedback || reviewData?.message || 'AI đã xem xét bài làm của bạn.'
      const score = reviewData?.verificationScore || reviewData?.value?.verificationScore

      setAiReview({ feedback, score })
      setToast({ message: t('focusSession.reviewReceived'), type: 'success' })
    } catch (error: any) {
      // More detailed error handling
      let errorMsg = t('focusSession.reviewError')

      if (error?.response?.data?.message) {
        errorMsg = error.response.data.message
      } else if (error?.response?.data?.error) {
        errorMsg = error.response.data.error
      } else if (error?.message) {
        errorMsg = error.message
      }

      // Show error in AI review section for debugging
      setAiReview({
        feedback: `❌ ${t('focusSession.errorPrefix')}: ${errorMsg}\n\n${t('focusSession.errorDetail')}:\n${JSON.stringify(error?.response?.data || error?.message || 'Unknown error', null, 2)}`,
        score: undefined
      })

      setToast({ message: errorMsg, type: 'error' })
    } finally {
      setAiReviewLoading(false)
    }
  }

  const handleBackToPlans = () => {
    navigate(ROUTER.MY_PLANS)
  }

  const renderWorkspace = () => {
    const taskType = task?.taskType

    // Convert to number for easier comparison
    let taskTypeNum = 0
    if (typeof taskType === 'number') {
      taskTypeNum = taskType
    } else if (typeof taskType === 'string') {
      if (taskType === "Theory") taskTypeNum = 1
      else if (taskType === "Quizz" || taskType === "Quiz") taskTypeNum = 2
      else taskTypeNum = 0 // Default to Practice
    }

    // Store taskTypeNum for use in other functions
    ; (window as any).currentTaskTypeNum = taskTypeNum

    switch (taskTypeNum) {
      case 0: // Practice - Code Editor (Monaco)
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <div style={{
              padding: '8px 16px',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Code size={16} color='var(--accent-primary)' />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('focusSession.practiceMode')}
                </span>
              </div>
              {/* Language selector */}
              <select
                value={editorLanguage}
                onChange={(e) => setEditorLanguage(e.target.value)}
                style={{
                  padding: '4px 10px',
                  background: 'var(--bg-main)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="csharp">C#</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="sql">SQL</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="php">PHP</option>
                <option value="ruby">Ruby</option>
                <option value="kotlin">Kotlin</option>
                <option value="swift">Swift</option>
                <option value="plaintext">Plain Text</option>
              </select>
            </div>

            {/* Monaco Editor Container */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#1e1e1e' }}>
              {/* Floating Placeholder */}
              {!code && (
                <div style={{
                  position: 'absolute',
                  top: 12,
                  left: 68, // Offset for line numbers
                  zIndex: 1,
                  color: 'rgba(255, 255, 255, 0.3)',
                  fontSize: 14,
                  fontFamily: 'monospace',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}>
                  {t('focusSession.codePlaceholder')}
                </div>
              )}

              <Editor
                height="100%"
                language={editorLanguage}
                value={code}
                onChange={(val) => setCode(val ?? '')}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  automaticLayout: true,
                  tabSize: 2,
                  padding: { top: 12 },
                  suggest: { showKeywords: true },
                  quickSuggestions: true,
                  formatOnPaste: true,
                  formatOnType: false,
                  bracketPairColorization: { enabled: true },
                }}
              />
            </div>

            {renderAiReview()}
          </div>
        )

      case 1: // Theory - Text Input
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-base)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <BookOpen size={16} /> {t('focusSession.theoryMode')}
            </div>
            <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 6
                }}>
                  {t('focusSession.theoryInputLabel')}
                </label>
                <textarea
                  value={theoryAnswers['answer'] || ''}
                  onChange={(e) => setTheoryAnswers(prev => ({ ...prev, answer: e.target.value }))}
                  placeholder={t('focusSession.theoryInputPlaceholder')}
                  style={{
                    width: '100%',
                    height: 200,
                    padding: 12,
                    border: '1px solid var(--border-base)',
                    borderRadius: 2,
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              {renderAiReview()}
            </div>
          </div>
        )

      case 2: // Quiz - Display questions from QuizQuestionsJson
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-base)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <HelpCircle size={16} /> {t('focusSession.quizMode')}
            </div>
            <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
              {(() => {
                try {
                  const quizData = task?.quizQuestionsJson ? JSON.parse(task.quizQuestionsJson) : null

                  if (!quizData) {
                    return (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
                        <div>{t('focusSession.noQuizData')}</div>
                        <div style={{ fontSize: 11, marginTop: 8, color: 'var(--text-disabled)' }}>
                          QuizQuestionsJson: {task?.quizQuestionsJson || 'null'}
                        </div>
                      </div>
                    )
                  }

                  if (!Array.isArray(quizData)) {
                    return (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
                        <div>{t('focusSession.invalidQuizData')}</div>
                        <div style={{ fontSize: 11, marginTop: 8, color: 'var(--text-disabled)' }}>
                          Type: {typeof quizData}, Data: {JSON.stringify(quizData)}
                        </div>
                      </div>
                    )
                  }

                  return quizData.map((question: any, qIdx: number) => (
                    <div key={qIdx} style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                        {t('focusSession.question', { number: qIdx + 1 })}: {question.question || question.text || question.title || question.Question || question.Text || question.Title}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(question.options || question.answers || question.Options || question.Answers || []).map((option: any, optIdx: number) => (
                          <label key={optIdx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            cursor: 'pointer',
                            padding: 8,
                            borderRadius: 2,
                            background: quizAnswers[`q${qIdx}`] === optIdx ? 'var(--bg-blue-hover)' : 'transparent'
                          }}>
                            <input
                              type="radio"
                              name={`q${qIdx}`}
                              value={optIdx}
                              checked={quizAnswers[`q${qIdx}`] === optIdx}
                              onChange={() => setQuizAnswers(prev => ({ ...prev, [`q${qIdx}`]: optIdx }))}
                              style={{ margin: 0 }}
                            />
                            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                              {typeof option === 'string' ? option : option.text || option.title || option.answer || option.Text || option.Title || option.Answer}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))
                } catch (error) {
                  return (
                    <div style={{ textAlign: 'center', color: 'var(--error-primary)', padding: 40 }}>
                      <div>{t('focusSession.quizLoadError')}</div>
                      <div style={{ fontSize: 11, marginTop: 8, color: 'var(--text-disabled)' }}>
                        Error: {(error as any)?.message || 'Unknown error'}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-disabled)' }}>
                        Raw data: {task?.quizQuestionsJson || 'null'}
                      </div>
                    </div>
                  )
                }
              })()}

              {renderAiReview()}

              {/* Debug: Show current quiz answers */}
              {Object.keys(quizAnswers).length > 0 && (
                <div style={{
                  marginTop: 16,
                  padding: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 4
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={14} /> {t('focusSession.debugCurrentAnswers')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                    {Object.entries(quizAnswers)
                      .sort(([a], [b]) => {
                        const aIndex = parseInt(a.replace('q', ''))
                        const bIndex = parseInt(b.replace('q', ''))
                        return aIndex - bIndex
                      })
                      .map(([questionKey, answerIndex]) => {
                        const questionNum = parseInt(questionKey.replace('q', '')) + 1
                        return (
                          <div key={questionKey} style={{ marginBottom: 4 }}>
                            {t('focusSession.question', { number: questionNum })}: {answerIndex + 1} (index: {answerIndex})
                          </div>
                        )
                      })}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 8 }}>
                    <div>Định dạng gửi API: {formatQuizAnswers()}</div>
                    <div style={{ marginTop: 4 }}>
                      Giải thích: Mảng các index đáp án theo thứ tự câu hỏi
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: 'var(--text-secondary)',
            fontSize: 14,
            gap: 8
          }}>
            <div style={{ fontSize: 12 }}>{t('focusSession.selectTaskTypeMsg')}</div>
          </div>
        )
    }
  }

  if (!session) {
    return (
      <div style={{ background: 'var(--bg-surface)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ flex: 1, padding: '40px 24px', maxWidth: 800, margin: '0 auto', width: '100%', textAlign: 'center' }}>
          <div style={{ padding: 40 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
              {t('focusSession.sessionNotFound')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              {t('focusSession.sessionExpired')}
            </p>
            <button
              type="button"
              onClick={handleBackToPlans}
              style={{
                padding: '12px 24px',
                background: 'var(--text-primary)',
                color: 'var(--bg-surface-short)',
                border: 'none',
                borderRadius: 2,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {t('focusSession.backToPlans')}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const progressPercentage = session.plannedDurationMinutes > 0
    ? Math.max(0, Math.min(100, ((session.plannedDurationMinutes * 60 - timeRemaining) / (session.plannedDurationMinutes * 60)) * 100))
    : 0

  return (
    <div style={{ background: 'var(--bg-surface)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isFocusMode && <Header />}

      {/* Floating Exit Focus Button */}
      {isFocusMode && (
        <button
          type="button"
          onClick={toggleFocusMode}
          style={{
            position: 'fixed', top: 16, right: 16, zIndex: 100000,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--bg-main)', border: '1px dashed var(--border-base)',
            color: 'var(--text-primary)', padding: '8px 16px', borderRadius: 4,
            cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        >
          <Minimize2 size={16} /> [ {t('lessonDetail.exitFocus')} ]
        </button>
      )}

      <main style={{ flex: 1, display: 'flex', gap: 0 }}>
        {/* Left Panel - Task Info */}
        <div style={{
          width: 300,
          background: 'var(--bg-main)',
          borderRight: '1px solid var(--border-base)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: 16,
            borderBottom: '1px solid var(--border-base)',
            background: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <button
              type="button"
              onClick={handleBackToPlans}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-base)',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.borderColor = 'var(--text-primary)'
                e.currentTarget.style.background = 'var(--bg-surface-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.borderColor = 'var(--border-base)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <ArrowLeft size={16} />
              {t('focusSession.backToPlans')}
            </button>

            {/* Enable Focus Mode button */}
            <button
              type="button"
              onClick={toggleFocusMode}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-main)',
                color: 'var(--accent-primary)',
                border: '1px dashed var(--border-base)',
                borderRadius: 2,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
              title="Toggle Distraction-Free Mode"
            >
              <Maximize2 size={14} />
              [ {t('lessonDetail.enableFocus')} ]
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={18} className="text-th-muted" />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {t('focusSession.taskInfo')}
              </h3>
            </div>
          </div>

          <div style={{ flex: 1, padding: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                {task?.title || session.title || t('focusSession.untitledTask')}
              </h4>
              {task?.description && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {task.description}
                </p>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                textAlign: 'center',
                marginBottom: 8
              }}>
                {formatTime(timeRemaining)}
              </div>
              <div style={{
                width: '100%',
                height: 6,
                background: 'var(--border-base)',
                borderRadius: 3,
                overflow: 'hidden',
                marginBottom: 8
              }}>
                <div style={{
                  width: `${progressPercentage}%`,
                  height: '100%',
                  background: getSessionTypeColor(session.sessionType),
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                {Math.round(progressPercentage)}% {t('focusSession.percentageComplete')}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={handleAiReview}
                disabled={aiReviewLoading}
                style={{
                  padding: '10px 16px',
                  background: aiReviewLoading ? 'var(--text-secondary)' : 'var(--accent-primary)',
                  color: 'var(--bg-surface)',
                  border: 'none',
                  borderRadius: 2,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: aiReviewLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                {aiReviewLoading ? <Loader2 className="animate-spin" size={16} /> : <Bot size={16} />}
                {aiReviewLoading ? t('focusSession.aiAnalyzing') : t('focusSession.aiReviewBtn')}
              </button>

              <button
                type="button"
                onClick={handleCompleteNow}
                disabled={loading}
                style={{
                  padding: '12px 16px',
                  background: loading ? 'var(--text-secondary)' : 'var(--success-primary)',
                  color: 'var(--bg-surface)',
                  border: 'none',
                  borderRadius: 2,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Flag size={16} />}
                {loading ? t('focusSession.completingBtn') : t('focusSession.completeBtn')}
              </button>
            </div>


          </div>
        </div>

        {/* Center Panel - Workspace */}
        <div style={{
          flex: 1,
          background: 'var(--bg-main)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {renderWorkspace()}
        </div>

        {/* Right Panel - Session Info */}
        <div style={{
          width: 280,
          background: 'var(--bg-main)',
          borderLeft: '1px solid var(--border-base)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: 16,
            borderBottom: '1px solid var(--border-base)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Timer size={18} className="text-th-muted" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {t('focusSession.sessionDetails')}
            </h3>
          </div>

          <div style={{ flex: 1, padding: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid currentColor',
                color: getSessionTypeColor(session.sessionType),
                borderRadius: 4,
                marginBottom: 12
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {getSessionTypeIcon(session.sessionType)}
                  {getSessionTypeLabel(session.sessionType)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 12, background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-base)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  {t('focusSession.sessionName')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, wordBreak: 'break-word', lineHeight: 1.4 }}>
                  {session.title || t('focusSession.defaultSessionName')}
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-base)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  {t('focusSession.startTime')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                  {formatDateTime(session.startTime)}
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-base)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  {t('focusSession.plannedDuration')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                  {session.plannedDurationMinutes} {t('focusSession.minutes')}
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-base)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  {t('focusSession.status')}
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: timeRemaining > 0 ? (isRunning ? 'var(--success-primary)' : 'var(--warning-primary)') : 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  {timeRemaining > 0 ? (
                    isRunning ? <><PlayCircle size={14} /> {t('focusSession.statusRunning')}</> : <><Info size={14} /> {t('focusSession.statusPaused')}</>
                  ) : (
                    <><CheckCircle size={14} /> {t('focusSession.statusCompleted')}</>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Complete Session Dialog */}
      {showCompleteDialog && (
        <CompleteSessionDialog
          isOpen={showCompleteDialog}
          onConfirm={handleCompleteSession}
          onCancel={handleCancelComplete}
          loading={loading}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {!isFocusMode && <Footer />}
    </div>
  )
}

export default FocusSessionPage