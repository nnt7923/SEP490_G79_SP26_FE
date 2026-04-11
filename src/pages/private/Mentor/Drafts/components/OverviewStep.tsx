import React from 'react'
import { ChevronDown, Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getGoalTitle } from '../../../../../utils/goalTranslation'
import { LanguageSelection } from '../../../../../services'
import type { DraftFormState, Level, SubjectOption } from '../editorTypes'
import { Field, SectionCard, cardStyle, getButtonStyle, inputStyle, subtleTextStyle, textAreaStyle } from './editorUi'

type Props = {
  form: DraftFormState
  subjectSearch: string
  selectedSubject: SubjectOption | null
  filteredSubjects: SubjectOption[]
  isSubjectMenuOpen: boolean
  subjectPickerRef: React.RefObject<HTMLDivElement | null>
  generatingAiDraft: boolean
  saving: boolean
  levelOptions: Level[]
  onFormChange: (updater: (prev: DraftFormState) => DraftFormState) => void
  onToggleGoal: (goalId: string) => void
  onSetPrimaryWeight: (weight: number) => void
  onSelectSubject: (subject: SubjectOption) => void
  onSubjectSearchChange: (value: string) => void
  onSubjectMenuToggle: (next?: boolean) => void
  onGenerateAiDraft: () => void
  isCreateMode: boolean
}

