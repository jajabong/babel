/**
 * Error Reporting Service
 * Provides centralized error logging, reporting, and monitoring
 */

import { Sanitizer } from '../utils/validation'

import { AppError, ErrorSeverity, ErrorCategory, isAppError } from './types'

export interface ErrorReport {
  id: string
  timestamp: string
  error: AppError
  userAgent: string
  url: string
  userId?: string
  sessionId: string
  context?: Record<string, unknown>
  stack?: string
  breadcrumbs: Breadcrumb[]
}

export interface Breadcrumb {
  timestamp: string
  message: string
  category: 'user' | 'navigation' | 'http' | 'error' | 'log'
  level: 'info' | 'warning' | 'error'
  data?: Record<string, unknown>
}

export interface ErrorReportingConfig {
  enabled: boolean
  environment: 'development' | 'staging' | 'production'
  apiKey?: string
  endpoint?: string
  maxErrors: number
  maxBreadcrumbs: number
  ignoreErrors: string[]
  beforeSend?: (report: ErrorReport) => ErrorReport | null
  onError?: (error: Error, report: ErrorReport) => void
}

export interface ErrorStatistics {
  totalErrors: number
  errorsByCategory: Record<ErrorCategory, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  recentErrors: ErrorReport[]
  topErrorMessages: Array<{ message: string; count: number }>
  sessionStartTime: string
}

/**
 * Error Reporting Service Class
 */
export class ErrorReportingService {
  private static instance: ErrorReportingService
  private config: ErrorReportingConfig
  private errorQueue: ErrorReport[] = []
  private breadcrumbs: Breadcrumb[] = []
  private sessionId: string
  private userId?: string
  private isOnline: boolean = navigator.onLine
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map()

