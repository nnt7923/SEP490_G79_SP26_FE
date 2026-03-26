import React from 'react'
import { Send, X } from 'lucide-react'

type Option = { id: string; label: string }

type Props = {
  isOpen: boolean
  title: string
  studentLabel: string
  pathLabel: string
  selectStudentPlaceholder: string
  selectPathPlaceholder: string
  submitLabel: string
  submittingLabel: string
  closeLabel: string
  students: Option[]
  paths: Option[]
  selectedStudentId: string
  selectedPathId: string
  onSelectStudent: (studentId: string) => void
  onSelectPath: (pathId: string) => void
  onClose: () => void
  onSubmit: () => void
  error?: string | null
  submitting?: boolean
  lockStudent?: boolean
  lockPath?: boolean
}

const ShareLearningPathModal: React.FC<Props> = ({
  isOpen,
  title,
  studentLabel,
  pathLabel,
  selectStudentPlaceholder,
  selectPathPlaceholder,
  submitLabel,
  submittingLabel,
  closeLabel,
  students,
  paths,
  selectedStudentId,
  selectedPathId,
  onSelectStudent,
  onSelectPath,
  onClose,
  onSubmit,
  error,
  submitting = false,
  lockStudent = false,
  lockPath = false,
}) => {
  if (!isOpen) return null

  return (
    <div className="chat-kit-modal-backdrop" onClick={onClose}>
      <div className="chat-kit-modal" onClick={(event) => event.stopPropagation()}>
        <div className="chat-kit-modal-header">
          <h3 className="chat-kit-modal-title">{title}</h3>
          <button type="button" onClick={onClose} className="chat-kit-modal-close" aria-label={closeLabel}>
            <X size={18} />
          </button>
        </div>

        <label className="chat-kit-modal-label">{studentLabel}</label>
        <select
          value={selectedStudentId}
          onChange={(event) => onSelectStudent(event.target.value)}
          className="chat-kit-modal-select"
          disabled={lockStudent || students.length === 0}
        >
          <option value="">{selectStudentPlaceholder}</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.label}
            </option>
          ))}
        </select>

        <label className="chat-kit-modal-label">{pathLabel}</label>
        <select
          value={selectedPathId}
          onChange={(event) => onSelectPath(event.target.value)}
          className="chat-kit-modal-select"
          disabled={lockPath || paths.length === 0}
        >
          <option value="">{selectPathPlaceholder}</option>
          {paths.map((path) => (
            <option key={path.id} value={path.id}>
              {path.label}
            </option>
          ))}
        </select>

        {error && <div className="chat-kit-modal-error">{error}</div>}

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !selectedStudentId || !selectedPathId}
          className="chat-kit-modal-submit"
        >
          <Send size={14} />
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </div>
  )
}

export default ShareLearningPathModal
