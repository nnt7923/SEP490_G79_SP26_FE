import React, { useState, useEffect } from 'react'
import { X, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { useResponsive } from '../../../hook/useResponsive'
import NewSummaryForm from './NewSummaryForm'
import SummarySessionList from './SummarySessionList'
import type { SummaryPanelProps, SummarySession, ResourceSummaryDto, SummaryErrorDto } from '../../../types/summary'
import { getSummaryHub } from '../../../services/SignalR'
import * as signalR from '@microsoft/signalr'

/**
 * SummaryPanel Component
 * 
 * Main panel component that integrates AI summary functionality into the resource viewer.
 * Manages SignalR connection, summary sessions, and responsive layout.
 * 
 * Feature: resource-ai-summary
 * Requirements: 1.1, 1.3, 6.4, 7.1, 7.3, 7.4
 */
const SummaryPanel: React.FC<SummaryPanelProps> = ({
  resourceId,
  totalPages,
  isVisible,
  onToggle,
}) => {
  // State management
  const [sessions, setSessions] = useState<SummarySession[]>([])
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected')
  const [isFormVisible, setIsFormVisible] = useState(false)

  // Responsive layout detection
  const { isMobile } = useResponsive()

  // Ref for focus management
  const panelRef = React.useRef<HTMLDivElement>(null)
  const previousFocusRef = React.useRef<HTMLElement | null>(null)

  /**
   * Clear sessions when resourceId changes
   * Validates: Requirement 8.2
   */
  useEffect(() => {
    setSessions([])
  }, [resourceId])

  /**
   * Keyboard navigation support
   * Validates: Requirement 7.4
   * - Escape key closes the panel on mobile
   * - Ctrl/Cmd + K toggles the panel
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key closes panel on mobile
      if (event.key === 'Escape' && isMobile && isVisible && onToggle) {
        event.preventDefault()
        onToggle()
      }

      // Ctrl/Cmd + K toggles panel
      if ((event.ctrlKey || event.metaKey) && event.key === 'k' && onToggle) {
        event.preventDefault()
        onToggle()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobile, isVisible, onToggle])

  /**
   * Focus management for mobile modal
   * Validates: Requirement 7.4
   * - Save previous focus when modal opens
   * - Restore focus when modal closes
   * - Focus first interactive element when modal opens
   */
  useEffect(() => {
    if (isMobile && isVisible) {
      // Save the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement

      // Focus the panel container
      if (panelRef.current) {
        // Find the first focusable element (close button or first input)
        const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements.length > 0) {
          focusableElements[0].focus()
        }
      }
    } else if (isMobile && !isVisible && previousFocusRef.current) {
      // Restore focus when modal closes
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [isMobile, isVisible])

  /**
   * Focus trap for mobile modal
   * Validates: Requirement 7.4
   * - Keep focus within modal when Tab is pressed
   */
  useEffect(() => {
    if (!isMobile || !isVisible) return

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => {
      document.removeEventListener('keydown', handleTabKey)
    }
  }, [isMobile, isVisible])

  /**
   * SignalR connection lifecycle
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 8.2
   */
  useEffect(() => {
    let hub: signalR.HubConnection | null = null
    let mounted = true

    const initializeConnection = async () => {
      try {
        // Get the summary hub connection
        hub = await getSummaryHub()

        // Set up connection state handlers
        hub.onreconnecting(() => {
          if (mounted) {
            setConnectionState('reconnecting')
          }
        })

        hub.onreconnected(() => {
          if (mounted) {
            setConnectionState('connected')
          }
        })

        hub.onclose(() => {
          if (mounted) {
            setConnectionState('disconnected')
          }
        })

        // Set up event handlers for summary events
        hub.on('SummaryLoading', () => {
          // Loading state is already set when creating the session
          // This event confirms the server received the request
        })

        hub.on('ReceiveSummary', (dto: ResourceSummaryDto) => {
          if (!mounted) return
          
          setSessions((prev) =>
            prev.map((session) =>
              session.resourceId === dto.resourceId &&
              session.startPage === dto.startPage &&
              session.endPage === dto.endPage &&
              session.status === 'loading'
                ? {
                    ...session,
                    status: 'success' as const,
                    summary: dto.summary,
                  }
                : session
            )
          )
        })

        hub.on('SummaryError', (error: SummaryErrorDto) => {
          if (!mounted) return
          
          // Log error code for debugging
          setSessions((prev) =>
            prev.map((session) =>
              session.resourceId === error.resourceId &&
              session.startPage === error.startPage &&
              session.endPage === error.endPage &&
              session.status === 'loading'
                ? {
                    ...session,
                    status: 'error' as const,
                    errorMessage: error.errorMessage,
                  }
                : session
            )
          )
        })

        // Update connection state
        if (mounted && hub.state === signalR.HubConnectionState.Connected) {
          setConnectionState('connected')
        }
      } catch (error) {
        if (mounted) {
          setConnectionState('disconnected')
        }
      }
    }

    initializeConnection()

    return () => {
      mounted = false
      // Cleanup: remove event handlers and disconnect
      if (hub) {
        hub.off('SummaryLoading')
        hub.off('ReceiveSummary')
        hub.off('SummaryError')
        // Note: We don't stop the hub here as it's a singleton managed by the service
        // The service will handle disconnection when appropriate
      }
    }
  }, [resourceId])

  /**
   * Request new summary via SignalR
   * Validates: Requirements 2.4, 2.5
   */
  const handleRequestSummary = async (startPage: number, endPage: number) => {
    try {
      // Create a new session in loading state
      const newSession: SummarySession = {
        id: `${resourceId}-${startPage}-${endPage}-${Date.now()}`,
        resourceId,
        startPage,
        endPage,
        status: 'loading',
        timestamp: Date.now(),
      }

      setSessions((prev) => [newSession, ...prev])

      // Get the hub and invoke the request
      const hub = await getSummaryHub()
      await hub.invoke('RequestResourceSummary', resourceId, startPage, endPage)
    } catch (error) {
      
      // Update the session to error state
      setSessions((prev) =>
        prev.map((session) =>
          session.resourceId === resourceId &&
          session.startPage === startPage &&
          session.endPage === endPage &&
          session.status === 'loading'
            ? {
                ...session,
                status: 'error' as const,
                errorMessage: 'Failed to send summary request. Please try again.',
              }
            : session
        )
      )
    }
  }

  /**
   * Retry failed summary request
   */
  const handleRetry = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId)
    if (session) {
      handleRequestSummary(session.startPage, session.endPage)
    }
  }

  /**
   * Delete summary session
   */
  const handleDelete = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
  }

  /**
   * Render connection status indicator
   * Validates: Requirement 6.4, 7.4
   */
  const renderConnectionStatus = () => {
    if (connectionState === 'connected') {
      return (
        <div 
          className="flex items-center space-x-2 text-status-green"
          role="status"
          aria-live="polite"
          aria-label="Connection status: Connected"
        >
          <Wifi className="w-4 h-4" aria-hidden="true" />
          <span className="text-xs font-medium">Connected</span>
        </div>
      )
    }

    if (connectionState === 'reconnecting') {
      return (
        <div 
          className="flex items-center space-x-2 text-yellow-600"
          role="status"
          aria-live="polite"
          aria-label="Connection status: Reconnecting"
        >
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span className="text-xs font-medium">Reconnecting...</span>
        </div>
      )
    }

    return (
      <div 
        className="flex items-center space-x-2 text-status-red"
        role="status"
        aria-live="polite"
        aria-label="Connection status: Disconnected"
      >
        <WifiOff className="w-4 h-4" aria-hidden="true" />
        <span className="text-xs font-medium">Disconnected</span>
      </div>
    )
  }

  /**
   * Render panel header with connection status
   * Validates: Requirements 1.1, 6.4
   */
  const renderHeader = () => (
    <div className="pb-3 border-b border-sl-200">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-sl-900">
          AI Summary
        </h2>
        {isMobile && onToggle && (
          <button
            onClick={onToggle}
            className="p-1 hover:bg-sl-100 transition-colors"
            title="Close summary panel"
            aria-label="Close summary panel"
          >
            <X className="w-4 h-4 text-sl-600" />
          </button>
        )}
      </div>
      {renderConnectionStatus()}
    </div>
  )

  /**
   * Render panel content
   */
  const renderContent = () => (
    <div className="flex-1 overflow-y-auto space-y-4">
      {/* New Summary Form - Collapsible */}
      <div>
        <button
          onClick={() => setIsFormVisible(!isFormVisible)}
          className="w-full flex items-center justify-between text-xs font-medium text-sl-600 hover:text-sl-900 transition-colors mb-2"
        >
          <span>New Summary</span>
          <span className="text-sl-400">{isFormVisible ? '−' : '+'}</span>
        </button>
        {isFormVisible && (
          <NewSummaryForm
            totalPages={totalPages}
            onSubmit={handleRequestSummary}
            disabled={connectionState !== 'connected'}
            existingSessions={sessions}
          />
        )}
      </div>

      {/* Summary Sessions List */}
      <div>
        <h3 className="text-xs font-medium text-sl-600 mb-2">
          History
        </h3>
        <SummarySessionList
          sessions={sessions}
          onRetry={handleRetry}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )

  // Don't render if not visible
  if (!isVisible) {
    return null
  }

  /**
   * Desktop layout: Side panel (384px width)
   * Validates: Requirements 7.1, 7.3, 7.5
   */
  if (!isMobile) {
    return (
      <div
        ref={panelRef}
        className="flex flex-col h-full bg-th-card border-l border-sl-200"
        style={{ width: '384px' }}
        role="complementary"
        aria-label="AI Summary Panel"
      >
        <div className="p-4 flex flex-col h-full">
          {renderHeader()}
          {renderContent()}
        </div>
      </div>
    )
  }

  /**
   * Mobile layout: Full-screen modal
   * Validates: Requirements 7.3, 7.4
   */
  return (
    <div 
      ref={panelRef}
      className="fixed inset-0 z-50 bg-th-card"
      role="dialog"
      aria-modal="true"
      aria-label="AI Summary Panel"
    >
      <div className="flex flex-col h-full">
        <div className="p-4 flex flex-col h-full">
          {renderHeader()}
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default SummaryPanel
