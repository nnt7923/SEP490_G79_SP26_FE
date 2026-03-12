import React from 'react'
import { BookOpen, Calendar, User } from 'lucide-react'
import type { Subject } from '../types'

interface SubjectListItemProps {
  subject: Subject
  onEdit?: (subject: Subject) => void
  onDelete?: (subject: Subject) => void
}

const SubjectListItem: React.FC<SubjectListItemProps> = ({ subject, onEdit, onDelete }) => {
    return (
      <div className="bg-th-card border border-bd-strong p-4 hover:bg-th-page transition-colors font-mono">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Icon */}
          <div className="w-12 h-12 bg-th-input border border-bd flex items-center justify-center flex-shrink-0">
            {subject.icon ? (
              subject.icon.startsWith('devicon-') ? (
                <i className={`${subject.icon} text-2xl text-status-blue`}></i>
              ) : (
                <span className="text-xl">{subject.icon}</span>
              )
            ) : (
              <BookOpen className="w-6 h-6 text-status-blue" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 w-full">
            <h3 className="text-sm font-bold text-heading mb-1 truncate uppercase">{subject.name}</h3>
            <p className="text-xs text-label line-clamp-1 mb-2">
              {subject.description || 'no_description( )'}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span className={subject.createdBy === 'Me' ? 'font-bold text-status-blue' : ''}>
                  {subject.createdBy === 'Me' ? 'me' : subject.createdBy || 'unknown'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{subject.createdAt ? new Date(subject.createdAt).toLocaleDateString() : 'n/a'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {subject.createdBy === 'Me' && (
            <div className="flex items-center gap-2 flex-shrink-0 mt-4 sm:mt-0 w-full sm:w-auto justify-end border-t sm:border-t-0 border-bd-muted pt-3 sm:pt-0">
              <button 
                onClick={() => onEdit?.(subject)}
                className="px-3 py-1 border border-blue-600 text-status-blue text-xs font-bold hover:bg-status-blue-bg transition-colors uppercase rounded-sm"
              >
                edit
              </button>
              <button 
                onClick={() => onDelete?.(subject)}
                className="px-3 py-1 border border-red-600 text-status-red text-xs font-bold hover:bg-status-red-bg transition-colors uppercase rounded-sm"
              >
                del
              </button>
            </div>
          )}
        </div>
      </div>
    )
}

export default SubjectListItem
