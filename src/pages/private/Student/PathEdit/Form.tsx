import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import Toast from '../../../../components/Toast'
import ROUTER from '../../../../router/ROUTER'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import { useResponsive } from '../../../../hook/useResponsive'
import {
  getStudentLearningPath,
  updateStudentLearningPath,
} from '../../../../services/LearningPathService'
import {
  buildStudentPayload,
  emptyChapter,
  emptyLesson,
  hydrateStudentForm,
  validateStudentForm,
} from './pathEditState'
import type {
  EditorStep,
  StudentEditableChapter,
  StudentEditableLesson,
  StudentPathEditForm,
  ToastState,
} from './pathEditTypes'
import { shellStyle, cardStyle } from '../../Mentor/Drafts/components/editorUi'
import { StudentEditorHeader, StudentContentNavigator } from './components/EditorChrome'
import StudentChaptersStep from './components/ChapterEditStep'
import StudentLessonStep from './components/LessonContentStep'

const StudentPathEditForm: React.FC = () => {
  const { pathId } = useParams<{ pathId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('student')
  const sidebarNavItems = useStudentSidebarConfig()
  const sidebarConfig = { navItems: sidebarNavItems }
  const { isSmallScreen } = useResponsive()

  const [form, setForm] = useState<StudentPathEditForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [currentStep, setCurrentStep] = useState<EditorStep>('chapters')
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false)

  useEffect(() => {
    if (!pathId) return
    let active = true
    setLoading(true)
    setLoadError(null)
    getStudentLearningPath(pathId)
      .then((res) => {
        if (!active) return
        const hydrated = hydrateStudentForm(res)
        setForm(hydrated)
        setActiveChapterId(hydrated.chapters[0]?.id ?? null)
        setActiveLessonId(hydrated.chapters[0]?.lessons[0]?.id ?? null)
      })
      .catch((err) => {
        if (!active) return
        const status = err?.response?.status
        const code = err?.response?.data?.errorCode || err?.response?.data?.code
        if (status === 400 || code === 'INVALID_STATUS') {
          navigate(ROUTER.MY_PLANS, { replace: true })
          return
        }
        setLoadError(
          err?.response?.data?.message ||
          err?.response?.data?.errorMessage ||
          err?.message ||
          'Failed to load learning path.',
        )
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [pathId, navigate])

  // â”€â”€ Form mutators â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const updateChapter = useCallback(
    (chapterId: string, updater: (c: StudentEditableChapter) => StudentEditableChapter) =>
      setForm((prev) => prev ? { ...prev, chapters: prev.chapters.map((c) => c.id === chapterId ? updater(c) : c) } : prev),
    [],
  )

  const updateLesson = useCallback(
    (chapterId: string, lessonId: string, updater: (l: StudentEditableLesson) => StudentEditableLesson) =>
      updateChapter(chapterId, (c) => ({ ...c, lessons: c.lessons.map((l) => l.id === lessonId ? updater(l) : l) })),
    [updateChapter],
  )

  const selectChapter = useCallback((chapterId: string, step: EditorStep = 'chapters') => {
    setForm((prev) => {
      const chapter = prev?.chapters.find((c) => c.id === chapterId)
      setActiveChapterId(chapterId)
      setActiveLessonId(chapter?.lessons[0]?.id ?? null)
      setCurrentStep(step)
      return prev
    })
  }, [])

  const selectLesson = useCallback((chapterId: string, lessonId: string) => {
    setActiveChapterId(chapterId)
    setActiveLessonId(lessonId)
    setCurrentStep('lesson')
  }, [])

  const addChapter = useCallback(() => {
    const chapter = emptyChapter()
    setForm((prev) => prev ? { ...prev, chapters: [...prev.chapters, chapter] } : prev)
    setActiveChapterId(chapter.id)
    setActiveLessonId(chapter.lessons[0]?.id ?? null)
    setCurrentStep('chapters')
  }, [])

  const addLesson = useCallback((chapterId: string) => {
    const lesson = emptyLesson()
    updateChapter(chapterId, (c) => ({ ...c, lessons: [...c.lessons, lesson] }))
    setActiveChapterId(chapterId)
    setActiveLessonId(lesson.id)
    setCurrentStep('lesson')
  }, [updateChapter])

  const moveChapter = useCallback((chapterId: string, direction: -1 | 1) =>
    setForm((prev) => {
      if (!prev) return prev
      const chapters = [...prev.chapters]
      const index = chapters.findIndex((c) => c.id === chapterId)
      const target = index + direction
      if (index < 0 || target < 0 || target >= chapters.length) return prev
      const [item] = chapters.splice(index, 1)
      chapters.splice(target, 0, item)
      return { ...prev, chapters }
    }), [])

  const moveLesson = useCallback((chapterId: string, lessonId: string, direction: -1 | 1) =>
    updateChapter(chapterId, (c) => {
      const lessons = [...c.lessons]
      const index = lessons.findIndex((l) => l.id === lessonId)
      const target = index + direction
      if (index < 0 || target < 0 || target >= lessons.length) return c
      const [item] = lessons.splice(index, 1)
      lessons.splice(target, 0, item)
      return { ...c, lessons }
    }), [updateChapter])

  const removeChapter = useCallback((chapterId: string) => {
    setForm((prev) => {
      if (!prev) return prev
      const next = prev.chapters.filter((c) => c.id !== chapterId)
      if (next.length === 0) {
        const fallback = emptyChapter()
        setActiveChapterId(fallback.id)
        setActiveLessonId(fallback.lessons[0]?.id ?? null)
        return { ...prev, chapters: [fallback] }
      }
      setActiveChapterId(next[0].id)
      setActiveLessonId(next[0].lessons[0]?.id ?? null)
      return { ...prev, chapters: next }
    })
  }, [])

  const removeLesson = useCallback((chapterId: string, lessonId: string) =>
    updateChapter(chapterId, (c) => {
      const next = c.lessons.filter((l) => l.id !== lessonId)
      return { ...c, lessons: next.length > 0 ? next : c.lessons }
    }), [updateChapter])

  const persistForm = useCallback(async () => {
    if (!form || !pathId) return
    const error = validateStudentForm(form)
    if (error) {
      setToast({ message: error, type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const payload = buildStudentPayload(form)
      await updateStudentLearningPath(pathId, payload)
      setToast({ message: t('pathEdit.saveSuccess'), type: 'success' })
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || err?.response?.data?.errorMessage || err?.message || t('pathEdit.saveFailed'),
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }, [form, pathId])

  // â”€â”€ Derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const activeChapter = useMemo(
    () => form?.chapters.find((c) => c.id === activeChapterId) ?? form?.chapters[0] ?? null,
    [activeChapterId, form?.chapters],
  )

  const activeLesson = useMemo(
    () => activeChapter?.lessons.find((l) => l.id === activeLessonId) ?? null,
    [activeChapter, activeLessonId],
  )

  const contextLabel = useMemo(() => {
    if (currentStep === 'chapters' && activeChapter)
      return t('pathEdit.contextChapter', { title: activeChapter.title || t('pathEdit.untitledChapter') })
    if (currentStep === 'lesson' && activeChapter && activeLesson)
      return t('pathEdit.contextLesson', { chapter: activeChapter.title || t('pathEdit.untitledChapter'), lesson: activeLesson.title || t('pathEdit.untitledLesson') })
    return null
  }, [activeChapter, activeLesson, currentStep])

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (loading) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div style={{ ...shellStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--accent-primary)' }}>
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p>{t('pathEdit.loadingPath')}</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (loadError) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div style={shellStyle}>
          <div style={{ ...cardStyle, padding: 20, color: 'var(--danger-primary)' }}>{loadError}</div>
        </div>
      </Layout>
    )
  }

  if (!form) return null

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={shellStyle}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'grid', gap: 20 }}>
          <StudentEditorHeader
            title={form.pathTitle}
            chapterCount={form.chapters.length}
            currentStep={currentStep}
            contextLabel={contextLabel}
            saving={saving}
            onBack={() => navigate(ROUTER.MY_PLANS)}
            onSave={persistForm}
            onStepChange={setCurrentStep}
          />

          {isSmallScreen ? (
            <StudentContentNavigator
              chapters={form.chapters}
              activeChapterId={activeChapterId}
              activeLessonId={activeLessonId}
              isCompact
              isOpen={isNavigatorOpen}
              onToggleOpen={() => setIsNavigatorOpen((p) => !p)}
              onSelectChapter={(id) => selectChapter(id, 'chapters')}
              onSelectLesson={selectLesson}
              onAddChapter={addChapter}
              onAddLesson={addLesson}
              onMoveChapter={moveChapter}
              onMoveLesson={moveLesson}
              onRemoveChapter={removeChapter}
              onRemoveLesson={removeLesson}
            />
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: isSmallScreen ? '1fr' : '320px minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
            {!isSmallScreen ? (
              <StudentContentNavigator
                chapters={form.chapters}
                activeChapterId={activeChapterId}
                activeLessonId={activeLessonId}
                isCompact={false}
                isOpen
                onToggleOpen={() => {}}
                onSelectChapter={(id) => selectChapter(id, 'chapters')}
                onSelectLesson={selectLesson}
                onAddChapter={addChapter}
                onAddLesson={addLesson}
                onMoveChapter={moveChapter}
                onMoveLesson={moveLesson}
                onRemoveChapter={removeChapter}
                onRemoveLesson={removeLesson}
              />
            ) : null}

            <main style={{ display: 'grid', gap: 20, minWidth: 0 }}>
              {currentStep === 'chapters' ? (
                <StudentChaptersStep
                  activeChapter={activeChapter}
                  onUpdateChapter={(updater) => activeChapter ? updateChapter(activeChapter.id, updater) : undefined}
                  onUpdateLesson={(lessonId, updater) => activeChapter ? updateLesson(activeChapter.id, lessonId, updater) : undefined}
                  onOpenLessonStudio={(lessonId) => activeChapter ? selectLesson(activeChapter.id, lessonId) : undefined}
                />
              ) : null}

              {currentStep === 'lesson' ? (
                <StudentLessonStep
                  activeChapter={activeChapter}
                  activeLesson={activeLesson}
                  onUpdateLesson={(updater) => activeChapter && activeLesson ? updateLesson(activeChapter.id, activeLesson.id, updater) : undefined}
                />
              ) : null}
            </main>
          </div>
        </div>

        {toast ? (
          <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 50 }}>
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          </div>
        ) : null}
      </div>
    </Layout>
  )
}

export default StudentPathEditForm
