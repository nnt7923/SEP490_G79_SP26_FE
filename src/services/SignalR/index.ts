import * as signalR from '@microsoft/signalr'
import useAuthStore from '../../store/useAuthStore'

// ==== Hub URLs ====
const rawBase = (import.meta.env.VITE_API_BASE_URL as string)
  || (import.meta.env.VITE_BASE_URL as string)
  || (import.meta.env.PROD ? 'https://pplp.click/api' : '')
const trimmed = (rawBase || '').replace(/\/+$/, '')
const isDev = typeof window !== 'undefined' && import.meta.env.DEV
const HUB_BASE = isDev
  ? '' // same-origin in dev (rely on dev proxy)
  : trimmed
    ? (trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed)
    : ''

const LESSON_HUB_URL = `${HUB_BASE}/hubs/lesson`
const CHAPTER_HUB_URL = `${HUB_BASE}/hubs/chapter`
const TASK_HUB_URL = `${HUB_BASE}/hubs/task`
const QUIZ_HUB_URL = `${HUB_BASE}/hubs/quiz`
const SUMMARY_HUB_URL = `${HUB_BASE}/hubs/summary`
const LEARNING_PATH_HUB_URL = `${HUB_BASE}/hubs/learningpath`
const TUTOR_HUB_URL = `${HUB_BASE}/hubs/tutor-chat`
const REQUEST_TIMEOUT = 120000 // 2m timeout


// ==== State ====
let lessonHub: signalR.HubConnection | null = null
let chapterHub: signalR.HubConnection | null = null
let taskHub: signalR.HubConnection | null = null
let quizHub: signalR.HubConnection | null = null
let summaryHub: signalR.HubConnection | null = null
let learningPathHub: signalR.HubConnection | null = null
let tutorHub: signalR.HubConnection | null = null

// single-flight guards (avoid duplicate invokes for the same id)
const inflightLesson = new Map<string, Promise<any>>()
const inflightChapter = new Map<string, Promise<any>>()
const inflightTask = new Map<string, Promise<any>>()
const inflightQuiz = new Map<string, Promise<any>>()
const inflightSummary = new Map<string, Promise<any>>()
const inflightLearningPath = new Map<string, Promise<any>>()
const inflightChapterSkeleton = new Map<string, Promise<any>>()
const inflightQuizSkeleton = new Map<string, Promise<any>>()
const inflightLearningPathSuggestions = new Map<string, Promise<any>>()
const inflightTutorMessages = new Map<string, Promise<any>>()

// ==== Utils ====
function getToken(): string | undefined {
  try { return useAuthStore.getState().token ?? undefined } catch { return undefined }
}

function isGuid(value: any): value is string {
  return typeof value === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)
}

async function ensureStarted(conn: signalR.HubConnection, _name: string) {
  // If already connected, return immediately
  if (conn.state === signalR.HubConnectionState.Connected) {
    return
  }

  // If connecting or reconnecting, wait for it to complete
  const isConnectingOrReconnecting = conn.state === signalR.HubConnectionState.Connecting || conn.state === signalR.HubConnectionState.Reconnecting
  if (isConnectingOrReconnecting) {
    // Wait up to 10 seconds for connection to be established
    const maxWait = 10000
    const startTime = Date.now()
    while (Date.now() - startTime < maxWait) {
      const currentState = conn.state
      if (currentState === signalR.HubConnectionState.Connected) {
        return
      }
      if (currentState === signalR.HubConnectionState.Disconnected) {
        break
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if ((conn.state as signalR.HubConnectionState) !== signalR.HubConnectionState.Connected) {
      throw new Error(`Connection timeout: ${_name} hub failed to connect`)
    }
    return
  }

  // If disconnected, start the connection
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    await conn.start()
  }
}

function buildConnection(url: string): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(url, {
      accessTokenFactory: () => getToken() || '',
      withCredentials: true,
    } as signalR.IHttpConnectionOptions)
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (ctx) => ctx.previousRetryCount === 0 ? 0 : Math.min(1000 << ctx.previousRetryCount, 30000),
    })
    .configureLogging(signalR.LogLevel.None)
    .build()
}

export async function getLessonHub(): Promise<signalR.HubConnection> {
  if (!lessonHub) {
    lessonHub = buildConnection(LESSON_HUB_URL)
  }
  await ensureStarted(lessonHub, 'lesson')
  return lessonHub
}