const OverviewStep: React.FC<Props> = ({
  form,
  subjectSearch,
  selectedSubject,
  filteredSubjects,
  isSubjectMenuOpen,
  subjectPickerRef,
  generatingAiDraft,
  saving,
  levelOptions,
  onFormChange,
  onToggleGoal,
  onSetPrimaryWeight,
  onSelectSubject,
  onSubjectSearchChange,
  onSubjectMenuToggle,
  onGenerateAiDraft,
  isCreateMode,
}) => {
  const { t } = useTranslation('mentor')

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <SectionCard
        title={t('drafts.pathSettings')}
        subtitle={t('drafts.pathSettingsHint')}
        action={isCreateMode ? (
          <button
            type="button"
            style={getButtonStyle({ accent: true, disabled: generatingAiDraft || saving })}
            onClick={onGenerateAiDraft}
            disabled={generatingAiDraft || saving}
          >
            {generatingAiDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={14} />}
            {generatingAiDraft ? t('aiPlans.generatingDraft') : t('aiPlans.generateByAi')}
          </button>
        ) : undefined}
      >
        <div style={{ ...cardStyle, padding: 14, marginBottom: 18, background: 'color-mix(in srgb, var(--warning-primary) 6%, var(--bg-surface) 94%)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning-primary)' }}>{t('drafts.aiRequiredHint')}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <Field label={t('drafts.subject')} required>
            <div ref={subjectPickerRef} style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, paddingRight: 40 }}
                value={subjectSearch}
                placeholder={t('drafts.subjectSearchPlaceholder')}
                onFocus={() => onSubjectMenuToggle(true)}
                onChange={(event) => onSubjectSearchChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    onSubjectMenuToggle(true)
                  }
                  if (event.key === 'Enter' && filteredSubjects.length > 0) {
                    event.preventDefault()
                    onSelectSubject(filteredSubjects[0])
                  }
                }}
              />
              <button
                type="button"
                aria-label={t('drafts.selectSubject')}
                onClick={() => onSubjectMenuToggle()}
                style={{ position: 'absolute', top: 1, right: 1, bottom: 1, width: 38, border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              >
                <ChevronDown size={16} />
              </button>
              {isSubjectMenuOpen ? (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 20, ...cardStyle, maxHeight: 240, overflowY: 'auto', padding: 6 }}>
                  {filteredSubjects.length > 0 ? filteredSubjects.map((subject) => (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => onSelectSubject(subject)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                        borderRadius: 2,
                        padding: '10px 12px',
                        background: subject.id === form.subjectId ? 'var(--bg-blue-hover)' : 'transparent',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {subject.name}
                    </button>
                  )) : (
                    <div style={{ padding: '10px 12px', ...subtleTextStyle }}>{t('drafts.noSubjectMatch')}</div>
                  )}
                </div>
              ) : null}
            </div>
          </Field>

          <Field label={t('drafts.level')} required>
            <select
              style={inputStyle}
              value={form.complexityLevel}
              onChange={(event) => onFormChange((prev) => ({ ...prev, complexityLevel: event.target.value as Level }))}
            >
              {levelOptions.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </Field>

          <Field label={t('drafts.titleLabel')}>
            <input
              style={inputStyle}
              value={form.title}
              onChange={(event) => onFormChange((prev) => ({ ...prev, title: event.target.value }))}
            />
          </Field>

          <Field label={t('drafts.language')} required>
            <select
              style={inputStyle}
              value={form.languageSelection}
              onChange={(event) => onFormChange((prev) => ({ ...prev, languageSelection: Number(event.target.value) }))}
            >
              <option value={LanguageSelection.Vietnamese}>Tiếng Việt</option>
              <option value={LanguageSelection.English}>English</option>
            </select>
          </Field>

          <Field label={t('drafts.startDate')}>
            <input
              type="date"
              style={inputStyle}
              value={form.startDate}
              onChange={(event) => onFormChange((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </Field>

          <Field label={t('drafts.endDate')}>
            <input
              type="date"
              style={inputStyle}
              value={form.endDate}
              onChange={(event) => onFormChange((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </Field>
        </div>

        <div style={{ marginTop: 18 }}>
          <Field label={t('drafts.description')}>
            <textarea
              style={{ ...textAreaStyle, minHeight: 110 }}
              value={form.description}
              onChange={(event) => onFormChange((prev) => ({ ...prev, description: event.target.value }))}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={t('drafts.goals')} subtitle={t('drafts.overviewGoalsHint')}>
        {!selectedSubject ? (
          <div style={subtleTextStyle}>{t('drafts.selectSubjectForGoals')}</div>
        ) : selectedSubject.goals.length === 0 ? (
          <div style={subtleTextStyle}>{t('drafts.noGoalsForSubject')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {selectedSubject.goals.map((goal) => {
              const selected = form.goals.some((item) => item.goalId === goal.goalId)
              return (
                <label
                  key={goal.goalId}
                  style={{
                    ...cardStyle,
                    padding: 14,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    background: selected ? 'var(--bg-blue-hover)' : 'var(--bg-main)',
                  }}
                >
                  <input type="checkbox" checked={selected} onChange={() => onToggleGoal(goal.goalId)} />
                  <span style={{ color: 'var(--text-primary)', flex: 1, fontWeight: 600 }}>{getGoalTitle(t, goal.goalId, goal.title)}</span>
                </label>
              )
            })}

            {form.goals.length === 2 ? (
              <div style={{ ...cardStyle, padding: 16, background: 'var(--bg-main)' }}>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{t('drafts.goalWeightHint')}</div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `${form.goals[0].weight}fr ${form.goals[1].weight}fr`,
                      border: '1px solid var(--border-base)',
                      background: 'var(--bg-surface)',
                      minHeight: 52,
                    }}
                  >
                    <div style={{ padding: '10px 12px', background: 'var(--bg-blue-hover)', color: 'var(--text-primary)', fontWeight: 600 }}>
                      <div>{(() => { const g = selectedSubject.goals.find((goal) => goal.goalId === form.goals[0].goalId); return g ? getGoalTitle(t, g.goalId, g.title) : '' })()}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>{form.goals[0].weight}%</div>
                    </div>
                    <div style={{ padding: '10px 12px', background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>
                      <div>{(() => { const g = selectedSubject.goals.find((goal) => goal.goalId === form.goals[1].goalId); return g ? getGoalTitle(t, g.goalId, g.title) : '' })()}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>{form.goals[1].weight}%</div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    value={form.goals[0].weight}
                    onChange={(event) => onSetPrimaryWeight(Number(event.target.value))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', ...subtleTextStyle }}>
                    <span>{t('drafts.goalWeightMin')}</span>
                    <span>{t('drafts.goalWeightTotal')}</span>
                    <span>{t('drafts.goalWeightMin')}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export default OverviewStep
