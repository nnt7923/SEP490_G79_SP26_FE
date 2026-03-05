
import React, { useState, useEffect, useRef } from 'react'
import { 
  SiJavascript, 
  SiTypescript, 
  SiPython, 
  SiReact, 
  SiNodedotjs, 
  SiDocker, 
  SiKubernetes,
  SiMongodb,
  SiPostgresql,
  SiGit,
  SiAmazon
} from 'react-icons/si'

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
  const menuRef = useRef<HTMLDivElement>(null)

  // Select icon based on goal ID for variety - using tech/programming icons
  const getIconComponent = () => {
    const icons = [
      SiJavascript,    // JavaScript
      SiTypescript,    // TypeScript
      SiPython,        // Python
      SiReact,         // React
      SiNodedotjs,     // Node.js
      SiDocker,        // Docker
      SiKubernetes,    // Kubernetes
      SiMongodb,       // MongoDB
      SiPostgresql,    // PostgreSQL
      SiGit,           // Git
      SiAmazon         // AWS
    ]
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const IconComponent = icons[hash % icons.length]
    return IconComponent
  }

  const IconComponent = getIconComponent()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  return (
    <div
      className={`group relative overflow-visible rounded-2xl border-2 transition-all duration-300 p-6 bg-white ${
        active
          ? 'border-blue-500 bg-blue-50 shadow-lg'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
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
            className={`flex items-center justify-center w-12 h-12 rounded-xl ${colorClass} shadow-md transition-transform duration-300 ${
              active ? 'scale-110' : 'group-hover:scale-105'
            }`}
          >
            {icon ? (
              <span className="text-xl text-white">{icon}</span>
            ) : (
              <IconComponent className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-base">{title}</div>
          </div>
        </div>
        {!isEditing && (
          <div className="relative" ref={menuRef}>
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
                className="absolute top-10 right-0 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[140px] z-50 overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
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
    </div>
  )
}

export default SingleGoalCard
