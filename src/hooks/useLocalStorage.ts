import { useState, useEffect, useCallback } from 'react'

export interface LocalStorageConfig<T> {
  key: string
  defaultValue?: T
  serialize?: (value: T) => string
  deserialize?: (value: string) => T
  syncAcrossTabs?: boolean
}

export interface UseLocalStorageReturn<T> {
  value: T
  setValue: (value: T | ((prev: T) => T)) => void
  removeValue: () => void
  isLoaded: boolean
  error: string | null
}

export const useLocalStorage = <T>({
  key,
  defaultValue,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
  syncAcrossTabs = true,
}: LocalStorageConfig<T>): UseLocalStorageReturn<T> => {
  const [value, setValueState] = useState<T>(defaultValue as T)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load initial value from localStorage
  useEffect(() => {
    try {
      const item = localStorage.getItem(key)

      if (item !== null) {
        const deserializedValue = deserialize(item)
        setValueState(deserializedValue)
      } else if (defaultValue !== undefined) {
        setValueState(defaultValue)
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load from localStorage'
      setError(errorMessage)
      if (defaultValue !== undefined) {
        setValueState(defaultValue)
      }
    } finally {
      setIsLoaded(true)
    }
  }, [key, defaultValue, deserialize])

  // Listen for storage events (tab sync)
  useEffect(() => {
    if (!syncAcrossTabs) return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const deserializedValue = deserialize(e.newValue)
          setValueState(deserializedValue)
          setError(null)
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : 'Failed to sync from localStorage'
          setError(errorMessage)
        }
      } else if (e.key === key && e.newValue === null) {
        // Value was removed in another tab
        if (defaultValue !== undefined) {
          setValueState(defaultValue)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, defaultValue, deserialize, syncAcrossTabs])

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      try {
        const valueToStore =
          typeof newValue === 'function'
            ? (newValue as (prev: T) => T)(value)
            : newValue

        const serializedValue = serialize(valueToStore)
        localStorage.setItem(key, serializedValue)

        setValueState(valueToStore)
        setError(null)

        // Dispatch storage event for tab sync
        if (syncAcrossTabs) {
          window.dispatchEvent(
            new StorageEvent('storage', {
              key,
              newValue: serializedValue,
              oldValue: serialize(value),
            })
          )
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to save to localStorage'
        setError(errorMessage)
      }
    },
    [key, value, serialize, syncAcrossTabs]
  )

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key)

      if (defaultValue !== undefined) {
        setValueState(defaultValue)
      }

      setError(null)

      // Dispatch storage event for tab sync
      if (syncAcrossTabs) {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            newValue: null,
            oldValue: serialize(value),
          })
        )
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to remove from localStorage'
      setError(errorMessage)
    }
  }, [key, value, defaultValue, serialize, syncAcrossTabs])

  return {
    value,
    setValue,
    removeValue,
    isLoaded,
    error,
  }
}
