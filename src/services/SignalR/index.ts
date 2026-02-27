import * as signalR from '@microsoft/signalr'
import useAuthStore from '../../store/useAuthStore'

// ==== Hub URLs ====
const rawBase = (import.meta.env.VITE_API_BASE_URL as string)
  || (import.meta.env.VITE_BASE_URL as string)
  || (import.meta.env.PROD ? 'https://pplp.click/api' : '')
const trimmed = (rawBase || '').replace(/\/+$/, '')
const isDev = typeof window !== 'undefined' && import.meta.env.DEV
const isVercel = typeof window !== 'undefined' && /vercel\.app$/i.test(window.location.hostname)
const HUB_BASE = (isDev || isVercel)
  ? '' // same-origin in dev & vercel; rely on rewrites
  : trimmed
    ? (trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed)
    : ''

const LESSON_HUB_URL = `${HUB_BASE}/hubs/lesson`
const CHAPTER_HUB_URL = `${HUB_BASE}/hubs/chapter`
const REQUEST_TIMEOUT = 120000 // 2m timeout

// ==== State ====
let lessonHub: signalR.HubConnection | null = null
let chapterHub: signalR.HubConnection | null = null

// single-flight guards (avoid duplicate invokes for the same id)
const inflightLesson = new Map<string, Promise<any>>()
const inflightChapter = new Map<string, Promise<any>>()

// ==== Utils ====
function getToken(): string | undefined {
  try { return useAuthStore.getState().token ?? undefined } catch { return undefined }
}

function isGuid(value: any): value is string {
  return typeof value === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)
}

async function ensureStarted(conn: signalR.HubConnection, _name: string) {
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
    const clearTo = () => { try { clearTimeout(to) } catch {} }

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
    const clearTo = () => { try { clearTimeout(to) } catch {} }
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

export async function disconnectHubs(): Promise<void> {
  try {
    if (lessonHub && lessonHub.state !== signalR.HubConnectionState.Disconnected) {
      await lessonHub.stop()
    }
    if (chapterHub && chapterHub.state !== signalR.HubConnectionState.Disconnected) {
      await chapterHub.stop()
    }
  } catch {
    // ignore
  }
}