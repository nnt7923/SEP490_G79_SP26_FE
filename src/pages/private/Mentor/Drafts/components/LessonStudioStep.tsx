import React from 'react'
import Editor from '@monaco-editor/react'
import { Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LessonContent from '../../../Plans/components/LessonContent'
import { buildLessonContentFromSections, parseLessonSections, SECTION_KEYS, SECTION_LABELS, type LessonSectionKey } from '../lessonContentContract'
import type { EditableChapter, EditableLesson } from '../editorTypes'
import { EmptyPanel, Field, SectionCard, cardStyle, getButtonStyle, subtleTextStyle, textAreaStyle } from './editorUi'

type Props = {
  activeChapter: EditableChapter | null
  activeLesson: EditableLesson | null
  isGeneratingLessonContent: boolean
  isQuizSkeletonLoading: boolean
  hasQuizSkeleton: boolean
  quizSkeletonError: string | null
  onGenerateLessonContent: () => void
  onUpdateLesson: (updater: (lesson: EditableLesson) => EditableLesson) => void
}

const SECTION_HINT_KEYS: Record<LessonSectionKey, string> = {
  overview: 'drafts.sectionHints.overview',
  'core-concepts': 'drafts.sectionHints.coreConcepts',
  'code-examples': 'drafts.sectionHints.codeExamples',
  'common-mistakes': 'drafts.sectionHints.commonMistakes',
  'best-practices': 'drafts.sectionHints.bestPractices',
  summary: 'drafts.sectionHints.summary',
}

const LessonStudioStep: React.FC<Props> = ({
  activeChapter,
  activeLesson,
  isGeneratingLessonContent,
  isQuizSkeletonLoading,
  hasQuizSkeleton,
  quizSkeletonError,
  onGenerateLessonContent,
  onUpdateLesson,
}) => {
  const { t } = useTranslation('mentor')

  if (!activeChapter || !activeLesson) return <EmptyPanel message={t('drafts.noLessonSelected')} />

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <SectionCard
        title={t('drafts.lessonStudio')}
        subtitle={t('drafts.lessonStudioHint')}
        action={
          <button
            type="button"
            style={getButtonStyle({ accent: true, disabled: isGeneratingLessonContent })}
            onClick={onGenerateLessonContent}
            disabled={isGeneratingLessonContent}
          >
            {isGeneratingLessonContent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={14} />}
            {isGeneratingLessonContent ? t('drafts.generatingLessonContent') : t('drafts.generateLessonContentByAi')}
          </button>
        }
      >
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ ...cardStyle, padding: 16, background: 'var(--bg-main)' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.7, color: 'var(--text-secondary)' }}>{t('drafts.editingLesson')}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {activeLesson.title || t('drafts.untitledLesson')}
                </div>
              </div>
              <div style={subtleTextStyle}>{activeChapter.title || t('drafts.untitledChapter')}</div>
            </div>

            {isQuizSkeletonLoading ? (
              <div style={{ ...subtleTextStyle, marginTop: 10, color: 'var(--accent-primary)' }}>
                {t('drafts.generatingQuizSkeleton')}
              </div>
            ) : null}

            {!isQuizSkeletonLoading && quizSkeletonError ? (
              <div style={{ ...subtleTextStyle, marginTop: 10, color: 'var(--danger-primary)' }}>
                {quizSkeletonError}
              </div>
            ) : null}

            {!isQuizSkeletonLoading && !quizSkeletonError && hasQuizSkeleton ? (
              <div style={{ ...subtleTextStyle, marginTop: 10, color: 'var(--success-primary)' }}>
                {t('drafts.quizSkeletonReady')}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: 20 }}>
            <div style={{ display: 'grid', gap: 14 }}>
              {SECTION_KEYS.map((key) => (
                <Field key={key} label={SECTION_LABELS[key]}>
                  <>
                    <div style={subtleTextStyle}>{t(SECTION_HINT_KEYS[key])}</div>
                    <textarea
                      style={{ ...textAreaStyle, minHeight: key === 'code-examples' || key === 'common-mistakes' ? 180 : 120 }}
                      value={activeLesson.sections[key]}
                      onChange={(event) => onUpdateLesson((lesson) => ({
                        ...lesson,
                        sections: { ...lesson.sections, [key]: event.target.value },
                      }))}
                    />
                  </>
                </Field>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Markdown Sync
                </div>
                <div style={{ ...subtleTextStyle, marginBottom: 8 }}>{t('drafts.markdownSyncHint')}</div>
                <Editor
                  height="360px"
                  width="100%"
                  defaultLanguage="markdown"
                  theme="vs-light"
                  value={buildLessonContentFromSections(activeLesson.sections as Record<LessonSectionKey, string>)}
                  onChange={(next) => onUpdateLesson((lesson) => ({
                    ...lesson,
                    sections: parseLessonSections(next ?? ''),
                  }))}
                  options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', scrollBeyondLastLine: false, wrappingStrategy: 'advanced' }}
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Preview
                </div>
                <div style={{ ...cardStyle, padding: 16, background: 'var(--bg-main)', maxHeight: 620, overflow: 'auto', overflowWrap: 'anywhere' }}>
                  <LessonContent content={buildLessonContentFromSections(activeLesson.sections as Record<LessonSectionKey, string>)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

export default LessonStudioStep
