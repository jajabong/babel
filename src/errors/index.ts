/**
 * Error Handling Module Index
 * Centralized exports for all error handling utilities
 */

// Error types and classes
export {
  AppError,
  ValidationError,
  APIError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  BusinessLogicError,
  SystemError,
  ComponentError,
  AsyncOperationError,
  ErrorSeverity,
  ErrorCategory,
  isAppError,
  toAppError,
} from './types'

// Error boundaries
export {
  ErrorBoundary,
  withErrorBoundary,
  type ErrorBoundaryProps,
} from './ErrorBoundary'

export {
  AsyncErrorBoundary,
  withAsyncErrorBoundary,
  useAsyncErrorBoundary,
  useAsyncOperation,
  type AsyncErrorBoundaryProps,
  type AsyncErrorContextValue,
} from './AsyncErrorBoundary'

// Error reporting
export {
  ErrorReportingService,
  errorReporting,
  reportError,
  reportMessage,
  addBreadcrumb,
  setUser,
  clearUser,
  type ErrorReport,
  type Breadcrumb,
  type ErrorReportingConfig,
  type ErrorStatistics,
} from './ErrorReportingService'

// Re-export for convenience
export type { ErrorContext, ErrorMetadata } from './types'
