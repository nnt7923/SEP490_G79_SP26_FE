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
    <div className="bg-white border border-gray-400 p-4 hover:bg-gray-50 transition-colors flex flex-col h-full font-mono">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 border border-gray-300 flex items-center justify-center">
            {subject.icon || <BookOpen className="w-5 h-5 text-blue-600" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 line-clamp-1 break-all uppercase">
              {subject.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs ${subject.createdBy === 'Me' ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                {subject.createdBy === 'Me' ? '[me]' : `[${subject.createdBy || 'unknown'}]`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow">
        <p className="text-xs text-gray-600 mb-4 line-clamp-3 min-h-[48px]">
          {'//'} {subject.description || 'no_description( )'}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{subject.createdAt ? new Date(subject.createdAt).toLocaleDateString() : 'n/a'}</span>
          </div>
          
          {subject.createdBy === 'Me' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onEdit?.(subject)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase px-2"
                title="Edit subject"
              >
                [ edit ]
              </button>
              <button 
                onClick={() => onDelete?.(subject)}
                className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors uppercase px-2"
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
