import React from 'react'
import { BookOpen, Calendar, User } from 'lucide-react'
import type { Subject } from '../types'

interface SubjectCardProps {
  subject: Subject
  onEdit?: (subject: Subject) => void
  onDelete?: (subject: Subject) => void
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onEdit, onDelete }) => {
  return (
    <div className="bg-th-card border border-bd-strong p-4 hover:bg-th-page transition-colors flex flex-col h-full font-mono">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-th-input border border-bd flex items-center justify-center">
            {subject.icon || <BookOpen className="w-5 h-5 text-status-blue" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-heading line-clamp-1 break-all uppercase">
              {subject.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs ${subject.createdBy === 'Me' ? 'text-status-blue font-bold' : 'text-muted'}`}>
                {subject.createdBy === 'Me' ? '[me]' : `[${subject.createdBy || 'unknown'}]`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow">
        <p className="text-xs text-label mb-4 line-clamp-3 min-h-[48px]">
          {'//'} {subject.description || 'no_description( )'}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-bd">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted">
            <Calendar className="w-3.5 h-3.5" />
            <span>{subject.createdAt ? new Date(subject.createdAt).toLocaleDateString() : 'n/a'}</span>
          </div>
          
          {subject.createdBy === 'Me' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onEdit?.(subject)}
                className="text-xs font-bold text-status-blue hover:text-status-blue-dark transition-colors uppercase px-2"
                title="Edit subject"
              >
                [ edit ]
              </button>
              <button 
                onClick={() => onDelete?.(subject)}
                className="text-xs font-bold text-status-red hover:text-status-red-darker transition-colors uppercase px-2"
                title="Delete subject"
              >
                [ del ]
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SubjectCard
