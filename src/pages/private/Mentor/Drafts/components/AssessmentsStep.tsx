import React from 'react'
import { Loader2, Plus, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type {
  AssessmentTab,
  EditableChapter,
  EditableLesson,
  EditableMatchingPair,
  EditableQuestion,
  EditableQuiz,
  EditableTask,
  QuestionType,
} from '../editorTypes'
import { EmptyPanel, Field, SectionCard, cardStyle, getButtonStyle, inputStyle, pillStyle, subtleTextStyle, textAreaStyle } from './editorUi'

type Props = {
  assessmentTab: AssessmentTab
  activeChapter: EditableChapter | null
  activeLesson: EditableLesson | null
  generatingQuizId: string | null
  generatingAllLessonQuizzes: boolean
  saving: boolean
  onAssessmentTabChange: (tab: AssessmentTab) => void
  onAddTask: () => void
  onUpdateTask: (taskId: string, updater: (task: EditableTask) => EditableTask) => void
  onRemoveTask: (taskId: string) => void
  onAddQuiz: () => void
  onUpdateQuiz: (quizId: string, updater: (quiz: EditableQuiz) => EditableQuiz) => void
  onRemoveQuiz: (quizId: string) => void
  onAddQuestion: (quizId: string) => void
  onUpdateQuestion: (quizId: string, questionId: string, updater: (question: EditableQuestion) => EditableQuestion) => void
  onRemoveQuestion: (quizId: string, questionId: string) => void
  onGenerateQuiz: (quiz: EditableQuiz) => void
  onGenerateAllLessonQuizzes: () => void
}

const TASK_TYPE_OPTIONS = ['Practice', 'Theory', 'Quizz'] as const
const TASK_STATUS_OPTIONS = ['Pending', 'InProgress', 'Completed'] as const
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'] as const
const QUESTION_TYPE_OPTIONS: QuestionType[] = ['TrueFalse', 'MultipleChoice', 'SingleChoice', 'Matching', 'FillInTheBlank', 'Ordering']

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  alignItems: 'center',
}

const rowGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 8,
  alignItems: 'center',
}

const questionCardStyle: React.CSSProperties = {
  ...cardStyle,
  padding: 16,
  background: 'var(--bg-main)',
  display: 'grid',
  gap: 14,
}

const normalizeQuestionByType = (question: EditableQuestion, nextType: QuestionType): EditableQuestion => {
  const baseQuestion: EditableQuestion = {
    ...question,
    type: nextType,
    options: [...question.options],
    selectedAnswers: [...question.selectedAnswers],
    matchingPairs: question.matchingPairs.map((pair) => ({ ...pair })),
    orderingSequence: [...question.orderingSequence],
  }

  if (nextType === 'TrueFalse') {
    return {
      ...baseQuestion,
      options: ['True', 'False'],
      correctAnswer: question.correctAnswer === 'False' ? 'False' : 'True',
      selectedAnswers: [],
      matchingPairs: [],
      orderingSequence: [],
    }
  }

  if (nextType === 'MultipleChoice') {
    return {
      ...baseQuestion,
      options: baseQuestion.options.length > 0 ? baseQuestion.options : [''],
      correctAnswer: '',
      matchingPairs: [],
      orderingSequence: [],
    }
  }

  if (nextType === 'SingleChoice') {
    return {
      ...baseQuestion,
      options: baseQuestion.options.length > 0 ? baseQuestion.options : [''],
      correctAnswer: baseQuestion.correctAnswer,
      selectedAnswers: [],
      matchingPairs: [],
      orderingSequence: [],
    }
  }

  if (nextType === 'Matching') {
    return {
      ...baseQuestion,
      options: [],
      correctAnswer: '',
      selectedAnswers: [],
      matchingPairs: baseQuestion.matchingPairs.length > 0 ? baseQuestion.matchingPairs : [{ id: `pair-${question.id}-1`, left: '', right: '' }],
      orderingSequence: [],
    }
  }

  if (nextType === 'FillInTheBlank') {
    return {
      ...baseQuestion,
      options: [],
      selectedAnswers: [],
      matchingPairs: [],
      orderingSequence: [],
    }
  }

  return {
    ...baseQuestion,
    options: baseQuestion.options.length > 0 ? baseQuestion.options : ['', ''],
    correctAnswer: '',
    selectedAnswers: [],
    matchingPairs: [],
    orderingSequence: baseQuestion.orderingSequence.length > 0 ? baseQuestion.orderingSequence : ['', ''],
  }
}

