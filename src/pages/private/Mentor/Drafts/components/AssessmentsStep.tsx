import React from 'react'
import { Loader2, Plus, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AssessmentTab, EditableChapter, EditableLesson, EditableQuiz, EditableTask } from '../editorTypes'
import { EmptyPanel, Field, SectionCard, cardStyle, getButtonStyle, inputStyle, pillStyle, subtleTextStyle, textAreaStyle } from './editorUi'

type Props = {
  assessmentTab: AssessmentTab
  activeChapter: EditableChapter | null
  activeLesson: EditableLesson | null
  generatingTaskChapterId: string | null
  generatingQuizId: string | null
  generatingAllLessonQuizzes: boolean
  saving: boolean
  onAssessmentTabChange: (tab: AssessmentTab) => void
  onGenerateTasks: () => void
  onAddTask: () => void
  onUpdateTask: (taskId: string, updater: (task: EditableTask) => EditableTask) => void
  onRemoveTask: (taskId: string) => void
  onAddQuiz: () => void
  onUpdateQuiz: (quizId: string, updater: (quiz: EditableQuiz) => EditableQuiz) => void
  onRemoveQuiz: (quizId: string) => void
  onGenerateQuiz: (quiz: EditableQuiz) => void
  onGenerateAllLessonQuizzes: () => void
}

const TASK_TYPE_OPTIONS = ['Practice', 'Theory', 'Quizz']
const TASK_STATUS_OPTIONS = ['Pending', 'InProgress', 'Completed']
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High']

