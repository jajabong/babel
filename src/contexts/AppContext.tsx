import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'

// Global App State Interfaces
export interface AppState {
  isProcessing: boolean
  pendingPrompt: string | null
  error: string | null
  isLoading: boolean
  theme: 'light' | 'dark'
}

export interface AppContextType {
  state: AppState
  actions: {
    setProcessing: (isProcessing: boolean) => void
    setPendingPrompt: (prompt: string | null) => void
    setError: (error: string | null) => void
    setLoading: (isLoading: boolean) => void
    setTheme: (theme: 'light' | 'dark') => void
    clearError: () => void
    reset: () => void
  }
}

// Action types
type AppAction =
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_PENDING_PROMPT'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' }

// Initial state
const initialState: AppState = {
  isProcessing: false,
  pendingPrompt: null,
  error: null,
  isLoading: false,
  theme: 'dark',
}

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload }
    case 'SET_PENDING_PROMPT':
      return { ...state, pendingPrompt: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_THEME':
      return { ...state, theme: action.payload }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

// Context
const AppContext = createContext<AppContextType | undefined>(undefined)

// Provider component
export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Actions wrapped in useCallback for performance
  const actions = useMemo(
    () => ({
      setProcessing: (isProcessing: boolean) =>
        dispatch({ type: 'SET_PROCESSING', payload: isProcessing }),

      setPendingPrompt: (prompt: string | null) =>
        dispatch({ type: 'SET_PENDING_PROMPT', payload: prompt }),

      setError: (error: string | null) =>
        dispatch({ type: 'SET_ERROR', payload: error }),

      setLoading: (isLoading: boolean) =>
        dispatch({ type: 'SET_LOADING', payload: isLoading }),

      setTheme: (theme: 'light' | 'dark') =>
        dispatch({ type: 'SET_THEME', payload: theme }),

      clearError: () => dispatch({ type: 'CLEAR_ERROR' }),

      reset: () => dispatch({ type: 'RESET' }),
    }),
    []
  )

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      state,
      actions,
    }),
    [state, actions]
  )

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  )
}

// Custom hook to consume context
export const useAppState = (): AppContextType => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider')
  }
  return context
}

// Selectors for specific state slices (for performance optimization)
export const useAppProcessing = () => {
  const { state } = useAppState()
  return state.isProcessing
}

export const useAppPendingPrompt = () => {
  const { state } = useAppState()
  return state.pendingPrompt
}

export const useAppError = () => {
  const { state, actions } = useAppState()
  return {
    error: state.error,
    clearError: actions.clearError,
    setError: actions.setError,
  }
}

export const useAppTheme = () => {
  const { state, actions } = useAppState()
  return {
    theme: state.theme,
    setTheme: actions.setTheme,
  }
}

export default AppContext
