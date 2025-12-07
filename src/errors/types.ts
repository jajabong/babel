/**
 * Base Error Classes for the Application
 * Provides structured error handling with different error types
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  NETWORK = 'network',
  API = 'api',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
  COMPONENT = 'component',
  ASYNC_OPERATION = 'async_operation',
}

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  sessionId?: string
  requestId?: string
  timestamp?: string
  userAgent?: string
  url?: string
  additionalData?: Record<string, unknown>
}

export interface ErrorMetadata {
  code?: string
  severity: ErrorSeverity
  category: ErrorCategory
  context?: ErrorContext
  recoverable: boolean
  retryable: boolean
  userMessage?: string
  technicalDetails?: string
}

/**
 * Base Application Error Class
 */
export abstract class AppError extends Error {
  public readonly code?: string
  public readonly severity: ErrorSeverity
  public readonly category: ErrorCategory
  public readonly context?: ErrorContext
  public readonly recoverable: boolean
  public readonly retryable: boolean
  public readonly userMessage: string
  public readonly technicalDetails?: string
  public readonly timestamp: string
  public readonly originalError?: unknown

  constructor(message: string, metadata: Omit<ErrorMetadata, 'timestamp'>) {
    super(message)
    this.name = this.constructor.name
    this.code = metadata.code
    this.severity = metadata.severity
    this.category = metadata.category
    this.context = metadata.context
    this.recoverable = metadata.recoverable
    this.retryable = metadata.retryable
    this.userMessage = metadata.userMessage || message
    this.technicalDetails = metadata.technicalDetails
    this.timestamp = new Date().toISOString()

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Convert error to JSON for logging/reporting
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      category: this.category,
      context: this.context,
      recoverable: this.recoverable,
      retryable: this.retryable,
      userMessage: this.userMessage,
      technicalDetails: this.technicalDetails,
      timestamp: this.timestamp,
      stack: this.stack,
    }
  }

  /**
   * Check if error should be reported to monitoring service
   */
  shouldReport(): boolean {
    return (
      this.severity === ErrorSeverity.HIGH ||
      this.severity === ErrorSeverity.CRITICAL ||
      this.category === ErrorCategory.SYSTEM ||
      this.category === ErrorCategory.API
    )
  }
}

/**
 * Validation Error - for input validation failures
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    fieldName?: string,
    invalidValue?: unknown,
    context?: ErrorContext
  ) {
    super(message, {
      code: 'VALIDATION_ERROR',
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.VALIDATION,
      context: {
        ...context,
        additionalData: {
          ...context?.additionalData,
          fieldName,
          invalidValue:
            typeof invalidValue === 'string'
              ? invalidValue.substring(0, 100)
              : invalidValue,
        },
      },
      recoverable: true,
      retryable: false,
      userMessage: `Please check your input: ${message}`,
      technicalDetails: `Validation failed for field: ${fieldName || 'unknown'}`,
    })
  }
}

/**
 * API Error - for API communication failures
 */
export class APIError extends AppError {
  public readonly status?: number
  public readonly responseHeaders?: Record<string, string>

  constructor(
    message: string,
    status?: number,
    responseHeaders?: Record<string, string>,
    context?: ErrorContext
  ) {
    const severity =
      status && status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM

    super(message, {
      code: status ? `HTTP_${status}` : 'API_ERROR',
      severity,
      category: ErrorCategory.API,
      context,
      recoverable: status !== 401 && status !== 403,
      retryable: !status || status >= 500 || status === 408 || status === 429,
      userMessage: getAPIUserMessage(status),
      technicalDetails: `API Error: ${message} (Status: ${status || 'unknown'})`,
    })

    this.status = status
    this.responseHeaders = responseHeaders
  }
}