const AssessmentsStep: React.FC<Props> = ({
  assessmentTab,
  activeChapter,
  activeLesson,
  generatingTaskChapterId,
  generatingQuizId,
  generatingAllLessonQuizzes,
  saving,
  onAssessmentTabChange,
  onGenerateTasks,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
  onAddQuiz,
  onUpdateQuiz,
  onRemoveQuiz,
  onGenerateQuiz,
  onGenerateAllLessonQuizzes,
}) => {
  const { t } = useTranslation('mentor')

  if (!activeChapter) return <EmptyPanel message={t('drafts.noChapterSelected')} />

  const renderTasks = () => (
    <SectionCard
      title={t('drafts.tasks')}
      subtitle={t('drafts.tasksHint')}
      action={
        <>
          <button
            type="button"
            style={getButtonStyle({ disabled: !activeChapter.persistedId || generatingTaskChapterId === activeChapter.id || saving })}
            onClick={onGenerateTasks}
            disabled={generatingTaskChapterId === activeChapter.id || saving}
            title={!activeChapter.persistedId ? t('drafts.saveBeforeGenerateTasks') : undefined}
          >
            {generatingTaskChapterId === activeChapter.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={14} />}
            {generatingTaskChapterId === activeChapter.id ? t('drafts.generatingTasks') : t('drafts.generateTasksByAi')}
          </button>
          <button type="button" style={getButtonStyle()} onClick={onAddTask}>
            <Plus size={14} /> {t('drafts.addTask')}
          </button>
        </>
      }
    >
      {activeChapter.tasks.length === 0 ? (
        <div style={subtleTextStyle}>{t('drafts.noTasksYet')}</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {activeChapter.tasks.map((task, taskIndex) => (
            <div key={task.id} style={{ ...cardStyle, padding: 16, background: 'var(--bg-main)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{task.title || `${t('drafts.untitledTask')} ${taskIndex + 1}`}</strong>
                  <span style={pillStyle()}>{activeChapter.title || t('drafts.untitledChapter')}</span>
                </div>
                <button type="button" style={getButtonStyle()} onClick={() => onRemoveTask(task.id)}>×</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Field label={t('drafts.taskTitle')}>
                  <input style={inputStyle} value={task.title} onChange={(event) => onUpdateTask(task.id, (item) => ({ ...item, title: event.target.value }))} />
                </Field>
                <Field label={t('drafts.taskType')}>
                  <select style={inputStyle} value={task.taskType} onChange={(event) => onUpdateTask(task.id, (item) => ({ ...item, taskType: event.target.value }))}>
                    {TASK_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
                <Field label={t('drafts.priority')}>
                  <select style={inputStyle} value={task.priority || 'Medium'} onChange={(event) => onUpdateTask(task.id, (item) => ({ ...item, priority: event.target.value }))}>
                    {PRIORITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
                <Field label={t('drafts.taskStatus')}>
                  <select style={inputStyle} value={task.taskStatus} onChange={(event) => onUpdateTask(task.id, (item) => ({ ...item, taskStatus: event.target.value }))}>
                    {TASK_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 1.2fr)', gap: 12, marginTop: 12 }}>
                <Field label={t('drafts.description')}>
                  <textarea style={{ ...textAreaStyle, minHeight: 110 }} value={task.description} onChange={(event) => onUpdateTask(task.id, (item) => ({ ...item, description: event.target.value }))} placeholder={t('drafts.taskDescriptionHint')} />
                </Field>
                <Field label={t('drafts.quizJson')} hint={t('drafts.quizJsonHint')}>
                  <textarea style={{ ...textAreaStyle, minHeight: 160 }} value={task.quizQuestionsJson} onChange={(event) => onUpdateTask(task.id, (item) => ({ ...item, quizQuestionsJson: event.target.value }))} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )

  const renderQuizzes = () => {
    if (!activeLesson) return <EmptyPanel message={t('drafts.noLessonSelected')} />

    return (
      <SectionCard
        title={t('drafts.lessonQuizzes')}
        subtitle={t('drafts.lessonQuizzesHint')}
        action={
          <>
            <button
              type="button"
              style={getButtonStyle({ disabled: generatingAllLessonQuizzes || saving })}
              onClick={onGenerateAllLessonQuizzes}
              disabled={generatingAllLessonQuizzes || saving}
            >
              {generatingAllLessonQuizzes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={14} />}
              {generatingAllLessonQuizzes ? t('drafts.generatingAllLessonQuizzes') : t('drafts.generateAllLessonQuizzesByAi')}
            </button>
            <button type="button" style={getButtonStyle()} onClick={onAddQuiz}>
              <Plus size={14} /> {t('drafts.addQuiz')}
            </button>
          </>
        }
      >
        {activeLesson.quizzes.length === 0 ? (
          <div style={subtleTextStyle}>{t('drafts.noQuizzesYet')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {activeLesson.quizzes.map((quiz, quizIndex) => (
              <div key={quiz.id} style={{ ...cardStyle, padding: 16, background: 'var(--bg-main)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{quiz.title || `${t('drafts.untitledQuiz')} ${quizIndex + 1}`}</strong>
                    <span style={pillStyle()}>{activeLesson.title || t('drafts.untitledLesson')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      style={getButtonStyle({ disabled: generatingQuizId === quiz.id || saving })}
                      onClick={() => onGenerateQuiz(quiz)}
                      disabled={generatingQuizId === quiz.id || saving}
                      title={!quiz.persistedId ? t('drafts.saveBeforeGenerateQuiz') : undefined}
                    >
                      {generatingQuizId === quiz.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={14} />}
                      {generatingQuizId === quiz.id ? t('drafts.generatingQuiz') : t('drafts.generateQuizByAi')}
                    </button>
                    <button type="button" style={getButtonStyle()} onClick={() => onRemoveQuiz(quiz.id)}>×</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <Field label={t('drafts.quizTitle')} hint={t('drafts.quizTitleHint')}>
                    <input style={inputStyle} value={quiz.title} onChange={(event) => onUpdateQuiz(quiz.id, (item) => ({ ...item, title: event.target.value }))} />
                  </Field>
                  <Field label={t('drafts.description')}>
                    <textarea style={{ ...textAreaStyle, minHeight: 110 }} value={quiz.description} onChange={(event) => onUpdateQuiz(quiz.id, (item) => ({ ...item, description: event.target.value }))} />
                  </Field>
                </div>

                <div style={{ marginTop: 12 }}>
                  <Field label={t('drafts.quizJson')} hint={t('drafts.quizJsonHint')}>
                    <textarea style={{ ...textAreaStyle, minHeight: 180 }} value={quiz.quizQuestionsJson} onChange={(event) => onUpdateQuiz(quiz.id, (item) => ({ ...item, quizQuestionsJson: event.target.value }))} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={{ ...cardStyle, padding: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{t('drafts.assessmentsTitle')}</div>
            <div style={{ ...subtleTextStyle, marginTop: 4 }}>{t('drafts.assessmentsHint')}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" style={getButtonStyle({ active: assessmentTab === 'tasks' })} onClick={() => onAssessmentTabChange('tasks')}>
              {t('drafts.assessmentTabs.tasks')}
            </button>
            <button type="button" style={getButtonStyle({ active: assessmentTab === 'quizzes' })} onClick={() => onAssessmentTabChange('quizzes')}>
              {t('drafts.assessmentTabs.quizzes')}
            </button>
          </div>
        </div>
      </section>

      {assessmentTab === 'tasks' ? renderTasks() : renderQuizzes()}
    </div>
  )
}

export default AssessmentsStep
