import React, {
  Component,
  ReactNode,
  ReactElement,
  createContext,
  useContext,
} from 'react'

import {
  AppError,
  AsyncOperationError,
  ErrorSeverity,
  isAppError,
} from './types'

interface AsyncErrorBoundaryState {
  hasError: boolean
  error: AppError | null
  errorId: string | null
  isRecovering: boolean
}

interface AsyncErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<{
    error: AppError
    retry: () => void
    reset: () => void
    errorId: string | null
  }>
  onError?: (error: AppError, errorId: string) => void
  onRecover?: (error: AppError) => Promise<void>
  maxRetries?: number
  recoveryTimeout?: number
  component?: string
  enableLogging?: boolean
}

interface AsyncErrorContextValue {
  handleError: (error: unknown, context?: string) => void
  clearError: () => void
  hasError: boolean
  currentError: AppError | null
  errorId: string | null
}

const AsyncErrorContext = createContext<AsyncErrorContextValue | null>(null)

/**
 * Hook to access async error boundary context
 */
export function useAsyncErrorBoundary(): AsyncErrorContextValue {
  const context = useContext(AsyncErrorContext)
  if (!context) {
    throw new Error(
      'useAsyncErrorBoundary must be used within an AsyncErrorBoundary'
    )
  }
  return context
}

/**
 * Async Error Boundary Component
 * Handles errors from async operations within its subtree
 */
export class AsyncErrorBoundary extends Component<
  AsyncErrorBoundaryProps,
  AsyncErrorBoundaryState
