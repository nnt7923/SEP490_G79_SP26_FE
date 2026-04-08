import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../services', () => ({
  LanguageSelection: {
    Vietnamese: 1,
    English: 2,
  },
}))

import {
  buildPayload,
  hydrateDraftForm,
  parseGeneratedQuizQuestionsPayload,
  parseQuizSkeletonPayload,
  validateDraftForm,
} from './editorState'

const sampleQuestionsPayload = {
  questions: [
    {
      questionText: 'Python is a compiled language.',
      type: 0,
      options: ['True', 'False'],
      correctAnswer: 'False',
      points: 1.0,
    },
    {
      questionText: "Given the following code:\nx = [1, 2, 3]\ny = x\ny.append(4)\nWhich statements are true?",
      type: 1,
      options: ['x equals [1, 2, 3, 4]', 'y equals [1, 2, 3, 4]', 'x and y refer to the same object', 'x equals [1, 2, 3]'],
      correctAnswer: 'x equals [1, 2, 3, 4], y equals [1, 2, 3, 4], x and y refer to the same object',
      points: 2.0,
    },
    {
      questionText: "What is the output of this code?\nfor i in range(3):\n    print(i, end=' ')",
      type: 2,
      options: ['1 2 3', '0 1 2', '0 1 2 3', '1 2 3 4'],
      correctAnswer: '0 1 2',
      points: 2.0,
    },
    {
      questionText: 'Match each data type with its example:',
      type: 3,
      options: ['int::42', 'str::hello', 'float::3.14', 'bool::True'],
      correctAnswer: 'int::42,str::hello,float::3.14,bool::True',
      points: 1.5,
    },
    {
      questionText: 'The keyword ___ is used to create a loop that iterates over a sequence in Python.',
      type: 4,
      options: [],
      correctAnswer: 'for',
      points: 1.0,
    },
    {
      questionText: 'Arrange the steps to read a file and process its content in Python:',
      type: 5,
      options: ['Close the file', 'Open the file with open()', 'Process each line', 'Read the content', 'Import necessary modules'],
      correctAnswer: 'Import necessary modules,Open the file with open(),Read the content,Process each line,Close the file',
      points: 2.5,
    },
  ],
}

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
})

describe('editorState question parsing', () => {
  it('parses all six question types from canonical wire format', () => {
    const result = parseGeneratedQuizQuestionsPayload(sampleQuestionsPayload)

    expect(result.hasQuestionArray).toBe(true)
    expect(result.rawItemCount).toBe(6)
    expect(result.items).toHaveLength(6)

    expect(result.items[0]).toMatchObject({
      questionText: 'Python is a compiled language.',
      type: 'TrueFalse',
      options: ['True', 'False'],
      correctAnswer: 'False',
      points: '1',
    })

    expect(result.items[1]).toMatchObject({
      type: 'MultipleChoice',
      selectedAnswers: ['x equals [1, 2, 3, 4]', 'y equals [1, 2, 3, 4]', 'x and y refer to the same object'],
    })

    expect(result.items[2]).toMatchObject({
      type: 'SingleChoice',
      correctAnswer: '0 1 2',
    })

    expect(result.items[3]).toMatchObject({
      type: 'Matching',
      matchingPairs: [
        { id: result.items[3].matchingPairs[0].id, left: 'int', right: '42' },
        { id: result.items[3].matchingPairs[1].id, left: 'str', right: 'hello' },
        { id: result.items[3].matchingPairs[2].id, left: 'float', right: '3.14' },
        { id: result.items[3].matchingPairs[3].id, left: 'bool', right: 'True' },
      ],
    })

    expect(result.items[4]).toMatchObject({
      type: 'FillInTheBlank',
      correctAnswer: 'for',
      options: [],
    })

    expect(result.items[5]).toMatchObject({
      type: 'Ordering',
      orderingSequence: ['Import necessary modules', 'Open the file with open()', 'Read the content', 'Process each line', 'Close the file'],
    })
  })
})

