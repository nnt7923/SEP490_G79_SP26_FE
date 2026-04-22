import React from 'react'
import { ArrowLeft, BookMarked, ChevronDown, ClipboardList, FolderTree, Globe, Plus, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { EditableChapter, EditorStep } from '../../Drafts/editorTypes'
import { cardStyle, getButtonStyle, pillStyle, subtleTextStyle } from '../../Drafts/components/editorUi'

type PublishedHeaderProps = {
  title: string
  chapterCount: number
  version: number | null
  currentStep: EditorStep
  contextLabel: string | null
  republishing: boolean
  onBack: () => void
  onRepublish: () => void
  onStepChange: (step: EditorStep) => void
}

const STEP_META: Array<{ id: EditorStep; icon: React.ReactNode }> = [
  { id: 'overview', icon: <Sparkles size={14} /> },
  { id: 'chapters', icon: <FolderTree size={14} /> },
  { id: 'lesson', icon: <BookMarked size={14} /> },
  { id: 'assessments', icon: <ClipboardList size={14} /> },
]

export const PublishedEditorHeader: React.FC<PublishedHeaderProps> = ({
  title,
  chapterCount,
  version,
  currentStep,
  contextLabel,
  republishing,
  onBack,
  onRepublish,
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
              <ArrowLeft size={14} /> {t('publishedPaths.backToList')}
            </button>
            <span style={{ padding: '2px 8px', border: '1px solid var(--success-primary, #22c55e)', color: 'var(--success-primary, #22c55e)', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
              {t('publishedPaths.publishedBadge')}
            </span>
            <span style={pillStyle()}>{t('publishedPaths.chapterCount', { count: chapterCount })}</span>
            {version != null ? <span style={pillStyle({ accent: true })}>{t('drafts.versionBadge', { version })}</span> : null}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: 'var(--text-primary)' }}>
              {title || t('publishedPaths.title')}
            </h1>
            <p style={{ ...subtleTextStyle, margin: '8px 0 0', maxWidth: 860 }}>
              {contextLabel ?? t('drafts.manualEditorHint')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            style={getButtonStyle({ accent: true, disabled: republishing })}
            onClick={onRepublish}
            disabled={republishing}
          >
            <Globe size={14} /> {republishing ? t('publishedPaths.republishing') : t('publishedPaths.republish')}
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

// Re-export ContentNavigator from Drafts so Published/Form can use it directly
export { ContentNavigator } from '../../Drafts/components/EditorChrome'
