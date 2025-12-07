import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useTypewriter } from '../useTypewriter'

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useTypewriter())

    expect(result.current.displayText).toBe('')
    expect(result.current.isTyping).toBe(false)
    expect(typeof result.current.start).toBe('function')
    expect(typeof result.current.stop).toBe('function')
    expect(typeof result.current.reset).toBe('function')
  })

  it('should initialize with default config', () => {
    const defaultConfig = {
      text: 'Initial text',
      speed: 2,
      batchSize: 3,
    }

    const { result } = renderHook(() => useTypewriter(defaultConfig))

    // Should start typing immediately if text is provided
    expect(result.current.isTyping).toBe(true)
  })

  it('should start typing with provided text', () => {
    const { result } = renderHook(() => useTypewriter())

    act(() => {
      result.current.start('Hello World')
    })

    expect(result.current.isTyping).toBe(true)
    expect(result.current.displayText).toBe('')
  })

  it('should type characters in batches', async () => {
    const { result } = renderHook(() =>
      useTypewriter({
        speed: 1,
        batchSize: 3,
      })
    )

    act(() => {
      result.current.start('Hello')
    })

    // Fast forward through all typing
    while (result.current.isTyping) {
      await act(async () => {
        vi.advanceTimersByTime(0)
      })
    }

    expect(result.current.displayText).toBe('Hello')
    expect(result.current.isTyping).toBe(false)
  })

  it('should call onComplete callback when typing finishes', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useTypewriter({
        onComplete,
      })
    )

    act(() => {
      result.current.start('Test')
    })

    // Fast forward through all typing
    while (result.current.isTyping) {
      await act(async () => {
        vi.advanceTimersByTime(0)
      })
    }

    // Wait for the timeout delay (600ms)
    await act(async () => {
      vi.advanceTimersByTime(600)
    })

    expect(onComplete).toHaveBeenCalled()
  })

  it('should stop typing', () => {
    const { result } = renderHook(() =>
      useTypewriter({
        speed: 10,
        batchSize: 1,
      })
    )

    act(() => {
      result.current.start('Hello World')
    })

    expect(result.current.isTyping).toBe(true)

    act(() => {
      result.current.stop()
    })

    expect(result.current.isTyping).toBe(false)
  })

  it('should reset state', () => {
    const { result } = renderHook(() => useTypewriter())

    act(() => {
      result.current.start('Hello')
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.displayText).toBe('')
    expect(result.current.isTyping).toBe(false)
  })

  it('should handle empty text', async () => {
    const { result } = renderHook(() => useTypewriter())

    act(() => {
      result.current.start('')
    })

    expect(result.current.displayText).toBe('')
    expect(result.current.isTyping).toBe(false)
  })

  it('should not type when disabled', () => {
    const { result } = renderHook(() =>
      useTypewriter({
        enabled: false,
      })
    )

    act(() => {
      result.current.start('Hello World')
    })

    expect(result.current.displayText).toBe('Hello World')
    expect(result.current.isTyping).toBe(false)
  })

  it('should use custom config when starting', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useTypewriter())

    act(() => {
      result.current.start('Custom', {
        speed: 5,
        batchSize: 2,
        onComplete,
      })
    })

    expect(result.current.isTyping).toBe(true)
  })

  it('should handle multiple start calls', async () => {
    const { result } = renderHook(() => useTypewriter())

    // Start first text
    act(() => {
      result.current.start('First')
    })

    // Start second text before first completes
    act(() => {
      result.current.start('Second')
    })

    // Should be typing the second text
    expect(result.current.isTyping).toBe(true)

    // Complete typing
    while (result.current.isTyping) {
      await act(async () => {
        vi.advanceTimersByTime(0)
      })
    }

    expect(result.current.displayText).toBe('Second')
  })

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useTypewriter())

    // Just ensure unmount doesn't throw errors
    expect(() => unmount()).not.toThrow()
  })
})
