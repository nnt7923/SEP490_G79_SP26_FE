import React, { useState, useEffect, useRef } from 'react'

interface SingleGoalCardProps {
  id: string
  active?: boolean
  title: string
  colorClass: string
  icon?: string
  onToggle: (key: string) => void
  onStartEdit: (id: string, currTitle: string) => void
  onDelete: (id: string) => void
  isEditing: boolean
  editingTitle: string
  setEditingTitle: (v: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  saving: boolean
  deleting: boolean
  isSystemGoal?: boolean 
}

const SingleGoalCard: React.FC<SingleGoalCardProps> = ({
  id,
  active,
  title,
  onToggle,
  onStartEdit,
  onDelete,
  isEditing,
  editingTitle,
  setEditingTitle,
  onSaveEdit,
  onCancelEdit,
  saving,
  deleting,
  isSystemGoal = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <div
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        padding: 16, border: '1px solid var(--border-base)', borderRadius: 2,
        background: active ? 'var(--bg-blue-hover)' : 'var(--bg-surface)',
        borderColor: active ? 'var(--accent-primary)' : 'var(--border-base)',
        cursor: (!isEditing && !menuOpen) ? 'pointer' : 'default',
        transition: 'all 0.2s', boxSizing: 'border-box'
      }}
      role={!isEditing ? 'button' : undefined}
      aria-pressed={!isEditing && active ? 'true' : 'false'}
      onClick={() => { if (!isEditing && !menuOpen) onToggle(id) }}
      onMouseEnter={(e) => {
        if (!active && !isEditing) { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--bg-main)' }
      }}
      onMouseLeave={(e) => {
        if (!active && !isEditing) { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.background = 'var(--bg-surface)' }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {active ? `> ${title}` : `$ ${title}`}
          </div>
        </div>

        {!isEditing && !isSystemGoal && (
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button type="button" aria-label="More options" disabled={saving || deleting}
              style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid transparent', borderRadius: 2, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14 }}
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.background = 'var(--bg-main)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
            >
              ⋮
            </button>
            {menuOpen && (
              <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 30, right: 0, background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 2, minWidth: 120, zIndex: 50, padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button type="button" onClick={() => { setMenuOpen(false); onStartEdit(id, title) }} disabled={saving || deleting}
                  style={{ textAlign: 'left', padding: '6px 12px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', transition: 'background 0.2s', borderRadius: 2 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-neutral)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                  edit
                </button>
                <button type="button" onClick={() => { setMenuOpen(false); onDelete(id) }} disabled={saving || deleting}
                  style={{ textAlign: 'left', padding: '6px 12px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--danger-primary)', transition: 'background 0.2s', borderRadius: 2 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-red-tint)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                  {deleting ? 'deleting…' : 'delete'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
          <input type="text" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} placeholder="goal title"
            style={{ flex: 1, padding: '4px 8px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }} />
          <button type="button" onClick={onSaveEdit} disabled={saving}
            style={{ padding: '4px 12px', background: saving ? 'var(--text-secondary)' : 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '...' : 'save'}
          </button>
          <button type="button" onClick={onCancelEdit} disabled={saving}
            style={{ padding: '4px 12px', background: 'transparent', border: '1px solid var(--border-base)', borderRadius: 2, fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer' }}>
            cancel
          </button>
        </div>
      )}
    </div>
  )
}

export default SingleGoalCard
