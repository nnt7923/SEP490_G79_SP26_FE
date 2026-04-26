import React from 'react'
import { useTranslation } from 'react-i18next'
import { SECTION_KEYS, SECTION_LABELS, type LessonSectionKey } from '../../../Mentor/Drafts/lessonContentContract'
import type { StudentEditableChapter, StudentEditableLesson } from '../pathEditTypes'
import { EmptyPanel, Field, SectionCard, cardStyle, subtleTextStyle } from '../../../Mentor/Drafts/components/editorUi'
import RichMarkdownEditor from '../../../Mentor/Drafts/components/RichMarkdownEditor'

type Props = {
  activeChapter: StudentEditableChapter | null
  activeLesson: StudentEditableLesson | null
  onUpdateLesson: (updater: (lesson: StudentEditableLesson) => StudentEditableLesson) => void
}

const LARGE_SECTIONS: LessonSectionKey[] = ['code-examples', 'common-mistakes', 'core-concepts']

const StudentLessonStep: React.FC<Props> = ({
  activeChapter,
  activeLesson,
  onUpdateLesson,
}) => {
  const { t } = useTranslation('student')

  if (!activeChapter || !activeLesson) return <EmptyPanel message={t('pathEdit.selectLesson')} />

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <SectionCard
        title={t('pathEdit.lessonStudioTitle')}
        subtitle={t('pathEdit.lessonStudioSubtitle')}
      >
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ ...cardStyle, padding: 16, background: 'var(--bg-main)' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.7, color: 'var(--text-secondary)' }}>{t('pathEdit.editingLesson')}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {activeLesson.title || t('pathEdit.untitledLesson')}
                </div>
              </div>
              <div style={subtleTextStyle}>{activeChapter.title || t('pathEdit.untitledChapter')}</div>
            </div>
            {activeLesson.quizzes.length > 0 && (
              <div style={{ ...subtleTextStyle, marginTop: 10 }}>
                {t('pathEdit.quizzesAttached', { count: activeLesson.quizzes.length })}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            {SECTION_KEYS.map((key) => (
              <Field key={key} label={SECTION_LABELS[key]}>
                <RichMarkdownEditor
                  value={activeLesson.sections[key] ?? ''}
                  large={LARGE_SECTIONS.includes(key)}
                  onChange={(md) => onUpdateLesson((l) => ({
                    ...l,
                    sections: { ...l.sections, [key]: md },
                  }))}
                />
              </Field>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

export default StudentLessonStep
