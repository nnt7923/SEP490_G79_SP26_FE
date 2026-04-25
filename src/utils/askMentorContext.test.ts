import { describe, expect, it } from 'vitest'
import {
  buildAskMentorContextPayload,
  formatAskMentorContextMessage,
  isValidAskMentorContextPayload,
  mapLanguageSelectionToAskMentorLanguage,
} from './askMentorContext'

describe('askMentorContext utils', () => {
  it('maps languageSelection correctly', () => {
    expect(mapLanguageSelectionToAskMentorLanguage(1)).toBe('VI')
    expect(mapLanguageSelectionToAskMentorLanguage(2)).toBe('EN')
    expect(mapLanguageSelectionToAskMentorLanguage(null)).toBeNull()
    expect(mapLanguageSelectionToAskMentorLanguage(999)).toBeNull()
  })

  it('builds payload from plans data', () => {
    const payload = buildAskMentorContextPayload({
      subjectName: 'JavaScript',
      selectedGoals: ['g1', 'g2'],
      goalPriorities: { g1: 70, g2: 30 },
      goalItems: [
        { key: 'g1', label: 'Nắm vững JS cơ bản' },
        { key: 'g2', label: 'Luyện dự án thực tế' },
      ],
      level: 'Intermediate',
      languageSelection: 1,
    })

    expect(payload).toEqual({
      subject: 'JavaScript',
      goals: [
        { goal: 'Nắm vững JS cơ bản', goalWeight: 70 },
        { goal: 'Luyện dự án thực tế', goalWeight: 30 },
      ],
      level: 'Intermediate',
      language: 'VI',
    })
  })

  it('validates payload and formats message', () => {
    const payload = buildAskMentorContextPayload({
      subjectName: 'React',
      selectedGoals: ['goal-react'],
      goalPriorities: { 'goal-react': 100 },
      goalItems: [{ key: 'goal-react', label: 'Build portfolio app' }],
      level: 'Beginner',
      languageSelection: 2,
    })

    expect(isValidAskMentorContextPayload(payload)).toBe(true)

    const message = formatAskMentorContextMessage(payload!)
    expect(message).toContain('[ASK_MENTOR_REQUEST]')
    expect(message).toContain('Subject: React')
    expect(message).toContain('- Build portfolio app (100%)')
    expect(message).toContain('Language: EN')
  })

  it('returns null for incomplete input', () => {
    const payload = buildAskMentorContextPayload({
      subjectName: '',
      selectedGoals: [],
      goalPriorities: {},
      goalItems: [],
      level: '',
      languageSelection: null,
    })
    expect(payload).toBeNull()
    expect(isValidAskMentorContextPayload(payload)).toBe(false)
  })
})
