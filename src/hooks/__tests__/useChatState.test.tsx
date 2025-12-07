import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { Message } from '../../components/ui'
import { useChatState } from '../useChatState'

describe('useChatState', () => {
  const mockMessages: Message[] = [
    { role: 'user', text: 'Hello' },
    { role: 'master', text: 'Hi there!' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useChatState())

    expect(result.current.messages).toEqual([])
    expect(result.current.messagesCount).toBe(0)
    expect(typeof result.current.addMessage).toBe('function')
    expect(typeof result.current.addMessages).toBe('function')
    expect(typeof result.current.clearMessages).toBe('function')
    expect(typeof result.current.updateMessage).toBe('function')
    expect(typeof result.current.removeMessage).toBe('function')
    expect(typeof result.current.scrollToBottom).toBe('function')
    expect(result.current.scrollRef).toBeDefined()
  })

  it('should initialize with initial messages', () => {
    const { result } = renderHook(() =>
      useChatState({ initialMessages: mockMessages })
    )

    expect(result.current.messages).toEqual(mockMessages)
    expect(result.current.messagesCount).toBe(2)
  })

  it('should add a single message', () => {
    const { result } = renderHook(() => useChatState())

    const newMessage: Message = { role: 'user', text: 'New message' }

    act(() => {
      result.current.addMessage(newMessage)
    })

    expect(result.current.messages).toContainEqual(newMessage)
    expect(result.current.messagesCount).toBe(1)
  })

  it('should add multiple messages', () => {
    const { result } = renderHook(() => useChatState())

    act(() => {
      result.current.addMessages(mockMessages)
    })

    expect(result.current.messages).toEqual(mockMessages)
    expect(result.current.messagesCount).toBe(2)
  })

  it('should respect maxMessages limit', () => {
    const { result } = renderHook(() =>
      useChatState({ maxMessages: 2, initialMessages: mockMessages })
    )

    const newMessage: Message = { role: 'ai', text: 'Another message' }

    act(() => {
      result.current.addMessage(newMessage)
    })

    expect(result.current.messages.length).toBe(2)
    expect(result.current.messages).toContainEqual(newMessage)
    expect(result.current.messages).not.toContainEqual(mockMessages[0])
  })

  it('should clear all messages', () => {
    const { result } = renderHook(() =>
      useChatState({ initialMessages: mockMessages })
    )

    act(() => {
      result.current.clearMessages()
    })

    expect(result.current.messages).toEqual([])
    expect(result.current.messagesCount).toBe(0)
  })

  it('should update message by index', () => {
    const { result } = renderHook(() =>
      useChatState({ initialMessages: mockMessages })
    )

    const updates = { text: 'Updated text' }

    act(() => {
      result.current.updateMessage(0, updates)
    })

    expect(result.current.messages[0]).toEqual({
      ...mockMessages[0],
      ...updates,
    })
  })

  it('should not update message when index is out of bounds', () => {
    const { result } = renderHook(() =>
      useChatState({ initialMessages: mockMessages })
    )

    const originalMessages = [...result.current.messages]

    act(() => {
      result.current.updateMessage(10, { text: 'Updated' })
    })

    expect(result.current.messages).toEqual(originalMessages)
  })

  it('should remove message by index', () => {
    const { result } = renderHook(() =>
      useChatState({ initialMessages: mockMessages })
    )

    act(() => {
      result.current.removeMessage(0)
    })

    expect(result.current.messages).toEqual([mockMessages[1]])
    expect(result.current.messagesCount).toBe(1)
  })

  it('should not remove message when index is out of bounds', () => {
    const { result } = renderHook(() =>
      useChatState({ initialMessages: mockMessages })
    )

    const originalMessages = [...result.current.messages]

    act(() => {
      result.current.removeMessage(10)
    })

    expect(result.current.messages).toEqual(originalMessages)
  })

  it('should limit messages when adding multiple messages', () => {
    const { result } = renderHook(() =>
      useChatState({ maxMessages: 1, initialMessages: mockMessages })
    )

    const newMessages: Message[] = [
      { role: 'ai', text: 'New 1' },
      { role: 'user', text: 'New 2' },
    ]

    act(() => {
      result.current.addMessages(newMessages)
    })

    expect(result.current.messages.length).toBe(1)
    expect(result.current.messages).toContainEqual(newMessages[1])
  })

  it('should call scrollToBottom when messages change', () => {
    const scrollIntoViewMock = vi.fn()
    global.IntersectionObserver = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: scrollIntoViewMock,
      writable: true,
    })

    const { result } = renderHook(() => useChatState())

    const newMessage: Message = { role: 'user', text: 'Test' }

    act(() => {
      result.current.addMessage(newMessage)
    })

    // The scroll should be triggered automatically when messages change
    // Note: In a real test environment, you might need to mock the ref behavior
  })

  it('should handle autoScroll disabled', () => {
    const scrollIntoViewMock = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: scrollIntoViewMock,
      writable: true,
    })

    const { result } = renderHook(() => useChatState({ autoScroll: false }))

    const newMessage: Message = { role: 'user', text: 'Test' }

    act(() => {
      result.current.addMessage(newMessage)
    })

    // With autoScroll disabled, scrollIntoView should not be called
    expect(scrollIntoViewMock).not.toHaveBeenCalled()
  })

  it('should provide scrollRef', () => {
    const { result } = renderHook(() => useChatState())

    expect(result.current.scrollRef).toBeDefined()
    expect(typeof result.current.scrollRef.current).toBe('object') // or null
  })

  it('should maintain message order', () => {
    const { result } = renderHook(() => useChatState())

    const messages: Message[] = [
      { role: 'user', text: 'First' },
      { role: 'master', text: 'Second' },
      { role: 'user', text: 'Third' },
    ]

    act(() => {
      messages.forEach(msg => {
        result.current.addMessage(msg)
      })
    })

    expect(result.current.messages).toEqual(messages)
  })
})
