export const SECTION_KEYS = [
  'overview',
  'core-concepts',
  'code-examples',
  'common-mistakes',
  'best-practices',
  'summary',
] as const

export type LessonSectionKey = (typeof SECTION_KEYS)[number]

export const SECTION_LABELS: Record<LessonSectionKey, string> = {
  overview: 'Overview',
  'core-concepts': 'Core Concepts',
  'code-examples': 'Code Examples',
  'common-mistakes': 'Common Mistakes',
  'best-practices': 'Best Practices',
  summary: 'Summary',
}

export const SECTION_HEADINGS: Record<LessonSectionKey, string> = {
  overview: '## Overview',
  'core-concepts': '## Core Concepts',
  'code-examples': '## Code Examples',
  'common-mistakes': '## Common Mistakes',
  'best-practices': '## Best Practices',
  summary: '## Summary',
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractSectionByMarkers = (markdown: string, key: LessonSectionKey): string => {
  const start = `<!-- SECTION:${key}:start -->`
  const end = `<!-- SECTION:${key}:end -->`

  const startIndex = markdown.indexOf(start)
  const endIndex = markdown.indexOf(end)

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return ''

  return markdown.slice(startIndex + start.length, endIndex).trim()
}

const extractSectionByHeading = (markdown: string, heading: string): string => {
  const pattern = new RegExp(`^${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=^##\\s|\\Z)`, 'im')
  const match = markdown.match(pattern)
  return match ? match[1].trim() : ''
}

const normalizeSectionContent = (section: string, key: LessonSectionKey): string => {
  const heading = SECTION_HEADINGS[key]
  const pattern = new RegExp(`^${escapeRegExp(heading)}\\s*\\n+`, 'i')
  return section.replace(pattern, '').trim()
}

export function createEmptyLessonSections(): Record<LessonSectionKey, string> {
  return {
    overview: '',
    'core-concepts': '',
    'code-examples': '',
    'common-mistakes': '',
    'best-practices': '',
    summary: '',
  }
}

export function parseLessonSections(markdown: string): Record<LessonSectionKey, string> {
  if (!markdown) return createEmptyLessonSections()

  const hasAnyMarker = SECTION_KEYS.some((key) =>
    markdown.includes(`<!-- SECTION:${key}:start -->`)
  )

  const sections = createEmptyLessonSections()
  SECTION_KEYS.forEach((key) => {
    const markerContent = hasAnyMarker ? extractSectionByMarkers(markdown, key) : ''
    if (markerContent) {
      sections[key] = normalizeSectionContent(markerContent, key)
      return
    }

    sections[key] = extractSectionByHeading(markdown, SECTION_HEADINGS[key])
  })

  return sections
}

export function buildLessonContentFromSections(sections: Record<LessonSectionKey, string>): string {
  return SECTION_KEYS.map((key) => {
    const content = sections[key]?.trim() || ''
    return [
      `<!-- SECTION:${key}:start -->`,
      SECTION_HEADINGS[key],
      '',
      content,
      `<!-- SECTION:${key}:end -->`,
    ].join('\n')
  }).join('\n\n')
}
