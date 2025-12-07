/**
 * Error Reporting Service Tests
 * Tests error logging, reporting, and monitoring functionality
 */

import ErrorReportingService, { errorReporting } from '../ErrorReportingService'
import { AppError, ErrorSeverity, ErrorCategory } from '../types'

// Mock fetch
global.fetch = jest.fn()

// Mock console methods
const originalConsoleError = console.error
const originalConsoleGroup = console.group

beforeEach(() => {
  console.error = jest.fn()
  console.group = jest.fn()
  jest.clearAllMocks()
  // Reset the singleton instance
  ;(ErrorReportingService as any).instance = null
})

afterEach(() => {
  console.error = originalConsoleError
  console.group = originalConsoleGroup
})

describe('ErrorReportingService', () => {
  let service: ErrorReportingService

  beforeEach(() => {
    service = ErrorReportingService.getInstance({
      enabled: true,
      environment: 'test',
      maxErrors: 10,
      endpoint: 'https://test-error-reporting.com/api/errors',
      apiKey: 'test-api-key',
    })
  })

  describe('captureException', () => {
    it('should capture and report AppError instances', () => {
      const error = new AppError('Test error', {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.USER_INPUT,
        recoverable: true,
        retryable: false,
        userMessage: 'Something went wrong',
      })

      const errorId = service.captureException(error)

      expect(errorId).toBeTruthy()
      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/)
    })

    it('should convert unknown errors to AppError', () => {
      const unknownError = new Error('Unknown error')
      const errorId = service.captureException(unknownError)

      expect(errorId).toBeTruthy()

      const recentErrors = service.getRecentErrors(1)
      expect(recentErrors).toHaveLength(1)
      expect(recentErrors[0].error.message).toBe('Unknown error')
    })

    it('should handle string errors', () => {
      const stringError = 'String error message'
      const errorId = service.captureException(stringError)

      expect(errorId).toBeTruthy()

      const recentErrors = service.getRecentErrors(1)
      expect(recentErrors[0].error.message).toBe('String error message')
    })

    it('should add context information', () => {
      const error = new Error('Test error')
      const context = {
        context: 'test_context',
        additionalData: { userId: '123', action: 'test_action' },
        tags: { component: 'TestComponent' },
      }

      service.captureException(error, context)

      const recentErrors = service.getRecentErrors(1)
      const report = recentErrors[0]

      expect(report.context?.userId).toBe('123')
      expect(report.context?.action).toBe('test_action')
      expect(report.context?.component).toBe('TestComponent')
    })

    it('should respect ignore list', () => {
      service.updateConfig({
        ignoreErrors: ['Ignored error message'],
      })

      const error = new Error('Ignored error message')
      const errorId = service.captureException(error)

      expect(errorId).toBe('')
      const recentErrors = service.getRecentErrors()
      expect(recentErrors).toHaveLength(0)
    })

    it('should not report when disabled', () => {
      service.updateConfig({ enabled: false })

      const error = new Error('Test error')
      const errorId = service.captureException(error)

      expect(errorId).toBe('')
    })

    it('should call beforeSend hook', () => {
      const beforeSend = jest.fn(report => {
        report.context!.filtered = true
        return report
      })

      service.updateConfig({ beforeSend })

      const error = new Error('Test error')
      service.captureException(error)

      expect(beforeSend).toHaveBeenCalled()

      const recentErrors = service.getRecentErrors(1)
      expect(recentErrors[0].context?.filtered).toBe(true)
    })

    it('should not send error if beforeSend returns null', () => {
      const beforeSend = jest.fn(() => null)
      service.updateConfig({ beforeSend })

      const error = new Error('Test error')
      const errorId = service.captureException(error)

      expect(errorId).toBe('')
      expect(beforeSend).toHaveBeenCalled()
    })
  })

  describe('captureMessage', () => {
    it('should capture log messages', () => {
      const errorId = service.captureMessage('Test message', 'info')

      expect(errorId).toBeTruthy()

      const recentErrors = service.getRecentErrors(1)
      expect(recentErrors[0].error.userMessage).toBe('Test message')
      expect(recentErrors[0].error.severity).toBe(ErrorSeverity.LOW)
    })

    it('should handle different severity levels', () => {
      service.captureMessage('Warning message', 'warning')
      service.captureMessage('Error message', 'error')

      const recentErrors = service.getRecentErrors(2)

      expect(recentErrors[0].error.severity).toBe(ErrorSeverity.MEDIUM) // warning
      expect(recentErrors[1].error.severity).toBe(ErrorSeverity.MEDIUM) // error
    })
  })

  describe('breadcrumb tracking', () => {
    it('should add breadcrumbs', () => {
      service.addBreadcrumb('User action', 'user', 'info', { action: 'click' })

      const breadcrumbs = service.getRecentBreadcrumbs(1)
      expect(breadcrumbs).toHaveLength(1)
      expect(breadcrumbs[0].message).toBe('User action')
      expect(breadcrumbs[0].category).toBe('user')
      expect(breadcrumbs[0].level).toBe('info')
      expect(breadcrumbs[0].data?.action).toBe('click')
    })

    it('should limit breadcrumb count', () => {
      service.updateConfig({ maxBreadcrumbs: 3 })

      // Add more breadcrumbs than the limit
      for (let i = 0; i < 5; i++) {
        service.addBreadcrumb(`Message ${i}`, 'log', 'info')
      }

      const breadcrumbs = service.getRecentBreadcrumbs()
      expect(breadcrumbs).toHaveLength(3)
      expect(breadcrumbs[0].message).toBe('Message 2') // Should keep the most recent
    })

    it('should include breadcrumbs in error reports', () => {
      service.addBreadcrumb('Before error', 'log', 'info')

      const error = new Error('Test error')
      service.captureException(error)

      const recentErrors = service.getRecentErrors(1)
      expect(recentErrors[0].breadcrumbs).toHaveLength(1)
      expect(recentErrors[0].breadcrumbs[0].message).toBe('Before error')
    })
  })

  describe('user context', () => {
    it('should set user context', () => {
      service.setUser('user123', { email: 'user@example.com', role: 'admin' })

      expect(service.getUserId()).toBe('user123')

      const breadcrumbs = service.getRecentBreadcrumbs(1)
      expect(breadcrumbs[0].message).toContain('User set: user123')
      expect(breadcrumbs[0].data?.email).toBe('user@example.com')
    })

    it('should clear user context', () => {
      service.setUser('user123')
      expect(service.getUserId()).toBe('user123')

      service.clearUser()
      expect(service.getUserId()).toBeUndefined()

      const breadcrumbs = service.getRecentBreadcrumbs(1)
      expect(breadcrumbs[0].message).toBe('User cleared')
    })
  })

  describe('statistics', () => {
    it('should track error statistics', () => {
      // Add different types of errors
      service.captureMessage('Low severity error', 'info')
      service.captureMessage('Medium severity error', 'error')

      const validationError = new AppError('Validation error', {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.VALIDATION,
        recoverable: true,
        retryable: false,
        userMessage: 'Validation failed',
      })
      service.captureException(validationError)

      const stats = service.getStatistics()

      expect(stats.totalErrors).toBe(3)
      expect(stats.errorsByCategory[ErrorCategory.VALIDATION]).toBe(1)
      expect(stats.errorsBySeverity[ErrorSeverity.LOW]).toBe(1)
      expect(stats.errorsBySeverity[ErrorSeverity.MEDIUM]).toBe(2)
      expect(stats.topErrorMessages).toHaveLength(3)
    })

    it('should limit recent errors in statistics', () => {
      // Add more errors than the limit
      for (let i = 0; i < 15; i++) {
        service.captureMessage(`Error ${i}`, 'error')
      }

      const stats = service.getStatistics()
      expect(stats.recentErrors).toHaveLength(10) // Should be limited to 10
    })
  })

  describe('session management', () => {
    it('should generate unique session ID', () => {
      const sessionId = service.getSessionId()
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/)
    })

    it('should include session ID in error reports', () => {
      const error = new Error('Test error')
      service.captureException(error)

      const recentErrors = service.getRecentErrors(1)
      expect(recentErrors[0].sessionId).toBe(service.getSessionId())
    })
  })

  describe('data sanitization', () => {
    it('should sanitize sensitive data for logging', () => {
      const error = new Error('Test error')
      const context = {
        additionalData: {
          password: 'secret123',
          token: 'abc123',
          apiKey: 'def456',
          safeField: 'safe_value',
        },
      }

      service.captureException(error, context)

      const recentErrors = service.getRecentErrors(1)
      const sanitizedData = recentErrors[0].context?.additionalData

      expect(sanitizedData?.password).toBe('***')
      expect(sanitizedData?.token).toBe('***')
      expect(sanitizedData?.apiKey).toBe('***')
      expect(sanitizedData?.safeField).toBe('safe_value')
    })

    it('should sanitize error messages', () => {
      const error = new Error('Error with password=secret123 and token=abc123')
      service.captureException(error)

      const recentErrors = service.getRecentErrors(1)
      const sanitizedMessage = recentErrors[0].error.message

      expect(sanitizedMessage).toBe('Error with password=*** and token=***')
    })
  })

  describe('HTTP reporting', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      })
    })

    it('should send error reports to endpoint', async () => {
      const error = new Error('Test error')
      service.captureException(error)

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(fetch).toHaveBeenCalledWith(
        'https://test-error-reporting.com/api/errors',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
          }),
          body: expect.any(String),
        })
      )
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const error = new Error('Test error')
      service.captureException(error)

      // Wait for retry mechanism
      await new Promise(resolve => setTimeout(resolve, 0))

      // Error should remain in queue
      const recentErrors = service.getRecentErrors(1)
      expect(recentErrors).toHaveLength(1)
    })

    it('should remove successful reports from queue', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      })

      const error = new Error('Test error')
      service.captureException(error)

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0))

      // Error should be removed from queue after successful send
      const recentErrors = service.getRecentErrors()
      expect(recentErrors).toHaveLength(0)
    })

    it('should limit error queue size', () => {
      service.updateConfig({ maxErrors: 2 })

      // Add more errors than the limit
      for (let i = 0; i < 5; i++) {
        service.captureMessage(`Error ${i}`, 'error')
      }

      const recentErrors = service.getRecentErrors()
      expect(recentErrors.length).toBeLessThanOrEqual(2)
    })
  })

  describe('configuration', () => {
    it('should update configuration', () => {
      service.updateConfig({
        enabled: false,
        maxErrors: 5,
        environment: 'production',
      })

      const config = service.getConfig()
      expect(config.enabled).toBe(false)
      expect(config.maxErrors).toBe(5)
      expect(config.environment).toBe('production')
    })

    it('should not modify configuration when disabled', () => {
      service.updateConfig({ enabled: false })

      const error = new Error('Test error')
      const errorId = service.captureException(error)

      expect(errorId).toBe('')
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('clear functionality', () => {
    it('should clear all data', () => {
      service.addBreadcrumb('Test breadcrumb', 'log', 'info')
      service.captureMessage('Test error', 'error')

      expect(service.getRecentBreadcrumbs()).toHaveLength(1)
      expect(service.getRecentErrors()).toHaveLength(1)

      service.clear()

      expect(service.getRecentBreadcrumbs()).toHaveLength(1) // Clear breadcrumb itself
      expect(service.getRecentErrors()).toHaveLength(0)
    })
  })
})

describe('Global error handlers', () => {
  let service: ErrorReportingService

  beforeEach(() => {
    service = ErrorReportingService.getInstance({ enabled: true })
  })

  it('should handle unhandled promise rejections', done => {
    const unhandledRejection = new Event('unhandledrejection') as any
    unhandledRejection.reason = new Error('Unhandled rejection')

    window.dispatchEvent(unhandledRejection)

    setTimeout(() => {
      const recentErrors = service.getRecentErrors(1)
      expect(recentErrors).toHaveLength(1)
      expect(recentErrors[0].error.message).toBe('Unhandled rejection')
      done()
    }, 0)
  })

  it('should handle uncaught errors', done => {
    const error = new Error('Uncaught error')
    const errorEvent = new ErrorEvent('error', {
      error,
      filename: 'test.js',
      lineno: 42,
      colno: 10,
    })

    window.dispatchEvent(errorEvent)

    setTimeout(() => {
      const recentErrors = service.getRecentErrors(1)
      expect(recentErrors).toHaveLength(1)
      expect(recentErrors[0].error.message).toBe('Uncaught error')
      expect(recentErrors[0].context?.filename).toBe('test.js')
      expect(recentErrors[0].context?.lineno).toBe(42)
      done()
    }, 0)
  })
})
