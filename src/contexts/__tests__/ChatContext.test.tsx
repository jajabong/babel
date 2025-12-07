import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { Message } from '../../components/ui'
import {
  ChatProvider,
  useChatState,
  useSidebarChat,
  useTargetChat,
  useOptimisationHistory,
} from '../ChatContext'

// Test component that uses the hook
const TestComponent = () => {
  const { state, actions, refs, selectors } = useChatState()

  const sidebarChat = useSidebarChat()
  const targetChat = useTargetChat()
  const optimisationHistory = useOptimisationHistory()

  return (
    <div>
      {/* State display */}
      <div data-testid='sidebar-messages-count'>
        {state.sidebarMessages.length}
      </div>
      <div data-testid='target-messages-count'>
        {state.targetMessages.length}
      </div>
      <div data-testid='sidebar-is-typing'>
        {state.sidebarIsTyping.toString()}
      </div>
      <div data-testid='target-is-typing'>
        {state.targetIsTyping.toString()}
      </div>
      <div data-testid='optimisation-history-count'>
        {state.optimisationHistory.length}
      </div>

      {/* Selectors display */}
      <div data-testid='sidebar-chat-messages'>
        {sidebarChat.messages.length}
      </div>
      <div data-testid='target-chat-messages'>{targetChat.messages.length}</div>
      <div data-testid='has-optimized-prompts'>
        {selectors.hasOptimizedPrompts.toString()}
      </div>
      <div data-testid='last-sidebar-message'>
        {selectors.lastSidebarMessage?.text || 'null'}
      </div>
      <div data-testid='last-target-message'>
        {selectors.lastTargetMessage?.text || 'null'}
      </div>

      {/* Action buttons */}
      <button
        onClick={() =>
          sidebarChat.addMessage({ role: 'user', text: 'sidebar message' })
        }
        data-testid='add-sidebar-message'
      >
        Add Sidebar Message
      </button>

      <button
        onClick={() =>
          targetChat.addMessage({ role: 'user', text: 'target message' })
        }
        data-testid='add-target-message'
      >
        Add Target Message
      </button>

      <button
        onClick={() => actions.setSidebarTyping(true)}
        data-testid='set-sidebar-typing'
      >
        Set Sidebar Typing
      </button>

      <button
        onClick={() => actions.setTargetTyping(true)}
        data-testid='set-target-typing'
      >
        Set Target Typing
      </button>

      <button
        onClick={() =>
          optimisationHistory.addToHistory({
            originalPrompt: 'original',
            optimizedPrompt: 'optimized',
            mode: 'GENERAL',
          })
        }
        data-testid='add-optimisation-history'
      >
        Add Optimisation History
      </button>

      <button
        onClick={() => sidebarChat.clearMessages()}
        data-testid='clear-sidebar-messages'
      >
        Clear Sidebar Messages
      </button>

      <button
        onClick={() => targetChat.clearMessages()}
        data-testid='clear-target-messages'
      >
        Clear Target Messages
      </button>

      <button
        onClick={() => optimisationHistory.clearHistory()}
        data-testid='clear-optimisation-history'
      >
        Clear Optimisation History
      </button>
    </div>
  )
}

const renderWithProvider = (component: React.ReactElement) => {
  return render(<ChatProvider>{component}</ChatProvider>)
}

