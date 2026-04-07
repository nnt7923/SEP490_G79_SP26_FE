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

  if (code === 'CHAPTER_TASK_REQUIRED') {
    return t('chat.shareMissingChapterTask', {
      defaultValue: 'Mỗi chapter phải có ít nhất 1 task trước khi chia sẻ.',
    })
  }

  if (code === 'LESSON_QUIZ_REQUIRED') {
    return t('chat.shareMissingLessonQuiz', {
      defaultValue: 'Mỗi lesson phải có ít nhất 1 quiz trước khi chia sẻ.',
    })
  }

  if (apiMessage) return apiMessage

  return fallback
}