  private constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      enabled: true,
      environment: (import.meta.env.MODE as any) || 'development',
      maxErrors: 100,
      maxBreadcrumbs: 50,
      ignoreErrors: [],
      ...config,
    }

    this.sessionId = this.generateSessionId()
    this.initializeEventListeners()
    this.startSession()
  }

  /**
   * Get singleton instance
   */
  static getInstance(
    config?: Partial<ErrorReportingConfig>
  ): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService(config)
    }
    return ErrorReportingService.instance
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Initialize event listeners
   */
  private initializeEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true
      this.flushErrorQueue()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
      this.captureException(event.reason, {
        context: 'unhandled_promise_rejection',
        additionalData: { reason: event.reason },
      })
    })

    // Listen for uncaught errors
    window.addEventListener('error', event => {
      this.captureException(event.error, {
        context: 'uncaught_error',
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    })

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.addBreadcrumb({
        message: document.hidden ? 'Page hidden' : 'Page visible',
        category: 'navigation',
        level: 'info',
      })
    })
  }

  /**
   * Start session tracking
   */
  private startSession(): void {
    this.addBreadcrumb({
      message: 'Session started',
      category: 'log',
      level: 'info',
      data: {
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      },
    })
  }

  /**
   * Capture and report an exception
   */
  captureException(
    error: unknown,
    context?: {
      context?: string
      additionalData?: Record<string, unknown>
      tags?: Record<string, string>
    }
  ): string {
    if (!this.config.enabled) {
      return ''
    }

    try {
      // Convert to AppError if needed
      const appError = isAppError(error)
        ? error
        : this.createErrorFromUnknown(error, context?.context)

      // Check if error should be ignored
      if (this.shouldIgnoreError(appError)) {
        return ''
      }

      // Create error report
      const report: ErrorReport = {
        id: this.generateErrorId(),
        timestamp: new Date().toISOString(),
        error: appError,
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.userId,
        sessionId: this.sessionId,
        context: {
          ...context?.additionalData,
          ...context?.tags,
          environment: this.config.environment,
        },
        stack: appError.stack,
        breadcrumbs: [...this.breadcrumbs],
      }

      // Apply beforeSend hook
      const finalReport = this.config.beforeSend?.(report) ?? report
      if (!finalReport) {
        return ''
      }

      // Add to queue
      this.addToQueue(finalReport)

      // Try to send immediately
      if (this.isOnline) {
        this.sendReport(finalReport)
      }

      return finalReport.id
    } catch (reportingError) {
      console.error('Failed to capture exception:', reportingError)
      return ''
    }
  }

  /**
   * Capture a message (log)
   */
  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: Record<string, unknown>
  ): string {
    if (!this.config.enabled) {
      return ''
    }

    const error = new AppError(message, {
      code: 'LOG_MESSAGE',
      severity: level === 'error' ? ErrorSeverity.MEDIUM : ErrorSeverity.LOW,
      category: ErrorCategory.SYSTEM,
      context: {
        context: 'log_message',
        additionalData: context,
      },
      recoverable: true,
      retryable: false,
      userMessage: message,
      technicalDetails: `Logged message: ${message}`,
    })

    return this.captureException(error)
  }

  /**
   * Add breadcrumb for context
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const fullBreadcrumb: Breadcrumb = {
      timestamp: new Date().toISOString(),
      ...breadcrumb,
    }

    this.breadcrumbs.push(fullBreadcrumb)

    // Limit breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs)
    }
  }

  /**
   * Set user context
   */
  setUser(userId: string, userInfo?: Record<string, unknown>): void {
    this.userId = userId

    this.addBreadcrumb({
      message: `User set: ${userId}`,
      category: 'user',
      level: 'info',
      data: userInfo,
    })
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    this.userId = undefined

    this.addBreadcrumb({
      message: 'User cleared',
      category: 'user',
      level: 'info',
    })
  }

  /**
   * Set tag/context
   */
  setTag(key: string, value: string): void {
    this.addBreadcrumb({
      message: `Tag set: ${key} = ${value}`,
      category: 'log',
      level: 'info',
      data: { [key]: value },
    })
  }

  /**
   * Get error statistics
   */
  getStatistics(): ErrorStatistics {
    const errorsByCategory: Record<ErrorCategory, number> = {} as any
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any
    const messageCounts: Record<string, number> = {}

    for (const report of this.errorQueue) {
      errorsByCategory[report.error.category] =
        (errorsByCategory[report.error.category] || 0) + 1
      errorsBySeverity[report.error.severity] =
        (errorsBySeverity[report.error.severity] || 0) + 1

      const message = report.error.userMessage || report.error.message
      messageCounts[message] = (messageCounts[message] || 0) + 1
    }

    const topErrorMessages = Object.entries(messageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }))

    return {
      totalErrors: this.errorQueue.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: this.errorQueue.slice(-10),
      topErrorMessages,
      sessionStartTime: this.sessionId.split('_')[1],
    }
  }

  /**
   * Clear error queue and breadcrumbs
   */
  clear(): void {
    this.errorQueue = []
    this.breadcrumbs = []
    this.addBreadcrumb({
      message: 'Error reporting cleared',
      category: 'log',
      level: 'info',
    })
  }

  /**
   * Create AppError from unknown error
   */
  private createErrorFromUnknown(error: unknown, context?: string): AppError {
    if (isAppError(error)) {
      return error
    }

    if (error instanceof Error) {
      return new AppError(error.message, {
        code: 'UNKNOWN_ERROR',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SYSTEM,
        context: {
          context: context || 'unknown',
          additionalData: { originalError: error.name },
        },
        recoverable: true,
        retryable: false,
        userMessage: 'An unexpected error occurred',
        technicalDetails: error.stack,
      })
    }

    if (typeof error === 'string') {
      return new AppError(error, {
        code: 'STRING_ERROR',
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.USER_INPUT,
        context: { context: context || 'unknown' },
        recoverable: true,
        retryable: false,
        userMessage: error,
      })
    }

    return new AppError('Unknown error occurred', {
      code: 'UNKNOWN_ERROR',
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.SYSTEM,
      context: { context: context || 'unknown' },
      recoverable: true,
      retryable: false,
      userMessage: 'An unexpected error occurred',
      technicalDetails: JSON.stringify(error),
    })
  }

  /**
   * Check if error should be ignored
   */
  private shouldIgnoreError(error: AppError): boolean {
    // Check ignore list
    if (this.config.ignoreErrors.includes(error.message)) {
      return true
    }

    if (error.code && this.config.ignoreErrors.includes(error.code)) {
      return true
    }

    // Ignore low severity errors in production
    if (
      this.config.environment === 'production' &&
      error.severity === ErrorSeverity.LOW
    ) {
      return true
    }

    return false
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Add report to queue
   */
  private addToQueue(report: ErrorReport): void {
    this.errorQueue.push(report)

    // Limit queue size
    if (this.errorQueue.length > this.config.maxErrors) {
      this.errorQueue = this.errorQueue.slice(-this.config.maxErrors)
    }

    // Add breadcrumb
    this.addBreadcrumb({
      message: `Error captured: ${report.error.userMessage || report.error.message}`,
      category: 'error',
      level: 'error',
      data: {
        errorId: report.id,
        category: report.error.category,
        severity: report.error.severity,
      },
    })
  }

  /**
   * Send error report to monitoring service
   */
  private async sendReport(report: ErrorReport): Promise<void> {
    if (!this.config.endpoint) {
      // In development, just log to console
      if (import.meta.env.DEV) {
        console.group('🚨 Error Report')
        console.error('Error:', report.error)
        console.error('Context:', report.context)
        console.error('Breadcrumbs:', report.breadcrumbs)
        console.groupEnd()
      }
      return
    }

    try {
      // Sanitize report for logging
      const sanitizedReport = this.sanitizeReport(report)

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
        },
        body: JSON.stringify(sanitizedReport),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Remove from queue on successful send
      const index = this.errorQueue.findIndex(r => r.id === report.id)
      if (index !== -1) {
        this.errorQueue.splice(index, 1)
      }
    } catch (error) {
      console.error('Failed to send error report:', error)

      // Retry with exponential backoff
      this.scheduleRetry(report)
    }
  }

  /**
   * Sanitize report for logging (remove sensitive data)
   */
  private sanitizeReport(report: ErrorReport): ErrorReport {
    return {
      ...report,
      error: {
        ...report.error,
        message: Sanitizer.sanitizeForLogging(report.error.message),
        userMessage: Sanitizer.sanitizeForLogging(
          report.error.userMessage || ''
        ),
        technicalDetails: Sanitizer.sanitizeForLogging(
          report.error.technicalDetails || ''
        ),
        context: report.error.context
          ? {
              ...report.error.context,
              additionalData: this.sanitizeAdditionalData(
                report.error.context?.additionalData
              ),
            }
          : undefined,
      },
      context: report.context
        ? this.sanitizeAdditionalData(report.context)
        : undefined,
      breadcrumbs: report.breadcrumbs.map(breadcrumb => ({
        ...breadcrumb,
        message: Sanitizer.sanitizeForLogging(breadcrumb.message),
        data: breadcrumb.data
          ? this.sanitizeAdditionalData(breadcrumb.data)
          : undefined,
      })),
    }
  }

  /**
   * Sanitize additional data object
   */
  private sanitizeAdditionalData(
    data?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!data) {
      return undefined
    }

    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = Sanitizer.sanitizeForLogging(value)
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeAdditionalData(
          value as Record<string, unknown>
        )
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * Schedule retry for failed report
   */
  private scheduleRetry(report: ErrorReport, attempt: number = 1): void {
    const maxRetries = 5
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000) // Max 30 seconds

    if (attempt > maxRetries) {
      console.error(`Max retry attempts reached for error report ${report.id}`)
      return
    }

    const timeout = setTimeout(() => {
      if (this.isOnline) {
        this.sendReport(report)
      }
    }, delay)

    this.retryTimeouts.set(report.id, timeout)
  }

  /**
   * Flush error queue when online
   */
  private async flushErrorQueue(): Promise<void> {
    const reports = [...this.errorQueue]

    for (const report of reports) {
      await this.sendReport(report)
    }
  }

  /**
   * Get configuration
   */
  getConfig(): ErrorReportingConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId
  }

  /**
   * Get current user ID
   */
  getUserId(): string | undefined {
    return this.userId
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): ErrorReport[] {
    return this.errorQueue.slice(-limit)
  }

  /**
   * Get recent breadcrumbs
   */
  getRecentBreadcrumbs(limit: number = 20): Breadcrumb[] {
    return this.breadcrumbs.slice(-limit)
  }
}

/**
 * Default error reporting service instance
 */
export const errorReporting = ErrorReportingService.getInstance()

/**
 * Convenience functions for common error reporting tasks
 */
export const reportError = (
  error: unknown,
  context?: {
    context?: string
    additionalData?: Record<string, unknown>
    tags?: Record<string, string>
  }
): string => {
  return errorReporting.captureException(error, context)
}

export const reportMessage = (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): string => {
  return errorReporting.captureMessage(message, level, context)
}

export const addBreadcrumb = (
  message: string,
  category: Breadcrumb['category'] = 'log',
  level: Breadcrumb['level'] = 'info',
  data?: Record<string, unknown>
): void => {
  errorReporting.addBreadcrumb({ message, category, level, data })
}

export const setUser = (
  userId: string,
  userInfo?: Record<string, unknown>
): void => {
  errorReporting.setUser(userId, userInfo)
}

export const clearUser = (): void => {
  errorReporting.clearUser()
}

export default ErrorReportingService