> {
  private recoveryTimeouts: Map<string, NodeJS.Timeout> = new Map()

  constructor(props: AsyncErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      isRecovering: false,
    }
  }

  componentWillUnmount() {
    // Clear all recovery timeouts
    this.recoveryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.recoveryTimeouts.clear()
  }

  generateErrorId = (): string => {
    return `async_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  handleError = (error: unknown, context?: string) => {
    const errorId = this.generateErrorId()

    // Convert unknown error to AppError
    const appError = isAppError(error)
      ? error
      : new AsyncOperationError(
          error instanceof Error
            ? error.message
            : 'Unknown async error occurred',
          context || 'unknown_operation',
          'promise',
          {
            component: this.props.component,
            action: context,
            errorId,
            url: window.location.href,
            additionalData: {
              asyncBoundary: true,
            },
          }
        )

    this.setState({
      hasError: true,
      error: appError,
      errorId,
      isRecovering: false,
    })

    // Report error
    if (this.props.onError) {
      this.props.onError(appError, errorId)
    }

    // Log to console in development
    if (this.props.enableLogging !== false && import.meta.env.DEV) {
      console.group('🚨 Async Error Boundary Caught Error')
      console.error('Error:', appError)
      console.error('Error ID:', errorId)
      console.error('Context:', context)
      console.groupEnd()
    }

    return errorId
  }

  clearError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      isRecovering: false,
    })

    // Clear any recovery timeouts
    this.recoveryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.recoveryTimeouts.clear()
  }

  handleRetry = async () => {
    const { error, errorId } = this.state
    const { maxRetries = 3, onRecover, recoveryTimeout = 30000 } = this.props

    if (!error || !errorId) {
      return
    }

    if (!error.retryable) {
      console.warn('Error is not retryable')
      return
    }

    this.setState({ isRecovering: true })

    try {
      // Attempt recovery if provided
      if (onRecover) {
        await onRecover(error)
      }

      // Clear error state
      this.clearError()
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError)

      // Handle recovery failure
      const recoveryAppError = isAppError(recoveryError)
        ? recoveryError
        : new AsyncOperationError(
            recoveryError instanceof Error
              ? recoveryError.message
              : 'Recovery failed',
            'error_recovery',
            'promise'
          )

      this.setState({
        error: recoveryAppError,
        isRecovering: false,
      })

      // Set a timeout to automatically clear the error after recovery timeout
      const timeout = setTimeout(() => {
        this.clearError()
      }, recoveryTimeout)

      this.recoveryTimeouts.set(errorId, timeout)
    }
  }

  handleReset = () => {
    this.clearError()
  }

  getContextValue = (): AsyncErrorContextValue => ({
    handleError: this.handleError,
    clearError: this.clearError,
    hasError: this.state.hasError,
    currentError: this.state.error,
    errorId: this.state.errorId,
  })

  render() {
    const { hasError, error, errorId, isRecovering } = this.state

    if (hasError && error) {
      // Custom fallback component
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return (
          <AsyncErrorContext.Provider value={this.getContextValue()}>
            <FallbackComponent
              error={error}
              retry={this.handleRetry}
              reset={this.handleReset}
              errorId={errorId}
            />
          </AsyncErrorContext.Provider>
        )
      }

      // Default fallback UI
      return (
        <AsyncErrorContext.Provider value={this.getContextValue()}>
          <AsyncErrorFallbackUI
            error={error}
            errorId={errorId}
            isRecovering={isRecovering}
            onRetry={this.handleRetry}
            onReset={this.handleReset}
          />
        </AsyncErrorContext.Provider>
      )
    }

    return (
      <AsyncErrorContext.Provider value={this.getContextValue()}>
        {this.props.children}
      </AsyncErrorContext.Provider>
    )
  }
}

/**
 * Default Async Error Fallback UI Component
 */
interface AsyncErrorFallbackUIProps {
  error: AppError
  errorId: string | null
  isRecovering: boolean
  onRetry: () => void
  onReset: () => void
}

const AsyncErrorFallbackUI: React.FC<AsyncErrorFallbackUIProps> = ({
  error,
  errorId,
  isRecovering,
  onRetry,
  onReset,
}) => {
  return (
    <div
      style={{
        padding: '16px',
        margin: '8px',
        border: '1px solid #fbbf24',
        borderRadius: '6px',
        backgroundColor: '#fef3c7',
        color: '#92400e',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '10px',
            color: 'white',
            fontSize: '12px',
          }}
        >
          ⚠
        </div>
        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
          Async Operation Failed
        </h4>
      </div>

      <div
        style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.4' }}
      >
        {error.userMessage}
      </div>

      {errorId && (
        <div
          style={{
            marginBottom: '12px',
            fontSize: '12px',
            color: '#78350f',
            fontFamily: 'monospace',
          }}
        >
          Error ID: {errorId}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {error.retryable && !isRecovering && (
          <button
            onClick={onRetry}
            disabled={isRecovering}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRecovering ? 'not-allowed' : 'pointer',
              opacity: isRecovering ? 0.6 : 1,
              fontSize: '13px',
            }}
          >
            {isRecovering ? 'Recovering...' : 'Retry Operation'}
          </button>
        )}

        <button
          onClick={onReset}
          disabled={isRecovering}
          style={{
            padding: '6px 12px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRecovering ? 'not-allowed' : 'pointer',
            opacity: isRecovering ? 0.6 : 1,
            fontSize: '13px',
          }}
        >
          Clear Error
        </button>
      </div>

      {isRecovering && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: '#dbeafe',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#1e40af',
          }}
        >
          ⏳ Attempting to recover from error...
        </div>
      )}
    </div>
  )
}

/**
 * Hook for handling async operations with error boundary integration
 */
export function useAsyncOperation<T extends (...args: any[]) => Promise<any>>(
  operation: T,
  options: {
    context?: string
    onSuccess?: (result: Awaited<ReturnType<T>>) => void
    onError?: (error: AppError) => void
    retryCount?: number
  } = {}
): [
  (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | null>,
  { loading: boolean; error: AppError | null; retryCount: number },
] {
  const { handleError, clearError } = useAsyncErrorBoundary()
  const [state, setState] = React.useState({
    loading: false,
    error: null as AppError | null,
    retryCount: 0,
  })

  const executeOperation = React.useCallback(
    async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | null> => {
      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const result = await operation(...args)
        setState(prev => ({ ...prev, loading: false, retryCount: 0 }))

        if (options.onSuccess) {
          options.onSuccess(result)
        }

        return result
      } catch (error) {
        const appError = isAppError(error)
          ? error
          : new AsyncOperationError(
              error instanceof Error ? error.message : 'Operation failed',
              options.context || 'async_operation',
              'promise'
            )

        setState(prev => ({
          ...prev,
          loading: false,
          error: appError,
          retryCount: prev.retryCount + 1,
        }))

        handleError(appError, options.context)

        if (options.onError) {
          options.onError(appError)
        }

        return null
      }
    },
    [operation, handleError, options]
  )

  return [executeOperation, state]
}

/**
 * Higher-order component to wrap components with async error boundary
 */
export function withAsyncErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<AsyncErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <AsyncErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AsyncErrorBoundary>
  )

  WrappedComponent.displayName = `withAsyncErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

export default AsyncErrorBoundary
