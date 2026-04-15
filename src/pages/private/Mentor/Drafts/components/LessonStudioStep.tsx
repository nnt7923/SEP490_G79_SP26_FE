import React, { useState, useMemo } from 'react'
import { Loader2, Sparkles, Eye, PenLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LessonContent from '../../../Plans/components/LessonContent'
import { buildLessonContentFromSections, SECTION_KEYS, SECTION_LABELS, type LessonSectionKey } from '../lessonContentContract'
import type { EditableChapter, EditableLesson } from '../editorTypes'
import { EmptyPanel, Field, SectionCard, cardStyle, getButtonStyle, subtleTextStyle } from './editorUi'
import RichMarkdownEditor from './RichMarkdownEditor'

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

type ViewMode = 'edit' | 'preview'

const SECTION_HINT_KEYS: Record<LessonSectionKey, string> = {
  overview: 'drafts.sectionHints.overview',
  'core-concepts': 'drafts.sectionHints.coreConcepts',
  'code-examples': 'drafts.sectionHints.codeExamples',
  'common-mistakes': 'drafts.sectionHints.commonMistakes',
  'best-practices': 'drafts.sectionHints.bestPractices',
  summary: 'drafts.sectionHints.summary',
}

const SECTION_PLACEHOLDER_KEYS: Record<LessonSectionKey, string> = {
  overview: 'drafts.sectionPlaceholders.overview',
  'core-concepts': 'drafts.sectionPlaceholders.coreConcepts',
  'code-examples': 'drafts.sectionPlaceholders.codeExamples',
  'common-mistakes': 'drafts.sectionPlaceholders.commonMistakes',
  'best-practices': 'drafts.sectionPlaceholders.bestPractices',
  summary: 'drafts.sectionPlaceholders.summary',
}

const LARGE_SECTIONS: LessonSectionKey[] = ['code-examples', 'common-mistakes', 'core-concepts']

const MemoizedPreview = React.memo(LessonContent)

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
  const [viewMode, setViewMode] = useState<ViewMode>('edit')

  // Only build preview markdown when in preview mode (on-demand)
  const previewMarkdown = useMemo(
    () => viewMode === 'preview' && activeLesson
      ? buildLessonContentFromSections(activeLesson.sections as Record<LessonSectionKey, string>)
      : '',
    [viewMode, activeLesson?.sections],
  )

  if (!activeChapter || !activeLesson) return <EmptyPanel message={t('drafts.noLessonSelected')} />

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <SectionCard
        title={t('drafts.lessonStudio')}
        subtitle={t('drafts.lessonStudioHint')}
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* ── View mode toggle ── */}
            <div style={{
              display: 'inline-flex',
              border: '1px solid var(--border-base)',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <button
                type="button"
                style={{
                  ...getButtonStyle({ active: viewMode === 'edit' }),
                  border: 'none',
                  borderRadius: 0,
                  borderRight: '1px solid var(--border-base)',
                }}
                onClick={() => setViewMode('edit')}
              >
                <PenLine size={14} />
                {t('drafts.editorMode', 'Editor')}
              </button>
              <button
                type="button"
                style={{
                  ...getButtonStyle({ active: viewMode === 'preview' }),
                  border: 'none',
                  borderRadius: 0,
                }}
                onClick={() => setViewMode('preview')}
              >
                <Eye size={14} />
                {t('drafts.previewMode', 'Preview')}
              </button>
            </div>

            <button
              type="button"
              style={getButtonStyle({ accent: true, disabled: isGeneratingLessonContent })}
              onClick={onGenerateLessonContent}
              disabled={isGeneratingLessonContent}
            >
              {isGeneratingLessonContent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={14} />}
              {isGeneratingLessonContent ? t('drafts.generatingLessonContent') : t('drafts.generateLessonContentByAi')}
            </button>
          </div>
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

          {/* ── Editor Mode ── */}
          {viewMode === 'edit' && (
            <div style={{ display: 'grid', gap: 14 }}>
              {SECTION_KEYS.map((key) => (
                <Field key={key} label={SECTION_LABELS[key]}>
                  <RichMarkdownEditor
                    value={activeLesson.sections[key] ?? ''}
                    large={LARGE_SECTIONS.includes(key)}
                    onChange={(md) => onUpdateLesson((lesson) => ({
                      ...lesson,
                      sections: { ...lesson.sections, [key]: md },
                    }))}
                  />
                </Field>
              ))}
            </div>
          )}

          {/* ── Preview Mode ── */}
          {viewMode === 'preview' && (
            <div style={{
              ...cardStyle,
              padding: 24,
              background: 'var(--bg-main)',
              overflowWrap: 'anywhere',
              minHeight: 300,
            }}>
              {previewMarkdown ? (
                <MemoizedPreview content={previewMarkdown} />
              ) : (
                <div style={{ ...subtleTextStyle, textAlign: 'center', padding: 40 }}>
                  {t('drafts.previewEmpty', 'No content to preview yet. Switch to Editor to add lesson content.')}
                </div>
              )}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

export default LessonStudioStep