describe('editorState hydrate/build payload', () => {
  it('hydrates quiz dueDate and questions from draft detail payload', () => {
    const hydrated = hydrateDraftForm({
      subjectId: 'subject-1',
      goals: [{ goalId: 'goal-1', weight: 100 }],
      complexityLevel: 2,
      languageSelection: 2,
      title: 'Python Path',
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: '2026-04-30T00:00:00.000Z',
      chapters: [
        {
          id: 'chapter-1',
          title: 'Chapter 1: Variables',
          lessons: [
            {
              id: 'lesson-1',
              title: 'Lesson 1',
              lessonDay: '2026-04-02T00:00:00.000Z',
              content: '## Overview\nIntro',
              quizzes: [
                {
                  id: 'quiz-1',
                  title: 'Quiz 1',
                  description: 'Basics',
                  dueDate: '2026-04-03T00:00:00.000Z',
                  questions: sampleQuestionsPayload.questions,
                },
              ],
            },
          ],
        },
      ],
    })

    expect(hydrated.complexityLevel).toBe('Intermediate')
    expect(hydrated.languageSelection).toBe(2)
    expect(hydrated.chapters[0].title).toBe('Variables')
    expect(hydrated.chapters[0].lessons[0].quizzes[0].dueDate).toBe('2026-04-03')
    expect(hydrated.chapters[0].lessons[0].quizzes[0].questions).toHaveLength(6)
    expect(hydrated.chapters[0].lessons[0].quizzes[0].questions[5].type).toBe('Ordering')
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
                  dueDate: '2026-04-04',
                  questions: parseGeneratedQuizQuestionsPayload(sampleQuestionsPayload).items,
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

  it('builds manual draft payload with string root enums and exact question wire format', () => {
    const form = hydrateDraftForm({
      subjectId: 'subject-1',
      goals: [{ goalId: 'goal-1', weight: 100 }],
      complexityLevel: 'Advanced',
      languageSelection: 2,
      title: 'Python Path',
      description: 'Desc',
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: '2026-04-30T00:00:00.000Z',
      chapters: [
        {
          id: 'chapter-1',
          title: 'Chapter 1',
          startDate: '2026-04-01T00:00:00.000Z',
          endDate: '2026-04-10T00:00:00.000Z',
          estimatedDays: 10,
          tasks: [
            {
              id: 'task-1',
              title: 'Task 1',
              description: 'Do it',
              priority: 3,
              taskStatus: 'Pending',
              dueDate: '2026-04-05T00:00:00.000Z',
              taskType: 2,
              quizQuestionsJson: '{"ok":true}',
            },
          ],
          lessons: [
            {
              id: 'lesson-1',
              title: 'Lesson 1',
              lessonDay: '2026-04-02T00:00:00.000Z',
              content: '## Overview\nIntro',
              quizzes: [
                {
                  id: 'quiz-1',
                  title: 'Quiz 1',
                  description: 'Basics',
                  dueDate: '2026-04-03T00:00:00.000Z',
                  questions: sampleQuestionsPayload.questions,
                },
              ],
            },
          ],
        },
      ],
    })

    const payload = buildPayload(form)

    expect(payload.complexityLevel).toBe('Advanced')
    expect(payload.languageSelection).toBe('English')
    expect(payload.chapters[0].title).toBe('Chapter 1: Chapter 1')
    expect(payload.chapters[0].tasks?.[0]).toMatchObject({
      priority: 3,
      taskType: 2,
      quizQuestionsJson: '{"ok":true}',
    })
    expect(payload.chapters[0].lessons[0].quizzes?.[0]).toMatchObject({
      dueDate: '2026-04-03T00:00:00.000Z',
    })
    expect(payload.chapters[0].lessons[0].quizzes?.[0].questions).toHaveLength(6)
    expect(payload.chapters[0].lessons[0].quizzes?.[0].questions?.[0]).toMatchObject({
      type: 0,
      correctAnswer: 'False',
    })
  })

  it('falls back lessonDay to chapter start date when lesson day is missing', () => {
    const payload = buildPayload({
      subjectId: 'subject-1',
      goals: [{ goalId: 'goal-1', weight: 100 }],
      complexityLevel: 'Beginner',
      languageSelection: 1,
      title: 'Draft',
      description: '',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      chapters: [
        {
          id: 'chapter-local',
          persistedId: null,
          title: 'Chapter',
          content: '',
          startDate: '2026-04-09',
          endDate: '',
          estimatedDays: '',
          tasks: [],
          lessons: [
            {
              id: 'lesson-local',
              persistedId: null,
              title: 'Lesson',
              lessonDay: '',
              sections: {
                overview: '',
                'core-concepts': '',
                'code-examples': '',
                'common-mistakes': '',
                'best-practices': '',
                summary: '',
              },
              quizzes: [],
            },
          ],
        },
      ],
    })

    expect(payload.chapters[0].lessons[0].lessonDay).toBe('2026-04-09T00:00:00.000Z')
  })

  it('auto prefixes chapter numbering on save so mentor does not type Chapter N manually', () => {
    const payload = buildPayload({
      subjectId: 'subject-1',
      goals: [{ goalId: 'goal-1', weight: 100 }],
      complexityLevel: 'Intermediate',
      languageSelection: 1,
      title: 'Draft',
      description: '',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      chapters: [
        {
          id: 'chapter-local-1',
          persistedId: null,
          title: 'React Basics',
          content: '',
          startDate: '',
          endDate: '',
          estimatedDays: '',
          lessons: [],
          tasks: [],
        },
        {
          id: 'chapter-local-2',
          persistedId: null,
          title: 'Chapter 2: State Management',
          content: '',
          startDate: '',
          endDate: '',
          estimatedDays: '',
          lessons: [],
          tasks: [],
        },
      ],
    })

    expect(payload.chapters[0].title).toBe('Chapter 1: React Basics')
    expect(payload.chapters[1].title).toBe('Chapter 2: State Management')
  })

  it('serializes each question type exactly as required', () => {
    const parsed = parseGeneratedQuizQuestionsPayload(sampleQuestionsPayload)
    const payload = buildPayload({
      subjectId: 'subject-1',
      goals: [{ goalId: 'goal-1', weight: 100 }],
      complexityLevel: 'Beginner',
      languageSelection: 1,
      title: 'Draft',
      description: '',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      chapters: [
        {
          id: 'chapter-local',
          persistedId: null,
          title: 'Chapter',
          content: '',
          startDate: '',
          endDate: '',
          estimatedDays: '',
          tasks: [],
          lessons: [
            {
              id: 'lesson-local',
              persistedId: null,
              title: 'Lesson',
              lessonDay: '2026-04-02',
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
                  id: 'quiz-local',
                  persistedId: null,
                  title: 'Quiz',
                  description: '',
                  dueDate: '2026-04-03',
                  questions: parsed.items.map((question, index) => ({
                    ...question,
                    persistedId: `question-${index}`,
                  })),
                },
              ],
            },
          ],
        },
      ],
    })

    expect(payload.chapters[0].lessons[0].quizzes?.[0].questions).toEqual([
      {
        id: 'question-0',
        questionId: 'question-0',
        questionText: 'Python is a compiled language.',
        type: 0,
        options: ['True', 'False'],
        correctAnswer: 'False',
        points: 1,
      },
      {
        id: 'question-1',
        questionId: 'question-1',
        questionText: "Given the following code:\nx = [1, 2, 3]\ny = x\ny.append(4)\nWhich statements are true?",
        type: 1,
        options: ['x equals [1, 2, 3, 4]', 'y equals [1, 2, 3, 4]', 'x and y refer to the same object', 'x equals [1, 2, 3]'],
        correctAnswer: 'x equals [1, 2, 3, 4], y equals [1, 2, 3, 4], x and y refer to the same object',
        points: 2,
      },
      {
        id: 'question-2',
        questionId: 'question-2',
        questionText: "What is the output of this code?\nfor i in range(3):\n    print(i, end=' ')",
        type: 2,
        options: ['1 2 3', '0 1 2', '0 1 2 3', '1 2 3 4'],
        correctAnswer: '0 1 2',
        points: 2,
      },
      {
        id: 'question-3',
        questionId: 'question-3',
        questionText: 'Match each data type with its example:',
        type: 3,
        options: ['int::42', 'str::hello', 'float::3.14', 'bool::True'],
        correctAnswer: 'int::42,str::hello,float::3.14,bool::True',
        points: 1.5,
      },
      {
        id: 'question-4',
        questionId: 'question-4',
        questionText: 'The keyword ___ is used to create a loop that iterates over a sequence in Python.',
        type: 4,
        options: [],
        correctAnswer: 'for',
        points: 1,
      },
      {
        id: 'question-5',
        questionId: 'question-5',
        questionText: 'Arrange the steps to read a file and process its content in Python:',
        type: 5,
        options: ['Close the file', 'Open the file with open()', 'Process each line', 'Read the content', 'Import necessary modules'],
        correctAnswer: 'Import necessary modules,Open the file with open(),Read the content,Process each line,Close the file',
        points: 2.5,
      },
    ])
  })
})

