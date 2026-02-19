import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../../../../components/Layout/Header'
import Footer from '../../../../components/Layout/Footer'
import ROUTER from '../../../../router/ROUTER'

const ResultPage: React.FC = () => {
  const location = useLocation() as any
  const navigate = useNavigate()
  const [skeleton] = useState<any | null>(() => {
    const fromState = location?.state?.skeleton
    if (fromState) return fromState
    try {
      const raw = sessionStorage.getItem('learningPathSkeleton')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (!skeleton) navigate(ROUTER.PLANS)
  }, [skeleton, navigate])

  const stageCount = useMemo(() => (Array.isArray(skeleton?.lessons) && skeleton.lessons.length) ? skeleton.lessons.length : 6, [skeleton])

  if (!skeleton) return null

  return (
    <div className="layout">
      <Header />
      <main className="page-main" role="main" aria-label="learning-path">
        <div className="page-container">
          {/* Hero frame (no content) */}
          <section className="rounded-xl bg-indigo-600 p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-2 w-full max-w-[520px]">
                <div className="h-5 w-3/5 rounded bg-white/70 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-white/40 animate-pulse" />
                <div className="mt-2 flex items-center gap-3">
                  <span className="h-2 w-16 rounded bg-white/30 animate-pulse" />
                  <span className="h-2 w-16 rounded bg-white/30 animate-pulse" />
                  <span className="h-2 w-24 rounded bg-white/30 animate-pulse" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="h-8 w-16 rounded bg-white/60 animate-pulse" />
                <div className="h-2 w-24 rounded bg-white/30 animate-pulse" />
              </div>
            </div>
          </section>

          {/* Main grid frame */}
          <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline frame (left) */}
            <div className="lg:col-span-2 space-y-4">
              {Array.from({ length: stageCount }).map((_, idx) => (
                <div key={`stage-${idx}`} className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xs">{idx + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-1/3 rounded bg-gray-200 animate-pulse" />
                        <div className="h-3 w-16 rounded bg-gray-100" />
                      </div>
                      <div className="mt-2 h-3 w-2/3 rounded bg-gray-100 animate-pulse" />
                      <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full w-1/3 bg-indigo-500" />
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="h-3 w-3/4 rounded bg-gray-100 animate-pulse" />
                        <div className="h-3 w-2/3 rounded bg-gray-100 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar frame (right) */}
            <aside className="space-y-4">
              {/* Tiến độ tổng quan */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="h-4 w-36 rounded bg-gray-200 animate-pulse" />
                <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full w-1/4 bg-indigo-500" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="h-5 w-6 mx-auto rounded bg-gray-200 animate-pulse" />
                    <div className="mt-2 h-2 w-24 mx-auto rounded bg-gray-100" />
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="h-5 w-6 mx-auto rounded bg-gray-200 animate-pulse" />
                    <div className="mt-2 h-2 w-24 mx-auto rounded bg-gray-100" />
                  </div>
                </div>
              </div>

              {/* Đang tập trung */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="h-4 w-32 rounded bg-gray-200 animate-pulse mb-2" />
                <div className="space-y-2">
                  <span className="inline-block h-8 w-full rounded-lg border border-gray-200 bg-gray-50" />
                  <span className="inline-block h-8 w-full rounded-lg border border-gray-200 bg-gray-50" />
                </div>
              </div>

              {/* Kỹ năng đạt được */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="h-4 w-36 rounded bg-gray-200 animate-pulse mb-3" />
                <ul className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <li key={`sk-${i}`}>
                      <div className="h-3 w-2/3 rounded bg-gray-200 animate-pulse" />
                      <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full w-1/3 bg-emerald-500" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mục tiêu tiếp theo */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                <div className="mt-2 h-3 w-3/4 rounded bg-gray-100" />
                <button className="btn btn-primary mt-3 w-full">Bắt đầu học</button>
              </div>
            </aside>
          </section>

          <div className="actions mt-6">
            <button type="button" className="btn" onClick={() => navigate(ROUTER.PLANS)}>Quay lại</button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ResultPage