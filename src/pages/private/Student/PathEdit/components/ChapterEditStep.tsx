import React from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen } from 'lucide-react'
import type { StudentEditableChapter } from '../pathEditTypes'
import { EmptyPanel, Field, SectionCard, cardStyle, getButtonStyle, inputStyle, subtleTextStyle, textAreaStyle } from '../../../Mentor/Drafts/components/editorUi'

type Props = {
  activeChapter: StudentEditableChapter | null
  onUpdateChapter: (updater: (chapter: StudentEditableChapter) => StudentEditableChapter) => void
  onUpdateLesson: (lessonId: string, updater: (lesson: StudentEditableChapter['lessons'][number]) => StudentEditableChapter['lessons'][number]) => void
  onOpenLessonStudio: (lessonId: string) => void
}

const StudentChaptersStep: React.FC<Props> = ({
  activeChapter,
  onUpdateChapter,
  onUpdateLesson,
  onOpenLessonStudio,
}) => {
  const { t } = useTranslation('student')

  if (!activeChapter) return <EmptyPanel message={t('pathEdit.selectChapter')} />

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <SectionCard title={t('pathEdit.chapterSettingsTitle')} subtitle={t('pathEdit.chapterSettingsSubtitle')}>
        <Field label={t('pathEdit.fieldChapterTitle')}>
          <input
            style={inputStyle}
            value={activeChapter.title}
            onChange={(e) => onUpdateChapter((c) => ({ ...c, title: e.target.value }))}
          />
        </Field>

        <div style={{ marginTop: 18 }}>
          <Field label={t('pathEdit.fieldChapterDescription')}>
            <textarea
              style={{ ...textAreaStyle, resize: 'none' }}
              value={activeChapter.description}
              readOnly
              disabled
              placeholder={t('pathEdit.chapterDescriptionReadonly')}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={t('pathEdit.lessonScheduleTitle')} subtitle={t('pathEdit.lessonScheduleSubtitle')}>
        <div style={{ display: 'grid', gap: 12 }}>
          {activeChapter.lessons.map((lesson, lessonIndex) => (
            <div key={lesson.id} style={{ ...cardStyle, padding: 16, background: 'var(--bg-main)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(180px, 0.8fr) auto', gap: 12, alignItems: 'end' }}>
                <Field label={t('pathEdit.lessonLabel', { index: lessonIndex + 1 })}>
                  <input
                    style={inputStyle}
                    value={lesson.title}
                    onChange={(e) => onUpdateLesson(lesson.id, (l) => ({ ...l, title: e.target.value }))}
                  />
                </Field>
                <Field label={t('pathEdit.fieldLessonDay')}>
                  <input
                    type="date"
                    style={inputStyle}
                    value={lesson.lessonDay}
                    onChange={(e) => onUpdateLesson(lesson.id, (l) => ({ ...l, lessonDay: e.target.value }))}
                  />
                </Field>
                <button type="button" style={getButtonStyle()} onClick={() => onOpenLessonStudio(lesson.id)}>
                  <BookOpen size={14} /> {t('pathEdit.openStudio')}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ ...subtleTextStyle, marginTop: 14 }}>{t('pathEdit.sidebarLessonHint')}</div>
      </SectionCard>
    </div>
  )
}

export default StudentChaptersStep
