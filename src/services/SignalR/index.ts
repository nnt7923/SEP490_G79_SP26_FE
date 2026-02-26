import * as signalR from '@microsoft/signalr'
import useAuthStore from '../../store/useAuthStore'

// Determine hub base URL with production fallback
const rawBase = (import.meta.env.VITE_API_BASE_URL as string)
  || (import.meta.env.VITE_BASE_URL as string)
  || (import.meta.env.PROD ? 'https://pplp.click/api' : '')
const trimmed = (rawBase || '').replace(/\/+$/, '')
const isDev = typeof window !== 'undefined' && import.meta.env.DEV
const HUB_BASE = isDev
  ? ''
  : trimmed
    ? (trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed)
    : 'https://pplp.click'

const LESSON_HUB_URL = `${HUB_BASE}/hubs/lesson`
const CHAPTER_HUB_URL = `${HUB_BASE}/hubs/chapter`
const REQUEST_TIMEOUT = 120000 // 2 minutes timeout

let lessonHub: signalR.HubConnection | null = null
let chapterHub: signalR.HubConnection | null = null

function getToken(): string | undefined {
  try { return useAuthStore.getState().token ?? undefined } catch { return undefined }
}

async function ensureStarted(conn: signalR.HubConnection) {
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    await conn.start()
  }
}

export async function getLessonHub(): Promise<signalR.HubConnection> {
  if (!lessonHub) {
    lessonHub = new signalR.HubConnectionBuilder()
      .withUrl(LESSON_HUB_URL, {
        accessTokenFactory: () => getToken() || '',
        withCredentials: true,
      } as signalR.IHttpConnectionOptions)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount === 0) return 0
          return Math.min(1000 << retryContext.previousRetryCount, 30000)
        },
      })
      .configureLogging(signalR.LogLevel.None)
      .build()
  }
  await ensureStarted(lessonHub)
  return lessonHub
}

export async function getChapterHub(): Promise<signalR.HubConnection> {
  if (!chapterHub) {
    chapterHub = new signalR.HubConnectionBuilder()
      .withUrl(CHAPTER_HUB_URL, {
        accessTokenFactory: () => getToken() || '',
        withCredentials: true,
      } as signalR.IHttpConnectionOptions)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount === 0) return 0
          return Math.min(1000 << retryContext.previousRetryCount, 30000)
        },
      })
      .configureLogging(signalR.LogLevel.None)
      .build()
  }
  await ensureStarted(chapterHub)
  return chapterHub
}

export async function requestLessonContent(
  lessonId: string,
  onLoading?: () => void,
): Promise<any> {
  const hub = await getLessonHub()

  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let isResolved = false

    const handleLoadingStart = () => {
      onLoading?.()
    }

    const handleContent = (content: any) => {
      if (isResolved) return
      isResolved = true

      if (timeoutId) clearTimeout(timeoutId)
      hub.off('LessonContentLoading', handleLoadingStart)
      hub.off('ReceiveLessonContent', handleContent)
      hub.off('LessonContentError', handleError)

      resolve(content)
    }

    const handleError = (error: any) => {
      if (isResolved) return
      isResolved = true

      if (timeoutId) clearTimeout(timeoutId)
      hub.off('LessonContentLoading', handleLoadingStart)
      hub.off('ReceiveLessonContent', handleContent)
      hub.off('LessonContentError', handleError)

      reject(new Error(error?.message || 'Failed to load lesson content'))
    }

    // Setup timeout
    timeoutId = setTimeout(() => {
      if (isResolved) return
      isResolved = true

      hub.off('LessonContentLoading', handleLoadingStart)
      hub.off('ReceiveLessonContent', handleContent)
      hub.off('LessonContentError', handleError)

      reject(new Error('Lesson content request timeout'))
    }, REQUEST_TIMEOUT)

    // Register event listeners
    hub.on('LessonContentLoading', handleLoadingStart)
    hub.on('ReceiveLessonContent', handleContent)
    hub.on('LessonContentError', handleError)

    // Send request
    try {
      hub.invoke('RequestLessonContent', lessonId).catch((err) => {
        handleError(err)
      })
    } catch (err) {
      handleError(err)
    }
  })
}

export async function requestChapterContent(
  chapterId: string,
  onLoading?: () => void,
): Promise<any> {
  const hub = await getChapterHub()

  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let isResolved = false

    const handleLoadingStart = () => {
      onLoading?.()
    }

    const handleContent = (content: any) => {
      if (isResolved) return
      isResolved = true

      if (timeoutId) clearTimeout(timeoutId)
      hub.off('ChapterContentLoading', handleLoadingStart)
      hub.off('ReceiveChapterContent', handleContent)
      hub.off('ChapterContentError', handleError)

      resolve(content)
    }

    const handleError = (error: any) => {
      if (isResolved) return
      isResolved = true

      if (timeoutId) clearTimeout(timeoutId)
      hub.off('ChapterContentLoading', handleLoadingStart)
      hub.off('ReceiveChapterContent', handleContent)
      hub.off('ChapterContentError', handleError)

      reject(new Error(error?.message || 'Failed to load chapter content'))
    }

    // Setup timeout
    timeoutId = setTimeout(() => {
      if (isResolved) return
      isResolved = true

      hub.off('ChapterContentLoading', handleLoadingStart)
      hub.off('ReceiveChapterContent', handleContent)
      hub.off('ChapterContentError', handleError)

      reject(new Error('Chapter content request timeout'))
    }, REQUEST_TIMEOUT)

    // Register event listeners
    hub.on('ChapterContentLoading', handleLoadingStart)
    hub.on('ReceiveChapterContent', handleContent)
    hub.on('ChapterContentError', handleError)

    // Send request
    try {
      hub.invoke('RequestChapterContent', chapterId).catch((err) => {
        handleError(err)
      })
    } catch (err) {
      handleError(err)
    }
  })
}

export async function disconnectHubs(): Promise<void> {
  try {
    if (lessonHub && lessonHub.state === signalR.HubConnectionState.Connected) {
      await lessonHub.stop()
    }
    if (chapterHub && chapterHub.state === signalR.HubConnectionState.Connected) {
      await chapterHub.stop()
    }
  } catch {
    // ignore
  }
}