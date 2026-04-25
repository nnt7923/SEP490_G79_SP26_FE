type Translate = (key: string, options?: Record<string, unknown>) => string

export function resolveShareToStudentErrorMessage(
  err: any,
  t: Translate,
  fallback: string,
): string {
  const code = String(err?.response?.data?.errorCode || err?.response?.data?.code || '').trim()
  const apiMessage = String(err?.response?.data?.message || err?.response?.data?.errorMessage || '').trim()

  if (code === 'SHARE_ALREADY_PENDING') {
    return t('chat.shareAlreadyPending')
  }

  if (code === 'SHARE_ALREADY_ACCEPTED') {
    return t('errors:codes.SHARE_ALREADY_ACCEPTED', {
      defaultValue: 'This learning path has already been accepted by the student.',
    })
  }

  if (code === 'CHAPTER_TASK_REQUIRED') {
    return t('chat.shareMissingChapterTask', {
      defaultValue: 'Each chapter must have at least 1 task before sharing.',
    })
  }

  if (code === 'LESSON_QUIZ_REQUIRED') {
    return t('chat.shareMissingLessonQuiz', {
      defaultValue: 'Each lesson must have at least 1 quiz before sharing.',
    })
  }

  const normalizedCode = code.toUpperCase()
  const normalizedMessage = apiMessage.toLowerCase()
  if (
    normalizedCode === 'STUDENT_SHARE_RECEPTION_LIMIT_REACHED'
    || normalizedCode === 'SHARE_RECEPTION_LIMIT_REACHED'
    || normalizedCode === 'STUDENT_SHARE_LIMIT_REACHED'
    || normalizedMessage.includes('share reception limit')
  ) {
    return t('chat.shareReceptionLimitReached', {
      defaultValue: 'The student has reached their share reception limit for this subscription.',
    })
  }

  if (apiMessage) return apiMessage

  return fallback
}