describe('editorState validation', () => {
  const createValidationForm = () => ({
    subjectId: 'subject-1',
    goals: [{ goalId: 'goal-1', weight: 100 }],
    complexityLevel: 'Beginner' as const,
    languageSelection: 1,
    title: 'Draft',
    description: '',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    chapters: [
      {
        id: 'chapter-local',
        persistedId: null,
        title: '',
        content: '',
        startDate: '',
        endDate: '',
        estimatedDays: '',
        tasks: [
          {
            id: 'task-local',
            persistedId: null,
            title: '',
            description: '',
            priority: '',
            taskStatus: 'Pending' as const,
            dueDate: '',
            taskType: 'Practice' as const,
            quizQuestionsJson: '',
          },
        ],
        lessons: [
          {
            id: 'lesson-local',
            persistedId: null,
            title: '',
            lessonDay: '',
            sections: {
              overview: '',
              'core-concepts': '',
              'code-examples': '',
              'common-mistakes': '',
              'best-practices': '',
              summary: '',
            },
            quizzes: [
              {
                id: 'quiz-local',
                persistedId: null,
                title: '',
                description: '',
                dueDate: '',
                questions: [
                  {
                    id: 'question-local',
                    persistedId: null,
                    questionText: '',
                    type: 'MultipleChoice' as const,
                    options: [],
                    correctAnswer: '',
                    points: '',
                    selectedAnswers: [],
                    matchingPairs: [],
                    orderingSequence: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  })

  it('allows saving draft when nested nodes are empty placeholders', () => {
    const validationMessage = validateDraftForm(createValidationForm())

    expect(validationMessage).toBeNull()
  })

  it('requires start date at root level', () => {
    const form = createValidationForm()
    form.startDate = ''

    const validationMessage = validateDraftForm(form)

    expect(validationMessage).toBe('Start date is required.')
  })

  it('requires end date at root level', () => {
    const form = createValidationForm()
    form.endDate = ''

    const validationMessage = validateDraftForm(form)

    expect(validationMessage).toBe('End date is required.')
  })

  it('rejects invalid task type when provided', () => {
    const form = createValidationForm()
    form.chapters[0].tasks[0].taskType = 'Unsupported' as any

    const validationMessage = validateDraftForm(form)

    expect(validationMessage).toBe('Task type is invalid for task "Untitled".')
  })

  it('rejects non-positive question points when value is provided', () => {
    const form = createValidationForm()
    form.chapters[0].lessons[0].quizzes[0].questions[0].questionText = 'Sample question'
    form.chapters[0].lessons[0].quizzes[0].questions[0].points = '0'

    const validationMessage = validateDraftForm(form)

    expect(validationMessage).toBe('Question points must be greater than 0 in quiz "Untitled".')
  })

  it('does not require selected answers for multiple choice questions during draft save', () => {
    const form = createValidationForm()
    form.chapters[0].lessons[0].quizzes[0].questions[0].questionText = 'What is React?'
    form.chapters[0].lessons[0].quizzes[0].questions[0].points = '2'
    form.chapters[0].lessons[0].quizzes[0].questions[0].options = ['A library', 'A database']
    form.chapters[0].lessons[0].quizzes[0].questions[0].selectedAnswers = []

    const validationMessage = validateDraftForm(form)

    expect(validationMessage).toBeNull()
  })
})
