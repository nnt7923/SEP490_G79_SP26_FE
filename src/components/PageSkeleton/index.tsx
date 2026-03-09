import React from 'react'

/**
 * PageSkeleton — animated placeholder shown while lazy-loaded pages are being
 * downloaded & parsed. Mimics the typical sidebar + content layout so the
 * transition from skeleton → real page feels seamless.
 */
const PageSkeleton: React.FC = () => (
  <div className="page-skeleton">
    {/* Top bar placeholder */}
    <div className="page-skeleton__topbar">
      <div className="skeleton-block" style={{ width: 120, height: 20 }} />
      <div style={{ flex: 1 }} />
      <div className="skeleton-block" style={{ width: 32, height: 32, borderRadius: '50%' }} />
    </div>

    {/* Content area */}
    <div className="page-skeleton__body">
      {/* Sidebar placeholder */}
      <aside className="page-skeleton__sidebar">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-block" style={{ width: `${70 + (i % 3) * 10}%`, height: 14, marginBottom: 16 }} />
        ))}
      </aside>

      {/* Main content placeholder */}
      <main className="page-skeleton__main">
        {/* Title */}
        <div className="skeleton-block" style={{ width: '40%', height: 24, marginBottom: 24 }} />

        {/* Stat cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div className="skeleton-block" style={{ height: 72 }} />
          <div className="skeleton-block" style={{ height: 72 }} />
        </div>

        {/* Content cards */}
        <div className="skeleton-block" style={{ width: '30%', height: 16, marginBottom: 12 }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-block" style={{ height: 56, marginBottom: 8 }} />
        ))}
      </main>
    </div>
  </div>
)

export default PageSkeleton