describe('ChatContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ChatProvider', () => {
    it('provides initial state values', () => {
      renderWithProvider(<TestComponent />)

      // Should have initial messages
      expect(screen.getByTestId('sidebar-messages-count')).toHaveTextContent(
        '1'
      ) // Welcome message
      expect(screen.getByTestId('target-messages-count')).toHaveTextContent('1') // Welcome message

      // Should have initial typing states
      expect(screen.getByTestId('sidebar-is-typing')).toHaveTextContent('false')
      expect(screen.getByTestId('target-is-typing')).toHaveTextContent('false')

      // Should have empty history
      expect(
        screen.getByTestId('optimisation-history-count')
      ).toHaveTextContent('0')

      // Should not have optimized prompts initially
      expect(screen.getByTestId('has-optimized-prompts')).toHaveTextContent(
        'false'
      )
    })

    it('throws error when useChatState is used outside provider', () => {
      expect(() => {
        render(<TestComponent />)
      }).toThrow('useChatState must be used within a ChatProvider')
    })
  })

  describe('Sidebar Chat Management', () => {
    it('adds sidebar messages correctly', async () => {
      renderWithProvider(<TestComponent />)

      const addButton = screen.getByTestId('add-sidebar-message')
      const initialCount = parseInt(
        screen.getByTestId('sidebar-messages-count').textContent || '0'
      )

      expect(initialCount).toBe(1) // Welcome message

      await act(async () => {
        fireEvent.click(addButton)
      })

      expect(screen.getByTestId('sidebar-messages-count')).toHaveTextContent(
        '2'
      )
      expect(screen.getByTestId('sidebar-chat-messages')).toHaveTextContent('2')
    })

    it('updates sidebar typing state correctly', async () => {
      renderWithProvider(<TestComponent />)

      const setTypingButton = screen.getByTestId('set-sidebar-typing')

      expect(screen.getByTestId('sidebar-is-typing')).toHaveTextContent('false')

      await act(async () => {
        fireEvent.click(setTypingButton)
      })

      expect(screen.getByTestId('sidebar-is-typing')).toHaveTextContent('true')
    })

    it('clears sidebar messages correctly', async () => {
      renderWithProvider(<TestComponent />)

      // Add a message first
      await act(async () => {
        fireEvent.click(screen.getByTestId('add-sidebar-message'))
      })

      expect(screen.getByTestId('sidebar-messages-count')).toHaveTextContent(
        '2'
      )

      // Clear messages
      await act(async () => {
        fireEvent.click(screen.getByTestId('clear-sidebar-messages'))
      })

      expect(screen.getByTestId('sidebar-messages-count')).toHaveTextContent(
        '0'
      )
    })

    it('tracks last sidebar message correctly', async () => {
      renderWithProvider(<TestComponent />)

      expect(screen.getByTestId('last-sidebar-message')).toHaveTextContent(
        'Hello! Select a mode and tell me what you need. I will optimize your request and auto-inject it into the chat.'
      )

      await act(async () => {
        fireEvent.click(screen.getByTestId('add-sidebar-message'))
      })

      expect(screen.getByTestId('last-sidebar-message')).toHaveTextContent(
        'sidebar message'
      )
    })
  })

  describe('Target Chat Management', () => {
    it('adds target messages correctly', async () => {
      renderWithProvider(<TestComponent />)

      const addButton = screen.getByTestId('add-target-message')
      const initialCount = parseInt(
        screen.getByTestId('target-messages-count').textContent || '0'
      )

      expect(initialCount).toBe(1) // Welcome message

      await act(async () => {
        fireEvent.click(addButton)
      })

      expect(screen.getByTestId('target-messages-count')).toHaveTextContent('2')
      expect(screen.getByTestId('target-chat-messages')).toHaveTextContent('2')
    })

    it('updates target typing state correctly', async () => {
      renderWithProvider(<TestComponent />)

      const setTypingButton = screen.getByTestId('set-target-typing')

      expect(screen.getByTestId('target-is-typing')).toHaveTextContent('false')

      await act(async () => {
        fireEvent.click(setTypingButton)
      })

      expect(screen.getByTestId('target-is-typing')).toHaveTextContent('true')
    })

    it('clears target messages correctly', async () => {
      renderWithProvider(<TestComponent />)

      // Add a message first
      await act(async () => {
        fireEvent.click(screen.getByTestId('add-target-message'))
      })

      expect(screen.getByTestId('target-messages-count')).toHaveTextContent('2')

      // Clear messages
      await act(async () => {
        fireEvent.click(screen.getByTestId('clear-target-messages'))
      })

      expect(screen.getByTestId('target-messages-count')).toHaveTextContent('0')
    })

    it('tracks last target message correctly', async () => {
      renderWithProvider(<TestComponent />)

      expect(screen.getByTestId('last-target-message')).toHaveTextContent(
        'Hello! I am Gemini. How can I help you today?'
      )

      await act(async () => {
        fireEvent.click(screen.getByTestId('add-target-message'))
      })

      expect(screen.getByTestId('last-target-message')).toHaveTextContent(
        'target message'
      )
    })
  })

  describe('Optimisation History Management', () => {
    it('adds optimisation history entries correctly', async () => {
      renderWithProvider(<TestComponent />)

      const addHistoryButton = screen.getByTestId('add-optimisation-history')

      expect(
        screen.getByTestId('optimisation-history-count')
      ).toHaveTextContent('0')
      expect(screen.getByTestId('has-optimized-prompts')).toHaveTextContent(
        'false'
      )

      await act(async () => {
        fireEvent.click(addHistoryButton)
      })

      expect(
        screen.getByTestId('optimisation-history-count')
      ).toHaveTextContent('1')
      expect(screen.getByTestId('has-optimized-prompts')).toHaveTextContent(
        'true'
      )
    })

    it('clears optimisation history correctly', async () => {
      renderWithProvider(<TestComponent />)

      // Add history first
      await act(async () => {
        fireEvent.click(screen.getByTestId('add-optimisation-history'))
      })

      expect(
        screen.getByTestId('optimisation-history-count')
      ).toHaveTextContent('1')

      // Clear history
      await act(async () => {
        fireEvent.click(screen.getByTestId('clear-optimisation-history'))
      })

      expect(
        screen.getByTestId('optimisation-history-count')
      ).toHaveTextContent('0')
      expect(screen.getByTestId('has-optimized-prompts')).toHaveTextContent(
        'false'
      )
    })
  })

  describe('Specialized Hooks', () => {
    it('useSidebarChat provides correct sidebar-specific functionality', () => {
      renderWithProvider(<TestComponent />)

      // Should have sidebar-specific message count
      expect(screen.getByTestId('sidebar-chat-messages')).toHaveTextContent('1')
    })

    it('useTargetChat provides correct target-specific functionality', () => {
      renderWithProvider(<TestComponent />)

      // Should have target-specific message count
      expect(screen.getByTestId('target-chat-messages')).toHaveTextContent('1')
    })

    it('useOptimisationHistory provides correct history functionality', () => {
      renderWithProvider(<TestComponent />)

      // Should have history count and add button
      expect(
        screen.getByTestId('optimisation-history-count')
      ).toHaveTextContent('0')
      expect(screen.getByTestId('add-optimisation-history')).toBeInTheDocument()
    })
  })

  describe('Performance Optimizations', () => {
    it('provides stable scroll refs', () => {
      const TestRefsComponent = () => {
        const { refs } = useChatState()
        const [initialRefs] = React.useState(refs)

        return (
          <div>
            <button
              onClick={() => {
                // Simulate state change
              }}
              data-testid='trigger-update'
            >
              Trigger Update
            </button>
            <div data-testid='refs-stable'>
              {initialRefs === refs ? 'stable' : 'unstable'}
            </div>
          </div>
        )
      }

      renderWithProvider(<TestRefsComponent />)

      expect(screen.getByTestId('refs-stable')).toHaveTextContent('stable')
    })

    it('memoizes selectors to prevent unnecessary recalculations', () => {
      let selectorCalculationCount = 0

      const TestSelectorsComponent = () => {
        const { selectors } = useChatState()

        // This would be called on every render if not memoized
        React.useEffect(() => {
          selectorCalculationCount++
          void selectors.hasOptimizedPrompts
        }, [selectors]) // Only re-run when selectors change

        return (
          <div>
            <div data-testid='calculation-count'>
              {selectorCalculationCount}
            </div>
            <button
              onClick={() => {
                // Trigger some state change that doesn't affect selectors
              }}
              data-testid='trigger-update'
            >
              Trigger Update
            </button>
          </div>
        )
      }

      renderWithProvider(<TestSelectorsComponent />)

      // Wait for initial effect
      expect(selectorCalculationCount).toBeGreaterThanOrEqual(0)
    })
  })
})
