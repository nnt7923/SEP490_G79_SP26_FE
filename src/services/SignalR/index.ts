import * as signalR from '@microsoft/signalr'
import useAuthStore from '../../store/useAuthStore'
import type { NotificationDto } from '../../types/notification'

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
const NOTIFICATION_HUB_URL = `${HUB_BASE}/hubs/notification`
const REQUEST_TIMEOUT = 300000 // 5m timeout
const SIGNALR_DEBUG_STORAGE_KEY = 'signalr:debug'
const SIGNALR_DEBUG_QUERY_KEY = 'debugSignalR'


// ==== State ====
let lessonHub: signalR.HubConnection | null = null
let chapterHub: signalR.HubConnection | null = null
let taskHub: signalR.HubConnection | null = null
let quizHub: signalR.HubConnection | null = null
let summaryHub: signalR.HubConnection | null = null
let learningPathHub: signalR.HubConnection | null = null
let tutorHub: signalR.HubConnection | null = null
let notificationHub: signalR.HubConnection | null = null
let notificationHubBound = false
let lastWalletBalanceUpdateAtMs = 0

const notificationReceiveListeners = new Set<(payload: NotificationDto | unknown) => void>()
const notificationUnreadCountListeners = new Set<(payload: unknown) => void>()

// single-flight guards (avoid duplicate invokes for the same id)
const inflightLesson = new Map<string, Promise<any>>()
const inflightChapter = new Map<string, Promise<any>>()
const inflightTask = new Map<string, Promise<any>>()
const inflightQuiz = new Map<string, Promise<any>>()
const inflightSummary = new Map<string, Promise<any>>()
const inflightLearningPath = new Map<string, Promise<any>>()
const inflightChapterSkeleton = new Map<string, Promise<any>>()
const inflightChapterMentorSkeleton = new Map<string, Promise<any>>()
const inflightMentorLessonContent = new Map<string, Promise<any>>()
const inflightSingleTask = new Map<string, Promise<any>>()
const inflightSingleQuizSkeleton = new Map<string, Promise<any>>()
const inflightSingleQuizQuestion = new Map<string, Promise<any>>()
const inflightQuizSkeleton = new Map<string, Promise<any>>()
const inflightLearningPathSuggestions = new Map<string, Promise<any>>()
const inflightAdoptSuggestedPath = new Map<string, Promise<any>>()
const inflightTutorMessages = new Map<string, Promise<any>>()
const inflightTutorMessageHistory = new Map<string, Promise<any>>()
const inflightTutorSummaryHistory = new Map<string, Promise<any>>()
const inflightTutorConversationResolve = new Map<string, Promise<any>>()

// ==== Utils ====
function getToken(): string | undefined {
  try { return useAuthStore.getState().token ?? undefined } catch { return undefined }
}

function isGuid(value: any): value is string {
  return typeof value === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)
}

function getPayloadCorrelationId(payload: any, keys: string[]): string | null {
  if (!payload || typeof payload !== 'object') return null
  for (const key of keys) {
    const value = payload[key]
    if (value != null && value !== '') return String(value)
  }
  return null
}

function resolveHubErrorMessage(err: any, fallback: string): string {
  return err?.ErrorMessage
    || err?.errorMessage
    || err?.message
    || err?.Message
    || fallback
}

function readSignalRDebugFlagFromWindow(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const query = new URLSearchParams(window.location.search)
    const queryValue = query.get(SIGNALR_DEBUG_QUERY_KEY)
    if (queryValue != null) {
      return ['1', 'true', 'yes', 'on'].includes(queryValue.trim().toLowerCase())
    }
  } catch {
    // ignore
  }

  try {
    const storageValue = window.localStorage.getItem(SIGNALR_DEBUG_STORAGE_KEY)
    if (storageValue != null) {
      return ['1', 'true', 'yes', 'on'].includes(storageValue.trim().toLowerCase())
    }
  } catch {
    // ignore
  }

  return false
}

function isSignalRDebugEnabled(): boolean {
  const envValue = String((import.meta.env.VITE_SIGNALR_DEBUG as string | undefined) ?? '').trim().toLowerCase()
  const envEnabled = ['1', 'true', 'yes', 'on'].includes(envValue)
  return envEnabled || readSignalRDebugFlagFromWindow()
}

function debugSignalR(scope: string, message: string, payload?: unknown) {
  if (!isSignalRDebugEnabled()) return
  if (payload === undefined) {
    console.debug(`[SignalR:${scope}] ${message}`)
    return
  }
  console.debug(`[SignalR:${scope}] ${message}`, payload)
}

function parseWalletUpdateTimestamp(raw: unknown): number {
  const text = String(raw ?? '').trim()
  if (!text) return Date.now()
  const parsed = Date.parse(text)
  return Number.isFinite(parsed) ? parsed : Date.now()
}

function extractWalletBalance(payload: any): number | null {
  const candidates = [
    payload,
    payload?.data,
    payload?.result,
    payload?.value,
    payload?.payload,
  ]

  let numeric: number | null = null
  for (const item of candidates) {
    const next = Number(item?.tokenBalance ?? item?.TokenBalance ?? item?.BalanceVnd ?? item?.balanceVnd)
    if (Number.isFinite(next)) {
      numeric = next
      break
    }
  }

  if (numeric == null) return null
  if (!Number.isFinite(numeric)) return null
  return Math.max(0, Math.round(numeric))
}

function applyWalletBalanceUpdate(payload: any, source: string): void {
  const nextBalance = extractWalletBalance(payload)
  if (nextBalance == null) return

  const updatedAtMs = parseWalletUpdateTimestamp(payload?.UpdatedAtUtc ?? payload?.updatedAtUtc)
  if (updatedAtMs < lastWalletBalanceUpdateAtMs) {
    debugSignalR(source, 'skip stale WalletTokenBalanceUpdated payload', payload)
    return
  }
  lastWalletBalanceUpdateAtMs = updatedAtMs

  try {
    const authState = useAuthStore.getState()
    const currentUser = authState.user as any
    authState.setUser({
      ...(currentUser ?? {}),
      tokenBalance: nextBalance,
      BalanceVnd: nextBalance,
      balanceVnd: nextBalance,
    })
    debugSignalR(source, 'applied WalletTokenBalanceUpdated', {
      tokenBalance: nextBalance,
      updatedAtUtc: payload?.UpdatedAtUtc ?? payload?.updatedAtUtc,
    })
  } catch {
    // ignore store update errors
  }
}

function applyWalletBalanceUpdateFromInvokeResult(result: any, source: string): void {
  applyWalletBalanceUpdate(result, source)
}

export function setSignalRDebug(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SIGNALR_DEBUG_STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // ignore
  }
}

async function ensureStarted(conn: signalR.HubConnection, _name: string) {
  if (conn.state === signalR.HubConnectionState.Connected) {
    debugSignalR(_name, 'connection already started')
    return
  }

  // If connecting or reconnecting, wait for it to complete
  if (conn.state === signalR.HubConnectionState.Connecting || conn.state === signalR.HubConnectionState.Reconnecting) {
    // Wait up to 10 seconds for connection to be established
    const maxWait = 10000
    const startTime = Date.now()
    while (Date.now() - startTime < maxWait) {
      const currentState = conn.state
      if (currentState === signalR.HubConnectionState.Connected) {
        debugSignalR(_name, 'connection became connected while waiting')
        return
      }
      if (currentState === signalR.HubConnectionState.Disconnected) {
        break
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (conn.state !== signalR.HubConnectionState.Connected) {
      throw new Error(`Connection timeout: ${_name} hub failed to connect`)
    }
    return
  }

  // If disconnected, start the connection
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    debugSignalR(_name, 'starting connection')
    await conn.start()
    debugSignalR(_name, 'connection started')
  }
}

function buildConnection(url: string, name: string): signalR.HubConnection {
  const conn = new signalR.HubConnectionBuilder()
    .withUrl(url, {
      accessTokenFactory: () => {
        const token = getToken()
        return token || ''
      },
      withCredentials: true,
    } as signalR.IHttpConnectionOptions)
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (ctx) => ctx.previousRetryCount === 0 ? 0 : Math.min(1000 << ctx.previousRetryCount, 30000),
    })
    .configureLogging(isSignalRDebugEnabled() ? signalR.LogLevel.Information : signalR.LogLevel.None)
    .build()

  const originalInvoke = conn.invoke.bind(conn)
  conn.invoke = (async (...args: unknown[]) => {
    const result = await originalInvoke(...args)
    const methodName = String(args[0] ?? 'unknown')
    applyWalletBalanceUpdateFromInvokeResult(result, `${name}.invoke.${methodName}`)
    return result
  }) as typeof conn.invoke

  conn.onreconnecting((error) => {
    debugSignalR(name, 'connection reconnecting', { error: resolveHubErrorMessage(error, 'Unknown reconnect error') })
  })
  conn.onreconnected((connectionId) => {
    debugSignalR(name, 'connection reconnected', { connectionId })
  })
  conn.onclose((error) => {
    debugSignalR(name, 'connection closed', error ? { error: resolveHubErrorMessage(error, 'Unknown close error') } : undefined)
  })

  conn.on('WalletTokenBalanceUpdated', (payload: any) => {
    applyWalletBalanceUpdate(payload, name)
  })

  return conn
}

export async function getLessonHub(): Promise<signalR.HubConnection> {
  if (!lessonHub) {
    lessonHub = buildConnection(LESSON_HUB_URL, 'lesson')
  }
  await ensureStarted(lessonHub, 'lesson')
  return lessonHub
}

export async function getChapterHub(): Promise<signalR.HubConnection> {
  if (!chapterHub) {
    chapterHub = buildConnection(CHAPTER_HUB_URL, 'chapter')
  }
  await ensureStarted(chapterHub, 'chapter')
  return chapterHub
}

export async function getTaskHub(): Promise<signalR.HubConnection> {
  if (!taskHub) {
    taskHub = buildConnection(TASK_HUB_URL, 'task')
  }
  await ensureStarted(taskHub, 'task')
  return taskHub
}

export async function getQuizHub(): Promise<signalR.HubConnection> {
  if (!quizHub) {
    quizHub = buildConnection(QUIZ_HUB_URL, 'quiz')
  }
  await ensureStarted(quizHub, 'quiz')
  return quizHub
}

export async function getSummaryHub(): Promise<signalR.HubConnection> {
  if (!summaryHub) {
    summaryHub = buildConnection(SUMMARY_HUB_URL, 'summary')
  }
  await ensureStarted(summaryHub, 'summary')
  return summaryHub
}

export async function getLearningPathHub(): Promise<signalR.HubConnection> {
  if (!learningPathHub) {
    learningPathHub = buildConnection(LEARNING_PATH_HUB_URL, 'learningpath')
  }
  await ensureStarted(learningPathHub, 'learningpath')
  return learningPathHub
}

export async function getTutorHub(): Promise<signalR.HubConnection> {
  if (!tutorHub) {
    tutorHub = buildConnection(TUTOR_HUB_URL, 'tutor')
  }
  await ensureStarted(tutorHub, 'tutor')
  return tutorHub
}

function bindNotificationHubListeners(hub: signalR.HubConnection) {
  if (notificationHubBound) return

  hub.on('ReceiveNotification', (payload: NotificationDto | unknown) => {
    notificationReceiveListeners.forEach((listener) => listener(payload))
  })
  hub.on('NotificationUnreadCountChanged', (payload: unknown) => {
    notificationUnreadCountListeners.forEach((listener) => listener(payload))
  })

  notificationHubBound = true
}

