import React from 'react'
import { BookOpen, Calendar, User, Edit2, Trash2 } from 'lucide-react'
import type { Subject } from '../types'

interface SubjectCardProps {
  subject: Subject
  onEdit?: (subject: Subject) => void
  onDelete?: (subject: Subject) => void
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onEdit, onDelete }) => {
  // Use backend color or fallback to generated color
  const getSubjectColor = () => {
    if (subject.color) return subject.color
    
    const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4']
    const index = subject.name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const color = getSubjectColor()

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
      {/* Color Header */}
      <div 
        className="h-32 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` }}
      >
        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
        <div className="absolute bottom-4 left-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-2xl">
            {subject.icon || <BookOpen className="w-6 h-6 text-white" />}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-[#1E293B] mb-2 line-clamp-1">{subject.name}</h3>
        <p className="text-sm text-[#64748B] mb-4 line-clamp-2 min-h-[40px]">
          {subject.description || 'No description available'}
        </p>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-[#64748B] mb-4">
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

        {/* Actions */}
        {subject.createdBy === 'Me' && (
          <div className="flex gap-2">
            <button 
              onClick={() => onEdit?.(subject)}
              className="flex-1 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1D4ED8] transition-colors flex items-center justify-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button 
              onClick={() => onDelete?.(subject)}
              className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SubjectCard
