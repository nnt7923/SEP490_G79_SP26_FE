import type { AskMentorContextPayload } from '../types/chat'

export type GoalLabelItem = {
  key: string
  label: string
}

type BuildAskMentorContextInput = {
  subjectName?: string | null
  selectedGoals: string[]
  goalPriorities: Record<string, number>
  goalItems: GoalLabelItem[]
  level?: string | null
  languageSelection?: number | null
}

export function mapLanguageSelectionToAskMentorLanguage(
  languageSelection?: number | null
): AskMentorContextPayload['language'] | null {
  if (languageSelection === 1) return 'VI'
  if (languageSelection === 2) return 'EN'
  return null
}

function toSafeWeight(raw: unknown): number {
  const numeric = Number(raw)
  if (!Number.isFinite(numeric)) return 50
  return Math.min(100, Math.max(1, Math.round(numeric)))
}

export function buildAskMentorContextPayload(
  input: BuildAskMentorContextInput
): AskMentorContextPayload | null {
  const subject = String(input.subjectName ?? '').trim()
  const level = String(input.level ?? '').trim()
  const language = mapLanguageSelectionToAskMentorLanguage(input.languageSelection)
  if (!subject || !level || !language || !Array.isArray(input.selectedGoals) || input.selectedGoals.length === 0) {
    return null
  }

  const goals = input.selectedGoals
    .map((goalId) => {
      const normalizedGoalId = String(goalId ?? '').trim()
      if (!normalizedGoalId) return null
      const label = String(
        input.goalItems.find((item) => String(item.key) === normalizedGoalId)?.label ?? normalizedGoalId
      ).trim()
      if (!label) return null
      return {
        goal: label,
        goalWeight: toSafeWeight(input.goalPriorities[normalizedGoalId]),
      }
    })
    .filter((goal): goal is AskMentorContextPayload['goals'][number] => Boolean(goal))

  if (goals.length === 0) return null

  if (goals.length === 1) {
    goals[0].goalWeight = 100
  }

  return {
    subject,
    goals,
    level,
    language,
  }
}

export function isValidAskMentorContextPayload(
  payload: AskMentorContextPayload | null | undefined
): payload is AskMentorContextPayload {
  if (!payload) return false
  if (payload.language !== 'VI' && payload.language !== 'EN') return false
  if (!String(payload.subject ?? '').trim()) return false
  if (!String(payload.level ?? '').trim()) return false
  if (!Array.isArray(payload.goals) || payload.goals.length === 0) return false
  return payload.goals.every((item) => {
    const goal = String(item?.goal ?? '').trim()
    const weight = Number(item?.goalWeight)
    return !!goal && Number.isFinite(weight) && weight > 0
  })
}

export function formatAskMentorContextMessage(payload: AskMentorContextPayload): string {
  const goalsReadable = payload.goals
    .map((goal) => `- ${goal.goal} (${goal.goalWeight}%)`)
    .join('\n')

  return [
    '[ASK_MENTOR]',
    `Subject: ${payload.subject}`,
    `Level: ${payload.level}`,
    `Language: ${payload.language}`,
    'Goals:',
    goalsReadable,
  ].join('\n')
}
