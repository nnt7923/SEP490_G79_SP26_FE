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
const REQUEST_TIMEOUT = 120000 // 2m timeout

// ==== State ====
let lessonHub: signalR.HubConnection | null = null
let chapterHub: signalR.HubConnection | null = null
let taskHub: signalR.HubConnection | null = null
let quizHub: signalR.HubConnection | null = null
let summaryHub: signalR.HubConnection | null = null

// single-flight guards (avoid duplicate invokes for the same id)
const inflightLesson = new Map<string, Promise<any>>()
const inflightChapter = new Map<string, Promise<any>>()
const inflightTask = new Map<string, Promise<any>>()
const inflightQuiz = new Map<string, Promise<any>>()
const inflightSummary = new Map<string, Promise<any>>()

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
  if (conn.state === signalR.HubConnectionState.Connecting || conn.state === signalR.HubConnectionState.Reconnecting) {
    // Wait up to 10 seconds for connection to be established
    const maxWait = 10000
    const startTime = Date.now()
    while (conn.state !== signalR.HubConnectionState.Connected && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (conn.state !== signalR.HubConnectionState.Connected) {
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

// ==== Request lesson content (pure SignalR, per spec) ====
export async function requestLessonContent(lessonId: string, onLoading?: () => void): Promise<any> {
  if (!isGuid(lessonId)) {
    return Promise.reject(new Error('lessonId phải là GUID hợp lệ'))
  }
  // single-flight: return running promise for same lessonId
  if (inflightLesson.has(lessonId)) {
    return inflightLesson.get(lessonId)!
  }

  const hub = await getLessonHub()

  const p = new Promise<any>((resolve, reject) => {
    let done = false
    const cleanup = () => {
      hub.off('LessonContentLoading', handleLoading)
      hub.off('ReceiveLessonContent', handleContent)
      hub.off('LessonContentError', handleError)
      inflightLesson.delete(lessonId)
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
      reject(new Error(err?.message || 'Failed to load lesson content'))
    }

    // timeout safety
    const to = setTimeout(() => {
      if (done) return
      done = true
      cleanup()
      reject(new Error('Lesson content request timeout'))
    }, REQUEST_TIMEOUT)

    // ensure timeout cleared in all paths
    const clearTo = () => { try { clearTimeout(to) } catch { } }

    // rewrap to clear timeout then delegate
    const handleContentWrap = (c: any) => { clearTo(); handleContent(c) }
    const handleErrorWrap = (e: any) => { clearTo(); handleError(e) }

    hub.on('LessonContentLoading', handleLoading)
    hub.on('ReceiveLessonContent', handleContentWrap)
    hub.on('LessonContentError', handleErrorWrap)

    try {
      hub.invoke('RequestLessonContent', lessonId).catch(handleErrorWrap)
    } catch (e) {
      handleErrorWrap(e)
    }
  })

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

  const hub = await getChapterHub()

  const p = new Promise<any>((resolve, reject) => {
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

  const hub = await getTaskHub()

  const p = new Promise<any>((resolve, reject) => {
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

  let hub: signalR.HubConnection
  try {
    hub = await getQuizHub()
  } catch (error) {
    return Promise.reject(new Error('Failed to establish SignalR connection'))
  }

  const p = new Promise<any>((resolve, reject) => {
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
  } catch {
    // ignore
  }
}
