import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  AppProvider,
  useAppState,
  useAppProcessing,
  useAppError,
} from '../AppContext'

// Test component that uses the hook
const TestComponent = () => {
  const { state, actions } = useAppState()
  const isProcessing = useAppProcessing()
  const { error, clearError, setError } = useAppError()

  return (
    <div>
      <div data-testid='is-processing'>{isProcessing.toString()}</div>
      <div data-testid='pending-prompt'>{state.pendingPrompt || 'null'}</div>
      <div data-testid='error'>{error || 'null'}</div>
      <div data-testid='theme'>{state.theme}</div>
      <div data-testid='is-loading'>{state.isLoading.toString()}</div>

      <button
        onClick={() => actions.setProcessing(true)}
        data-testid='set-processing'
      >
        Set Processing
      </button>

      <button
        onClick={() => actions.setPendingPrompt('test prompt')}
        data-testid='set-pending-prompt'
      >
        Set Pending Prompt
      </button>

      <button onClick={() => setError('test error')} data-testid='set-error'>
        Set Error
      </button>

      <button onClick={clearError} data-testid='clear-error'>
        Clear Error
      </button>

      <button onClick={() => actions.setTheme('light')} data-testid='set-theme'>
        Set Theme
      </button>

      <button
        onClick={() => actions.setLoading(true)}
        data-testid='set-loading'
      >
        Set Loading
      </button>

      <button onClick={actions.reset} data-testid='reset'>
        Reset
      </button>
    </div>
  )
}

const renderWithProvider = (component: React.ReactElement) => {
  return render(<AppProvider>{component}</AppProvider>)
}

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AppProvider', () => {
    it('provides initial state values', () => {
      renderWithProvider(<TestComponent />)

      expect(screen.getByTestId('is-processing')).toHaveTextContent('false')
      expect(screen.getByTestId('pending-prompt')).toHaveTextContent('null')
      expect(screen.getByTestId('error')).toHaveTextContent('null')
      expect(screen.getByTestId('theme')).toHaveTextContent('dark')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    })

    it('throws error when useAppState is used outside provider', () => {
      expect(() => {
        render(<TestComponent />)
      }).toThrow('useAppState must be used within an AppProvider')
    })
  })

  describe('App State Management', () => {
    it('updates processing state correctly', async () => {
      renderWithProvider(<TestComponent />)

      const setProcessingButton = screen.getByTestId('set-processing')

      expect(screen.getByTestId('is-processing')).toHaveTextContent('false')

      await act(async () => {
        fireEvent.click(setProcessingButton)
      })

      expect(screen.getByTestId('is-processing')).toHaveTextContent('true')
    })

    it('updates pending prompt correctly', async () => {
      renderWithProvider(<TestComponent />)

      const setPendingPromptButton = screen.getByTestId('set-pending-prompt')

      expect(screen.getByTestId('pending-prompt')).toHaveTextContent('null')

      await act(async () => {
        fireEvent.click(setPendingPromptButton)
      })

      expect(screen.getByTestId('pending-prompt')).toHaveTextContent(
        'test prompt'
      )
    })

    it('updates loading state correctly', async () => {
      renderWithProvider(<TestComponent />)

      const setLoadingButton = screen.getByTestId('set-loading')

      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')

      await act(async () => {
        fireEvent.click(setLoadingButton)
      })

      expect(screen.getByTestId('is-loading')).toHaveTextContent('true')
    })

    it('updates theme correctly', async () => {
      renderWithProvider(<TestComponent />)

      const setThemeButton = screen.getByTestId('set-theme')

      expect(screen.getByTestId('theme')).toHaveTextContent('dark')

      await act(async () => {
        fireEvent.click(setThemeButton)
      })

      expect(screen.getByTestId('theme')).toHaveTextContent('light')
    })

    it('handles error state correctly', async () => {
      renderWithProvider(<TestComponent />)

      const setErrorButton = screen.getByTestId('set-error')
      const clearErrorButton = screen.getByTestId('clear-error')

      expect(screen.getByTestId('error')).toHaveTextContent('null')

      await act(async () => {
        fireEvent.click(setErrorButton)
      })

      expect(screen.getByTestId('error')).toHaveTextContent('test error')

      await act(async () => {
        fireEvent.click(clearErrorButton)
      })

      expect(screen.getByTestId('error')).toHaveTextContent('null')
    })

    it('resets state to initial values', async () => {
      renderWithProvider(<TestComponent />)

      // Change some values
      await act(async () => {
        fireEvent.click(screen.getByTestId('set-processing'))
        fireEvent.click(screen.getByTestId('set-pending-prompt'))
        fireEvent.click(screen.getByTestId('set-error'))
        fireEvent.click(screen.getByTestId('set-loading'))
        fireEvent.click(screen.getByTestId('set-theme'))
      })

      // Verify values changed
      expect(screen.getByTestId('is-processing')).toHaveTextContent('true')
      expect(screen.getByTestId('pending-prompt')).toHaveTextContent(
        'test prompt'
      )
      expect(screen.getByTestId('error')).toHaveTextContent('test error')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('true')
      expect(screen.getByTestId('theme')).toHaveTextContent('light')

      // Reset and verify initial values
      await act(async () => {
        fireEvent.click(screen.getByTestId('reset'))
      })

      expect(screen.getByTestId('is-processing')).toHaveTextContent('false')
      expect(screen.getByTestId('pending-prompt')).toHaveTextContent('null')
      expect(screen.getByTestId('error')).toHaveTextContent('null')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    })
  })

  describe('Selector Hooks', () => {
    it('useAppProcessing returns only processing state', () => {
      renderWithProvider(<TestComponent />)
      expect(screen.getByTestId('is-processing')).toHaveTextContent('false')
    })

    it('useAppError returns error state and actions', () => {
      renderWithProvider(<TestComponent />)

      // Should have error display and actions
      expect(screen.getByTestId('error')).toBeInTheDocument()
      expect(screen.getByTestId('set-error')).toBeInTheDocument()
      expect(screen.getByTestId('clear-error')).toBeInTheDocument()
    })
  })

  describe('Performance Optimizations', () => {
    it('provides stable context value references', async () => {
      let renderCount = 0

      const TestStableComponent = () => {
        renderCount++
        const { actions } = useAppState()

        return (
          <div>
            <div data-testid='render-count'>{renderCount}</div>
            <button
              onClick={() => actions.setTheme('light')}
              data-testid='change-theme'
            >
              Change Theme
            </button>
          </div>
        )
      }

      renderWithProvider(<TestStableComponent />)

      const initialCount = parseInt(
        screen.getByTestId('render-count').textContent || '0'
      )

      // Actions should be stable references
      await act(async () => {
        fireEvent.click(screen.getByTestId('change-theme'))
      })

      // Should not cause unnecessary re-renders
      expect(
        parseInt(screen.getByTestId('render-count').textContent || '0')
      ).toBe(initialCount + 1)
    })
  })
})
