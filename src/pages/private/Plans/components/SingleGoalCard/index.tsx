
import React, { useState } from 'react'

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
}

const SingleGoalCard: React.FC<SingleGoalCardProps> = ({
  id,
  active,
  title,
  colorClass,
  icon,
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
}) => {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 p-6 ${
        active
          ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-lg shadow-teal-500/20'
          : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-md'
      } ${!isEditing && !menuOpen ? 'cursor-pointer' : 'cursor-default'}`}
      role={!isEditing ? 'button' : 'group'}
      aria-pressed={!isEditing && active ? 'true' : 'false'}
      onClick={() => {
        if (!isEditing && !menuOpen) onToggle(id)
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-xl ${colorClass} text-white text-xl shadow-md transition-transform duration-300 ${
              active ? 'scale-110' : 'group-hover:scale-105'
            }`}
          >
            {icon ?? '🧠'}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-base">{title}</div>
          </div>
        </div>
        {!isEditing && (
          <div className="relative">
            <button
              type="button"
              aria-label="More options"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((v) => !v)
              }}
              disabled={saving || deleting}
            >
              ⋮
            </button>
            {menuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-10 right-0 bg-white border border-gray-200 rounded-xl shadow-xl min-w-[140px] z-20 overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 border-b border-gray-100"
                  onClick={() => {
                    setMenuOpen(false)
                    onStartEdit(id, title)
                  }}
                  disabled={saving || deleting}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 hover:bg-red-50 transition-colors text-sm font-medium text-red-600"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(id)
                  }}
                  disabled={saving || deleting}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing && (
        <div
          className="flex gap-2 mt-4"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
            placeholder="Goal title"
          />
          <button
            type="button"
            className={`px-4 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors ${
              saving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={onSaveEdit}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            onClick={onCancelEdit}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      )}

      {active && !isEditing && (
        <div className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-teal-500 text-white text-xs font-bold shadow-md">
          ✓
        </div>
      )}
    </div>
  )
}

export default SingleGoalCard