export async function getChapterHub(): Promise<signalR.HubConnection> {
  if (!chapterHub) {
    chapterHub = buildConnection(CHAPTER_HUB_URL)
  }
  await ensureStarted(chapterHub, 'chapter')
  return chapterHub
}

export async function getTaskHub(): Promise<signalR.HubConnection> {
  if (!taskHub) {
    taskHub = buildConnection(TASK_HUB_URL)
  }
  await ensureStarted(taskHub, 'task')
  return taskHub
}

export async function getQuizHub(): Promise<signalR.HubConnection> {
  if (!quizHub) {
    quizHub = buildConnection(QUIZ_HUB_URL)
  }
  await ensureStarted(quizHub, 'quiz')
  return quizHub
}

export async function getSummaryHub(): Promise<signalR.HubConnection> {
  if (!summaryHub) {
    summaryHub = buildConnection(SUMMARY_HUB_URL)
  }
  await ensureStarted(summaryHub, 'summary')
  return summaryHub
}

export async function getLearningPathHub(): Promise<signalR.HubConnection> {
  if (!learningPathHub) {
    learningPathHub = buildConnection(LEARNING_PATH_HUB_URL)
  }
  await ensureStarted(learningPathHub, 'learningpath')
  return learningPathHub
}

export async function getTutorHub(): Promise<signalR.HubConnection> {
  if (!tutorHub) {
    tutorHub = buildConnection(TUTOR_HUB_URL)
  }
  await ensureStarted(tutorHub, 'tutor')
  return tutorHub
}

