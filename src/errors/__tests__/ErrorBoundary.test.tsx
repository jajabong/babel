/**
 * Error Boundary Tests
 * Tests error boundary behavior and error handling scenarios
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

import '@testing-library/jest-dom'
import ErrorBoundary, { withErrorBoundary } from '../ErrorBoundary'
import {
  AppError,
  ValidationError,
  ComponentError,
  ErrorSeverity,
  ErrorCategory,
} from '../types'

// Mock console methods to test logging
const originalConsoleError = console.error
const originalConsoleGroup = console.group
const originalConsoleGroupEnd = console.groupEnd

beforeEach(() => {
  console.error = jest.fn()
  console.group = jest.fn()
  console.groupEnd = jest.fn()
})

afterEach(() => {
  console.error = originalConsoleError
  console.group = originalConsoleGroup
  console.groupEnd = originalConsoleGroupEnd
})

describe('ErrorBoundary', () => {
  const ThrowErrorComponent: React.FC<{
    shouldThrow?: boolean
    error?: Error
  }> = ({ shouldThrow = false, error = new Error('Test error') }) => {
    if (shouldThrow) {
      throw error
    }
    return <div>No error</div>
  }

  const ThrowAsyncErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({
    shouldThrow = false,
  }) => {
    React.useEffect(() => {
      if (shouldThrow) {
        throw new Error('Async error')
      }
    }, [shouldThrow])
    return <div>No async error</div>
  }

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('should catch and display synchronous errors', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('should handle ComponentError instances', () => {
    const componentError = new ComponentError(
      'Component failed',
      'TestComponent',
      'TestBoundary',
      new Error('Original error')
    )

    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow error={componentError} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Component failed')).toBeInTheDocument()
  })

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowErrorComponent shouldThrow />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(
      expect.any(AppError),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    )
  })

  it('should allow retry when error is retryable', async () => {
    const { rerender } = render(
      <ErrorBoundary maxRetries={2}>
        <ThrowErrorComponent shouldThrow />
      </ErrorBoundary>
    )

    // Check error is displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Click retry button
    const retryButton = screen.getByText('Retry')
    fireEvent.click(retryButton)

    // Should still show error (since component still throws)
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  it('should disable retry when max retries reached', () => {
    render(
      <ErrorBoundary maxRetries={0}>
        <ThrowErrorComponent shouldThrow />
      </ErrorBoundary>
    )

    expect(screen.queryByText('Retry')).not.toBeInTheDocument()
  })

  it('should show reset functionality', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow />
      </ErrorBoundary>
    )

    const resetButton = screen.getByText('Reset Component')
    expect(resetButton).toBeInTheDocument()

    fireEvent.click(resetButton)

    // Should render normal content (but component will throw again immediately)
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('should show technical details in development mode', () => {
    const originalEnv = import.meta.env.DEV
    Object.defineProperty(import.meta, 'env', { value: { DEV: true } })

    render(
      <ErrorBoundary showErrorDetails={true}>
        <ThrowErrorComponent shouldThrow />
      </ErrorBoundary>
    )

    const details = screen.getByText('Technical Details')
    expect(details).toBeInTheDocument()

    // Expand details
    fireEvent.click(details)

    expect(screen.getByText('Error Type:')).toBeInTheDocument()
    expect(screen.getByText('Severity:')).toBeInTheDocument()
    expect(screen.getByText('Category:')).toBeInTheDocument()

    // Restore original env
    Object.defineProperty(import.meta, 'env', { value: { DEV: originalEnv } })
  })

  it('should use custom fallback component when provided', () => {
    const CustomFallback: React.FC<{
      error: AppError
      retry: () => void
      reset: () => void
    }> = ({ error, retry, reset }) => (
      <div>
        <span>Custom error: {error.userMessage}</span>
        <button onClick={retry}>Custom retry</button>
        <button onClick={reset}>Custom reset</button>
      </div>
    )

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowErrorComponent shouldThrow />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument()
    expect(screen.getByText('Custom retry')).toBeInTheDocument()
    expect(screen.getByText('Custom reset')).toBeInTheDocument()
  })

  it('should handle async errors in useEffect', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowAsyncErrorComponent shouldThrow />
      </ErrorBoundary>
    )

    // Error boundary should catch async errors too
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should clean up timeouts on unmount', () => {
    const { unmount } = render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow />
      </ErrorBoundary>
    )

    // Start a retry
    const retryButton = screen.getByText('Retry')
    fireEvent.click(retryButton)

    // Unmount before retry completes
    unmount()

    // Should not throw any errors about unmounted component
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('unmounted'),
      expect.any(Error)
    )
  })
})

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    const TestComponent: React.FC<{ name: string }> = ({ name }) => (
      <div>Hello {name}</div>
    )
    const WrappedComponent = withErrorBoundary(TestComponent, {
      component: 'TestComponent',
    })

    render(<WrappedComponent name='World' />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('should catch errors in wrapped component', () => {
    const ThrowComponent: React.FC = () => {
      throw new Error('Wrapped component error')
    }
    const WrappedComponent = withErrorBoundary(ThrowComponent)

    render(<WrappedComponent />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should pass displayName correctly', () => {
    const TestComponent: React.FC = () => <div>Test</div>
    TestComponent.displayName = 'TestComponent'
    const WrappedComponent = withErrorBoundary(TestComponent)

    expect(WrappedComponent.displayName).toBe(
      'withErrorBoundary(TestComponent)'
    )
  })
})

describe('Error Boundary Edge Cases', () => {
  it('should handle null/undefined errors', () => {
    const ThrowNullComponent: React.FC = () => {
      throw null
    }

    render(
      <ErrorBoundary>
        <ThrowNullComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should handle string errors', () => {
    const ThrowStringComponent: React.FC = () => {
      throw 'String error'
    }

    render(
      <ErrorBoundary>
        <ThrowStringComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should handle object errors', () => {
    const ThrowObjectComponent: React.FC = () => {
      throw { message: 'Object error', code: 'CUSTOM_CODE' }
    }

    render(
      <ErrorBoundary>
        <ThrowObjectComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should handle ValidationError specifically', () => {
    const ThrowValidationError: React.FC = () => {
      throw new ValidationError('Invalid input', 'fieldName', 'invalidValue')
    }

    render(
      <ErrorBoundary>
        <ThrowValidationError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/Please check your input/)).toBeInTheDocument()
  })
})

describe('Error Boundary Recovery', () => {
  it('should handle recoverable errors differently', () => {
    const recoverableError = new AppError('Recoverable error', {
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.USER_INPUT,
      recoverable: true,
      retryable: true,
      userMessage: 'This error can be recovered from',
    })

    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow error={recoverableError} />
      </ErrorBoundary>
    )

    expect(
      screen.getByText('This error can be recovered from')
    ).toBeInTheDocument()
    expect(screen.getByText(/This error is recoverable/)).toBeInTheDocument()
  })

  it('should disable retry for non-retryable errors', () => {
    const nonRetryableError = new AppError('Non-retryable error', {
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.AUTHENTICATION,
      recoverable: false,
      retryable: false,
      userMessage: 'This error cannot be retried',
    })

    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow error={nonRetryableError} />
      </ErrorBoundary>
    )

    expect(screen.queryByText('Retry')).not.toBeInTheDocument()
  })

  it('should show different recovery options based on error properties', () => {
    const retryableError = new AppError('Retryable error', {
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.NETWORK,
      recoverable: true,
      retryable: true,
      userMessage: 'Network error occurred',
    })

    render(
      <ErrorBoundary maxRetries={3}>
        <ThrowErrorComponent shouldThrow error={retryableError} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Retry')).toBeInTheDocument()
    expect(screen.getByText('Reset Component')).toBeInTheDocument()
    expect(screen.getByText('Reload Page')).toBeInTheDocument()
  })
})
