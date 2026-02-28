import React from 'react'
import { BookOpen, Calendar, User, Edit2, Trash2 } from 'lucide-react'
import type { Subject } from '../types'

interface SubjectListItemProps {
  subject: Subject
  onEdit?: (subject: Subject) => void
  onDelete?: (subject: Subject) => void
}

const SubjectListItem: React.FC<SubjectListItemProps> = ({ subject, onEdit, onDelete }) => {
  // Use backend color or fallback to generated color
  const getSubjectColor = () => {
    if (subject.color) return subject.color
    
    const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4']
    const index = subject.name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const color = getSubjectColor()

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all duration-200 p-4">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
          style={{ backgroundColor: `${color}15` }}
        >
          {subject.icon ? (
            <span>{subject.icon}</span>
          ) : (
            <BookOpen className="w-6 h-6" style={{ color }} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[#1E293B] mb-1 truncate">{subject.name}</h3>
          <p className="text-sm text-[#64748B] line-clamp-1 mb-2">
            {subject.description || 'No description available'}
          </p>
          <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span className={subject.createdBy === 'Me' ? 'font-semibold text-[#2563EB]' : ''}>
                {subject.createdBy || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{subject.createdAt ? new Date(subject.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {subject.createdBy === 'Me' && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={() => onEdit?.(subject)}
              className="px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1D4ED8] transition-colors flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button 
              onClick={() => onDelete?.(subject)}
              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SubjectListItem
