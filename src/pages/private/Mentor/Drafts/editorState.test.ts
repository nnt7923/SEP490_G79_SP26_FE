import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../services', () => ({
  LanguageSelection: {
    Vietnamese: 1,
    English: 2,
  },
}))

import { hydrateDraftForm, parseQuizSkeletonPayload } from './editorState'

describe('editorState quiz skeleton parsing', () => {
  it('parses a direct quiz array payload', () => {
    const result = parseQuizSkeletonPayload([
      { quizId: 'quiz-1', title: 'Variables', description: 'Basics' },
      { quizzId: 'quiz-2', title: 'Loops', description: 'Practice' },
    ])

    expect(result.hasQuizArray).toBe(true)
    expect(result.rawItemCount).toBe(2)
    expect(result.items).toEqual([
      { persistedId: 'quiz-1', title: 'Variables', description: 'Basics' },
      { persistedId: 'quiz-2', title: 'Loops', description: 'Practice' },
    ])
  })

  it('parses wrapped PascalCase payloads with alternate field names', () => {
    const result = parseQuizSkeletonPayload({
      Quizzes: [
        { QuizId: 'quiz-3', Name: 'Functions', Desc: 'Scope and return values' },
      ],
    })

    expect(result.hasQuizArray).toBe(true)
    expect(result.rawItemCount).toBe(1)
    expect(result.items).toEqual([
      { persistedId: 'quiz-3', title: 'Functions', description: 'Scope and return values' },
    ])
  })

  it('parses nested value/data wrappers before reading quiz arrays', () => {
    const result = parseQuizSkeletonPayload({
      value: {
        Items: [
          { id: 'quiz-4', Title: 'Arrays', Description: 'Array methods' },
        ],
      },
    })

    expect(result.hasQuizArray).toBe(true)
    expect(result.rawItemCount).toBe(1)
    expect(result.items).toEqual([
      { persistedId: 'quiz-4', title: 'Arrays', description: 'Array methods' },
    ])
  })

  it('finds quiz arrays nested in non-standard wrapper keys', () => {
    const result = parseQuizSkeletonPayload({
      payload: {
        quizSkeleton: {
          data: {
            list: {
              Quizzes: [
                { QuizId: 'quiz-5', Title: 'Objects', Description: 'Object literals' },
              ],
            },
          },
        },
      },
    })

    expect(result.hasQuizArray).toBe(true)
    expect(result.rawItemCount).toBe(1)
    expect(result.items).toEqual([
      { persistedId: 'quiz-5', title: 'Objects', description: 'Object literals' },
    ])
  })

  it('keeps object rows to avoid false-empty classification', () => {
    const result = parseQuizSkeletonPayload({
      quizzes: [
        {},
      ],
    })

    expect(result.hasQuizArray).toBe(true)
    expect(result.rawItemCount).toBe(1)
    expect(result.items).toEqual([
      { persistedId: null, title: '', description: '' },
    ])
  })

  it('treats an empty quiz array as empty but valid', () => {
    const result = parseQuizSkeletonPayload({ quizzes: [] })

    expect(result.hasQuizArray).toBe(true)
    expect(result.rawItemCount).toBe(0)
    expect(result.items).toEqual([])
  })

  it('preserves existing lesson quizzes when hydrate payload omits quiz arrays', () => {
    const fallback = {
      subjectId: 'subject-1',
      goals: [{ goalId: 'goal-1', weight: 100 }],
      complexityLevel: 'Beginner' as const,
      languageSelection: 1,
      title: 'Draft',
      description: '',
      startDate: '',
      endDate: '',
      chapters: [
        {
          id: 'chapter-local-1',
          persistedId: 'chapter-1',
          title: 'Chapter 1',
          content: '',
          startDate: '',
          endDate: '',
          estimatedDays: '',
          tasks: [],
          lessons: [
            {
              id: 'lesson-local-1',
              persistedId: 'lesson-1',
              title: 'Lesson 1',
              lessonDay: '',
              sections: {
                overview: 'Overview',
                'core-concepts': '',
                'code-examples': '',
                'common-mistakes': '',
                'best-practices': '',
                summary: '',
              },
              quizzes: [
                {
                  id: 'quiz-local-1',
                  persistedId: 'quiz-1',
                  title: 'Existing quiz',
                  description: 'Keep me',
                  quizQuestionsJson: '{"items":[]}',
                },
              ],
            },
          ],
        },
      ],
    }

    const hydrated = hydrateDraftForm({
      subjectId: 'subject-1',
      title: 'Draft',
      chapters: [
        {
          id: 'chapter-1',
          title: 'Chapter 1',
          lessons: [
            {
              id: 'lesson-1',
              title: 'Lesson 1',
            },
          ],
        },
      ],
    }, fallback)

    expect(hydrated.chapters[0].lessons[0].quizzes).toEqual(fallback.chapters[0].lessons[0].quizzes)
  })

  it('clears lesson quizzes when hydrate payload explicitly returns an empty quiz array', () => {
    const fallback = {
      subjectId: 'subject-1',
      goals: [{ goalId: 'goal-1', weight: 100 }],
      complexityLevel: 'Beginner' as const,
      languageSelection: 1,
      title: 'Draft',
      description: '',
      startDate: '',
      endDate: '',
      chapters: [
        {
          id: 'chapter-local-1',
          persistedId: 'chapter-1',
          title: 'Chapter 1',
          content: '',
          startDate: '',
          endDate: '',
          estimatedDays: '',
          tasks: [],
          lessons: [
            {
              id: 'lesson-local-1',
              persistedId: 'lesson-1',
              title: 'Lesson 1',
              lessonDay: '',
              sections: {
                overview: 'Overview',
                'core-concepts': '',
                'code-examples': '',
                'common-mistakes': '',
                'best-practices': '',
                summary: '',
              },
              quizzes: [
                {
                  id: 'quiz-local-1',
                  persistedId: 'quiz-1',
                  title: 'Existing quiz',
                  description: 'Keep me',
                  quizQuestionsJson: '{"items":[]}',
                },
              ],
            },
          ],
        },
      ],
    }

    const hydrated = hydrateDraftForm({
      subjectId: 'subject-1',
      title: 'Draft',
      chapters: [
        {
          id: 'chapter-1',
          title: 'Chapter 1',
          lessons: [
            {
              id: 'lesson-1',
              title: 'Lesson 1',
              quizzes: [],
            },
          ],
        },
      ],
    }, fallback)

    expect(hydrated.chapters[0].lessons[0].quizzes).toEqual([])
  })
})
