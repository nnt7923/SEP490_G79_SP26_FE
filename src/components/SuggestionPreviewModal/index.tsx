import React, { useState } from 'react'
import { X, Maximize2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getGoalTitle } from '../../utils/goalTranslation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface SuggestionPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  loading: boolean
  error: string | null
  data: any | null
  onSelect: () => void
}

const formatDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('vi-VN') : '-')

const TASK_TYPE_LABEL: Record<string, string> = {
  Practice: 'Thực hành',
  Theory: 'Lý thuyết',
  '0': 'Lý thuyết',
  '1': 'Thực hành',
}

const stripMarkdown = (text: string): string =>
  text
    .replace(/<!--.*?-->/gs, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim()

const LessonFullModal: React.FC<{ lesson: any; onClose: () => void }> = ({ lesson, onClose }) => (
  <div
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10100, padding: 24 }}
    onClick={onClose}
  >
    <div
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, maxWidth: 720, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.25)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Nội dung bài học</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{lesson.title}</div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex', borderRadius: 4 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <X size={16} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {lesson.content ?? ''}
        </ReactMarkdown>
      </div>
    </div>
  </div>
)

const LessonCard: React.FC<{ lesson: any; index: number }> = ({ lesson, index }) => {
  const [fullOpen, setFullOpen] = useState(false)
  const content: string = lesson.content ?? ''
  const plain = stripMarkdown(content)
  const preview = plain.length > 180 ? plain.slice(0, 180) + '…' : plain

  return (
    <>
      <article style={{ border: '1px solid var(--border-base)', borderRadius: 6, background: 'var(--bg-surface)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>Bài học {index + 1}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{lesson.title}</div>
            {lesson.lessonDay && (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{formatDate(lesson.lessonDay)}</div>
            )}
          </div>
          {content && (
            <button
              type="button"
              onClick={() => setFullOpen(true)}
              style={{ background: 'transparent', border: '1px solid var(--border-base)', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <Maximize2 size={11} />
              Xem thêm
            </button>
          )}
        </div>

        {preview && (
          <div style={{ padding: '0 16px 12px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {preview}
          </div>
        )}

        {lesson.quizzes?.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-base)', padding: '10px 16px', background: 'var(--bg-main)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quiz ({lesson.quizzes.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {lesson.quizzes.map((q: any, qi: number) => (
                <div key={q.quizzId || qi} style={{ fontSize: 12, color: 'var(--text-primary)', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4 }}>
                  {q.title}
                </div>
              ))}
            </div>
          </div>
        )}
      </article>

      {fullOpen && <LessonFullModal lesson={lesson} onClose={() => setFullOpen(false)} />}
    </>
  )
}

const SuggestionPreviewModal: React.FC<SuggestionPreviewModalProps> = ({
  isOpen, onClose, loading, error, data, onSelect,
}) => {
  const { t } = useTranslation('student')
  const [activeChIdx, setActiveChIdx] = useState(0)

  if (!isOpen) return null

  const lp = data?.learningPath
  const chapters: any[] = lp?.chapterDtos ?? []
  const activeCh = chapters[activeChIdx] ?? null

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 8, maxWidth: 1060, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--accent-primary) 0%, transparent 100%)', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-primary)' }}>
            Xem trước lộ trình
            {lp?.title && <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>/ {lp.title}</span>}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex', borderRadius: 4 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--accent-primary)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Đang tải xem trước...</span>
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--danger-primary, #ef4444)', borderRadius: 6, color: 'var(--danger-primary, #ef4444)', fontSize: 13 }}>
              {error}
            </div>
          )}

          {!loading && !error && lp && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title card */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, padding: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--accent-primary) 0%, transparent 100%)' }} />
                <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {lp.title || t('myPlans.untitled')}
                </h2>
                {lp.description && (
                  <p style={{ margin: '0 0 14px 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{lp.description}</p>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                  {lp.subjectName && <span style={{ padding: '4px 10px', background: 'var(--bg-main)', border: '1px dashed var(--border-base)', borderRadius: 4, color: 'var(--text-primary)' }}>{lp.subjectName}</span>}
                  {chapters.length > 0 && <span style={{ padding: '4px 10px', background: 'var(--bg-main)', border: '1px dashed var(--border-base)', borderRadius: 4, color: 'var(--text-primary)' }}>{chapters.length} chương</span>}
                  {chapters.length > 0 && (() => {
                    const total = chapters.reduce((s: number, ch: any) => s + (ch.lessons?.length || 0), 0)
                    return total > 0 ? <span style={{ padding: '4px 10px', background: 'var(--bg-main)', border: '1px dashed var(--border-base)', borderRadius: 4, color: 'var(--text-primary)' }}>{total} bài học</span> : null
                  })()}
                </div>
              </div>

              {/* Goals */}
              {lp.goals && lp.goals.length > 0 && (
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, padding: 18 }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mục tiêu</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {lp.goals.map((goal: any) => (
                      <div key={goal.goalId} style={{ padding: '10px 14px', border: '1px solid var(--border-base)', borderRadius: 6, background: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{getGoalTitle(t, goal.goalId, goal.title)}</span>
                        {goal.weight != null && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{Math.round(goal.weight * 100)}%</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chapters + detail */}
              {chapters.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0,1fr)', gap: 14, height: 520 }}>
                  {/* Sidebar */}
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, padding: 12, overflowY: 'auto', height: '100%' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10, padding: '0 4px' }}>
                      Nội dung ({chapters.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {chapters.map((ch: any, i: number) => (
                        <button key={ch.chapterId || i} type="button" onClick={() => setActiveChIdx(i)}
                          style={{
                            textAlign: 'left', padding: '10px 12px', borderRadius: 6, cursor: 'pointer', width: '100%',
                            border: `1px solid ${i === activeChIdx ? 'var(--accent-primary)' : 'transparent'}`,
                            background: i === activeChIdx ? 'var(--bg-blue-hover)' : 'transparent',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => { if (i !== activeChIdx) e.currentTarget.style.background = 'var(--bg-main)' }}
                          onMouseLeave={(e) => { if (i !== activeChIdx) e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>Chương {i + 1}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{ch.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {ch.lessons?.length || 0} bài · {ch.tasks?.length || 0} bài tập
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chapter detail */}
                  {activeCh && (
                    <div style={{ overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, padding: 18, flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Chương {activeChIdx + 1}</div>
                        <h3 style={{ margin: '0 0 6px 0', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{activeCh.title}</h3>
                        {activeCh.content && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{activeCh.content}</p>}
                      </div>

                      {activeCh.lessons?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, padding: '0 2px' }}>
                            Bài học ({activeCh.lessons.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {activeCh.lessons.map((lesson: any, li: number) => (
                              <LessonCard key={lesson.lessonId || li} lesson={lesson} index={li} />
                            ))}
                          </div>
                        </div>
                      )}

                      {activeCh.tasks?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, padding: '0 2px' }}>
                            Bài tập ({activeCh.tasks.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {activeCh.tasks.map((task: any) => (
                              <div key={task.taskId || task.title} style={{ padding: '12px 16px', border: '1px solid var(--border-base)', borderRadius: 6, background: 'var(--bg-surface)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: task.description ? 8 : 0 }}>
                                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{task.title}</span>
                                  {task.taskType != null && (
                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-main)', border: '1px solid var(--border-base)', color: 'var(--text-secondary)', flexShrink: 0 }}>
                                      {TASK_TYPE_LABEL[String(task.taskType)] ?? String(task.taskType)}
                                    </span>
                                  )}
                                </div>
                                {task.description && (
                                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                    {task.description.split(/(\d+\.\s)/).reduce((acc: string[], part: string, i: number, arr: string[]) => {
                                      if (/^\d+\.\s$/.test(part) && i + 1 < arr.length) {
                                        acc.push(part + arr[i + 1])
                                      } else if (i > 0 && /^\d+\.\s$/.test(arr[i - 1])) {
                                        // already merged
                                      } else if (!/^\d+\.\s$/.test(part)) {
                                        acc.push(part)
                                      }
                                      return acc
                                    }, []).filter((s: string) => s.trim()).map((line: string, li: number) => (
                                      <div key={li} style={{ marginBottom: 4 }}>{line.trim()}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && data && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-base)', background: 'var(--bg-surface)', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
            <button
              onClick={onClose}
              style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--border-base)', borderRadius: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              Hủy
            </button>
            <button
              onClick={onSelect}
              style={{ padding: '8px 20px', background: 'var(--accent-primary)', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              Chọn lộ trình này
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SuggestionPreviewModal
