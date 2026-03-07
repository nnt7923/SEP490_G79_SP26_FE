/**
 * Type definitions for AI Summary feature
 * Feature: resource-ai-summary
 */

/**
 * Status of a summary session
 */
export type SummaryStatus = 'loading' | 'success' | 'error'

/**
 * A single AI summary session representing a request and its result
 */
export interface SummarySession {
  /** Unique identifier for the session */
  id: string
  /** Resource being summarized */
  resourceId: string
  /** First page of the range */
  startPage: number
  /** Last page of the range */
  endPage: number
  /** Current status of the summary request */
  status: SummaryStatus
  /** Generated summary text (present when status is 'success') */
  summary?: string
  /** Error details if failed (present when status is 'error') */
  errorMessage?: string
  /** Creation timestamp for ordering */
  timestamp: number
}

/**
 * Data transfer object for summary result from server
 * Received from SignalR ReceiveSummary event
 */
export interface ResourceSummaryDto {
  /** Resource identifier */
  resourceId: string
  /** First page of the summarized range */
  startPage: number
  /** Last page of the summarized range */
  endPage: number
  /** AI-generated summary text */
  summary: string
  /** ISO timestamp when summary was generated */
  generatedAt?: string
}

/**
 * Data transfer object for summary errors from server
 * Received from SignalR SummaryError event
 */
export interface SummaryErrorDto {
  /** Error code for debugging */
  errorCode: string
  /** Human-readable error message */
  errorMessage: string
  /** Resource identifier (optional) */
  resourceId?: string
  /** Start page of failed request (optional) */
  startPage?: number
  /** End page of failed request (optional) */
  endPage?: number
}

/**
 * Props for SummaryPanel component
 */
export interface SummaryPanelProps {
  /** Resource identifier */
  resourceId: string
  /** Total number of pages in the resource */
  totalPages: number
  /** Whether the panel is visible */
  isVisible: boolean
  /** Callback to toggle panel visibility */
  onToggle?: () => void
}

/**
 * Props for NewSummaryForm component
 */
export interface NewSummaryFormProps {
  /** Total number of pages in the resource */
  totalPages: number
  /** Callback when form is submitted with valid page range */
  onSubmit: (startPage: number, endPage: number) => void
  /** Whether the form should be disabled */
  disabled: boolean
  /** Existing sessions to check for duplicates */
  existingSessions: SummarySession[]
}

/**
 * Props for SummarySessionList component
 */
export interface SummarySessionListProps {
  /** List of summary sessions to display */
  sessions: SummarySession[]
  /** Callback when retry is requested for a failed session */
  onRetry: (sessionId: string) => void
  /** Callback when delete is requested for a session */
  onDelete: (sessionId: string) => void
}

/**
 * Props for SummarySessionItem component
 */
export interface SummarySessionItemProps {
  /** Summary session to display */
  session: SummarySession
  /** Callback when retry button is clicked */
  onRetry: () => void
  /** Callback when delete button is clicked */
  onDelete: () => void
}
