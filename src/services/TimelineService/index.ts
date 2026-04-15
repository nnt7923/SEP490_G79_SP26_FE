import api from '../Axios'

export interface TimelineQuery {
  fromUtc?: string
  toUtc?: string
  learningPathId?: string
  onlyActivePaths?: boolean
}

export interface TimelineItem {
  itemId: string
  itemType: 'Lesson' | 'Task' | 'Quiz' | string
  title: string
  dueAtUtc?: string | null
  learningPathId?: string | null
  learningPathTitle?: string | null
  chapterId?: string | null
  chapterTitle?: string | null
  lessonId?: string | null
  status?: string | null
  isCompleted: boolean
  isOverdue: boolean
  priority?: string | number | null
  [key: string]: any
}

export interface TimelineResponse {
  fromUtc?: string
  toUtc?: string
  totalItems: number
  overdueItems: number
  items: TimelineItem[]
}

function unwrapResponse<T>(res: any): T {
  const data = res?.data ?? res
  if (data && typeof data === 'object') {
    if ('value' in data) return data.value as T
    if ('data' in data && data?.data && typeof data.data === 'object' && 'value' in data.data) {
      return data.data.value as T
    }
  }
  return data as T
}

function normalizeTimeline(raw: any): TimelineResponse {
  const items = Array.isArray(raw?.items) ? raw.items : []
  return {
    fromUtc: raw?.fromUtc,
    toUtc: raw?.toUtc,
    totalItems: Number(raw?.totalItems ?? items.length ?? 0),
    overdueItems: Number(raw?.overdueItems ?? items.filter((item: any) => item?.isOverdue).length ?? 0),
    items: items.map((item: any) => ({
      ...item,
      itemId: String(item?.itemId ?? item?.id ?? ''),
      itemType: String(item?.itemType ?? 'Other'),
      title: String(item?.title ?? ''),
      dueAtUtc: item?.dueAtUtc ?? null,
      learningPathId: item?.learningPathId ?? null,
      learningPathTitle: item?.learningPathTitle ?? null,
      chapterId: item?.chapterId ?? null,
      chapterTitle: item?.chapterTitle ?? null,
      lessonId: item?.lessonId ?? null,
      status: item?.status ?? null,
      isCompleted: Boolean(item?.isCompleted),
      isOverdue: Boolean(item?.isOverdue),
      priority: item?.priority ?? null,
    })),
  }
}

export async function getTimeline(query?: TimelineQuery): Promise<TimelineResponse> {
  const params: Record<string, any> = {}
  if (query?.fromUtc) params.fromUtc = query.fromUtc
  if (query?.toUtc) params.toUtc = query.toUtc
  if (query?.learningPathId) params.learningPathId = query.learningPathId
  if (typeof query?.onlyActivePaths === 'boolean') params.onlyActivePaths = query.onlyActivePaths

  const hasParams = Object.keys(params).length > 0
  const res: any = hasParams
    ? await api.get('/timeline', { params })
    : await api.get('/timeline')

  const raw = unwrapResponse<any>(res)
  return normalizeTimeline(raw)
}

export default {
  getTimeline,
}
