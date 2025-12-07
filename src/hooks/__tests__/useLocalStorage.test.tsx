import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useLocalStorage } from '../useLocalStorage'

describe('useLocalStorage', () => {
  const testKey = 'test-key'
  const testValue = { name: 'Test', count: 42 }
  const testDefaultValue = { name: 'Default', count: 0 }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // Mock localStorage methods
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    })

    // Mock storage events
    Object.defineProperty(window, 'StorageEvent', {
      value: class StorageEvent extends Event {
        key: string | null
        newValue: string | null
        oldValue: string | null

        constructor(
          type: string,
          eventInitDict?: {
            key?: string | null
            newValue?: string | null
            oldValue?: string | null
          }
        ) {
          super(type)
          this.key = eventInitDict?.key ?? null
          this.newValue = eventInitDict?.newValue ?? null
          this.oldValue = eventInitDict?.oldValue ?? null
        }
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with default value when localStorage is empty', () => {
    const mockGetItem = vi.mocked(localStorage.getItem)
    mockGetItem.mockReturnValue(null)

    const { result } = renderHook(() =>
      useLocalStorage({
        key: testKey,
        defaultValue: testDefaultValue,
      })
    )

    expect(result.current.isLoaded).toBe(true)
    expect(result.current.value).toEqual(testDefaultValue)
    expect(result.current.error).toBeNull()
  })

  it('should load value from localStorage on initialization', () => {
    const mockGetItem = vi.mocked(localStorage.getItem)
    mockGetItem.mockReturnValue(JSON.stringify(testValue))

    const { result } = renderHook(() =>
      useLocalStorage({
        key: testKey,
        defaultValue: testDefaultValue,
      })
    )

    expect(result.current.isLoaded).toBe(true)
    expect(result.current.value).toEqual(testValue)
    expect(result.current.error).toBeNull()
    expect(mockGetItem).toHaveBeenCalledWith(testKey)
  })

  it('should handle JSON parsing error', () => {
    const mockGetItem = vi.mocked(localStorage.getItem)
    mockGetItem.mockReturnValue('invalid json')

    const { result } = renderHook(() =>
      useLocalStorage({
        key: testKey,
        defaultValue: testDefaultValue,
      })
    )

    expect(result.current.isLoaded).toBe(true)
    expect(result.current.value).toEqual(testDefaultValue)
    expect(result.current.error).toBeTruthy()
  })

  it('should set value to localStorage', () => {
    const mockSetItem = vi.mocked(localStorage.setItem)
    const mockGetItem = vi.mocked(localStorage.getItem)
    mockGetItem.mockReturnValue(null)

    const { result } = renderHook(() =>
      useLocalStorage({
        key: testKey,
        defaultValue: testDefaultValue,
      })
    )

    act(() => {
      result.current.setValue(testValue)
    })

    expect(mockSetItem).toHaveBeenCalledWith(testKey, JSON.stringify(testValue))
    expect(result.current.value).toEqual(testValue)
    expect(result.current.error).toBeNull()
  })

  it('should handle function value updates', () => {
    const mockSetItem = vi.mocked(localStorage.setItem)
    const mockGetItem = vi.mocked(localStorage.getItem)
    mockGetItem.mockReturnValue(null)

    const { result } = renderHook(() =>
      useLocalStorage({
        key: testKey,
        defaultValue: testDefaultValue,
      })
    )

    act(() => {
      result.current.setValue(prev => ({
        ...prev,
        count: prev.count + 1,
      }))
    })

    expect(mockSetItem).toHaveBeenCalledWith(
      testKey,
      JSON.stringify({ name: 'Default', count: 1 })
    )
    expect(result.current.value).toEqual({ name: 'Default', count: 1 })
  })

  it('should handle setItem error', () => {
    const mockSetItem = vi.mocked(localStorage.setItem)
    const mockGetItem = vi.mocked(localStorage.getItem)
    mockGetItem.mockReturnValue(null)
    mockSetItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded')
    })

    const { result } = renderHook(() =>
      useLocalStorage({
        key: testKey,
        defaultValue: testDefaultValue,
      })
    )

    act(() => {
      result.current.setValue(testValue)
    })

    expect(result.current.value).toEqual(testDefaultValue)
    expect(result.current.error).toBe('Storage quota exceeded')
  })

  it('should remove value from localStorage', () => {
    const mockRemoveItem = vi.mocked(localStorage.removeItem)
    const mockGetItem = vi.mocked(localStorage.getItem)
    mockGetItem.mockReturnValue(null)

    const { result } = renderHook(() =>
      useLocalStorage({
        key: testKey,
        defaultValue: testDefaultValue,
      })
    )

    act(() => {
      result.current.setValue(testValue)
    })

    act(() => {
      result.current.removeValue()
    })

    expect(mockRemoveItem).toHaveBeenCalledWith(testKey)
    expect(result.current.value).toEqual(testDefaultValue)
  })

  it('should handle removeItem error', () => {
    const mockRemoveItem = vi.mocked(localStorage.removeItem)
    const mockGetItem = vi.mocked(localStorage.getItem)
    mockGetItem.mockReturnValue(null)
    mockRemoveItem.mockImplementation(() => {
      throw new Error('Remove failed')
    })

    const { result } = renderHook(() =>
      useLocalStorage({
        key: testKey,
        defaultValue: testDefaultValue,
      })
    )

    act(() => {
      result.current.removeValue()
    })

    expect(result.current.error).toBe('Remove failed')
  })

  it('should use custom serialize/deserialize functions', () => {
    const mockGetItem = vi.mocked(localStorage.getItem)
    const mockSetItem = vi.mocked(localStorage.setItem)
    mockGetItem.mockReturnValue('custom-format')

    const customSerialize = vi.fn(value => `custom-${JSON.stringify(value)}`)
    const customDeserialize = vi.fn(value => ({ custom: 'value' }))

    const { result } = renderHook(() =>
      useLocalStorage({
        key: testKey,
        defaultValue: testDefaultValue,
        serialize: customSerialize,
        deserialize: customDeserialize,
      })
    )

    expect(customDeserialize).toHaveBeenCalledWith('custom-format')
    expect(result.current.value).toEqual({ custom: 'value' })

    act(() => {
      result.current.setValue(testValue)
    })

    expect(customSerialize).toHaveBeenCalledWith(testValue)
    expect(mockSetItem).toHaveBeenCalledWith(
      testKey,
      'custom-{"name":"Test","count":42}'
    )
  })

  it('should sync across tabs when enabled', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const mockGetItem = vi.mocked(localStorage.getItem)
    mockGetItem.mockReturnValue(null)

    const { unmount } = renderHook(() =>
      useLocalStorage({
        key: testKey,
        defaultValue: testDefaultValue,
        syncAcrossTabs: true,
      })
    )

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'storage',
      expect.any(Function)
    )

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'storage',
      expect.any(Function)
    )

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  it('should not sync across tabs when disabled', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const mockGetItem = vi.mocked(localStorage.getItem)
    mockGetItem.mockReturnValue(null)

    renderHook(() =>
      useLocalStorage({
        key: testKey,
        defaultValue: testDefaultValue,
        syncAcrossTabs: false,
      })
    )

    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      'storage',
      expect.any(Function)
    )

    addEventListenerSpy.mockRestore()
  })

  it('should handle storage events from other tabs', () => {
    const mockGetItem = vi.mocked(localStorage.getItem)
    mockGetItem.mockReturnValue(null)

    const { result } = renderHook(() =>
      useLocalStorage({
        key: testKey,
        defaultValue: testDefaultValue,
        syncAcrossTabs: true,
      })
    )

    // Simulate storage event from another tab
    const storageEvent = new StorageEvent('storage', {
      key: testKey,
      newValue: JSON.stringify(testValue),
      oldValue: JSON.stringify(testDefaultValue),
    })

    act(() => {
      window.dispatchEvent(storageEvent)
    })

    expect(result.current.value).toEqual(testValue)
  })

  it('should not respond to storage events for different keys', () => {
    const mockGetItem = vi.mocked(localStorage.getItem)
    mockGetItem.mockReturnValue(null)

    const { result } = renderHook(() =>
      useLocalStorage({
        key: testKey,
        defaultValue: testDefaultValue,
        syncAcrossTabs: true,
      })
    )

    const originalValue = result.current.value

    // Simulate storage event for different key
    const storageEvent = new StorageEvent('storage', {
      key: 'different-key',
      newValue: JSON.stringify(testValue),
    })

    act(() => {
      window.dispatchEvent(storageEvent)
    })

    expect(result.current.value).toEqual(originalValue)
  })

  it('should handle storage event with null value (removal)', () => {
    const mockGetItem = vi.mocked(localStorage.getItem)
    mockGetItem.mockReturnValue(JSON.stringify(testValue))

    const { result } = renderHook(() =>
      useLocalStorage({
        key: testKey,
        defaultValue: testDefaultValue,
        syncAcrossTabs: true,
      })
    )

    // Simulate removal in another tab
    const storageEvent = new StorageEvent('storage', {
      key: testKey,
      newValue: null,
      oldValue: JSON.stringify(testValue),
    })

    act(() => {
      window.dispatchEvent(storageEvent)
    })

    expect(result.current.value).toEqual(testDefaultValue)
  })
})
