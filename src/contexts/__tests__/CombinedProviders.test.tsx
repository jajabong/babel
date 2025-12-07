import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CombinedProviders } from '../index'
import { useAppState, useSidebarChat, useSettings } from '../index'

// Test component that uses all contexts
const TestAllContextsComponent = () => {
  // App Context
  const { state: appState, actions: appActions } = useAppState()

  // Chat Context
  const sidebarChat = useSidebarChat()

  // Settings Context
  const { settings, actions: settingsActions } = useSettings()

  return (
    <div>
      {/* App Context */}
      <div data-testid='app-is-processing'>
        {appState.isProcessing.toString()}
      </div>
      <button
        onClick={() => appActions.setProcessing(true)}
        data-testid='set-app-processing'
      >
        Set App Processing
      </button>

      {/* Chat Context */}
      <div data-testid='sidebar-messages'>{sidebarChat.messages.length}</div>
      <button
        onClick={() => sidebarChat.addMessage({ role: 'user', text: 'test' })}
        data-testid='add-sidebar-message'
      >
        Add Sidebar Message
      </button>

      {/* Settings Context */}
      <div data-testid='settings-api-key'>{settings.apiKey || 'empty'}</div>
      <button
        onClick={() => settingsActions.setApiKey('test-key')}
        data-testid='set-api-key'
      >
        Set API Key
      </button>
    </div>
  )
}

describe('CombinedProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides all contexts to child components', () => {
    render(
      <CombinedProviders>
        <TestAllContextsComponent />
      </CombinedProviders>
    )

    // App Context should work
    expect(screen.getByTestId('app-is-processing')).toHaveTextContent('false')

    // Chat Context should work
    expect(screen.getByTestId('sidebar-messages')).toHaveTextContent('1') // Initial welcome message

    // Settings Context should work
    expect(screen.getByTestId('settings-api-key')).toBeInTheDocument()
  })

  it('allows interaction with all contexts', async () => {
    render(
      <CombinedProviders>
        <TestAllContextsComponent />
      </CombinedProviders>
    )

    // Test App Context interaction
    expect(screen.getByTestId('app-is-processing')).toHaveTextContent('false')

    await act(async () => {
      fireEvent.click(screen.getByTestId('set-app-processing'))
    })

    expect(screen.getByTestId('app-is-processing')).toHaveTextContent('true')

    // Test Chat Context interaction
    expect(screen.getByTestId('sidebar-messages')).toHaveTextContent('1')

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-sidebar-message'))
    })

    expect(screen.getByTestId('sidebar-messages')).toHaveTextContent('2')

    // Test Settings Context interaction
    expect(screen.getByTestId('settings-api-key')).toHaveTextContent('empty')

    await act(async () => {
      fireEvent.click(screen.getByTestId('set-api-key'))
    })

    expect(screen.getByTestId('settings-api-key')).toHaveTextContent('test-key')
  })

  it('throws error when hooks are used outside provider', () => {
    // Test each hook individually
    expect(() => {
      render(<TestAllContextsComponent />)
    }).toThrow() // One of the hooks will throw, which is expected
  })

  it('maintains context isolation', async () => {
    render(
      <CombinedProviders>
        <TestAllContextsComponent />
      </CombinedProviders>
    )

    // Interact with one context
    await act(async () => {
      fireEvent.click(screen.getByTestId('set-app-processing'))
    })

    // Other contexts should not be affected
    expect(screen.getByTestId('sidebar-messages')).toHaveTextContent('1')
    expect(screen.getByTestId('settings-api-key')).toHaveTextContent('empty')

    // But app context should be updated
    expect(screen.getByTestId('app-is-processing')).toHaveTextContent('true')

    // Interact with another context
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-sidebar-message'))
    })

    // App context should remain unchanged
    expect(screen.getByTestId('app-is-processing')).toHaveTextContent('true')

    // But chat context should be updated
    expect(screen.getByTestId('sidebar-messages')).toHaveTextContent('2')
  })

  it('provides stable context values', () => {
    let renderCount = 0

    const TestStabilityComponent = () => {
      renderCount++
      const appState = useAppState()
      const sidebarChat = useSidebarChat()
      const settings = useSettings()

      return (
        <div>
          <div data-testid='render-count'>{renderCount}</div>
          <button
            onClick={() => {
              // This should trigger minimal re-renders due to context splitting
            }}
            data-testid='trigger-update'
          >
            Trigger Update
          </button>
        </div>
      )
    }

    render(
      <CombinedProviders>
        <TestStabilityComponent />
      </CombinedProviders>
    )

    const initialCount = parseInt(
      screen.getByTestId('render-count').textContent || '0'
    )

    // Trigger re-render
    act(() => {
      fireEvent.click(screen.getByTestId('trigger-update'))
    })

    // Context splitting should prevent unnecessary re-renders
    expect(
      parseInt(screen.getByTestId('render-count').textContent || '0')
    ).toBe(initialCount + 1)
  })

  it('handles nested provider usage gracefully', () => {
    const NestedComponent = () => {
      const { state } = useAppState()
      return (
        <div data-testid='nested-state'>{state.isProcessing.toString()}</div>
      )
    }

    render(
      <CombinedProviders>
        <div>
          <TestAllContextsComponent />
          <NestedComponent />
        </div>
      </CombinedProviders>
    )

    expect(screen.getByTestId('nested-state')).toHaveTextContent('false')
    expect(screen.getByTestId('app-is-processing')).toHaveTextContent('false')
  })
})