export async function getNotificationHub(): Promise<signalR.HubConnection> {
  if (!notificationHub) {
    notificationHub = buildConnection(NOTIFICATION_HUB_URL, 'notification')
  }
  await ensureStarted(notificationHub, 'notification')
  bindNotificationHubListeners(notificationHub)
  return notificationHub
}

export async function subscribeToNotifications(handlers: {
  onReceiveNotification?: (payload: NotificationDto | unknown) => void
  onUnreadCountChanged?: (payload: unknown) => void
}): Promise<() => void> {
  if (handlers.onReceiveNotification) {
    notificationReceiveListeners.add(handlers.onReceiveNotification)
  }
  if (handlers.onUnreadCountChanged) {
    notificationUnreadCountListeners.add(handlers.onUnreadCountChanged)
  }

  await getNotificationHub()

  return () => {
    if (handlers.onReceiveNotification) {
      notificationReceiveListeners.delete(handlers.onReceiveNotification)
    }
    if (handlers.onUnreadCountChanged) {
      notificationUnreadCountListeners.delete(handlers.onUnreadCountChanged)
    }
  }
}

export async function disconnectNotificationHub(): Promise<void> {
  try {
    if (notificationHub && notificationHub.state !== signalR.HubConnectionState.Disconnected) {
      await notificationHub.stop()
    }
  } catch {
    // ignore
  } finally {
    notificationReceiveListeners.clear()
    notificationUnreadCountListeners.clear()
    notificationHub = null
    notificationHubBound = false
  }
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
  debugSignalR('lesson.request-content', 'request started', { lessonId })
  // single-flight: return running promise for same lessonId
  if (inflightLesson.has(lessonId)) {
    debugSignalR('lesson.request-content', 'reusing inflight request', { lessonId })
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
      let quizSkeletonError: any = null
      const isMatchingLessonPayload = (payload: any, requireId = false) => {
        const payloadLessonId = getPayloadCorrelationId(payload, ['LessonId', 'lessonId'])
        if (!payloadLessonId) return !requireId
        return payloadLessonId === lessonId
      }

      const cleanup = () => {
        debugSignalR('lesson.request-content', 'cleanup listeners', { lessonId })
        hub.off('LessonContentLoading', handleLoading)
        hub.off('ReceiveLessonContent', handleContent)
        hub.off('LessonContentError', handleError)
        hub.off('QuizSkeletonLoading', handleQuizLoading)
        hub.off('ReceiveQuizSkeleton', handleQuizSkeleton)
        hub.off('QuizSkeletonError', handleQuizError)
        hub.off('LessonGenerationCompleted', handleCompleted)
        inflightLesson.delete(lessonId)
      }

      const handleLoading = (data: any) => {
        if (!isMatchingLessonPayload(data, true)) return
        debugSignalR('lesson.request-content', 'LessonContentLoading', data)
        onLoading?.()
      }

      const handleContent = (content: any) => {
        if (!isMatchingLessonPayload(content)) return
        debugSignalR('lesson.request-content', 'ReceiveLessonContent', content)
        lessonContent = content
      }

      const handleQuizLoading = (data: any) => {
        // Quiz skeleton loading started
        if (!isMatchingLessonPayload(data, true)) return
        debugSignalR('lesson.request-content', 'QuizSkeletonLoading', data)
        onQuizEvent?.onLoading?.()
      }

      const handleQuizSkeleton = (quizData: any) => {
        if (!isMatchingLessonPayload(quizData, true)) return
        debugSignalR('lesson.request-content', 'ReceiveQuizSkeleton', quizData)
        quizSkeleton = quizData
        quizSkeletonError = null
        onQuizEvent?.onSuccess?.(quizData)
      }

      const handleQuizError = (err: any) => {
        if (!isMatchingLessonPayload(err, true)) return
        debugSignalR('lesson.request-content', 'QuizSkeletonError', err)
        quizSkeleton = false // Mark as failed but don't fail the whole request
        quizSkeletonError = err
        onQuizEvent?.onError?.(err)
      }

      const handleCompleted = (result: any) => {
        if (!isMatchingLessonPayload(result, true)) return
        debugSignalR('lesson.request-content', 'LessonGenerationCompleted', result)
        if (!isResolved) {
          isResolved = true
          resolve({
            lessonId,
            content: lessonContent?.content || result?.content,
            quizSkeleton: quizSkeleton === false ? null : (quizSkeleton || result?.quizSkeleton),
            quizSkeletonError,
            ...result
          })
        }
        if (!done) {
          done = true
          cleanup()
          clearTo()
        }
      }

      const handleError = (err: any) => {
        if (!isMatchingLessonPayload(err, true)) return
        debugSignalR('lesson.request-content', 'LessonContentError', err)
        if (done) return
        done = true
        cleanup()
        clearTo()
        if (!isResolved) {
          isResolved = true
          reject(new Error(resolveHubErrorMessage(err, 'Failed to load lesson content')))
        }
      }

      // timeout safety
      const to = setTimeout(() => {
        if (done) return
        debugSignalR('lesson.request-content', 'request timeout', { lessonId, timeoutMs: REQUEST_TIMEOUT })
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
        debugSignalR('lesson.request-content', 'invoking hub method', { method: 'RequestLessonContent', lessonId })
        hub.invoke('RequestLessonContent', lessonId).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightLesson.set(lessonId, p)
  return p
}

export async function requestLessonQuizSkeleton(
  lessonId: string,
  onLoading?: () => void,
): Promise<any> {
  if (!isGuid(lessonId)) {
    return Promise.reject(new Error('lessonId pháº£i lÃ  GUID há»£p lá»‡'))
  }

  debugSignalR('lesson.quiz-skeleton', 'request started', { lessonId })
  if (inflightQuizSkeleton.has(lessonId)) {
    debugSignalR('lesson.quiz-skeleton', 'reusing inflight request', { lessonId })
    return inflightQuizSkeleton.get(lessonId)!
  }

  const p = (async () => {
    const hub = await getLessonHub()

    return new Promise<any>((resolve, reject) => {
      let done = false
      const isMatchingLessonPayload = (payload: any, requireId = false) => {
        const payloadLessonId = getPayloadCorrelationId(payload, ['LessonId', 'lessonId'])
        if (!payloadLessonId) return !requireId
        return payloadLessonId === lessonId
      }

      const cleanup = () => {
        debugSignalR('lesson.quiz-skeleton', 'cleanup listeners', { lessonId })
        hub.off('QuizSkeletonLoading', handleLoading)
        hub.off('ReceiveQuizSkeleton', handleQuizSkeleton)
        hub.off('QuizSkeletonError', handleQuizError)
        inflightQuizSkeleton.delete(lessonId)
      }

      const handleLoading = (data: any) => {
        if (!isMatchingLessonPayload(data, true)) return
        debugSignalR('lesson.quiz-skeleton', 'QuizSkeletonLoading', data)
        onLoading?.()
      }

      const handleQuizSkeleton = (quizData: any) => {
        if (!isMatchingLessonPayload(quizData, true)) return
        debugSignalR('lesson.quiz-skeleton', 'ReceiveQuizSkeleton', quizData)
        if (done) return
        done = true
        cleanup()
        clearTo()
        resolve(quizData)
      }

      const handleQuizError = (err: any) => {
        if (!isMatchingLessonPayload(err, true)) return
        debugSignalR('lesson.quiz-skeleton', 'QuizSkeletonError', err)
        if (done) return
        done = true
        cleanup()
        clearTo()
        reject(new Error(resolveHubErrorMessage(err, 'Failed to load lesson quiz skeleton')))
      }

      const to = setTimeout(() => {
        if (done) return
        debugSignalR('lesson.quiz-skeleton', 'request timeout', { lessonId, timeoutMs: REQUEST_TIMEOUT })
        done = true
        cleanup()
        reject(new Error('Lesson quiz skeleton request timeout'))
      }, REQUEST_TIMEOUT)

      const clearTo = () => { try { clearTimeout(to) } catch { } }
      const handleQuizSkeletonWrap = (q: any) => { handleQuizSkeleton(q) }
      const handleQuizErrorWrap = (e: any) => { handleQuizError(e) }

      hub.on('QuizSkeletonLoading', handleLoading)
      hub.on('ReceiveQuizSkeleton', handleQuizSkeletonWrap)
      hub.on('QuizSkeletonError', handleQuizErrorWrap)

      try {
        debugSignalR('lesson.quiz-skeleton', 'invoking hub method', { method: 'RequestQuizSkeleton', lessonId })
        hub.invoke('RequestQuizSkeleton', lessonId).catch(handleQuizErrorWrap)
      } catch (e) {
        handleQuizErrorWrap(e)
      }
    })
  })()

  inflightQuizSkeleton.set(lessonId, p)
  return p
}

export async function requestSingleQuizSkeleton(
  lessonId: string,
  onLoading?: () => void,
): Promise<any> {
  if (!isGuid(lessonId)) {
    return Promise.reject(new Error('lessonId must be a valid GUID'))
  }

  if (inflightSingleQuizSkeleton.has(lessonId)) {
    return inflightSingleQuizSkeleton.get(lessonId)!
  }

  const p = (async () => {
    const hub = await getLessonHub()

    return new Promise<any>((resolve, reject) => {
      let done = false

      const isMatchingLessonPayload = (payload: any): boolean => {
        const payloadLessonId = getPayloadCorrelationId(payload, ['lessonId', 'LessonId'])
        return !!payloadLessonId && payloadLessonId === lessonId
      }

      const buildSingleQuizError = (err: any, fallback: string) => {
        const error = new Error(resolveHubErrorMessage(err, fallback)) as Error & {
          code?: string
          errorCode?: string
          detail?: any
        }
        const code = String(err?.ErrorCode ?? err?.errorCode ?? '').trim()
        if (code) {
          error.code = code
          error.errorCode = code
        }
        error.detail = err
        return error
      }

      const cleanup = () => {
        hub.off('SingleQuizSkeletonLoading', handleLoading)
        hub.off('ReceiveSingleQuizSkeleton', handleSuccess)
        hub.off('SingleQuizSkeletonError', handleError)
        inflightSingleQuizSkeleton.delete(lessonId)
      }

      const handleLoading = (payload: any) => {
        if (!isMatchingLessonPayload(payload)) return
        onLoading?.()
      }

      const handleSuccess = (payload: any) => {
        if (!isMatchingLessonPayload(payload)) return
        if (done) return
        done = true
        cleanup()
        clearTo()
        resolve(payload)
      }

      const handleError = (err: any) => {
        if (!isMatchingLessonPayload(err)) return
        if (done) return
        done = true
        cleanup()
        clearTo()
        reject(buildSingleQuizError(err, 'Failed to generate single quiz skeleton'))
      }

      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Single quiz skeleton generation timeout'))
      }, REQUEST_TIMEOUT)

      const clearTo = () => { try { clearTimeout(to) } catch { } }
      const handleSuccessWrap = (payload: any) => { clearTo(); handleSuccess(payload) }
      const handleErrorWrap = (err: any) => { clearTo(); handleError(err) }

      hub.on('SingleQuizSkeletonLoading', handleLoading)
      hub.on('ReceiveSingleQuizSkeleton', handleSuccessWrap)
      hub.on('SingleQuizSkeletonError', handleErrorWrap)

      try {
        hub.invoke('RequestSingleQuizSkeleton', lessonId).catch(handleErrorWrap)
      } catch (err) {
        handleErrorWrap(err)
      }
    })
  })()

  inflightSingleQuizSkeleton.set(lessonId, p)
  return p
}

export async function requestSingleQuizQuestion(
  quizId: string,
  questionType: number,
  onLoading?: () => void,
): Promise<any> {
  if (!isGuid(quizId)) {
    return Promise.reject(new Error('quizId must be a valid GUID'))
  }

  const normalizedQuestionType = Number(questionType)
  if (!Number.isFinite(normalizedQuestionType) || ![0, 1, 2, 3, 4, 5].includes(normalizedQuestionType)) {
    return Promise.reject(new Error('questionType must be one of 0 (TrueFalse), 1 (MultipleChoice), 2 (SingleChoice), 3 (Matching), 4 (FillInTheBlank), or 5 (Ordering)'))
  }

  const key = `${quizId}:${normalizedQuestionType}`
  if (inflightSingleQuizQuestion.has(key)) {
    return inflightSingleQuizQuestion.get(key)!
  }

  const p = (async () => {
    const hub = await getQuizHub()

    return new Promise<any>((resolve, reject) => {
      let done = false

      const toNumber = (value: unknown): number | null => {
        const numeric = Number(value)
        return Number.isFinite(numeric) ? numeric : null
      }

      const isMatchingQuizPayload = (payload: any): boolean => {
        const payloadQuizId = getPayloadCorrelationId(payload, ['quizId', 'QuizId'])
        return !!payloadQuizId && payloadQuizId === quizId
      }

      const isMatchingLoadingPayload = (payload: any): boolean => {
        if (!isMatchingQuizPayload(payload)) return false
        const payloadQuestionType = toNumber(payload?.questionType ?? payload?.QuestionType)
        if (payloadQuestionType != null && payloadQuestionType !== normalizedQuestionType) return false
        return true
      }

      const isMatchingSuccessPayload = (payload: any): boolean => {
        if (!isMatchingQuizPayload(payload)) return false

        const payloadQuestionType = toNumber(
          payload?.questionType
          ?? payload?.QuestionType
          ?? payload?.question?.type
          ?? payload?.question?.Type
          ?? payload?.Question?.type
          ?? payload?.Question?.Type,
        )
        if (payloadQuestionType != null && payloadQuestionType !== normalizedQuestionType) return false
        return true
      }

      const isMatchingErrorPayload = (payload: any): boolean => {
        if (!isMatchingQuizPayload(payload)) return false

        const payloadQuestionType = toNumber(payload?.questionType ?? payload?.QuestionType)
        if (payloadQuestionType != null && payloadQuestionType !== normalizedQuestionType) return false
        return true
      }

      const buildSingleQuizQuestionError = (err: any, fallback: string) => {
        const error = new Error(resolveHubErrorMessage(err, fallback)) as Error & {
          code?: string
          errorCode?: string
          detail?: any
        }
        const code = String(err?.ErrorCode ?? err?.errorCode ?? '').trim()
        if (code) {
          error.code = code
          error.errorCode = code
        }
        error.detail = err
        return error
      }

      const cleanup = () => {
        hub.off('SingleQuizQuestionLoading', handleLoading)
        hub.off('ReceiveSingleQuizQuestion', handleSuccess)
        hub.off('SingleQuizQuestionError', handleError)
        inflightSingleQuizQuestion.delete(key)
      }

      const handleLoading = (payload: any) => {
        if (!isMatchingLoadingPayload(payload)) return
        onLoading?.()
      }

      const handleSuccess = (payload: any) => {
        if (!isMatchingSuccessPayload(payload)) return
        if (done) return
        done = true
        cleanup()
        clearTo()
        resolve(payload)
      }

      const handleError = (err: any) => {
        if (!isMatchingErrorPayload(err)) return
        if (done) return
        done = true
        cleanup()
        clearTo()
        reject(buildSingleQuizQuestionError(err, 'Failed to generate single quiz question'))
      }

      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Single quiz question generation timeout'))
      }, REQUEST_TIMEOUT)

      const clearTo = () => { try { clearTimeout(to) } catch { } }
      const handleSuccessWrap = (payload: any) => { clearTo(); handleSuccess(payload) }
      const handleErrorWrap = (err: any) => { clearTo(); handleError(err) }

      hub.on('SingleQuizQuestionLoading', handleLoading)
      hub.on('ReceiveSingleQuizQuestion', handleSuccessWrap)
      hub.on('SingleQuizQuestionError', handleErrorWrap)

      try {
        hub.invoke('RequestSingleQuizQuestion', quizId, normalizedQuestionType).catch(handleErrorWrap)
      } catch (err) {
        handleErrorWrap(err)
      }
    })
  })()

  inflightSingleQuizQuestion.set(key, p)
  return p
}