/**
 * Network Error - for network connectivity issues
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    isTimeout: boolean = false,
    context?: ErrorContext
  ) {
    super(message, {
      code: isTimeout ? 'NETWORK_TIMEOUT' : 'NETWORK_ERROR',
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.NETWORK,
      context,
      recoverable: true,
      retryable: true,
      userMessage: isTimeout
        ? 'Request timed out. Please check your connection and try again.'
        : 'Network connection failed. Please check your internet connection.',
      technicalDetails: `Network Error: ${message}`,
    })
  }
}

/**
 * Authentication Error - for authentication failures
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    context?: ErrorContext
  ) {
    super(message, {
      code: 'AUTH_ERROR',
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.AUTHENTICATION,
      context,
      recoverable: false,
      retryable: false,
      userMessage: 'Please sign in to continue.',
      technicalDetails: `Authentication Error: ${message}`,
    })
  }
}

/**
 * Authorization Error - for permission failures
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Access denied',
    requiredPermission?: string,
    context?: ErrorContext
  ) {
    super(message, {
      code: 'ACCESS_DENIED',
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.AUTHORIZATION,
      context: {
        ...context,
        additionalData: {
          ...context?.additionalData,
          requiredPermission,
        },
      },
      recoverable: false,
      retryable: false,
      userMessage: 'You do not have permission to perform this action.',
      technicalDetails: `Authorization Error: ${message} (Required: ${requiredPermission || 'unknown'})`,
    })
  }
}

/**
 * Business Logic Error - for application-specific business rule violations
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, userMessage?: string, context?: ErrorContext) {
    super(message, {
      code: 'BUSINESS_LOGIC_ERROR',
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.BUSINESS_LOGIC,
      context,
      recoverable: true,
      retryable: false,
      userMessage: userMessage || message,
      technicalDetails: `Business Logic Error: ${message}`,
    })
  }
}

/**
 * System Error - for unexpected system failures
 */
export class SystemError extends AppError {
  constructor(
    message: string,
    originalError?: unknown,
    context?: ErrorContext
  ) {
    super(message, {
      code: 'SYSTEM_ERROR',
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.SYSTEM,
      context,
      recoverable: false,
      retryable: false,
      userMessage: 'An unexpected error occurred. Please try again later.',
      technicalDetails: `System Error: ${message}`,
    })

    this.originalError = originalError
  }
}

/**
 * Component Error - for React component rendering errors
 */
export class ComponentError extends AppError {
  public readonly componentName?: string
  public readonly errorBoundary?: string

  constructor(
    message: string,
    componentName?: string,
    errorBoundary?: string,
    originalError?: unknown,
    context?: ErrorContext
  ) {
    super(message, {
      code: 'COMPONENT_ERROR',
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.COMPONENT,
      context: {
        ...context,
        additionalData: {
          ...context?.additionalData,
          componentName,
          errorBoundary,
        },
      },
      recoverable: true,
      retryable: false,
      userMessage:
        'Something went wrong with this component. Please refresh the page.',
      technicalDetails: `Component Error: ${message} in ${componentName || 'unknown component'}`,
    })

    this.componentName = componentName
    this.errorBoundary = errorBoundary
    this.originalError = originalError
  }
}

/**
 * Async Operation Error - for failed asynchronous operations
 */
export class AsyncOperationError extends AppError {
  public readonly operation?: string
  public readonly asyncType?: 'promise' | 'callback' | 'event' | 'timer'

  constructor(
    message: string,
    operation?: string,
    asyncType: 'promise' | 'callback' | 'event' | 'timer' = 'promise',
    context?: ErrorContext
  ) {
    super(message, {
      code: 'ASYNC_OPERATION_ERROR',
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.ASYNC_OPERATION,
      context: {
        ...context,
        additionalData: {
          ...context?.additionalData,
          operation,
          asyncType,
        },
      },
      recoverable: true,
      retryable: true,
      userMessage: 'An operation failed to complete. Please try again.',
      technicalDetails: `Async Operation Error: ${message} (${asyncType}: ${operation || 'unknown'})`,
    })

    this.operation = operation
    this.asyncType = asyncType
  }
}

/**
 * Helper function to get user-friendly messages for HTTP status codes
 */
function getAPIUserMessage(status?: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.'
    case 401:
      return 'Please sign in to continue.'
    case 403:
      return 'You do not have permission to perform this action.'
    case 404:
      return 'The requested resource was not found.'
    case 408:
      return 'Request timed out. Please try again.'
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
    case 500:
      return 'Server error. Please try again later.'
    case 502:
      return 'Service temporarily unavailable. Please try again later.'
    case 503:
      return 'Service maintenance in progress. Please try again later.'
    case 504:
      return 'Gateway timeout. Please try again later.'
    default:
      return 'An error occurred while communicating with the server.'
  }
}

/**
 * Type guard to check if an error is an instance of AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown, context?: ErrorContext): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new SystemError(error.message, error, context)
  }

  if (typeof error === 'string') {
    return new SystemError(error, undefined, context)
  }

  return new SystemError('Unknown error occurred', error, context)
}
