import React from 'react'
import { BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { EditableChapter } from '../editorTypes'
import { EmptyPanel, Field, SectionCard, cardStyle, getButtonStyle, inputStyle, subtleTextStyle, textAreaStyle } from './editorUi'

type Props = {
  activeChapter: EditableChapter | null
  onUpdateChapter: (updater: (chapter: EditableChapter) => EditableChapter) => void
  onUpdateLesson: (lessonId: string, updater: (lesson: EditableChapter['lessons'][number]) => EditableChapter['lessons'][number]) => void
  onOpenLessonStudio: (lessonId: string) => void
}

const ChaptersStep: React.FC<Props> = ({ activeChapter, onUpdateChapter, onUpdateLesson, onOpenLessonStudio }) => {
  const { t } = useTranslation('mentor')

  if (!activeChapter) return <EmptyPanel message={t('drafts.noChapterSelected')} />

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <SectionCard title={t('drafts.chapterSettings')} subtitle={t('drafts.chapterSettingsHint')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <Field label={t('drafts.chapterTitle')}>
            <input
              style={inputStyle}
              value={activeChapter.title}
              onChange={(event) => onUpdateChapter((chapter) => ({ ...chapter, title: event.target.value }))}
            />
          </Field>
          <Field label={t('drafts.estimatedDays')}>
            <input
              type="number"
              min={1}
              style={inputStyle}
              value={activeChapter.estimatedDays}
              onChange={(event) => onUpdateChapter((chapter) => ({ ...chapter, estimatedDays: event.target.value }))}
            />
          </Field>
          <Field label={t('drafts.startDate')}>
            <input
              type="date"
              style={inputStyle}
              value={activeChapter.startDate}
              onChange={(event) => onUpdateChapter((chapter) => ({ ...chapter, startDate: event.target.value }))}
            />
          </Field>
          <Field label={t('drafts.endDate')}>
            <input
              type="date"
              style={inputStyle}
              value={activeChapter.endDate}
              onChange={(event) => onUpdateChapter((chapter) => ({ ...chapter, endDate: event.target.value }))}
            />
          </Field>
        </div>

        <div style={{ marginTop: 18 }}>
          <Field label={t('drafts.chapterDescription')}>
            <textarea
              style={textAreaStyle}
              value={activeChapter.content}
              onChange={(event) => onUpdateChapter((chapter) => ({ ...chapter, content: event.target.value }))}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={t('drafts.lessonSchedule')} subtitle={t('drafts.lessonScheduleHint')}>
        <div style={{ display: 'grid', gap: 12 }}>
          {activeChapter.lessons.map((lesson, lessonIndex) => (
            <div key={lesson.id} style={{ ...cardStyle, padding: 16, background: 'var(--bg-main)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(180px, 0.8fr) auto', gap: 12, alignItems: 'end' }}>
                <Field label={t('drafts.lessonLabel', { index: lessonIndex + 1 })}>
                  <input
                    style={inputStyle}
                    value={lesson.title}
                    onChange={(event) => onUpdateLesson(lesson.id, (item) => ({ ...item, title: event.target.value }))}
                  />
                </Field>
                <Field label={t('drafts.lessonDay')}>
                  <input
                    type="date"
                    style={inputStyle}
                    value={lesson.lessonDay}
                    onChange={(event) => onUpdateLesson(lesson.id, (item) => ({ ...item, lessonDay: event.target.value }))}
                  />
                </Field>
                <button type="button" style={getButtonStyle()} onClick={() => onOpenLessonStudio(lesson.id)}>
                  <BookOpen size={14} /> {t('drafts.openStudio')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...subtleTextStyle, marginTop: 14 }}>{t('drafts.lessonScheduleFooter')}</div>
      </SectionCard>
    </div>
  )
}

export default ChaptersStep