export async function requestMentorLessonContent(
  lessonId: string,
  onLoading?: () => void,
): Promise<any> {
  if (!isGuid(lessonId)) {
    return Promise.reject(new Error('lessonId must be a valid GUID'))
  }

  if (inflightMentorLessonContent.has(lessonId)) {
    return inflightMentorLessonContent.get(lessonId)!
  }

  const p = (async () => {
    const hub = await getLessonHub()

    return new Promise<any>((resolve, reject) => {
      let done = false
      let generatedLessonContent: any = null
      let completionPayload: any = null
      let completionFallbackTo: ReturnType<typeof setTimeout> | null = null
      const isMatchingLessonPayload = (payload: any, requireId = false): boolean => {
        const payloadLessonId = getPayloadCorrelationId(payload, ['lessonId', 'LessonId'])
        if (!payloadLessonId) return !requireId
        return payloadLessonId === lessonId
      }

      const extractContentFromPayload = (payload: any): string => {
        if (!payload || typeof payload !== 'object') return ''
        return String(
          payload?.content
          ?? payload?.Content
          ?? payload?.markdown
          ?? payload?.Markdown
          ?? payload?.body
          ?? payload?.Body
          ?? payload?.text
          ?? payload?.Text
          ?? payload?.generatedContent
          ?? payload?.GeneratedContent
          ?? payload?.lessonContent
          ?? payload?.LessonContent
          ?? payload?.lessonResult?.value?.content
          ?? payload?.LessonResult?.Value?.Content
          ?? '',
        ).trim()
      }

      const clearCompletionFallback = () => {
        if (!completionFallbackTo) return
        try { clearTimeout(completionFallbackTo) } catch { }
        completionFallbackTo = null
      }

      const finalizeSuccess = (payload: any) => {
        const generatedContent = extractContentFromPayload(generatedLessonContent)
        const completedContent = extractContentFromPayload(payload)

        resolve({
          ...payload,
          lessonId,
          lessonContent: generatedLessonContent,
          content: generatedContent || completedContent,
        })
      }

      const buildMentorLessonError = (err: any, fallback: string) => {
        const error = new Error(resolveHubErrorMessage(err, fallback)) as Error & {
          code?: string
          errorCode?: string
          detail?: any
        }
        const code = String(err?.ErrorCode ?? err?.errorCode ?? '').trim()
        if (code) {
          error.code = code
          error.errorCode = code
        }
        error.detail = err
        return error
      }

      const cleanup = () => {
        clearCompletionFallback()
        hub.off('LessonContentLoading', handleLoading)
        hub.off('ReceiveLessonContent', handleContent)
        hub.off('LessonGenerationCompleted', handleCompleted)
        hub.off('LessonContentError', handleError)
        inflightMentorLessonContent.delete(lessonId)
      }

      const handleLoading = (payload: any) => {
        if (!isMatchingLessonPayload(payload, true)) return
        onLoading?.()
      }

      const handleContent = (payload: any) => {
        if (!isMatchingLessonPayload(payload)) return
        generatedLessonContent = payload

        if (completionPayload && !done) {
          done = true
          cleanup()
          clearTo()
          finalizeSuccess(completionPayload)
        }
      }

      const handleCompleted = (payload: any) => {
        if (!isMatchingLessonPayload(payload, true)) return
        if (done) return

        completionPayload = payload
        const hasContent = Boolean(extractContentFromPayload(generatedLessonContent) || extractContentFromPayload(payload))

        if (hasContent) {
          done = true
          cleanup()
          clearTo()
          finalizeSuccess(payload)
          return
        }

        clearCompletionFallback()
        completionFallbackTo = setTimeout(() => {
          if (done) return
          done = true
          cleanup()
          clearTo()
          finalizeSuccess(payload)
        }, 1200)
      }

      const handleError = (err: any) => {
        if (!isMatchingLessonPayload(err, true)) return
        if (done) return
        done = true
        cleanup()
        clearTo()
        reject(buildMentorLessonError(err, 'Failed to generate mentor lesson content'))
      }

      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Mentor lesson content request timeout'))
      }, REQUEST_TIMEOUT)

      const clearTo = () => { try { clearTimeout(to) } catch { } }
      const handleCompletedWrap = (payload: any) => { clearTo(); handleCompleted(payload) }
      const handleErrorWrap = (err: any) => { clearTo(); handleError(err) }

      hub.on('LessonContentLoading', handleLoading)
      hub.on('ReceiveLessonContent', handleContent)
      hub.on('LessonGenerationCompleted', handleCompletedWrap)
      hub.on('LessonContentError', handleErrorWrap)

      try {
        hub.invoke('RequestMentorLessonContent', lessonId).catch(handleErrorWrap)
      } catch (err) {
        handleErrorWrap(err)
      }
    })
  })()

  inflightMentorLessonContent.set(lessonId, p)
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

