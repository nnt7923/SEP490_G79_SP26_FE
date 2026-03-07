import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as signalR from '@microsoft/signalr'
import { getSummaryHub, requestResourceSummary, disconnectSummaryHub } from './index'

// Mock the SignalR module
vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: vi.fn(() => ({
    withUrl: vi.fn().mockReturnThis(),
    withAutomaticReconnect: vi.fn().mockReturnThis(),
    configureLogging: vi.fn().mockReturnThis(),
    build: vi.fn(() => mockHubConnection),
  })),
  HubConnectionState: {
    Disconnected: 0,
    Connected: 1,
  },
  LogLevel: {
    None: 0,
  },
}))

// Mock auth store
vi.mock('../../store/useAuthStore', () => ({
  default: {
    getState: () => ({ token: 'mock-token' }),
  },
}))

const mockHubConnection = {
  state: 0, // Disconnected
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  invoke: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}

describe('SignalR Summary Hub Service', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockHubConnection.state = 0 // Reset to Disconnected
    // Ensure clean state by disconnecting
    await disconnectSummaryHub()
  })

  afterEach(async () => {
    await disconnectSummaryHub()
  })

  describe('getSummaryHub', () => {
    it('should create and start a hub connection', async () => {
      const hub = await getSummaryHub()
      
      expect(hub).toBeDefined()
      expect(mockHubConnection.start).toHaveBeenCalled()
    })

    it('should return the same instance on subsequent calls (singleton)', async () => {
      const hub1 = await getSummaryHub()
      mockHubConnection.state = 1 // Set to Connected
      const hub2 = await getSummaryHub()
      
      expect(hub1).toBe(hub2)
      expect(mockHubConnection.start).toHaveBeenCalledTimes(1)
    })
  })

  describe('requestResourceSummary', () => {
    it('should reject if resourceId is not a valid GUID', async () => {
      await expect(
        requestResourceSummary('invalid-id', 1, 10)
      ).rejects.toThrow('resourceId phải là GUID hợp lệ')
    })

    it('should reject if startPage is less than 1', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      await expect(
        requestResourceSummary(validGuid, 0, 10)
      ).rejects.toThrow('Số trang phải lớn hơn 0')
    })

    it('should reject if endPage is less than 1', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      await expect(
        requestResourceSummary(validGuid, 1, 0)
      ).rejects.toThrow('Số trang phải lớn hơn 0')
    })

    it('should reject if startPage is greater than endPage', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      await expect(
        requestResourceSummary(validGuid, 10, 5)
      ).rejects.toThrow('Trang bắt đầu phải nhỏ hơn hoặc bằng trang kết thúc')
    })

    it('should invoke hub method with correct parameters', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      mockHubConnection.invoke.mockResolvedValue(undefined)
      
      // Simulate successful response
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveSummary') {
          setTimeout(() => handler({
            resourceId: validGuid,
            startPage: 1,
            endPage: 10,
            summary: 'Test summary'
          }), 10)
        }
      })

      const promise = requestResourceSummary(validGuid, 1, 10)
      
      await expect(promise).resolves.toBeDefined()
      expect(mockHubConnection.invoke).toHaveBeenCalledWith(
        'RequestResourceSummary',
        validGuid,
        1,
        10
      )
    })

    it('should call onLoading callback when SummaryLoading event is received', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      const onLoading = vi.fn()
      mockHubConnection.invoke.mockResolvedValue(undefined)
      
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'SummaryLoading') {
          setTimeout(() => handler(), 5)
        }
        if (event === 'ReceiveSummary') {
          setTimeout(() => handler({
            resourceId: validGuid,
            startPage: 1,
            endPage: 10,
            summary: 'Test summary'
          }), 10)
        }
      })

      await requestResourceSummary(validGuid, 1, 10, onLoading)
      
      expect(onLoading).toHaveBeenCalled()
    })

    it('should resolve with summary data when ReceiveSummary event is received', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      const mockSummary = {
        resourceId: validGuid,
        startPage: 1,
        endPage: 10,
        summary: 'This is a test summary'
      }
      
      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveSummary') {
          setTimeout(() => handler(mockSummary), 10)
        }
      })

      const result = await requestResourceSummary(validGuid, 1, 10)
      
      expect(result).toEqual(mockSummary)
    })

    it('should reject when SummaryError event is received', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      const mockError = {
        errorCode: 'AI_SERVICE_ERROR',
        errorMessage: 'AI service temporarily unavailable'
      }
      
      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'SummaryError') {
          setTimeout(() => handler(mockError), 10)
        }
      })

      await expect(
        requestResourceSummary(validGuid, 1, 10)
      ).rejects.toThrow('AI service temporarily unavailable')
    })

    it('should prevent duplicate requests for the same resource and page range', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.state = 1 // Set to Connected to avoid reconnection
      
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveSummary') {
          setTimeout(() => handler({
            resourceId: validGuid,
            startPage: 1,
            endPage: 10,
            summary: 'Test summary'
          }), 50)
        }
      })

      // Start first request
      const promise1 = requestResourceSummary(validGuid, 1, 10)
      // Start second request with same parameters immediately (before first completes)
      const promise2 = requestResourceSummary(validGuid, 1, 10)
      
      // Wait for both to complete
      const [result1, result2] = await Promise.all([promise1, promise2])
      
      // Both should resolve to the same data
      expect(result1).toEqual(result2)
      
      // Hub invoke should only be called once (single-flight guard working)
      expect(mockHubConnection.invoke).toHaveBeenCalledTimes(1)
    })
  })

  describe('disconnectSummaryHub', () => {
    it('should stop the hub connection', async () => {
      await getSummaryHub()
      mockHubConnection.state = 1 // Set to Connected
      
      await disconnectSummaryHub()
      
      expect(mockHubConnection.stop).toHaveBeenCalled()
    })

    it('should not throw if hub is already disconnected', async () => {
      mockHubConnection.state = 0 // Disconnected
      
      await expect(disconnectSummaryHub()).resolves.not.toThrow()
    })
  })
})