// ==== Request lesson content (pure SignalR, per spec) ====
export async function requestLessonContent(
  lessonId: string,
  onLoading?: () => void,
  onQuizEvent?: {
    onLoading?: () => void
    onSuccess?: (quizSkeleton: any) => void
    onError?: (err: any) => void
  }
): Promise<any> {
  if (!isGuid(lessonId)) {
    return Promise.reject(new Error('lessonId phải là GUID hợp lệ'))
  }
  // single-flight: return running promise for same lessonId
  if (inflightLesson.has(lessonId)) {
    return inflightLesson.get(lessonId)!
  }

  // Wrap in async IIFE so inflightLesson is set BEFORE awaiting hub connection.
  // This prevents duplicate invocations (e.g. React StrictMode double-mount).
  const p = (async () => {
    const hub = await getLessonHub()

    return new Promise<any>((resolve, reject) => {
      let done = false
      let isResolved = false
      let lessonContent: any = null
      let quizSkeleton: any = null

      const cleanup = () => {
        hub.off('LessonContentLoading', handleLoading)
        hub.off('ReceiveLessonContent', handleContent)
        hub.off('LessonContentError', handleError)
        hub.off('QuizSkeletonLoading', handleQuizLoading)
        hub.off('ReceiveQuizSkeleton', handleQuizSkeleton)
        hub.off('QuizSkeletonError', handleQuizError)
        hub.off('LessonGenerationCompleted', handleCompleted)
        inflightLesson.delete(lessonId)
      }

      const resolveEarly = () => {
        if (!isResolved && lessonContent) {
          isResolved = true
          resolve({
            ...lessonContent,
            quizSkeleton: quizSkeleton === false ? null : quizSkeleton
          })
        }
      }

      const handleLoading = () => {
        onLoading?.()
      }

      const handleContent = (content: any) => {
        if (content?.LessonId === lessonId || content?.lessonId === lessonId) {
          lessonContent = content
          resolveEarly()
        }
      }

      const handleQuizLoading = (data: any) => {
        // Quiz skeleton loading started
        if (data?.LessonId === lessonId || data?.lessonId === lessonId) {
          onQuizEvent?.onLoading?.()
        }
      }

      const handleQuizSkeleton = (quizData: any) => {
        if (quizData?.LessonId === lessonId || quizData?.lessonId === lessonId) {
          quizSkeleton = quizData
          onQuizEvent?.onSuccess?.(quizData)
        }
      }

      const handleQuizError = (err: any) => {
        if (err?.LessonId === lessonId || err?.lessonId === lessonId) {
          quizSkeleton = false // Mark as failed but don't fail the whole request
          onQuizEvent?.onError?.(err)
        }
      }

      const handleCompleted = (result: any) => {
        if (result?.LessonId === lessonId || result?.lessonId === lessonId) {
          if (!isResolved) {
            isResolved = true
            resolve({
              lessonId,
              content: lessonContent?.content || result?.content,
              quizSkeleton: quizSkeleton === false ? null : (quizSkeleton || result?.quizSkeleton),
              ...result
            })
          }
          if (!done) {
            done = true
            cleanup()
            clearTo()
          }
        }
      }

      const handleError = (err: any) => {
        if (done) return
        done = true
        cleanup()
        clearTo()
        if (!isResolved) {
          isResolved = true
          reject(new Error(err?.message || 'Failed to load lesson content'))
        }
      }

      // timeout safety
      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        if (!isResolved) {
          isResolved = true
          reject(new Error('Lesson content request timeout'))
        }
      }, REQUEST_TIMEOUT)

      const clearTo = () => { try { clearTimeout(to) } catch { } }

      // rewrap to clear timeout on completion/error ONLY
      const handleCompletedWrap = (r: any) => { handleCompleted(r) }
      const handleErrorWrap = (e: any) => { handleError(e) }

      hub.on('LessonContentLoading', handleLoading)
      hub.on('ReceiveLessonContent', handleContent)
      hub.on('LessonContentError', handleErrorWrap)
      hub.on('QuizSkeletonLoading', handleQuizLoading)
      hub.on('ReceiveQuizSkeleton', handleQuizSkeleton)
      hub.on('QuizSkeletonError', handleQuizError)
      hub.on('LessonGenerationCompleted', handleCompletedWrap)

      try {
        hub.invoke('RequestLessonContent', lessonId).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightLesson.set(lessonId, p)
  return p
}

// ==== Request chapter content (pure SignalR) ====
export async function requestChapterContent(chapterId: string, onLoading?: () => void): Promise<any> {
  if (!isGuid(chapterId)) {
    return Promise.reject(new Error('chapterId phải là GUID hợp lệ'))
  }
  if (inflightChapter.has(chapterId)) {
    return inflightChapter.get(chapterId)!
  }

  const p = (async () => {
    const hub = await getChapterHub()

    return new Promise<any>((resolve, reject) => {
      let done = false
      const cleanup = () => {
        hub.off('ChapterContentLoading', handleLoading)
        hub.off('ReceiveChapterContent', handleContent)
        hub.off('ChapterContentError', handleError)
        inflightChapter.delete(chapterId)
      }

      const handleLoading = () => {
        onLoading?.()
      }

      const handleContent = (content: any) => {
        if (done) return
        done = true
        cleanup()
        resolve(content)
      }

      const handleError = (err: any) => {
        if (done) return
        done = true
        cleanup()
        reject(new Error(err?.message || 'Failed to load chapter content'))
      }

      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Chapter content request timeout'))
      }, REQUEST_TIMEOUT)
      const clearTo = () => { try { clearTimeout(to) } catch { } }
      const handleContentWrap = (c: any) => { clearTo(); handleContent(c) }
      const handleErrorWrap = (e: any) => { clearTo(); handleError(e) }

      hub.on('ChapterContentLoading', handleLoading)
      hub.on('ReceiveChapterContent', handleContentWrap)
      hub.on('ChapterContentError', handleErrorWrap)

      try {
        hub.invoke('RequestChapterContent', chapterId).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightChapter.set(chapterId, p)
  return p
}

// ==== Request chapter tasks (pure SignalR) ====
export async function requestChapterTasks(chapterId: string, onLoading?: () => void): Promise<any> {
  if (!isGuid(chapterId)) {
    return Promise.reject(new Error('chapterId phải là GUID hợp lệ'))
  }
  if (inflightTask.has(chapterId)) {
    return inflightTask.get(chapterId)!
  }

  const p = (async () => {
    const hub = await getTaskHub()

    return new Promise<any>((resolve, reject) => {
      let done = false
      const cleanup = () => {
        hub.off('ChapterTasksLoading', handleLoading)
        hub.off('ReceiveChapterTasks', handleContent)
        hub.off('ChapterTasksError', handleError)
        inflightTask.delete(chapterId)
      }

      const handleLoading = () => {
        onLoading?.()
      }

      const handleContent = (tasks: any) => {
        if (done) return
        done = true
        cleanup()
        resolve(tasks)
      }

      const handleError = (err: any) => {
        if (done) return
        done = true
        cleanup()
        reject(new Error(err?.message || 'Failed to load chapter tasks'))
      }

      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Chapter tasks request timeout'))
      }, REQUEST_TIMEOUT)
      const clearTo = () => { try { clearTimeout(to) } catch { } }
      const handleContentWrap = (c: any) => { clearTo(); handleContent(c) }
      const handleErrorWrap = (e: any) => { clearTo(); handleError(e) }

      hub.on('ChapterTasksLoading', handleLoading)
      hub.on('ReceiveChapterTasks', handleContentWrap)
      hub.on('ChapterTasksError', handleErrorWrap)

      try {
        hub.invoke('RequestChapterTasks', chapterId).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightTask.set(chapterId, p)
  return p
}

// ==== Request quiz questions (pure SignalR) ====
export async function requestQuizQuestions(quizId: string, onLoading?: () => void): Promise<any> {
  if (!quizId || typeof quizId !== 'string') {
    return Promise.reject(new Error('quizId is required and must be a string'))
  }

  if (!isGuid(quizId)) {
    return Promise.reject(new Error(`quizId phải là GUID hợp lệ. Received: ${quizId}`))
  }

  // single-flight: return running promise for same quizId
  if (inflightQuiz.has(quizId)) {
    return inflightQuiz.get(quizId)!
  }

  // Wrap in async IIFE so inflightQuiz is set BEFORE awaiting hub connection.
  // This prevents duplicate invocations (e.g. React StrictMode double-mount).
  const p = (async () => {
    const hub = await getQuizHub()

    return new Promise<any>((resolve, reject) => {
      let done = false
      const cleanup = () => {
        hub.off('QuizQuestionsLoading', handleLoading)
        hub.off('ReceiveQuizQuestions', handleQuestions)
        hub.off('QuizQuestionsError', handleError)
        inflightQuiz.delete(quizId)
      }

      const handleLoading = () => {
        onLoading?.()
      }

      const handleQuestions = (questions: any) => {
        if (done) return
        done = true
        cleanup()
        resolve(questions)
      }

      const handleError = (err: any) => {
        if (done) return
        done = true
        cleanup()
        reject(new Error(err?.message || 'Failed to load quiz questions'))
      }

      // timeout safety
      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Quiz questions request timeout'))
      }, REQUEST_TIMEOUT)

      // ensure timeout cleared in all paths
      const clearTo = () => { try { clearTimeout(to) } catch { } }

      // rewrap to clear timeout then delegate
      const handleQuestionsWrap = (q: any) => { clearTo(); handleQuestions(q) }
      const handleErrorWrap = (e: any) => { clearTo(); handleError(e) }

      hub.on('QuizQuestionsLoading', handleLoading)
      hub.on('ReceiveQuizQuestions', handleQuestionsWrap)
      hub.on('QuizQuestionsError', handleErrorWrap)

      try {
        hub.invoke('RequestQuizQuestions', quizId).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightQuiz.set(quizId, p)
  return p
}

// ==== Request resource summary (pure SignalR) ====
export async function requestResourceSummary(
  resourceId: string,
  startPage: number,
  endPage: number,
  onLoading?: () => void
): Promise<any> {
  if (!isGuid(resourceId)) {
    return Promise.reject(new Error('resourceId phải là GUID hợp lệ'))
  }
  if (startPage < 1 || endPage < 1) {
    return Promise.reject(new Error('Số trang phải lớn hơn 0'))
  }
  if (startPage > endPage) {
    return Promise.reject(new Error('Trang bắt đầu phải nhỏ hơn hoặc bằng trang kết thúc'))
  }

  // single-flight: return running promise for same resourceId:startPage-endPage
  const key = `${resourceId}:${startPage}-${endPage}`
  if (inflightSummary.has(key)) {
    return inflightSummary.get(key)!
  }

  // Create and store the promise immediately to prevent race conditions
  const p = (async () => {
    const hub = await getSummaryHub()

    return new Promise<any>((resolve, reject) => {
      let done = false
      const cleanup = () => {
        hub.off('SummaryLoading', handleLoading)
        hub.off('ReceiveSummary', handleSummary)
        hub.off('SummaryError', handleError)
        inflightSummary.delete(key)
      }

      const handleLoading = () => {
        onLoading?.()
      }

      const handleSummary = (summary: any) => {
        if (done) return
        done = true
        cleanup()
        resolve(summary)
      }

      const handleError = (err: any) => {
        if (done) return
        done = true
        cleanup()
        reject(new Error(err?.errorMessage || 'Failed to generate summary'))
      }

      // timeout safety
      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Summary request timeout'))
      }, REQUEST_TIMEOUT)

      // ensure timeout cleared in all paths
      const clearTo = () => { try { clearTimeout(to) } catch { } }

      // rewrap to clear timeout then delegate
      const handleSummaryWrap = (s: any) => { clearTo(); handleSummary(s) }
      const handleErrorWrap = (e: any) => { clearTo(); handleError(e) }

      hub.on('SummaryLoading', handleLoading)
      hub.on('ReceiveSummary', handleSummaryWrap)
      hub.on('SummaryError', handleErrorWrap)

      try {
        hub.invoke('RequestResourceSummary', resourceId, startPage, endPage).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightSummary.set(key, p)
  return p
}

export async function disconnectSummaryHub(): Promise<void> {
  try {
    if (summaryHub && summaryHub.state !== signalR.HubConnectionState.Disconnected) {
      await summaryHub.stop()
    }
    inflightSummary.clear()
  } catch {
    // ignore
  }
}

// ==== Types for better TypeScript support ====
export interface ChapterSkeletonResult {
  chapterId: string
  title: string
  orderIndex: number
  lessonCount?: number
  quizCount?: number
}

export interface LearningPathCreated {
  pathId: string
  title: string
  description: string
  chapterCount: number
  chapterDtos: Array<{
    chapterId: string
    title: string
    orderIndex: number
  }>
}

export interface LearningPathError {
  errorCode: 'INVALID_COMPLEXITY' | 'INVALID_LANGUAGE' | 'LEARNING_PATH_NOT_FOUND' | 'UNAUTHORIZED' | 'GENERATION_FAILED' | 'UNEXPECTED_ERROR'
  errorMessage: string
}

// ==== Request learning path generation (pure SignalR) ====
export async function requestLearningPathGeneration(
  payload: {
    subjectId: string
    goals: Array<{ goalId: string; weight: number }>
    complexityLevel: string
    languageSelection: number
  },
  onLoading?: () => void,
  onProgress?: (progress: number) => void
): Promise<any> {
  if (!payload.subjectId || !payload.goals || !Array.isArray(payload.goals) || payload.goals.length === 0 || !payload.complexityLevel || payload.languageSelection === undefined) {
    return Promise.reject(new Error('Missing required parameters for learning path generation'))
  }

  // Convert languageSelection number to string for backend
  const languageSelectionString = payload.languageSelection === 1 ? 'VietNamese' : 'English'

  // single-flight: return running promise for same payload
  const key = `${payload.subjectId}-${JSON.stringify(payload.goals)}-${payload.complexityLevel}-${payload.languageSelection}`
  if (inflightLearningPath.has(key)) {
    return inflightLearningPath.get(key)!
  }

  // Create and store the promise immediately to prevent race conditions
  const p = (async () => {
    const hub = await getLearningPathHub()

    return new Promise<any>((resolve, reject) => {
      let done = false
      const cleanup = () => {
        hub.off('LearningPathGenerationStarted', handleLoading)
        hub.off('LearningPathCreated', handleLearningPath)
        hub.off('LearningPathGenerationCompleted', handleCompleted)
        hub.off('LearningPathGenerationError', handleError)
        inflightLearningPath.delete(key)
      }

      const handleLoading = () => {
        onLoading?.()
        onProgress?.(10) // Initial progress
      }

      const handleLearningPath = (learningPath: any) => {
        onProgress?.(80) // Progress when learning path is created

        // LearningPathCreated should have the complete data
        if (learningPath && (learningPath.pathId || learningPath.chapterDtos || learningPath.title)) {
          if (done) return
          done = true
          cleanup()
          onProgress?.(100)
          resolve(learningPath)
        }
      }

      const handleCompleted = (result: any) => {
        if (done) return
        done = true
        cleanup()
        onProgress?.(100) // Complete
        resolve(result)
      }

      const handleError = (err: any) => {
        if (done) return
        done = true
        cleanup()
        reject(new Error(err?.errorMessage || err?.message || 'Failed to generate learning path'))
      }

      // timeout safety
      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Learning path generation timeout'))
      }, REQUEST_TIMEOUT)

      // ensure timeout cleared in all paths
      const clearTo = () => { try { clearTimeout(to) } catch { } }

      // rewrap to clear timeout then delegate
      const handleCompletedWrap = (result: any) => { clearTo(); handleCompleted(result) }
      const handleErrorWrap = (e: any) => { clearTo(); handleError(e) }

      hub.on('LearningPathGenerationStarted', handleLoading)
      hub.on('LearningPathCreated', handleLearningPath)
      hub.on('LearningPathGenerationCompleted', handleCompletedWrap)
      hub.on('LearningPathGenerationError', handleErrorWrap)

      try {
        // Backend expects subjectId, goals array, complexityLevel, languageSelection
        hub.invoke('RequestLearningPathGeneration',
          payload.subjectId,
          payload.goals,
          payload.complexityLevel,
          languageSelectionString
        ).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightLearningPath.set(key, p)
  return p
}

// ==== Request learning path suggestions (pure SignalR) ====
export async function requestLearningPathSuggestions(
  payload: {
    subjectId: string
    goals: Array<{ goalId: string; weight: number }>
    complexityLevel: string
    languageSelection: number
  },
  onLoading?: () => void,
  onSuggestionsLoaded?: (suggestions: any[]) => void
): Promise<any> {
  if (!payload.subjectId || !payload.goals || !Array.isArray(payload.goals) || payload.goals.length === 0 || !payload.complexityLevel || payload.languageSelection === undefined) {
    return Promise.reject(new Error('Missing required parameters for learning path suggestions'))
  }

  // Convert languageSelection number to string for backend
  const languageSelectionString = payload.languageSelection === 1 ? 'VietNamese' : 'English'

  // single-flight: return running promise for same payload
  const key = `suggestions-${payload.subjectId}-${JSON.stringify(payload.goals)}-${payload.complexityLevel}-${payload.languageSelection}`
  if (inflightLearningPathSuggestions.has(key)) {
    return inflightLearningPathSuggestions.get(key)!
  }

  // Create and store the promise immediately to prevent race conditions
  const p = (async () => {
    const hub = await getLearningPathHub()

    return new Promise<any>((resolve, reject) => {
      let done = false
      const cleanup = () => {
        hub.off('LearningPathSuggestionsStarted', handleLoading)
        hub.off('LearningPathSuggestionsLoaded', handleSuggestions)
        hub.off('LearningPathSuggestionsError', handleError)
        inflightLearningPathSuggestions.delete(key)
      }

      const handleLoading = () => {
        onLoading?.()
      }

      const handleSuggestions = (data: any) => {
        if (data && data.suggestions) {
          onSuggestionsLoaded?.(data.suggestions)
          
          if (done) return
          done = true
          cleanup()
          resolve(data)
        }
      }

      const handleError = (err: any) => {
        if (done) return
        done = true
        cleanup()
        
        // Handle specific error codes
        const errorCode = err?.errorCode
        let errorMessage = err?.errorMessage || err?.message || 'Failed to get learning path suggestions'
        
        switch (errorCode) {
          case 'INVALID_COMPLEXITY':
            errorMessage = 'Invalid complexity level provided'
            break
          case 'INVALID_LANGUAGE':
            errorMessage = 'Invalid language selection'
            break
          case 'SUBJECT_NOT_FOUND':
            errorMessage = 'Subject not found'
            break
          case 'GOALS_REQUIRED':
            errorMessage = 'Goals are required'
            break
          case 'GOALS_LIMIT_EXCEEDED':
            errorMessage = 'Too many goals selected'
            break
          case 'DUPLICATE_GOALS':
            errorMessage = 'Duplicate goals detected'
            break
          case 'GOAL_NOT_FOUND':
            errorMessage = 'One or more goals not found'
            break
          case 'GOAL_SUBJECT_MISMATCH':
            errorMessage = 'Goals do not match the selected subject'
            break
          case 'UNEXPECTED_ERROR':
          default:
            errorMessage = errorMessage || 'An unexpected error occurred'
            break
        }
        
        reject(new Error(errorMessage))
      }

      // timeout safety
      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Learning path suggestions request timeout'))
      }, REQUEST_TIMEOUT)

      // ensure timeout cleared in all paths
      const clearTo = () => { try { clearTimeout(to) } catch { } }

      // rewrap to clear timeout then delegate
      const handleSuggestionsWrap = (data: any) => { clearTo(); handleSuggestions(data) }
      const handleErrorWrap = (e: any) => { clearTo(); handleError(e) }

      hub.on('LearningPathSuggestionsStarted', handleLoading)
      hub.on('LearningPathSuggestionsLoaded', handleSuggestionsWrap)
      hub.on('LearningPathSuggestionsError', handleErrorWrap)

      try {
        // Backend expects subjectId, goals array, complexityLevel, languageSelection
        hub.invoke('RequestLearningPathSuggestions',
          payload.subjectId,
          payload.goals,
          payload.complexityLevel,
          languageSelectionString
        ).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightLearningPathSuggestions.set(key, p)
  return p
}

// ==== Send tutor message (pure SignalR) ====
export async function sendTutorMessage(
  conversationId: string | null,
  learningPathId: string | null,
  chapterId: string | null,
  lessonId: string | null,
  message: string,
  onMessageStarted?: () => void,
  onMessageReceived?: (data: any) => void
): Promise<any> {
  if (!message || message.trim().length === 0) {
    return Promise.reject(new Error('Message cannot be empty'))
  }

  // single-flight: return running promise for same message
  const key = `tutor-${conversationId || 'new'}-${Date.now()}`
  if (inflightTutorMessages.has(key)) {
    return inflightTutorMessages.get(key)!
  }

  // Create and store the promise immediately to prevent race conditions
  const p = (async () => {
    const hub = await getTutorHub()

    return new Promise<any>((resolve, reject) => {
      let done = false
      const cleanup = () => {
        hub.off('TutorMessageStarted', handleStarted)
        hub.off('TutorMessageReceived', handleReceived)
        hub.off('TutorMessageError', handleError)
        inflightTutorMessages.delete(key)
      }

      const handleStarted = () => {
        onMessageStarted?.()
      }

      const handleReceived = (data: any) => {
        if (data) {
          onMessageReceived?.(data)
          
          if (done) return
          done = true
          cleanup()
          resolve(data)
        }
      }

      const handleError = (err: any) => {
        if (done) return
        done = true
        cleanup()
        
        // Handle specific error codes
        const errorCode = err?.errorCode
        let errorMessage = err?.errorMessage || err?.message || 'Failed to send tutor message'
        
        switch (errorCode) {
          case 'UNAUTHORIZED':
            errorMessage = 'You are not authorized to use the tutor'
            break
          case 'EMPTY_MESSAGE':
            errorMessage = 'Message cannot be empty'
            break
          case 'AI_CONFIG_NOT_FOUND':
            errorMessage = 'AI configuration not found'
            break
          case 'CONVERSATION_NOT_FOUND':
            errorMessage = 'Conversation not found'
            break
          case 'LEARNING_PATH_NOT_FOUND':
            errorMessage = 'Learning path not found'
            break
          case 'CHAPTER_NOT_FOUND':
            errorMessage = 'Chapter not found'
            break
          case 'LESSON_NOT_FOUND':
            errorMessage = 'Lesson not found'
            break
          case 'ACCESS_DENIED':
            errorMessage = 'Access denied to this resource'
            break
          case 'AI_RESPONSE_FAILED':
            errorMessage = 'AI failed to generate response'
            break
          case 'UNEXPECTED_ERROR':
          default:
            errorMessage = errorMessage || 'An unexpected error occurred'
            break
        }
        
        reject(new Error(errorMessage))
      }

      // timeout safety
      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Tutor message request timeout'))
      }, REQUEST_TIMEOUT)

      // ensure timeout cleared in all paths
      const clearTo = () => { try { clearTimeout(to) } catch { } }

      // rewrap to clear timeout then delegate
      const handleReceivedWrap = (data: any) => { clearTo(); handleReceived(data) }
      const handleErrorWrap = (e: any) => { clearTo(); handleError(e) }

      hub.on('TutorMessageStarted', handleStarted)
      hub.on('TutorMessageReceived', handleReceivedWrap)
      hub.on('TutorMessageError', handleErrorWrap)

      try {
        // Backend expects conversationId, learningPathId, chapterId, lessonId, message
        hub.invoke('SendTutorMessage',
          conversationId,
          learningPathId,
          chapterId,
          lessonId,
          message.trim()
        ).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightTutorMessages.set(key, p)
  return p
}

// ==== Request chapter skeleton generation (pure SignalR) ====
export async function requestChapterSkeleton(
  pathId: string,
  orderIndex: number,
  onLoading?: () => void
): Promise<any> {
  if (!pathId || typeof orderIndex !== 'number') {
    return Promise.reject(new Error('pathId and orderIndex are required for chapter skeleton generation'))
  }

  // single-flight: return running promise for same pathId-orderIndex
  const key = `${pathId}-${orderIndex}`
  if (inflightChapterSkeleton.has(key)) {
    return inflightChapterSkeleton.get(key)!
  }

  // Create and store the promise immediately to prevent race conditions
  const p = (async () => {
    const hub = await getChapterHub()

    return new Promise<any>((resolve, reject) => {
      let done = false
      const cleanup = () => {
        hub.off('ChapterSkeletonGenerationStarted', handleLoading)
        hub.off('ChapterSkeletonGenerated', handleChapterSkeleton)
        hub.off('ChapterSkeletonError', handleError)
        inflightChapterSkeleton.delete(key)
      }

      const handleLoading = (data: any) => {
        // Check if this event is for our request
        if (data?.pathId === pathId && data?.orderIndex === orderIndex) {
          onLoading?.()
        }
      }

      const handleChapterSkeleton = (chapterSkeleton: any) => {
        // Check if this event is for our request - be more flexible with matching
        if (chapterSkeleton?.orderIndex === orderIndex ||
          (chapterSkeleton?.pathId === pathId && chapterSkeleton?.orderIndex === orderIndex)) {
          if (done) return
          done = true
          cleanup()
          resolve(chapterSkeleton)
        }
      }

      const handleError = (err: any) => {
        // Check if this error is for our request
        if (err?.pathId === pathId && err?.orderIndex === orderIndex) {
          if (done) return
          done = true
          cleanup()
          reject(new Error(err?.errorMessage || err?.message || 'Failed to generate chapter skeleton'))
        }
      }

      // timeout safety
      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Chapter skeleton generation timeout'))
      }, REQUEST_TIMEOUT)

      // ensure timeout cleared in all paths
      const clearTo = () => { try { clearTimeout(to) } catch { } }

      // rewrap to clear timeout then delegate
      const handleChapterSkeletonWrap = (cs: any) => { clearTo(); handleChapterSkeleton(cs) }
      const handleErrorWrap = (e: any) => { clearTo(); handleError(e) }

      hub.on('ChapterSkeletonGenerationStarted', handleLoading)
      hub.on('ChapterSkeletonGenerated', handleChapterSkeletonWrap)
      hub.on('ChapterSkeletonError', handleErrorWrap)

      try {
        hub.invoke('RequestChapterSkeleton', pathId, orderIndex).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightChapterSkeleton.set(key, p)
  return p
}

export async function disconnectHubs(): Promise<void> {
  try {
    if (lessonHub && lessonHub.state !== signalR.HubConnectionState.Disconnected) {
      await lessonHub.stop()
    }
    if (chapterHub && chapterHub.state !== signalR.HubConnectionState.Disconnected) {
      await chapterHub.stop()
    }
    if (taskHub && taskHub.state !== signalR.HubConnectionState.Disconnected) {
      await taskHub.stop()
    }
    if (quizHub && quizHub.state !== signalR.HubConnectionState.Disconnected) {
      await quizHub.stop()
    }
    if (summaryHub && summaryHub.state !== signalR.HubConnectionState.Disconnected) {
      await summaryHub.stop()
    }
    if (learningPathHub && learningPathHub.state !== signalR.HubConnectionState.Disconnected) {
      await learningPathHub.stop()
    }
    if (tutorHub && tutorHub.state !== signalR.HubConnectionState.Disconnected) {
      await tutorHub.stop()
    }

    // Clear all inflight requests
    inflightLesson.clear()
    inflightChapter.clear()
    inflightTask.clear()
    inflightQuiz.clear()
    inflightSummary.clear()
    inflightLearningPath.clear()
    inflightChapterSkeleton.clear()
    inflightQuizSkeleton.clear()
    inflightLearningPathSuggestions.clear()
    inflightTutorMessages.clear()
  } catch {
    // ignore
  }
}