export async function requestSingleTask(
  chapterId: string,
  title: string | null,
  taskType: number,
  onLoading?: () => void,
): Promise<any> {
  if (!isGuid(chapterId)) {
    return Promise.reject(new Error('chapterId must be a valid GUID'))
  }

  if (!Number.isFinite(taskType) || ![0, 1, 2].includes(taskType)) {
    return Promise.reject(new Error('taskType must be one of 0 (Practice), 1 (Theory), or 2 (Quizz)'))
  }

  const normalizedTitle = title == null ? '' : String(title).trim()
  const key = `${chapterId}:${taskType}:${normalizedTitle.toLowerCase()}`
  if (inflightSingleTask.has(key)) {
    return inflightSingleTask.get(key)!
  }

  const p = (async () => {
    const hub = await getTaskHub()

    return new Promise<any>((resolve, reject) => {
      let done = false
      const requestTaskType = Number(taskType)
      const requestTitle = normalizedTitle.toLowerCase()

      const toNumber = (value: unknown): number | null => {
        const numeric = Number(value)
        return Number.isFinite(numeric) ? numeric : null
      }

      const isMatchingLoadingPayload = (payload: any): boolean => {
        const payloadChapterId = getPayloadCorrelationId(payload, ['chapterId', 'ChapterId'])
        if (!payloadChapterId || payloadChapterId !== chapterId) return false

        const payloadTaskType = toNumber(payload?.taskType ?? payload?.TaskType)
        if (payloadTaskType != null && payloadTaskType !== requestTaskType) return false

        const payloadTitle = String(payload?.title ?? payload?.Title ?? '').trim().toLowerCase()
        if (payloadTitle && requestTitle && payloadTitle !== requestTitle) return false

        return true
      }

      const isMatchingSuccessPayload = (payload: any): boolean => {
        const payloadTaskType = toNumber(payload?.taskType ?? payload?.TaskType)
        if (payloadTaskType != null && payloadTaskType !== requestTaskType) return false
        return true
      }

      const isMatchingErrorPayload = (payload: any): boolean => {
        const payloadChapterId = getPayloadCorrelationId(payload, ['chapterId', 'ChapterId'])
        if (!payloadChapterId || payloadChapterId !== chapterId) return false

        const payloadTaskType = toNumber(payload?.taskType ?? payload?.TaskType)
        if (payloadTaskType != null && payloadTaskType !== requestTaskType) return false

        const payloadTitle = String(payload?.title ?? payload?.Title ?? '').trim().toLowerCase()
        if (payloadTitle && requestTitle && payloadTitle !== requestTitle) return false

        return true
      }

      const buildTaskError = (err: any, fallback: string) => {
        const error = new Error(resolveHubErrorMessage(err, fallback)) as Error & {
          code?: string
          errorCode?: string
          detail?: any
        }
        const code = String(err?.ErrorCode ?? err?.errorCode ?? '').trim()
        if (code) {
          error.code = code
          error.errorCode = code
        }
        error.detail = err
        return error
      }

      const cleanup = () => {
        hub.off('SingleTaskLoading', handleLoading)
        hub.off('ReceiveSingleTask', handleSuccess)
        hub.off('SingleTaskError', handleError)
        inflightSingleTask.delete(key)
      }

      const handleLoading = (payload: any) => {
        if (!isMatchingLoadingPayload(payload)) return
        onLoading?.()
      }

      const handleSuccess = (payload: any) => {
        if (!isMatchingSuccessPayload(payload)) return
        if (done) return
        done = true
        cleanup()
        clearTo()
        resolve(payload)
      }

      const handleError = (err: any) => {
        if (!isMatchingErrorPayload(err)) return
        if (done) return
        done = true
        cleanup()
        clearTo()
        reject(buildTaskError(err, 'Failed to generate single task'))
      }

      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Single task generation timeout'))
      }, REQUEST_TIMEOUT)

      const clearTo = () => { try { clearTimeout(to) } catch { } }
      const handleSuccessWrap = (payload: any) => { clearTo(); handleSuccess(payload) }
      const handleErrorWrap = (err: any) => { clearTo(); handleError(err) }

      hub.on('SingleTaskLoading', handleLoading)
      hub.on('ReceiveSingleTask', handleSuccessWrap)
      hub.on('SingleTaskError', handleErrorWrap)

      try {
        hub.invoke('RequestSingleTask', chapterId, normalizedTitle || null, requestTaskType).catch(handleErrorWrap)
      } catch (err) {
        handleErrorWrap(err)
      }
    })
  })()

  inflightSingleTask.set(key, p)
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
      const isMatchingQuizPayload = (payload: any) => {
        const payloadQuizId = getPayloadCorrelationId(payload, ['QuizId', 'quizId'])
        return !payloadQuizId || payloadQuizId === quizId
      }

      const cleanup = () => {
        hub.off('QuizQuestionsLoading', handleLoading)
        hub.off('ReceiveQuizQuestions', handleQuestions)
        hub.off('QuizQuestionsError', handleError)
        inflightQuiz.delete(quizId)
      }

      const handleLoading = (data: any) => {
        if (!isMatchingQuizPayload(data)) return
        onLoading?.()
      }

      const handleQuestions = (questions: any) => {
        if (!isMatchingQuizPayload(questions)) return
        if (done) return
        done = true
        cleanup()
        resolve(questions)
      }

      const handleError = (err: any) => {
        if (!isMatchingQuizPayload(err)) return
        if (done) return
        done = true
        cleanup()
        reject(new Error(resolveHubErrorMessage(err, 'Failed to load quiz questions')))
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

// ==== Request adopt suggested learning path (pure SignalR) ====
export async function requestAdoptSuggestedLearningPath(
  suggestedPathId: string,
  subjectId: string,
  goals: Array<{ goalId: string; weight: number }>,
  complexityLevel: string,
  languageSelection: number,
  onLoading?: () => void,
  onAdopted?: (data: any) => void
): Promise<any> {
  if (!suggestedPathId || !subjectId || !goals || !Array.isArray(goals) || goals.length === 0 || !complexityLevel || languageSelection === undefined) {
    return Promise.reject(new Error('Missing required parameters for adopting suggested learning path'))
  }

  // Convert languageSelection number to string for backend
  const languageSelectionString = languageSelection === 1 ? 'VietNamese' : 'English'

  // single-flight: return running promise for same suggestedPathId
  const key = `adopt-${suggestedPathId}-${subjectId}`
  if (inflightAdoptSuggestedPath.has(key)) {
    return inflightAdoptSuggestedPath.get(key)!
  }

  // Create and store the promise immediately to prevent race conditions
  const p = (async () => {
    const hub = await getLearningPathHub()

    return new Promise<any>((resolve, reject) => {
      let done = false
      const cleanup = () => {
        hub.off('AdoptSuggestedLearningPathStarted', handleLoading)
        hub.off('SuggestedLearningPathAdopted', handleAdopted)
        hub.off('AdoptSuggestedLearningPathError', handleError)
        inflightAdoptSuggestedPath.delete(key)
      }

      const handleLoading = () => {
        onLoading?.()
      }

      const handleAdopted = (data: any) => {
        if (data) {
          onAdopted?.(data)
          
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
        let errorMessage = err?.errorMessage || err?.message || 'Failed to adopt suggested learning path'
        
        switch (errorCode) {
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
          case 'INVALID_GOAL_WEIGHT':
            errorMessage = 'Invalid goal weight provided'
            break
          case 'GOAL_NOT_FOUND':
            errorMessage = 'One or more goals not found'
            break
          case 'GOAL_SUBJECT_MISMATCH':
            errorMessage = 'Goals do not match the selected subject'
            break
          case 'LEARNING_PATH_NOT_FOUND':
            errorMessage = 'Suggested learning path not found'
            break
          case 'SUGGESTION_CONTEXT_MISMATCH':
            errorMessage = 'Suggestion context does not match current selection'
            break
          case 'INVALID_COMPLEXITY':
            errorMessage = 'Invalid complexity level provided'
            break
          case 'INVALID_LANGUAGE':
            errorMessage = 'Invalid language selection'
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
        reject(new Error('Adopt suggested learning path request timeout'))
      }, REQUEST_TIMEOUT)

      // ensure timeout cleared in all paths
      const clearTo = () => { try { clearTimeout(to) } catch { } }

      // rewrap to clear timeout then delegate
      const handleAdoptedWrap = (data: any) => { clearTo(); handleAdopted(data) }
      const handleErrorWrap = (e: any) => { clearTo(); handleError(e) }

      hub.on('AdoptSuggestedLearningPathStarted', handleLoading)
      hub.on('SuggestedLearningPathAdopted', handleAdoptedWrap)
      hub.on('AdoptSuggestedLearningPathError', handleErrorWrap)

      try {
        // Backend expects suggestedPathId, subjectId, goals array, complexityLevel, languageSelection
        hub.invoke('RequestAdoptSuggestedLearningPath',
          suggestedPathId,
          subjectId,
          goals,
          complexityLevel,
          languageSelectionString
        ).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightAdoptSuggestedPath.set(key, p)
  return p
}

// ==== Request learning path suggestion preview (pure SignalR) ====
const inflightSuggestionPreview = new Map<string, Promise<any>>()

export async function requestLearningPathSuggestionPreview(
  suggestedPathId: string,
  subjectId: string,
  goals: Array<{ goalId: string; weight: number }>,
  complexityLevel: string,
  languageSelection: number,
  onLoading?: () => void
): Promise<any> {
  if (!suggestedPathId || !subjectId || !goals?.length || !complexityLevel || languageSelection === undefined) {
    return Promise.reject(new Error('Missing required parameters for suggestion preview'))
  }

  const languageSelectionString = languageSelection === 1 ? 'VietNamese' : 'English'
  const key = `preview-${suggestedPathId}-${subjectId}`
  if (inflightSuggestionPreview.has(key)) return inflightSuggestionPreview.get(key)!

  const p = (async () => {
    const hub = await getLearningPathHub()

    return new Promise<any>((resolve, reject) => {
      let done = false
      const cleanup = () => {
        hub.off('LearningPathSuggestionPreviewStarted', handleLoading)
        hub.off('LearningPathSuggestionPreviewLoaded', handleLoaded)
        hub.off('LearningPathSuggestionPreviewError', handleError)
        inflightSuggestionPreview.delete(key)
      }

      const handleLoading = () => { onLoading?.() }

      const handleLoaded = (data: any) => {
        if (done) return
        done = true
        cleanup()
        resolve(data)
      }

      const handleError = (err: any) => {
        if (done) return
        done = true
        cleanup()
        const errorCode = err?.errorCode
        const errorMessage = err?.errorMessage || err?.message || 'Failed to preview learning path'
        const error: any = new Error(errorMessage)
        error.errorCode = errorCode
        reject(error)
      }

      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Learning path suggestion preview request timeout'))
      }, REQUEST_TIMEOUT)

      const clearTo = () => { try { clearTimeout(to) } catch { } }
      const handleLoadedWrap = (d: any) => { clearTo(); handleLoaded(d) }
      const handleErrorWrap = (e: any) => { clearTo(); handleError(e) }

      hub.on('LearningPathSuggestionPreviewStarted', handleLoading)
      hub.on('LearningPathSuggestionPreviewLoaded', handleLoadedWrap)
      hub.on('LearningPathSuggestionPreviewError', handleErrorWrap)

      try {
        hub.invoke(
          'RequestLearningPathSuggestionPreview',
          suggestedPathId,
          subjectId,
          goals,
          complexityLevel,
          languageSelectionString
        ).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightSuggestionPreview.set(key, p)
  return p
}
export type TutorHubErrorCode =
  | 'UNAUTHORIZED'
  | 'EMPTY_MESSAGE'
  | 'AI_CONFIG_NOT_FOUND'
  | 'CONVERSATION_NOT_FOUND'
  | 'AI_RESPONSE_FAILED'
  | 'CHAPTER_NOT_FOUND'
  | 'LESSON_NOT_FOUND'
  | 'LESSON_NOT_IN_CHAPTER'
  | 'LEARNING_PATH_NOT_FOUND'
  | 'ACCESS_DENIED'
  | 'CONVERSATION_CONTEXT_MISMATCH'
  | 'CONTEXT_REQUIRED'
  | 'TUTOR_MESSAGE_LIMIT_EXCEEDED'
  | 'CONVERSATION_ID_REQUIRED'
  | 'UNEXPECTED_ERROR'

export interface TutorHubError extends Error {
  code: TutorHubErrorCode | string
}

export type TutorConversationResolvedPayload = {
  conversationId: string
  created: boolean
}

export type TutorMessageHistoryItem = {
  messageId?: string
  conversationId?: string
  userMessageId?: string
  assistantMessageId?: string
  userMessage?: string
  assistantMessage?: string
  role?: string
  senderRole?: string
  type?: string
  content?: string
  message?: string
  createdAt?: string
}

export type TutorMessagesPageResponse = {
  items: TutorMessageHistoryItem[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  contextUsagePercent?: number
}

export type TutorSummaryHistoryItem = {
  summaryId: string
  conversationId: string
  summaryContent: string
  messageCount: number
  startMessageCreatedAt: string | null
  endMessageCreatedAt: string | null
  createdAt: string
}

export type TutorSummariesPageResponse = {
  items: TutorSummaryHistoryItem[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type TutorChatResponse = {
  conversationId: string
  userMessageId: string
  assistantMessageId: string
  assistantMessage: string
  createdAt: string
  contextUsagePercent: number
}

function normalizeTutorMessagesPagePayload(payload: any): TutorMessagesPageResponse {
  const source = payload?.data ?? payload
  const items = Array.isArray(source?.items)
    ? source.items
    : Array.isArray(source?.Items)
      ? source.Items
      : []

  const pageSize = Number(source?.pageSize ?? source?.PageSize ?? items.length ?? 0)
  const totalCount = Number(source?.totalCount ?? source?.TotalCount ?? items.length ?? 0)
  const totalPages = Number(source?.totalPages ?? source?.TotalPages ?? (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1))
  const contextUsagePercent = Number(source?.contextUsagePercent ?? source?.ContextUsagePercent)

  return {
    items,
    pageNumber: Number(source?.pageNumber ?? source?.PageNumber ?? 1),
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 1,
    totalCount: Number.isFinite(totalCount) && totalCount >= 0 ? totalCount : items.length,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
    hasPreviousPage: Boolean(source?.hasPreviousPage ?? source?.HasPreviousPage),
    hasNextPage: Boolean(source?.hasNextPage ?? source?.HasNextPage),
    ...(Number.isFinite(contextUsagePercent) ? { contextUsagePercent } : {}),
  }
}

function normalizeTutorSummariesPagePayload(payload: any): TutorSummariesPageResponse {
  const rawItems = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.Items)
      ? payload.Items
      : []

  const items: TutorSummaryHistoryItem[] = rawItems.map((item: any) => ({
    summaryId: String(item?.summaryId ?? item?.SummaryId ?? item?.id ?? ''),
    conversationId: String(item?.conversationId ?? item?.ConversationId ?? ''),
    summaryContent: String(item?.summaryContent ?? item?.SummaryContent ?? item?.content ?? ''),
    messageCount: Number(item?.messageCount ?? item?.MessageCount ?? 0) || 0,
    startMessageCreatedAt: item?.startMessageCreatedAt ?? item?.StartMessageCreatedAt ?? null,
    endMessageCreatedAt: item?.endMessageCreatedAt ?? item?.EndMessageCreatedAt ?? null,
    createdAt: String(item?.createdAt ?? item?.CreatedAt ?? ''),
  }))

  const pageSize = Number(payload?.pageSize ?? payload?.PageSize ?? items.length ?? 0)
  const totalCount = Number(payload?.totalCount ?? payload?.TotalCount ?? items.length ?? 0)
  const totalPages = Number(payload?.totalPages ?? payload?.TotalPages ?? (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1))

  return {
    items,
    pageNumber: Number(payload?.pageNumber ?? payload?.PageNumber ?? 1),
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 1,
    totalCount: Number.isFinite(totalCount) && totalCount >= 0 ? totalCount : items.length,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
    hasPreviousPage: Boolean(payload?.hasPreviousPage ?? payload?.HasPreviousPage),
    hasNextPage: Boolean(payload?.hasNextPage ?? payload?.HasNextPage),
  }
}

function normalizeTutorChatResponse(payload: any): TutorChatResponse {
  return {
    conversationId: String(payload?.conversationId ?? payload?.ConversationId ?? ''),
    userMessageId: String(payload?.userMessageId ?? payload?.UserMessageId ?? ''),
    assistantMessageId: String(payload?.assistantMessageId ?? payload?.AssistantMessageId ?? ''),
    assistantMessage: String(payload?.assistantMessage ?? payload?.AssistantMessage ?? ''),
    createdAt: String(payload?.createdAt ?? payload?.CreatedAt ?? new Date().toISOString()),
    contextUsagePercent: Number(payload?.contextUsagePercent ?? payload?.ContextUsagePercent ?? 0) || 0,
  }
}

function normalizeTutorConversationResolvedPayload(payload: any): TutorConversationResolvedPayload {
  return {
    conversationId: String(payload?.conversationId ?? payload?.ConversationId ?? ''),
    created: Boolean(payload?.created ?? payload?.Created),
  }
}

function normalizeTutorPageSize(pageSize: number): number {
  const numeric = Number(pageSize)
  if (!Number.isFinite(numeric)) return 30
  return Math.min(100, Math.max(1, Math.floor(numeric)))
}

function normalizeTutorHubError(rawError: any, fallbackMessage: string): TutorHubError {
  const errorCode = rawError?.errorCode || rawError?.code || 'UNEXPECTED_ERROR'
  const errorMessage = rawError?.errorMessage || rawError?.message || fallbackMessage
  const normalized = new Error(errorMessage) as TutorHubError
  normalized.code = errorCode
  return normalized
}

export async function sendTutorMessage(
  conversationId: string | null,
  learningPathId: string | null,
  chapterId: string | null,
  lessonId: string | null,
  message: string,
  onMessageStarted?: () => void,
  onMessageReceived?: (data: TutorChatResponse) => void,
  onMessageError?: (error: TutorHubError) => void
): Promise<TutorChatResponse> {
  if (!message || message.trim().length === 0) {
    return Promise.reject(normalizeTutorHubError({ errorCode: 'EMPTY_MESSAGE', errorMessage: 'Message cannot be empty' }, 'Message cannot be empty'))
  }

  // single-flight: return running promise for same message
  const key = `tutor-${conversationId || 'new'}-${Date.now()}`
  if (inflightTutorMessages.has(key)) {
    return inflightTutorMessages.get(key)!
  }

  // Create and store the promise immediately to prevent race conditions
  const p = (async () => {
    const hub = await getTutorHub()

    return new Promise<TutorChatResponse>((resolve, reject) => {
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
          const normalized = normalizeTutorChatResponse(data)

          if (conversationId && normalized.conversationId && normalized.conversationId !== conversationId) {
            return
          }

          onMessageReceived?.(normalized)
          
          if (done) return
          done = true
          cleanup()
          resolve(normalized)
        }
      }

      const handleError = (err: any) => {
        if (done) return
        done = true
        cleanup()

        const normalizedError = normalizeTutorHubError(err, 'Failed to send tutor message')
        onMessageError?.(normalizedError)
        reject(normalizedError)
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

// ==== Request tutor message history (pure SignalR) ====
export async function requestTutorMessages(
  conversationId: string,
  pageNumber: number = 1,
  pageSize: number = 30,
  onLoading?: () => void,
  onMessagesLoaded?: (data: TutorMessagesPageResponse) => void,
  onMessagesError?: (error: TutorHubError) => void
): Promise<TutorMessagesPageResponse> {
  if (!conversationId) {
    return Promise.reject(normalizeTutorHubError({ errorCode: 'CONVERSATION_ID_REQUIRED', errorMessage: 'conversationId is required for requesting tutor messages' }, 'conversationId is required for requesting tutor messages'))
  }

  const normalizedPageSize = normalizeTutorPageSize(pageSize)

  // single-flight: return running promise for same conversationId-page
  const key = `messages-${conversationId}-${pageNumber}-${normalizedPageSize}`
  if (inflightTutorMessageHistory.has(key)) {
    return inflightTutorMessageHistory.get(key)!
  }

  // Create and store the promise immediately to prevent race conditions
  const p = (async () => {
    const hub = await getTutorHub()

    return new Promise<TutorMessagesPageResponse>((resolve, reject) => {
      let done = false
      const cleanup = () => {
        hub.off('TutorMessagesLoading', handleLoading)
        hub.off('TutorMessagesLoaded', handleLoaded)
        hub.off('TutorMessagesError', handleError)
        inflightTutorMessageHistory.delete(key)
      }

      const handleLoading = () => {
        onLoading?.()
      }

      const handleLoaded = (data: any) => {
        if (data) {
          const normalized = normalizeTutorMessagesPagePayload(data)
          const payloadConversationId = String(
            data?.conversationId
            ?? data?.ConversationId
            ?? data?.data?.conversationId
            ?? data?.data?.ConversationId
            ?? normalized.items?.[0]?.conversationId
            ?? ''
          )

          if (payloadConversationId && payloadConversationId !== conversationId) {
            return
          }

          onMessagesLoaded?.(normalized)
          
          if (done) return
          done = true
          cleanup()
          resolve(normalized)
        }
      }

      const handleError = (err: any) => {
        if (done) return
        done = true
        cleanup()

        const normalizedError = normalizeTutorHubError(err, 'Failed to load tutor messages')
        onMessagesError?.(normalizedError)
        reject(normalizedError)
      }

      // timeout safety
      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Tutor messages request timeout'))
      }, REQUEST_TIMEOUT)

      // ensure timeout cleared in all paths
      const clearTo = () => { try { clearTimeout(to) } catch { } }

      // rewrap to clear timeout then delegate
      const handleLoadedWrap = (data: any) => { clearTo(); handleLoaded(data) }
      const handleErrorWrap = (e: any) => { clearTo(); handleError(e) }

      hub.on('TutorMessagesLoading', handleLoading)
      hub.on('TutorMessagesLoaded', handleLoadedWrap)
      hub.on('TutorMessagesError', handleErrorWrap)

      try {
        // Backend expects conversationId, pageNumber, pageSize
        hub.invoke('RequestTutorMessages',
          conversationId,
          pageNumber,
          normalizedPageSize
        ).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightTutorMessageHistory.set(key, p)
  return p
}

export async function requestTutorSummaries(
  conversationId: string,
  pageNumber: number = 1,
  pageSize: number = 20,
  onLoading?: () => void,
  onSummariesLoaded?: (data: TutorSummariesPageResponse) => void,
  onSummariesError?: (error: TutorHubError) => void
): Promise<TutorSummariesPageResponse> {
  if (!conversationId) {
    return Promise.reject(
      normalizeTutorHubError(
        { errorCode: 'CONVERSATION_ID_REQUIRED', errorMessage: 'conversationId is required for requesting tutor summaries' },
        'conversationId is required for requesting tutor summaries'
      )
    )
  }

  const normalizedPageSize = normalizeTutorPageSize(pageSize)
  const key = `summaries-${conversationId}-${pageNumber}-${normalizedPageSize}`
  if (inflightTutorSummaryHistory.has(key)) {
    return inflightTutorSummaryHistory.get(key)!
  }

  const p = (async () => {
    const hub = await getTutorHub()

    return new Promise<TutorSummariesPageResponse>((resolve, reject) => {
      let done = false
      const cleanup = () => {
        hub.off('TutorSummariesLoading', handleLoading)
        hub.off('TutorSummariesLoaded', handleLoaded)
        hub.off('TutorSummariesError', handleError)
        inflightTutorSummaryHistory.delete(key)
      }

      const handleLoading = () => {
        onLoading?.()
      }

      const handleLoaded = (data: any) => {
        if (!data) return

        const normalized = normalizeTutorSummariesPagePayload(data)
        const payloadConversationId = String(
          data?.conversationId
          ?? data?.ConversationId
          ?? normalized.items?.[0]?.conversationId
          ?? ''
        )

        if (payloadConversationId && payloadConversationId !== conversationId) {
          return
        }

        onSummariesLoaded?.(normalized)

        if (done) return
        done = true
        cleanup()
        resolve(normalized)
      }

      const handleError = (err: any) => {
        if (done) return
        done = true
        cleanup()

        const normalizedError = normalizeTutorHubError(err, 'Failed to load tutor summaries')
        onSummariesError?.(normalizedError)
        reject(normalizedError)
      }

      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Tutor summaries request timeout'))
      }, REQUEST_TIMEOUT)

      const clearTo = () => { try { clearTimeout(to) } catch { } }
      const handleLoadedWrap = (data: any) => { clearTo(); handleLoaded(data) }
      const handleErrorWrap = (e: any) => { clearTo(); handleError(e) }

      hub.on('TutorSummariesLoading', handleLoading)
      hub.on('TutorSummariesLoaded', handleLoadedWrap)
      hub.on('TutorSummariesError', handleErrorWrap)

      try {
        hub.invoke('RequestTutorSummaries', conversationId, pageNumber, normalizedPageSize).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightTutorSummaryHistory.set(key, p)
  return p
}

// ==== Request resolve tutor conversation (pure SignalR) ====
export async function requestResolveTutorConversation(
  learningPathId: string | null,
  chapterId: string | null,
  lessonId: string | null,
  createIfMissing: boolean = true,
  onLoading?: () => void,
  onResolved?: (data: TutorConversationResolvedPayload) => void,
  onResolveError?: (error: TutorHubError) => void
): Promise<TutorConversationResolvedPayload> {
  // single-flight: return running promise for same context
  const key = `resolve-${learningPathId || 'null'}-${chapterId || 'null'}-${lessonId || 'null'}`
  if (inflightTutorConversationResolve.has(key)) {
    return inflightTutorConversationResolve.get(key)!
  }

  // Create and store the promise immediately to prevent race conditions
  const p = (async () => {
    const hub = await getTutorHub()

    return new Promise<TutorConversationResolvedPayload>((resolve, reject) => {
      let done = false
      const cleanup = () => {
        hub.off('TutorConversationResolveStarted', handleStarted)
        hub.off('TutorConversationResolved', handleResolved)
        hub.off('TutorConversationResolveError', handleError)
        inflightTutorConversationResolve.delete(key)
      }

      const handleStarted = () => {
        onLoading?.()
      }

      const handleResolved = (data: any) => {
        if (data) {
          const normalized = normalizeTutorConversationResolvedPayload(data)
          onResolved?.(normalized)
          
          if (done) return
          done = true
          cleanup()
          resolve(normalized)
        }
      }

      const handleError = (err: any) => {
        if (done) return
        done = true
        cleanup()

        const normalizedError = normalizeTutorHubError(err, 'Failed to resolve tutor conversation')
        onResolveError?.(normalizedError)
        reject(normalizedError)
      }

      // timeout safety
      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Tutor conversation resolve request timeout'))
      }, REQUEST_TIMEOUT)

      // ensure timeout cleared in all paths
      const clearTo = () => { try { clearTimeout(to) } catch { } }

      // rewrap to clear timeout then delegate
      const handleResolvedWrap = (data: any) => { clearTo(); handleResolved(data) }
      const handleErrorWrap = (e: any) => { clearTo(); handleError(e) }

      hub.on('TutorConversationResolveStarted', handleStarted)
      hub.on('TutorConversationResolved', handleResolvedWrap)
      hub.on('TutorConversationResolveError', handleErrorWrap)

      try {
        // Backend expects learningPathId, chapterId, lessonId, createIfMissing
        hub.invoke('RequestResolveTutorConversation',
          learningPathId,
          chapterId,
          lessonId,
          createIfMissing
        ).catch(handleErrorWrap)
      } catch (e) {
        handleErrorWrap(e)
      }
    })
  })()

  inflightTutorConversationResolve.set(key, p)
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

export async function requestChapterMentorSkeleton(
  pathId: string,
  chapterTitle: string,
  chapterDescription: string,
  onLoading?: () => void,
): Promise<any> {
  if (!isGuid(pathId)) {
    return Promise.reject(new Error('pathId must be a valid GUID'))
  }

  if (typeof chapterTitle !== 'string' || typeof chapterDescription !== 'string') {
    return Promise.reject(new Error('chapterTitle and chapterDescription must be strings'))
  }

  const key = `${pathId}:${chapterTitle.trim()}:${chapterDescription.trim()}`
  if (inflightChapterMentorSkeleton.has(key)) {
    return inflightChapterMentorSkeleton.get(key)!
  }

  const p = (async () => {
    const hub = await getChapterHub()
    debugSignalR('chapter', 'RequestChapterMentorSkeleton invoke payload', {
      pathId,
      chapterTitle,
      chapterDescription,
    })

    return new Promise<any>((resolve, reject) => {
      let done = false
      const normalizedTitle = chapterTitle.trim().toLowerCase()
      const normalizedDescription = chapterDescription.trim().toLowerCase()

      const toNormalizedString = (value: unknown) => String(value ?? '').trim().toLowerCase()
      const buildChapterMentorError = (err: any, fallback: string) => {
        const error = new Error(resolveHubErrorMessage(err, fallback)) as Error & {
          code?: string
          errorCode?: string
          detail?: any
        }
        const code = String(err?.ErrorCode ?? err?.errorCode ?? '').trim()
        if (code) {
          error.code = code
          error.errorCode = code
        }
        error.detail = err
        return error
      }

      const hasValidLessonsShape = (payload: any): boolean => {
        const lessonItems = Array.isArray(payload?.lessons)
          ? payload.lessons
          : Array.isArray(payload?.Lessons)
            ? payload.Lessons
            : null

        if (!lessonItems) return false
        return lessonItems.every((lesson: any) => {
          const lessonTitle = String(lesson?.title ?? lesson?.Title ?? '').trim()
          const orderIndex = Number(lesson?.orderIndex ?? lesson?.OrderIndex)
          return lessonTitle.length > 0 && Number.isFinite(orderIndex)
        })
      }

      const isMatchingPayload = (payload: any) => {
        const payloadPathId = getPayloadCorrelationId(payload, ['pathId', 'PathId'])
        if (!payloadPathId || payloadPathId !== pathId) return false

        const payloadTitle = toNormalizedString(payload?.chapterTitle ?? payload?.ChapterTitle)
        const payloadDescription = toNormalizedString(payload?.chapterDescription ?? payload?.ChapterDescription)

        if (payloadTitle && payloadTitle !== normalizedTitle) return false
        if (payloadDescription && payloadDescription !== normalizedDescription) return false

        return true
      }

      const cleanup = () => {
        hub.off('ChapterMentorSkeletonGenerationStarted', handleLoading)
        hub.off('ChapterMentorSkeletonGenerated', handleGenerated)
        hub.off('ChapterMentorSkeletonError', handleError)
        inflightChapterMentorSkeleton.delete(key)
      }

      const handleLoading = (payload: any) => {
        if (!isMatchingPayload(payload)) return
        debugSignalR('chapter', 'ChapterMentorSkeletonGenerationStarted', payload)
        onLoading?.()
      }

      const handleGenerated = (payload: any) => {
        if (!isMatchingPayload(payload)) return
        debugSignalR('chapter', 'ChapterMentorSkeletonGenerated', payload)
        if (!hasValidLessonsShape(payload)) {
          handleError({
            ErrorCode: 'INVALID_AI_RESPONSE',
            ErrorMessage: 'Chapter mentor skeleton payload is invalid.',
            PathId: pathId,
            ChapterTitle: chapterTitle,
            ChapterDescription: chapterDescription,
          })
          return
        }
        if (done) return
        done = true
        cleanup()
        resolve(payload)
      }

      const handleError = (err: any) => {
        if (!isMatchingPayload(err)) return
        debugSignalR('chapter', 'ChapterMentorSkeletonError', err)
        if (done) return
        done = true
        cleanup()
        reject(buildChapterMentorError(err, 'Failed to generate chapter mentor skeleton'))
      }

      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Chapter mentor skeleton generation timeout'))
      }, REQUEST_TIMEOUT)

      const clearTo = () => { try { clearTimeout(to) } catch { } }
      const handleGeneratedWrap = (payload: any) => { clearTo(); handleGenerated(payload) }
      const handleErrorWrap = (err: any) => { clearTo(); handleError(err) }

      hub.on('ChapterMentorSkeletonGenerationStarted', handleLoading)
      hub.on('ChapterMentorSkeletonGenerated', handleGeneratedWrap)
      hub.on('ChapterMentorSkeletonError', handleErrorWrap)

      try {
        hub.invoke('RequestChapterMentorSkeleton', pathId, chapterTitle, chapterDescription).catch(handleErrorWrap)
      } catch (err) {
        handleErrorWrap(err)
      }
    })
  })()

  inflightChapterMentorSkeleton.set(key, p)
  return p
}

// ==== Bulk learning path content generation (LessonHub) ====

export interface BulkGenerationStarted {
  PathId: string
  TotalLessons: number
  TotalQuizzes: number
  LessonConcurrency: number
  QuizConcurrency: number
}

export interface BulkGenerationProgress {
  PathId: string
  TotalLessons: number
  CompletedLessons: number
  FailedLessons: number
  TotalQuizzes: number
  CompletedQuizzes: number
  FailedQuizzes: number
}

export interface BulkGenerationCompleted extends BulkGenerationProgress {}

export interface BulkGenerationError {
  PathId: string
  ErrorCode: string
  ErrorMessage: string
}

export interface BulkGenerationCancelled {
  PathId: string
  ErrorCode: string
  ErrorMessage: string
}

export interface BulkGenerationCallbacks {
  onStarted?: (data: BulkGenerationStarted) => void
  onProgress?: (data: BulkGenerationProgress) => void
  onCompleted?: (data: BulkGenerationCompleted) => void
  onError?: (data: BulkGenerationError) => void
  onCancelled?: (data: BulkGenerationCancelled) => void
  onLessonSuccess?: (lesson: any) => void
  onLessonError?: (data: { LessonId: string; ErrorCode: string; ErrorMessage: string }) => void
  onQuizSuccess?: (data: { QuizId: string; Questions: any }) => void
  onQuizError?: (data: { QuizId: string; ErrorCode: string; ErrorMessage: string }) => void
}

const inflightBulkGeneration = new Map<string, Promise<BulkGenerationCompleted>>()

export async function requestBulkLearningPathContent(
  pathId: string,
  lessonConcurrency = 4,
  quizConcurrency = 6,
  callbacks?: BulkGenerationCallbacks,
): Promise<BulkGenerationCompleted> {
  if (!pathId) return Promise.reject(new Error('pathId is required'))

  if (inflightBulkGeneration.has(pathId)) return inflightBulkGeneration.get(pathId)!

  const p = (async () => {
    const hub = await getLessonHub()

    return new Promise<BulkGenerationCompleted>((resolve, reject) => {
      let done = false

      const cleanup = () => {
        hub.off('BulkLearningPathGenerationStarted', handleStarted)
        hub.off('BulkLearningPathGenerationProgress', handleProgress)
        hub.off('BulkLearningPathGenerationCompleted', handleCompleted)
        hub.off('BulkLearningPathGenerationError', handleError)
        hub.off('BulkLearningPathGenerationCancelled', handleCancelled)
        hub.off('ReceiveLessonContent', handleLessonSuccess)
        hub.off('LessonContentError', handleLessonError)
        hub.off('ReceiveQuizQuestions', handleQuizSuccess)
        hub.off('QuizQuestionsError', handleQuizError)
        inflightBulkGeneration.delete(pathId)
      }

      const handleStarted = (data: any) => {
        debugSignalR('bulk', 'BulkLearningPathGenerationStarted', data)
        callbacks?.onStarted?.(data)
      }

      const handleProgress = (data: any) => {
        debugSignalR('bulk', 'BulkLearningPathGenerationProgress', data)
        callbacks?.onProgress?.(data)
      }

      const handleCompleted = (data: any) => {
        if (done) return
        done = true
        debugSignalR('bulk', 'BulkLearningPathGenerationCompleted', data)
        callbacks?.onCompleted?.(data)
        cleanup()
        resolve(data)
      }

      const handleError = (data: any) => {
        if (done) return
        done = true
        debugSignalR('bulk', 'BulkLearningPathGenerationError', data)
        callbacks?.onError?.(data)
        cleanup()
        const err: any = new Error(data?.ErrorMessage || 'Bulk generation failed')
        err.errorCode = data?.ErrorCode
        reject(err)
      }

      const handleCancelled = (data: any) => {
        if (done) return
        done = true
        debugSignalR('bulk', 'BulkLearningPathGenerationCancelled', data)
        callbacks?.onCancelled?.(data)
        cleanup()
        const err: any = new Error(data?.ErrorMessage || 'Bulk generation cancelled')
        err.errorCode = data?.ErrorCode || 'CONNECTION_ABORTED'
        reject(err)
      }

      const handleLessonSuccess = (data: any) => {
        callbacks?.onLessonSuccess?.(data)
      }

      const handleLessonError = (data: any) => {
        callbacks?.onLessonError?.(data)
      }

      const handleQuizSuccess = (data: any) => {
        callbacks?.onQuizSuccess?.(data)
      }

      const handleQuizError = (data: any) => {
        callbacks?.onQuizError?.(data)
      }

      const to = setTimeout(() => {
        if (done) return
        done = true
        cleanup()
        reject(new Error('Bulk learning path generation timeout'))
      }, REQUEST_TIMEOUT)

      const clearTo = () => { try { clearTimeout(to) } catch { } }
      const handleCompletedWrap = (d: any) => { clearTo(); handleCompleted(d) }
      const handleErrorWrap = (d: any) => { clearTo(); handleError(d) }
      const handleCancelledWrap = (d: any) => { clearTo(); handleCancelled(d) }

      // Register all listeners BEFORE invoke
      hub.on('BulkLearningPathGenerationStarted', handleStarted)
      hub.on('BulkLearningPathGenerationProgress', handleProgress)
      hub.on('BulkLearningPathGenerationCompleted', handleCompletedWrap)
      hub.on('BulkLearningPathGenerationError', handleErrorWrap)
      hub.on('BulkLearningPathGenerationCancelled', handleCancelledWrap)
      hub.on('ReceiveLessonContent', handleLessonSuccess)
      hub.on('LessonContentError', handleLessonError)
      hub.on('ReceiveQuizQuestions', handleQuizSuccess)
      hub.on('QuizQuestionsError', handleQuizError)

      try {
        debugSignalR('bulk', 'invoking RequestBulkLearningPathContent', { pathId, lessonConcurrency, quizConcurrency })
        hub.invoke('RequestBulkLearningPathContent', pathId, lessonConcurrency, quizConcurrency)
          .then(() => console.log('[BulkGen] invoke OK, waiting for events...'))
          .catch((err: any) => {
            console.error('[BulkGen] invoke FAILED:', err)
            handleErrorWrap(err)
          })
      } catch (e) {
        console.error('[BulkGen] invoke threw:', e)
        handleErrorWrap(e)
      }
    })
  })()

  inflightBulkGeneration.set(pathId, p)
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
    if (notificationHub && notificationHub.state !== signalR.HubConnectionState.Disconnected) {
      await notificationHub.stop()
    }

    // Reset all hub references to null so they get recreated with new token
    lessonHub = null
    chapterHub = null
    taskHub = null
    quizHub = null
    summaryHub = null
    learningPathHub = null
    tutorHub = null
    notificationHub = null
    notificationHubBound = false

    // Clear all inflight requests
    inflightLesson.clear()
    inflightChapter.clear()
    inflightTask.clear()
    inflightQuiz.clear()
    inflightSummary.clear()
    inflightLearningPath.clear()
    inflightChapterSkeleton.clear()
    inflightChapterMentorSkeleton.clear()
    inflightMentorLessonContent.clear()
    inflightSingleTask.clear()
    inflightSingleQuizSkeleton.clear()
    inflightSingleQuizQuestion.clear()
    inflightQuizSkeleton.clear()
    inflightLearningPathSuggestions.clear()
    inflightAdoptSuggestedPath.clear()
    inflightSuggestionPreview.clear()
    inflightBulkGeneration.clear()
    inflightTutorMessages.clear()
    inflightTutorMessageHistory.clear()
    inflightTutorSummaryHistory.clear()
    inflightTutorConversationResolve.clear()
    notificationReceiveListeners.clear()
    notificationUnreadCountListeners.clear()
  } catch {
    // ignore
  }
}

// Function to force reconnect all hubs (useful when token changes)
export async function reconnectHubs(): Promise<void> {
  await disconnectHubs()
  // Hubs will be recreated automatically on next use with new token
}

// ===========================================================================
// ===  BATCH / CONCURRENT GENERATION HELPERS  ================================
// ===========================================================================
// These functions fire N invocations simultaneously and return results keyed
// by resource ID.  They reuse all existing single-item functions so the
// single-flight guards, ID-routing, and error semantics stay identical.
//
// Return value: Map<key, { status: 'fulfilled' | 'rejected'; value?: any; reason?: Error }>
// Per-item callbacks fire as soon as each item settles — callers can update UI
// incrementally without waiting for the slowest item.

export type BatchSettledEntry = {
  status: 'fulfilled' | 'rejected'
  value?: any
  reason?: Error
}

// ---------------------------------------------------------------------------
// 1. requestMultipleLessonContents
//    Concurrent lesson-content + quiz-skeleton generation.
// ---------------------------------------------------------------------------
export async function requestMultipleLessonContents(
  lessonIds: string[],
  callbacks?: {
    onItemLoading?: (lessonId: string) => void
    onItemSuccess?: (lessonId: string, result: any) => void
    onItemError?: (lessonId: string, err: Error) => void
    onQuizEvent?: {
      onLoading?: (lessonId: string) => void
      onSuccess?: (lessonId: string, quizData: any) => void
      onError?: (lessonId: string, err: any) => void
    }
  }
): Promise<Map<string, BatchSettledEntry>> {
  const results = new Map<string, BatchSettledEntry>()
  if (!lessonIds || lessonIds.length === 0) return results

  const tasks = lessonIds.map(async (lessonId) => {
    try {
      const result = await requestLessonContent(
        lessonId,
        callbacks?.onItemLoading ? () => callbacks.onItemLoading!(lessonId) : undefined,
        callbacks?.onQuizEvent
          ? {
              onLoading: callbacks.onQuizEvent.onLoading
                ? () => callbacks.onQuizEvent!.onLoading!(lessonId)
                : undefined,
              onSuccess: callbacks.onQuizEvent.onSuccess
                ? (quizData: any) => callbacks.onQuizEvent!.onSuccess!(lessonId, quizData)
                : undefined,
              onError: callbacks.onQuizEvent.onError
                ? (err: any) => callbacks.onQuizEvent!.onError!(lessonId, err)
                : undefined,
            }
          : undefined,
      )
      results.set(lessonId, { status: 'fulfilled', value: result })
      callbacks?.onItemSuccess?.(lessonId, result)
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err?.message ?? err ?? 'Unknown error'))
      results.set(lessonId, { status: 'rejected', reason: error })
      callbacks?.onItemError?.(lessonId, error)
    }
  })

  await Promise.allSettled(tasks)
  return results
}

// ---------------------------------------------------------------------------
// 2. requestMultipleMentorLessonContents
//    Same as above but via RequestMentorLessonContent (mentor-only).
// ---------------------------------------------------------------------------
export async function requestMultipleMentorLessonContents(
  lessonIds: string[],
  callbacks?: {
    onItemLoading?: (lessonId: string) => void
    onItemSuccess?: (lessonId: string, result: any) => void
    onItemError?: (lessonId: string, err: Error) => void
  }
): Promise<Map<string, BatchSettledEntry>> {
  const results = new Map<string, BatchSettledEntry>()
  if (!lessonIds || lessonIds.length === 0) return results

  const tasks = lessonIds.map(async (lessonId) => {
    try {
      const result = await requestMentorLessonContent(
        lessonId,
        callbacks?.onItemLoading ? () => callbacks.onItemLoading!(lessonId) : undefined,
      )
      results.set(lessonId, { status: 'fulfilled', value: result })
      callbacks?.onItemSuccess?.(lessonId, result)
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err?.message ?? err ?? 'Unknown error'))
      results.set(lessonId, { status: 'rejected', reason: error })
      callbacks?.onItemError?.(lessonId, error)
    }
  })

  await Promise.allSettled(tasks)
  return results
}

// ---------------------------------------------------------------------------
// 3. requestMultipleTasks
//    Concurrent single-task generation across multiple (chapterId, taskType) pairs.
//    Key in result Map: `${chapterId}:${taskType}:${title ?? ''}`
// ---------------------------------------------------------------------------
export type MultiTaskRequest = {
  chapterId: string
  title?: string | null
  taskType: number
}

export async function requestMultipleTasks(
  requests: MultiTaskRequest[],
  callbacks?: {
    onItemLoading?: (chapterId: string, taskType: number) => void
    onItemSuccess?: (key: string, chapterId: string, result: any) => void
    onItemError?: (key: string, chapterId: string, err: Error) => void
  }
): Promise<Map<string, BatchSettledEntry>> {
  const results = new Map<string, BatchSettledEntry>()
  if (!requests || requests.length === 0) return results

  const tasks = requests.map(async ({ chapterId, title, taskType }) => {
    const normalizedTitle = title == null ? '' : String(title).trim()
    const key = `${chapterId}:${taskType}:${normalizedTitle.toLowerCase()}`
    try {
      const result = await requestSingleTask(
        chapterId,
        title ?? null,
        taskType,
        callbacks?.onItemLoading ? () => callbacks.onItemLoading!(chapterId, taskType) : undefined,
      )
      results.set(key, { status: 'fulfilled', value: result })
      callbacks?.onItemSuccess?.(key, chapterId, result)
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err?.message ?? err ?? 'Unknown error'))
      results.set(key, { status: 'rejected', reason: error })
      callbacks?.onItemError?.(key, chapterId, error)
    }
  })

  await Promise.allSettled(tasks)
  return results
}

// ---------------------------------------------------------------------------
// 4. requestChapterTasksById (internal helper)
//    Wrapper around requestChapterTasks that strictly filters incoming events
//    by chapterId — safe to call N times in parallel for different chapters.
//    For backward compat, the public requestChapterTasks is unchanged.
// ---------------------------------------------------------------------------
async function requestChapterTasksById(
  chapterId: string,
  onLoading?: () => void,
): Promise<any> {
  if (!isGuid(chapterId)) {
    return Promise.reject(new Error('chapterId must be a valid GUID'))
  }

  // Reuse the existing single-flight map — same key as requestChapterTasks
  if (inflightTask.has(chapterId)) {
    return inflightTask.get(chapterId)!
  }

  const p = (async () => {
    const hub = await getTaskHub()

    return new Promise<any>((resolve, reject) => {
      let done = false

      const isMatchingPayload = (payload: any): boolean => {
        const payloadChapterId = getPayloadCorrelationId(payload, ['chapterId', 'ChapterId'])
        return !!payloadChapterId && payloadChapterId === chapterId
      }

      const cleanup = () => {
        hub.off('ChapterTasksLoading', handleLoading)
        hub.off('ReceiveChapterTasks', handleContent)
        hub.off('ChapterTasksError', handleError)
        inflightTask.delete(chapterId)
      }

      const handleLoading = (data: any) => {
        if (data && !isMatchingPayload(data)) return
        onLoading?.()
      }

      const handleContent = (tasks: any) => {
        if (!isMatchingPayload(tasks)) return
        if (done) return
        done = true
        cleanup()
        clearTo()
        resolve(tasks)
      }

      const handleError = (err: any) => {
        if (!isMatchingPayload(err)) return
        if (done) return
        done = true
        cleanup()
        clearTo()
        reject(new Error(resolveHubErrorMessage(err, 'Failed to load chapter tasks')))
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

// ---------------------------------------------------------------------------
// 5. requestMultipleChapterTasks
//    Concurrent full-chapter-tasks generation for multiple chapters.
//    Key in result Map: chapterId
// ---------------------------------------------------------------------------
export async function requestMultipleChapterTasks(
  chapterIds: string[],
  callbacks?: {
    onItemLoading?: (chapterId: string) => void
    onItemSuccess?: (chapterId: string, result: any) => void
    onItemError?: (chapterId: string, err: Error) => void
  }
): Promise<Map<string, BatchSettledEntry>> {
  const results = new Map<string, BatchSettledEntry>()
  if (!chapterIds || chapterIds.length === 0) return results

  const tasks = chapterIds.map(async (chapterId) => {
    try {
      const result = await requestChapterTasksById(
        chapterId,
        callbacks?.onItemLoading ? () => callbacks.onItemLoading!(chapterId) : undefined,
      )
      results.set(chapterId, { status: 'fulfilled', value: result })
      callbacks?.onItemSuccess?.(chapterId, result)
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err?.message ?? err ?? 'Unknown error'))
      results.set(chapterId, { status: 'rejected', reason: error })
      callbacks?.onItemError?.(chapterId, error)
    }
  })

  await Promise.allSettled(tasks)
  return results
}

// ---------------------------------------------------------------------------
// 6. requestMultipleQuizSkeletons
//    Concurrent quiz-skeleton generation (RequestSingleQuizSkeleton × N).
//    Key in result Map: lessonId
// ---------------------------------------------------------------------------
export async function requestMultipleQuizSkeletons(
  lessonIds: string[],
  callbacks?: {
    onItemLoading?: (lessonId: string) => void
    onItemSuccess?: (lessonId: string, result: any) => void
    onItemError?: (lessonId: string, err: Error) => void
  }
): Promise<Map<string, BatchSettledEntry>> {
  const results = new Map<string, BatchSettledEntry>()
  if (!lessonIds || lessonIds.length === 0) return results

  const tasks = lessonIds.map(async (lessonId) => {
    try {
      const result = await requestSingleQuizSkeleton(
        lessonId,
        callbacks?.onItemLoading ? () => callbacks.onItemLoading!(lessonId) : undefined,
      )
      results.set(lessonId, { status: 'fulfilled', value: result })
      callbacks?.onItemSuccess?.(lessonId, result)
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err?.message ?? err ?? 'Unknown error'))
      results.set(lessonId, { status: 'rejected', reason: error })
      callbacks?.onItemError?.(lessonId, error)
    }
  })

  await Promise.allSettled(tasks)
  return results
}

// ---------------------------------------------------------------------------
// 7. requestMultipleQuizQuestions
//    Concurrent single-question generation (RequestSingleQuizQuestion × N).
//    Key in result Map: `${quizId}:${questionType}`
// ---------------------------------------------------------------------------
export type MultiQuizRequest = {
  quizId: string
  questionType: number
}

export async function requestMultipleQuizQuestions(
  requests: MultiQuizRequest[],
  callbacks?: {
    onItemLoading?: (quizId: string, questionType: number) => void
    onItemSuccess?: (key: string, quizId: string, result: any) => void
    onItemError?: (key: string, quizId: string, err: Error) => void
  }
): Promise<Map<string, BatchSettledEntry>> {
  const results = new Map<string, BatchSettledEntry>()
  if (!requests || requests.length === 0) return results

  const tasks = requests.map(async ({ quizId, questionType }) => {
    const key = `${quizId}:${questionType}`
    try {
      const result = await requestSingleQuizQuestion(
        quizId,
        questionType,
        callbacks?.onItemLoading ? () => callbacks.onItemLoading!(quizId, questionType) : undefined,
      )
      results.set(key, { status: 'fulfilled', value: result })
      callbacks?.onItemSuccess?.(key, quizId, result)
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err?.message ?? err ?? 'Unknown error'))
      results.set(key, { status: 'rejected', reason: error })
      callbacks?.onItemError?.(key, quizId, error)
    }
  })

  await Promise.allSettled(tasks)
  return results
}

// ---------------------------------------------------------------------------
// 8. requestMultipleQuizQuestionsForQuiz
//    Convenience: generate ALL question types at once for a single quiz.
//    questionTypes defaults to [0,1,2,3,4,5] (all types).
// ---------------------------------------------------------------------------
export async function requestMultipleQuizQuestionsForQuiz(
  quizId: string,
  questionTypes: number[] = [0, 1, 2, 3, 4, 5],
  callbacks?: {
    onItemLoading?: (questionType: number) => void
    onItemSuccess?: (questionType: number, result: any) => void
    onItemError?: (questionType: number, err: Error) => void
  }
): Promise<Map<number, BatchSettledEntry>> {
  const results = new Map<number, BatchSettledEntry>()
  if (!isGuid(quizId) || questionTypes.length === 0) return results

  const tasks = questionTypes.map(async (questionType) => {
    try {
      const result = await requestSingleQuizQuestion(
        quizId,
        questionType,
        callbacks?.onItemLoading ? () => callbacks.onItemLoading!(questionType) : undefined,
      )
      results.set(questionType, { status: 'fulfilled', value: result })
      callbacks?.onItemSuccess?.(questionType, result)
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err?.message ?? err ?? 'Unknown error'))
      results.set(questionType, { status: 'rejected', reason: error })
      callbacks?.onItemError?.(questionType, error)
    }
  })

  await Promise.allSettled(tasks)
  return results
}

// ==== Request goal supplement learning path (SignalR) ====
export async function requestGoalSupplementLearningPath(
  sourcePathId: string,
  goalId: string,
  options?: {
    complexityLevel?: string
    languageSelection?: number
    saveAsDraft?: boolean
    onStarted?: (data: { sourcePathId: string; goalId: string }) => void
    onCreated?: (data: {
      sourcePathId: string
      goalId: string
      currentProgressPercent: number
      remainingPercent: number
      learningPath: any
    }) => void
    onCompleted?: (data: {
      sourcePathId: string
      goalId: string
      currentProgressPercent: number
      remainingPercent: number
      pathId: string
      message: string
    }) => void
    onError?: (data: { errorCode: string; errorMessage: string }) => void
  }
): Promise<{ pathId: string; learningPath?: any }> {
  const hub = await getLearningPathHub()

  return new Promise((resolve, reject) => {
    let done = false

    const isMatchingPayload = (payload: any): boolean => {
      const pSourcePathId = String(payload?.sourcePathId ?? payload?.SourcePathId ?? '').trim()
      const pGoalId = String(payload?.goalId ?? payload?.GoalId ?? '').trim()
      if (pSourcePathId && pSourcePathId !== sourcePathId) return false
      if (pGoalId && pGoalId !== goalId) return false
      return true
    }

    const cleanup = () => {
      hub.off('GoalSupplementLearningPathGenerationStarted', handleStarted)
      hub.off('GoalSupplementLearningPathCreated', handleCreated)
      hub.off('GoalSupplementLearningPathGenerationCompleted', handleCompleted)
      hub.off('GoalSupplementLearningPathGenerationError', handleError)
    }

    const handleStarted = (payload: any) => {
      if (!isMatchingPayload(payload)) return
      debugSignalR('supplement.started', 'GoalSupplementLearningPathGenerationStarted', payload)
      options?.onStarted?.({ sourcePathId: payload.sourcePathId, goalId: payload.goalId })
    }

    const handleCreated = (payload: any) => {
      if (!isMatchingPayload(payload)) return
      debugSignalR('supplement.created', 'GoalSupplementLearningPathCreated', payload)
      options?.onCreated?.({
        sourcePathId: payload.sourcePathId,
        goalId: payload.goalId,
        currentProgressPercent: payload.currentProgressPercent,
        remainingPercent: payload.remainingPercent,
        learningPath: payload.learningPath,
      })
    }

    const handleCompleted = (payload: any) => {
      if (!isMatchingPayload(payload)) return
      debugSignalR('supplement.completed', 'GoalSupplementLearningPathGenerationCompleted', payload)
      if (done) return
      done = true
      cleanup()
      clearTo()
      resolve({
        pathId: String(payload.pathId ?? payload.learningPath?.pathId ?? ''),
        learningPath: payload.learningPath,
      })
      options?.onCompleted?.({
        sourcePathId: payload.sourcePathId,
        goalId: payload.goalId,
        currentProgressPercent: payload.currentProgressPercent,
        remainingPercent: payload.remainingPercent,
        pathId: payload.pathId,
        message: payload.message,
      })
    }

    const handleError = (payload: any) => {
      if (!isMatchingPayload(payload)) return
      debugSignalR('supplement.error', 'GoalSupplementLearningPathGenerationError', payload)
      if (done) return
      done = true
      cleanup()
      clearTo()
      const msg = resolveHubErrorMessage(payload, 'Failed to generate supplement learning path')
      reject(new Error(msg))
      options?.onError?.({ errorCode: payload.errorCode ?? '', errorMessage: msg })
    }

    const to = setTimeout(() => {
      if (done) return
      done = true
      cleanup()
      reject(new Error('Supplement learning path generation timeout'))
    }, REQUEST_TIMEOUT)

    const clearTo = () => { try { clearTimeout(to) } catch { } }

    hub.on('GoalSupplementLearningPathGenerationStarted', handleStarted)
    hub.on('GoalSupplementLearningPathCreated', handleCreated)
    hub.on('GoalSupplementLearningPathGenerationCompleted', handleCompleted)
    hub.on('GoalSupplementLearningPathGenerationError', handleError)

    try {
      hub.invoke(
        'RequestGoalSupplementLearningPath',
        sourcePathId,
        goalId,
        options?.complexityLevel ?? null,
        options?.languageSelection ?? null,
        options?.saveAsDraft ?? false,
      ).catch(handleError)
    } catch (err) {
      handleError(err)
    }
  })
}
