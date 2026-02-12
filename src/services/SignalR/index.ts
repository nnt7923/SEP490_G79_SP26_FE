import * as signalR from '@microsoft/signalr'
import useAuthStore from '../../store/useAuthStore'

const rawBase = (import.meta.env.VITE_API_BASE_URL as string) || (import.meta.env.VITE_BASE_URL as string) || ''
const trimmed = (rawBase || '').replace(/\/+$/, '')
const isDev = typeof window !== 'undefined' && import.meta.env.DEV
const HUB_BASE = isDev
  ? ''
  : trimmed
    ? (trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed)
    : ''

const LESSON_HUB_URL = `${HUB_BASE}/hubs/lesson`
const CHAPTER_HUB_URL = `${HUB_BASE}/hubs/chapter`

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
      .withAutomaticReconnect()
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
      .withAutomaticReconnect()
      .build()
  }
  await ensureStarted(chapterHub)
  return chapterHub
}

export async function requestLessonContent(lessonId: string): Promise<any> {
  const hub = await getLessonHub()
  return new Promise(async (resolve, reject) => {
    const onLoading = (_msg: any) => { /* optional: handle loading */ }
    const onContent = (content: any) => {
      hub.off('LessonContentLoading', onLoading)
      hub.off('ReceiveLessonContent', onContent)
      hub.off('LessonContentError', onError)
      resolve(content)
    }
    const onError = (err: any) => {
      hub.off('LessonContentLoading', onLoading)
      hub.off('ReceiveLessonContent', onContent)
      hub.off('LessonContentError', onError)
      reject(err)
    }
    hub.on('LessonContentLoading', onLoading)
    hub.on('ReceiveLessonContent', onContent)
    hub.on('LessonContentError', onError)

    try {
      await hub.invoke('RequestLessonContent', lessonId)
    } catch (e) {
      onError(e)
    }
  })
}

export async function requestChapterContent(chapterId: string): Promise<any> {
  const hub = await getChapterHub()
  return new Promise(async (resolve, reject) => {
    const onLoading = (_msg: any) => {}
    const onContent = (content: any) => {
      hub.off('ChapterContentLoading', onLoading)
      hub.off('ReceiveChapterContent', onContent)
      hub.off('ChapterContentError', onError)
      resolve(content)
    }
    const onError = (err: any) => {
      hub.off('ChapterContentLoading', onLoading)
      hub.off('ReceiveChapterContent', onContent)
      hub.off('ChapterContentError', onError)
      reject(err)
    }
    hub.on('ChapterContentLoading', onLoading)
    hub.on('ReceiveChapterContent', onContent)
    hub.on('ChapterContentError', onError)

    try {
      await hub.invoke('RequestChapterContent', chapterId)
    } catch (e) {
      onError(e)
    }
  })
}