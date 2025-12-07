import React, { Component, ReactNode, ErrorInfo } from 'react'

import { AppError, ComponentError, ErrorSeverity, ErrorCategory } from './types'

interface ErrorBoundaryState {
  hasError: boolean
  error: AppError | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRetrying: boolean
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<{
    error: AppError
    retry: () => void
    reset: () => void
  }>
  onError?: (error: AppError, errorInfo: ErrorInfo) => void
  maxRetries?: number
  component?: string
  showErrorDetails?: boolean
  enableLogging?: boolean
}

/**
 * Error Boundary Component
 * Catches React component errors and provides fallback UI
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeouts: NodeJS.Timeout[] = []

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Convert unknown error to AppError
    const appError =
      error instanceof AppError
        ? error
        : new ComponentError(error.message, undefined, 'ErrorBoundary', error)

    return {
      hasError: true,
      error: appError,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError =
      error instanceof AppError
        ? error
        : new ComponentError(
            error.message,
            this.props.component,
            'ErrorBoundary',
            error,
            {
              component: this.props.component,
              action: 'component_render',
              url: window.location.href,
              userAgent: navigator.userAgent,
              additionalData: {
                errorBoundary: true,
                reactVersion: React.version,
              },
            }
          )

    this.setState({
      error: appError,
      errorInfo,
    })

    // Report error
    if (this.props.onError) {
      this.props.onError(appError, errorInfo)
    }

    // Log to console in development
    if (this.props.enableLogging !== false && import.meta.env.DEV) {
      console.group('🚨 Error Boundary Caught Error')
      console.error('Error:', appError)
      console.error('Error Info:', errorInfo)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props
    const { retryCount, error } = this.state

    if (retryCount >= maxRetries) {
      console.warn('Maximum retry attempts reached')
      return
    }

    if (!error?.retryable) {
      console.warn('Error is not retryable')
      return
    }

    this.setState({ isRetrying: true })

    // Add exponential backoff for retries
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)

    const timeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }))
    }, delay)

    this.retryTimeouts.push(timeout)
  }

  handleReset = () => {
    // Clear all pending timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.retryTimeouts = []

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback component
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return (
          <FallbackComponent
            error={this.state.error}
            retry={this.handleRetry}
            reset={this.handleReset}
          />
        )
      }

      // Default fallback UI
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries || 3}
          isRetrying={this.state.isRetrying}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          showErrorDetails={this.props.showErrorDetails ?? import.meta.env.DEV}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Default Error Fallback UI Component
 */
interface ErrorFallbackUIProps {
  error: AppError
  errorInfo: ErrorInfo | null
  retryCount: number
  maxRetries: number
  isRetrying: boolean
  onRetry: () => void
  onReset: () => void
  showErrorDetails: boolean
}

const ErrorFallbackUI: React.FC<ErrorFallbackUIProps> = ({
  error,
  errorInfo,
  retryCount,
  maxRetries,
  isRetrying,
  onRetry,
  onReset,
  showErrorDetails,
}) => {
  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return '#3b82f6' // blue
      case ErrorSeverity.MEDIUM:
        return '#f59e0b' // yellow
      case ErrorSeverity.HIGH:
        return '#ef4444' // red
      case ErrorSeverity.CRITICAL:
        return '#dc2626' // dark red
      default:
        return '#6b7280' // gray
    }
  }

  const canRetry = error.retryable && retryCount < maxRetries && !isRetrying

  return (
    <div
      style={{
        padding: '20px',
        margin: '10px',
        border: `2px solid ${getSeverityColor(error.severity)}`,
        borderRadius: '8px',
        backgroundColor: '#fef2f2',
        color: '#1f2937',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: getSeverityColor(error.severity),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px',
            color: 'white',
            fontSize: '14px',
          }}
        >
          !
        </div>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          Something went wrong
        </h3>
      </div>

      <div style={{ marginBottom: '15px', lineHeight: '1.5' }}>
        <strong>Error:</strong> {error.userMessage}
      </div>

      {error.recoverable && (
        <div
          style={{
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          💡 This error is recoverable. You can try the recovery options below.
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {canRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              opacity: isRetrying ? 0.6 : 1,
              fontSize: '14px',
            }}
          >
            {isRetrying
              ? 'Retrying...'
              : `Retry ${retryCount > 0 ? `(${retryCount}/${maxRetries})` : ''}`}
          </button>
        )}

        <button
          onClick={onReset}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Reset Component
        </button>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Reload Page
        </button>
      </div>

      {showErrorDetails && (
        <details style={{ marginTop: '20px' }}>
          <summary
            style={{
              cursor: 'pointer',
              fontWeight: '600',
              marginBottom: '10px',
            }}
          >
            Technical Details
          </summary>
          <div
            style={{
              padding: '15px',
              backgroundColor: '#1f2937',
              color: '#f3f4f6',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace',
              overflow: 'auto',
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <strong>Error Type:</strong> {error.constructor.name}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Category:</strong> {error.category}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Severity:</strong> {error.severity}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Recoverable:</strong> {error.recoverable ? 'Yes' : 'No'}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Retryable:</strong> {error.retryable ? 'Yes' : 'No'}
            </div>
            {error.code && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Error Code:</strong> {error.code}
              </div>
            )}
            {error.technicalDetails && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Technical Details:</strong> {error.technicalDetails}
              </div>
            )}
            {errorInfo?.componentStack && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Component Stack:</strong>
                <pre style={{ margin: '5px 0', whiteSpace: 'pre-wrap' }}>
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
            {error.stack && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Stack Trace:</strong>
                <pre style={{ margin: '5px 0', whiteSpace: 'pre-wrap' }}>
                  {error.stack}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}

      {import.meta.env.DEV && (
        <div
          style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: '#dbeafe',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          <strong>Development Mode:</strong> Error details are shown for
          debugging purposes. These details will be hidden in production.
        </div>
      )}
    </div>
  )
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

export default ErrorBoundary
