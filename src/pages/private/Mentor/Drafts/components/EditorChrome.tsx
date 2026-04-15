import React from 'react'
import { ArrowLeft, BookMarked, ChevronDown, ClipboardList, FolderTree, Plus, Save, Share2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { EditableChapter, EditorStep } from '../editorTypes'
import { cardStyle, getButtonStyle, pillStyle, subtleTextStyle } from './editorUi'

type HeaderProps = {
  isCreateMode: boolean
  title: string
  chapterCount: number
  version: number | null
  currentStep: EditorStep
  contextLabel: string | null
  canShare: boolean
  saving: boolean
  sharing: boolean
  onBack: () => void
  onSave: () => void
  onShare: () => void
  onStepChange: (step: EditorStep) => void
}

const STEP_META: Array<{ id: EditorStep; icon: React.ReactNode }> = [
  { id: 'overview', icon: <Sparkles size={14} /> },
  { id: 'chapters', icon: <FolderTree size={14} /> },
  { id: 'lesson', icon: <BookMarked size={14} /> },
  { id: 'assessments', icon: <ClipboardList size={14} /> },
]

export const DraftEditorHeader: React.FC<HeaderProps> = ({
  isCreateMode,
  title,
  chapterCount,
  version,
  currentStep,
  contextLabel,
  canShare,
  saving,
  sharing,
  onBack,
  onSave,
  onShare,
  onStepChange,
}) => {
  const { t } = useTranslation('mentor')

  return (
    <div
      style={{
        ...cardStyle,
        padding: 18,
        position: 'sticky',
        top: 16,
        zIndex: 8,
        background: 'var(--bg-surface)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" style={getButtonStyle()} onClick={onBack}>
              <ArrowLeft size={14} /> {t('drafts.backToList')}
            </button>
            <span style={pillStyle({ warning: true })}>{t('drafts.draftBadge')}</span>
            <span style={pillStyle()}>{t('drafts.chapterCount', { count: chapterCount })}</span>
            {!isCreateMode && version != null ? <span style={pillStyle({ accent: true })}>{t('drafts.versionBadge', { version })}</span> : null}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: 'var(--text-primary)' }}>
              {isCreateMode ? t('drafts.createManualTitle') : title || t('drafts.title')}
            </h1>
            <p style={{ ...subtleTextStyle, margin: '8px 0 0', maxWidth: 860 }}>
              {contextLabel ?? t('drafts.manualEditorHint')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            style={getButtonStyle({ disabled: !canShare })}
            onClick={onShare}
            disabled={sharing || !canShare}
          >
            <Share2 size={14} /> {t('chat.sharePathBtn')}
          </button>
          <button
            type="button"
            style={getButtonStyle({ accent: true, disabled: saving })}
            onClick={onSave}
            disabled={saving}
          >
            <Save size={14} /> {saving ? t('drafts.saving') : t('drafts.save')}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
        {STEP_META.map((step, index) => (
          <button
            key={step.id}
            type="button"
            style={getButtonStyle({ active: step.id === currentStep })}
            onClick={() => onStepChange(step.id)}
          >
            <span style={{ ...pillStyle({ accent: step.id === currentStep }), minWidth: 22, justifyContent: 'center', padding: '2px 6px' }}>{index + 1}</span>
            {step.icon}
            {t(`drafts.steps.${step.id}`)}
          </button>
        ))}
      </div>
    </div>
  )
}

type NavigatorProps = {
  chapters: EditableChapter[]
  activeChapterId: string | null
  activeLessonId: string | null
  isCompact: boolean
  isOpen: boolean
  currentStep: EditorStep
  onToggleOpen: () => void
  onSelectChapter: (chapterId: string) => void
  onSelectLesson: (chapterId: string, lessonId: string, step?: EditorStep) => void
  onAddChapter: () => void
  onAddLesson: (chapterId: string) => void
  onMoveChapter: (chapterId: string, direction: -1 | 1) => void
  onMoveLesson: (chapterId: string, lessonId: string, direction: -1 | 1) => void
  onRemoveChapter: (chapterId: string) => void
  onRemoveLesson: (chapterId: string, lessonId: string) => void
}

export const ContentNavigator: React.FC<NavigatorProps> = ({
  chapters,
  activeChapterId,
  activeLessonId,
  isCompact,
  isOpen,
  currentStep,
  onToggleOpen,
  onSelectChapter,
  onSelectLesson,
  onAddChapter,
  onAddLesson,
  onMoveChapter,
  onMoveLesson,
  onRemoveChapter,
  onRemoveLesson,
}) => {
  const { t } = useTranslation('mentor')

  const content = (
    <div style={{ display: 'grid', gap: 12 }}>
      {chapters.map((chapter, chapterIndex) => (
        <div
          key={chapter.id}
          style={{
            ...cardStyle,
            padding: 12,
            background: chapter.id === activeChapterId ? 'var(--bg-blue-hover)' : 'var(--bg-surface)',
            borderColor: chapter.id === activeChapterId ? 'var(--accent-primary)' : 'var(--border-base)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <button
              type="button"
              onClick={() => onSelectChapter(chapter.id)}
              style={{ flex: 1, background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                {t('drafts.chapterLabel', { index: chapterIndex + 1 })}
              </div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 700, marginTop: 5 }}>
                {chapter.title || t('drafts.untitledChapter')}
              </div>
              <div style={{ ...subtleTextStyle, marginTop: 6 }}>
                {t('drafts.lessonCount', { count: chapter.lessons.length })}
              </div>
            </button>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" style={getButtonStyle({ compact: true })} onClick={() => onMoveChapter(chapter.id, -1)}>↑</button>
              <button type="button" style={getButtonStyle({ compact: true })} onClick={() => onMoveChapter(chapter.id, 1)}>↓</button>
              <button type="button" style={getButtonStyle({ compact: true })} onClick={() => onRemoveChapter(chapter.id)}>×</button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {chapter.lessons.map((lesson, lessonIndex) => (
              <div key={lesson.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => onSelectLesson(chapter.id, lesson.id, currentStep === 'assessments' ? 'assessments' : 'lesson')}
                  style={{
                    flex: 1,
                    background: lesson.id === activeLessonId ? 'color-mix(in srgb, var(--accent-primary) 12%, var(--bg-surface) 88%)' : 'var(--bg-main)',
                    border: `1px solid ${lesson.id === activeLessonId ? 'var(--accent-primary)' : 'var(--border-base)'}`,
                    borderRadius: 2,
                    padding: '9px 10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {t('drafts.lessonLabel', { index: lessonIndex + 1 })}
                  </div>
                  <div style={{ marginTop: 2 }}>{lesson.title || t('drafts.untitledLesson')}</div>
                </button>
                <button type="button" style={getButtonStyle({ compact: true })} onClick={() => onMoveLesson(chapter.id, lesson.id, -1)}>↑</button>
                <button type="button" style={getButtonStyle({ compact: true })} onClick={() => onMoveLesson(chapter.id, lesson.id, 1)}>↓</button>
                <button type="button" style={getButtonStyle({ compact: true })} onClick={() => onRemoveLesson(chapter.id, lesson.id)}>×</button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10 }}>
            <button type="button" style={getButtonStyle()} onClick={() => onAddLesson(chapter.id)}>
              <Plus size={14} /> {t('drafts.addLesson')}
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  if (isCompact) {
    return (
      <section style={{ ...cardStyle, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: isOpen ? 14 : 0 }}>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>{t('drafts.contentTree')}</strong>
            <div style={{ ...subtleTextStyle, marginTop: 4 }}>{t('drafts.mobileNavigatorHint')}</div>
          </div>
          <button type="button" style={getButtonStyle()} onClick={onToggleOpen}>
            <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
            {isOpen ? t('drafts.hideNavigator') : t('drafts.showNavigator')}
          </button>
        </div>
        {isOpen ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <button type="button" style={getButtonStyle()} onClick={onAddChapter}>
                <Plus size={14} /> {t('drafts.addChapter')}
              </button>
            </div>
            {content}
          </>
        ) : null}
      </section>
    )
  }

  return (
    <aside style={{ ...cardStyle, padding: 16, position: 'sticky', top: 180, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 220px)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>{t('drafts.contentTree')}</strong>
          <div style={{ ...subtleTextStyle, marginTop: 4 }}>{t('drafts.navigatorHint')}</div>
        </div>
        <button type="button" style={getButtonStyle()} onClick={onAddChapter}>
          <Plus size={14} /> {t('drafts.addChapter')}
        </button>
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 320px)', paddingRight: 4 }}>
        {content}
      </div>
    </aside>
  )
}
