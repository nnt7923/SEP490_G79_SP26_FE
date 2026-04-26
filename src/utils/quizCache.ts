type AnyRecord = Record<string, any>

const QUIZ_SKELETON_KEY = (lessonId: string) => `quizSkeleton:${lessonId}`

export function readQuizSkeletonCache(lessonId: string): AnyRecord | null {
  try {
    const raw = sessionStorage.getItem(QUIZ_SKELETON_KEY(lessonId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeQuizSkeletonCache(lessonId: string, data: AnyRecord): void {
  try {
    sessionStorage.setItem(QUIZ_SKELETON_KEY(lessonId), JSON.stringify(data))
  } catch {
    // ignore
  }
}

export function clearQuizSkeletonCache(lessonId: string): void {
  try {
    sessionStorage.removeItem(QUIZ_SKELETON_KEY(lessonId))
  } catch {
    // ignore
  }
}

export function clearAllQuizSkeletonCaches(): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith('quizSkeleton:')) keysToRemove.push(key)
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    // ignore
  }
}

const quizKey = (q: AnyRecord) => q?.id ?? q?.quizId ?? q?.quizzId ?? q?.title ?? ''

export function normalizeQuizList(input: any): AnyRecord[] {
  const list = Array.isArray(input)
    ? input
    : (input?.quizzes || input?.Quizzes || [])
  if (!Array.isArray(list)) return []
  return list.map((q: AnyRecord) => ({
    ...q,
    id: q?.id ?? q?.quizId ?? q?.quizzId,
    quizId: q?.quizId ?? q?.id ?? q?.quizzId,
    title: q?.title ?? q?.name,
    description: q?.description ?? q?.desc ?? null,
  })).filter((q: AnyRecord) => q?.id || q?.quizId || q?.title)
}

const sameQuizList = (a: AnyRecord[] | undefined, b: AnyRecord[]) => {
  if (!Array.isArray(a)) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (quizKey(a[i]) !== quizKey(b[i])) return false
  }
  return true
}

const mergeLessons = (lessons: AnyRecord[]) => {
  let changed = false
  const updated = lessons.map((ls: AnyRecord) => {
    const lessonId = ls?.lessonId ?? ls?.id
    if (!lessonId) return ls
    const cached = readQuizSkeletonCache(lessonId)
    const cachedList = normalizeQuizList(cached)
    if (cachedList.length === 0) return ls
    if (sameQuizList(ls?.quizzes, cachedList)) return ls
    changed = true
    return {
      ...ls,
      quizzes: cachedList,
      quizCount: cachedList.length,
    }
  })
  return { lessons: updated, changed }
}

export function mergeSkeletonWithCachedQuizzes(skeleton: AnyRecord | null): AnyRecord | null {
  if (!skeleton) return skeleton

  let changed = false
  const chaptersArray = skeleton.chapters || skeleton.chapterDtos
  let updatedChapters = chaptersArray

  if (Array.isArray(chaptersArray)) {
    updatedChapters = chaptersArray.map((ch: AnyRecord) => {
      if (!Array.isArray(ch?.lessons)) return ch
      const res = mergeLessons(ch.lessons)
      if (!res.changed) return ch
      changed = true
      return { ...ch, lessons: res.lessons }
    })
  }

  let updatedLessons = skeleton.lessons
  if (Array.isArray(skeleton.lessons)) {
    const res = mergeLessons(skeleton.lessons)
    if (res.changed) {
      changed = true
      updatedLessons = res.lessons
    }
  }

  if (!changed) return skeleton

  return {
    ...skeleton,
    chapters: skeleton.chapters ? updatedChapters : undefined,
    chapterDtos: skeleton.chapterDtos ? updatedChapters : undefined,
    lessons: updatedLessons,
  }
}