const updateStringList = (items: string[], index: number, value: string) => items.map((item, itemIndex) => itemIndex === index ? value : item)

const removeStringListItem = (items: string[], index: number) => items.filter((_, itemIndex) => itemIndex !== index)

const updatePairList = (pairs: EditableMatchingPair[], pairId: string, patch: Partial<EditableMatchingPair>) =>
  pairs.map((pair) => pair.id === pairId ? { ...pair, ...patch } : pair)

const removePairListItem = (pairs: EditableMatchingPair[], pairId: string) => pairs.filter((pair) => pair.id !== pairId)

const AssessmentsStep: React.FC<Props> = ({
  assessmentTab,
  activeChapter,
  activeLesson,
  generatingQuizId,
  generatingAllLessonQuizzes,
  saving,
  onAssessmentTabChange,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
  onAddQuiz,
  onUpdateQuiz,
  onRemoveQuiz,
  onAddQuestion,
  onUpdateQuestion,
  onRemoveQuestion,
  onGenerateQuiz,
  onGenerateAllLessonQuizzes,
}) => {
  const { t } = useTranslation('mentor')

  if (!activeChapter) return <EmptyPanel message={t('drafts.noChapterSelected')} />

  const renderOptionEditor = (quizId: string, question: EditableQuestion, mode: 'single' | 'multiple' | 'ordering') => (
    <div style={{ display: 'grid', gap: 10 }}>
      <Field label={t('drafts.options')}>
        <div style={{ display: 'grid', gap: 8 }}>
          {question.options.map((option, optionIndex) => (
            <div key={`${question.id}-option-${optionIndex}`} style={rowGridStyle}>
              <input
                style={inputStyle}
                value={option}
                onChange={(event) => onUpdateQuestion(quizId, question.id, (item) => ({ ...item, options: updateStringList(item.options, optionIndex, event.target.value) }))}
                placeholder={t('drafts.optionPlaceholder', { index: optionIndex + 1 })}
              />
              <button
                type="button"
                style={getButtonStyle({ compact: true })}
                onClick={() => onUpdateQuestion(quizId, question.id, (item) => ({ ...item, options: removeStringListItem(item.options, optionIndex) }))}
              >
                {t('drafts.remove')}
              </button>
            </div>
          ))}
          <button
            type="button"
            style={getButtonStyle()}
            onClick={() => onUpdateQuestion(quizId, question.id, (item) => ({ ...item, options: [...item.options, ''] }))}
          >
            <Plus size={14} /> {t('drafts.addOption')}
          </button>
        </div>
      </Field>

      {mode === 'single' ? (
        <Field label={t('drafts.correctAnswer')}>
          <select
            style={inputStyle}
            value={question.correctAnswer}
            onChange={(event) => onUpdateQuestion(quizId, question.id, (item) => ({ ...item, correctAnswer: event.target.value }))}
          >
            <option value="">{t('drafts.selectCorrectAnswer')}</option>
            {question.options
              .filter((option) => option.trim())
              .map((option, optionIndex) => <option key={`${question.id}-single-${optionIndex}`} value={option}>{option}</option>)}
          </select>
        </Field>
      ) : null}

      {mode === 'multiple' ? (
        <Field label={t('drafts.selectedAnswers')}>
          <div style={{ display: 'grid', gap: 8 }}>
            {question.options.filter((option) => option.trim()).map((option, optionIndex) => (
              <label key={`${question.id}-multi-${optionIndex}`} style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={question.selectedAnswers.includes(option)}
                  onChange={(event) => onUpdateQuestion(quizId, question.id, (item) => {
                    const nextSelectedAnswers = event.target.checked
                      ? [...item.selectedAnswers.filter((selected) => selected !== option), option]
                      : item.selectedAnswers.filter((selected) => selected !== option)
                    return { ...item, selectedAnswers: nextSelectedAnswers }
                  })}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </Field>
      ) : null}

      {mode === 'ordering' ? (
        <Field label={t('drafts.orderingSequence')} hint={t('drafts.orderingSequenceHint')}>
          <div style={{ display: 'grid', gap: 8 }}>
            {question.orderingSequence.map((step, stepIndex) => (
              <div key={`${question.id}-sequence-${stepIndex}`} style={rowGridStyle}>
                <input
                  style={inputStyle}
                  value={step}
                  onChange={(event) => onUpdateQuestion(quizId, question.id, (item) => ({ ...item, orderingSequence: updateStringList(item.orderingSequence, stepIndex, event.target.value) }))}
                  placeholder={t('drafts.sequencePlaceholder', { index: stepIndex + 1 })}
                />
                <button
                  type="button"
                  style={getButtonStyle({ compact: true })}
                  onClick={() => onUpdateQuestion(quizId, question.id, (item) => ({ ...item, orderingSequence: removeStringListItem(item.orderingSequence, stepIndex) }))}
                >
                  {t('drafts.remove')}
                </button>
              </div>
            ))}
            <button
              type="button"
              style={getButtonStyle()}
              onClick={() => onUpdateQuestion(quizId, question.id, (item) => ({ ...item, orderingSequence: [...item.orderingSequence, ''] }))}
            >
              <Plus size={14} /> {t('drafts.addSequenceStep')}
            </button>
          </div>
        </Field>
      ) : null}
    </div>
  )

  const renderQuestionTypeFields = (quizId: string, question: EditableQuestion) => {
    if (question.type === 'TrueFalse') {
      return (
        <Field label={t('drafts.correctAnswer')}>
          <select
            style={inputStyle}
            value={question.correctAnswer}
            onChange={(event) => onUpdateQuestion(quizId, question.id, (item) => ({ ...item, correctAnswer: event.target.value }))}
          >
            <option value="True">True</option>
            <option value="False">False</option>
          </select>
        </Field>
      )
    }

    if (question.type === 'SingleChoice') return renderOptionEditor(quizId, question, 'single')
    if (question.type === 'MultipleChoice') return renderOptionEditor(quizId, question, 'multiple')

    if (question.type === 'Matching') {
      return (
        <Field label={t('drafts.matchingPairs')}>
          <div style={{ display: 'grid', gap: 8 }}>
            {question.matchingPairs.map((pair, pairIndex) => (
              <div key={pair.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto', gap: 8, alignItems: 'center' }}>
                <input
                  style={inputStyle}
                  value={pair.left}
                  onChange={(event) => onUpdateQuestion(quizId, question.id, (item) => ({ ...item, matchingPairs: updatePairList(item.matchingPairs, pair.id, { left: event.target.value }) }))}
                  placeholder={t('drafts.leftValue', { index: pairIndex + 1 })}
                />
                <input
                  style={inputStyle}
                  value={pair.right}
                  onChange={(event) => onUpdateQuestion(quizId, question.id, (item) => ({ ...item, matchingPairs: updatePairList(item.matchingPairs, pair.id, { right: event.target.value }) }))}
                  placeholder={t('drafts.rightValue', { index: pairIndex + 1 })}
                />
                <button
                  type="button"
                  style={getButtonStyle({ compact: true })}
                  onClick={() => onUpdateQuestion(quizId, question.id, (item) => ({ ...item, matchingPairs: removePairListItem(item.matchingPairs, pair.id) }))}
                >
                  {t('drafts.remove')}
                </button>
              </div>
            ))}
            <button
              type="button"
              style={getButtonStyle()}
              onClick={() => onUpdateQuestion(quizId, question.id, (item) => ({
                ...item,
                matchingPairs: [...item.matchingPairs, { id: `pair-${item.id}-${Math.random().toString(36).slice(2, 8)}`, left: '', right: '' }],
              }))}
            >
              <Plus size={14} /> {t('drafts.addPair')}
            </button>
          </div>
        </Field>
      )
    }

    if (question.type === 'FillInTheBlank') {
      return (
        <Field label={t('drafts.correctAnswer')}>
          <input
            style={inputStyle}
            value={question.correctAnswer}
            onChange={(event) => onUpdateQuestion(quizId, question.id, (item) => ({ ...item, correctAnswer: event.target.value }))}
            placeholder={t('drafts.fillInBlankPlaceholder')}
          />
        </Field>
      )
    }

    return renderOptionEditor(quizId, question, 'ordering')
  }

  const renderTasks = () => (
    <SectionCard
      title={t('drafts.tasks')}
      subtitle={t('drafts.tasksHint')}
      action={(
        <button type="button" style={getButtonStyle()} onClick={onAddTask}>
          <Plus size={14} /> {t('drafts.addTask')}
        </button>
      )}
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
                <button type="button" style={getButtonStyle()} onClick={() => onRemoveTask(task.id)}>{t('drafts.remove')}</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Field label={t('drafts.taskTitle')}>
                  <input style={inputStyle} value={task.title} onChange={(event) => onUpdateTask(task.id, (item) => ({ ...item, title: event.target.value }))} />
                </Field>
                <Field label={t('drafts.taskType')}>
                  <select style={inputStyle} value={task.taskType} onChange={(event) => onUpdateTask(task.id, (item) => ({ ...item, taskType: event.target.value as EditableTask['taskType'] }))}>
                    {TASK_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
                <Field label={t('drafts.priority')}>
                  <select style={inputStyle} value={task.priority || ''} onChange={(event) => onUpdateTask(task.id, (item) => ({ ...item, priority: event.target.value as EditableTask['priority'] }))}>
                    <option value="">{t('drafts.notSet')}</option>
                    {PRIORITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
                <Field label={t('drafts.taskStatus')}>
                  <select style={inputStyle} value={task.taskStatus} onChange={(event) => onUpdateTask(task.id, (item) => ({ ...item, taskStatus: event.target.value as EditableTask['taskStatus'] }))}>
                    {TASK_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
                <Field label={t('drafts.dueDate')}>
                  <input type="date" style={inputStyle} value={task.dueDate} onChange={(event) => onUpdateTask(task.id, (item) => ({ ...item, dueDate: event.target.value }))} />
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
        action={(
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
        )}
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
                  <div style={actionRowStyle}>
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
                    <button type="button" style={getButtonStyle()} onClick={() => onRemoveQuiz(quiz.id)}>{t('drafts.remove')}</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <Field label={t('drafts.quizTitle')} hint={t('drafts.quizTitleHint')}>
                    <input style={inputStyle} value={quiz.title} onChange={(event) => onUpdateQuiz(quiz.id, (item) => ({ ...item, title: event.target.value }))} />
                  </Field>
                  <Field label={t('drafts.quizDueDate')}>
                    <input type="date" style={inputStyle} value={quiz.dueDate} onChange={(event) => onUpdateQuiz(quiz.id, (item) => ({ ...item, dueDate: event.target.value }))} />
                  </Field>
                </div>

                <div style={{ marginTop: 12 }}>
                  <Field label={t('drafts.description')}>
                    <textarea style={{ ...textAreaStyle, minHeight: 110 }} value={quiz.description} onChange={(event) => onUpdateQuiz(quiz.id, (item) => ({ ...item, description: event.target.value }))} />
                  </Field>
                </div>

                <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t('drafts.questions')}</div>
                      <div style={{ ...subtleTextStyle, marginTop: 4 }}>{t('drafts.questionsHint')}</div>
                    </div>
                    <button type="button" style={getButtonStyle()} onClick={() => onAddQuestion(quiz.id)}>
                      <Plus size={14} /> {t('drafts.addQuestion')}
                    </button>
                  </div>

                  {quiz.questions.length === 0 ? (
                    <div style={subtleTextStyle}>{t('drafts.noQuestionsYet')}</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {quiz.questions.map((question, questionIndex) => (
                        <div key={question.id} style={questionCardStyle}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'grid', gap: 6 }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{t('drafts.questionLabel', { index: questionIndex + 1 })}</strong>
                              <span style={pillStyle({ accent: true })}>{t(`drafts.questionTypes.${question.type}`)}</span>
                            </div>
                            <button type="button" style={getButtonStyle()} onClick={() => onRemoveQuestion(quiz.id, question.id)}>
                              {t('drafts.remove')}
                            </button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(180px, 220px)', gap: 12 }}>
                            <Field label={t('drafts.questionText')}>
                              <textarea
                                style={{ ...textAreaStyle, minHeight: 100 }}
                                value={question.questionText}
                                onChange={(event) => onUpdateQuestion(quiz.id, question.id, (item) => ({ ...item, questionText: event.target.value }))}
                              />
                            </Field>
                            <div style={{ display: 'grid', gap: 12 }}>
                              <Field label={t('drafts.questionType')}>
                                <select
                                  style={inputStyle}
                                  value={question.type}
                                  onChange={(event) => onUpdateQuestion(quiz.id, question.id, (item) => normalizeQuestionByType(item, event.target.value as QuestionType))}
                                >
                                  {QUESTION_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{t(`drafts.questionTypes.${type}`)}</option>)}
                                </select>
                              </Field>
                              <Field label={t('drafts.points')}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  style={inputStyle}
                                  value={question.points}
                                  onChange={(event) => onUpdateQuestion(quiz.id, question.id, (item) => ({ ...item, points: event.target.value }))}
                                />
                              </Field>
                            </div>
                          </div>

                          {renderQuestionTypeFields(quiz.id, question)}
                        </div>
                      ))}
                    </div>
                  )}
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
