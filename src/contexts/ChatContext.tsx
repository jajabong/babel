import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  ReactNode,
} from 'react'

import type { Message } from '../components/ui'

// Chat State Interfaces
export interface ChatState {
  sidebarMessages: Message[]
  targetMessages: Message[]
  sidebarIsTyping: boolean
  targetIsTyping: boolean
  optimisationHistory: Array<{
    originalPrompt: string
    optimizedPrompt: string
    mode: string
    timestamp: number
  }>
}

export interface ChatContextType {
  state: ChatState
  actions: {
    // Sidebar chat actions
    addSidebarMessage: (
      message: Omit<Message, 'text'> & { text: string }
    ) => void
    clearSidebarMessages: () => void
    updateSidebarMessage: (index: number, updates: Partial<Message>) => void

    // Target chat actions
    addTargetMessage: (
      message: Omit<Message, 'text'> & { text: string }
    ) => void
    clearTargetMessages: () => void
    updateTargetMessage: (index: number, updates: Partial<Message>) => void

    // Typing states
    setSidebarTyping: (isTyping: boolean) => void
    setTargetTyping: (isTyping: boolean) => void

    // Optimisation history
    addToOptimisationHistory: (entry: {
      originalPrompt: string
      optimizedPrompt: string
      mode: string
    }) => void
    clearOptimisationHistory: () => void

    // Scroll management
    scrollToSidebarBottom: () => void
    scrollToTargetBottom: () => void
  }
  refs: {
    sidebarScrollRef: React.RefObject<HTMLDivElement>
    targetScrollRef: React.RefObject<HTMLDivElement>
  }
  selectors: {
    sidebarMessagesCount: number
    targetMessagesCount: number
    lastSidebarMessage: Message | null
    lastTargetMessage: Message | null
    hasOptimizedPrompts: boolean
  }
}

// Action types
type ChatAction =
  | { type: 'ADD_SIDEBAR_MESSAGE'; payload: Message }
  | { type: 'CLEAR_SIDEBAR_MESSAGES' }
  | {
      type: 'UPDATE_SIDEBAR_MESSAGE'
      payload: { index: number; updates: Partial<Message> }
    }
  | { type: 'ADD_TARGET_MESSAGE'; payload: Message }
  | { type: 'CLEAR_TARGET_MESSAGES' }
  | {
      type: 'UPDATE_TARGET_MESSAGE'
      payload: { index: number; updates: Partial<Message> }
    }
  | { type: 'SET_SIDEBAR_TYPING'; payload: boolean }
  | { type: 'SET_TARGET_TYPING'; payload: boolean }
  | {
      type: 'ADD_OPTIMISATION_HISTORY'
      payload: {
        originalPrompt: string
        optimizedPrompt: string
        mode: string
        timestamp: number
      }
    }
  | { type: 'CLEAR_OPTIMISATION_HISTORY' }

// Initial state
const initialSidebarMessages: Message[] = [
  {
    role: 'master',
    text: 'Hello! Select a mode and tell me what you need. I will optimize your request and auto-inject it into the chat.',
  },
]

const initialTargetMessages: Message[] = [
  {
    role: 'ai',
    text: 'Hello! I am Gemini. How can I help you today?',
  },
]

const initialState: ChatState = {
  sidebarMessages: initialSidebarMessages,
  targetMessages: initialTargetMessages,
  sidebarIsTyping: false,
  targetIsTyping: false,
  optimisationHistory: [],
}

// Reducer
const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'ADD_SIDEBAR_MESSAGE':
      return {
        ...state,
        sidebarMessages: [...state.sidebarMessages, action.payload],
      }
    case 'CLEAR_SIDEBAR_MESSAGES':
      return {
        ...state,
        sidebarMessages: [],
      }
    case 'UPDATE_SIDEBAR_MESSAGE':
      return {
        ...state,
        sidebarMessages: state.sidebarMessages.map((msg, idx) =>
          idx === action.payload.index
            ? { ...msg, ...action.payload.updates }
            : msg
        ),
      }
    case 'ADD_TARGET_MESSAGE':
      return {
        ...state,
        targetMessages: [...state.targetMessages, action.payload],
      }
    case 'CLEAR_TARGET_MESSAGES':
      return {
        ...state,
        targetMessages: [],
      }
    case 'UPDATE_TARGET_MESSAGE':
      return {
        ...state,
        targetMessages: state.targetMessages.map((msg, idx) =>
          idx === action.payload.index
            ? { ...msg, ...action.payload.updates }
            : msg
        ),
      }
    case 'SET_SIDEBAR_TYPING':
      return {
        ...state,
        sidebarIsTyping: action.payload,
      }
    case 'SET_TARGET_TYPING':
      return {
        ...state,
        targetIsTyping: action.payload,
      }
    case 'ADD_OPTIMISATION_HISTORY':
      return {
        ...state,
        optimisationHistory: [...state.optimisationHistory, action.payload],
      }
    case 'CLEAR_OPTIMISATION_HISTORY':
      return {
        ...state,
        optimisationHistory: [],
      }
    default:
      return state
  }
}

// Context
const ChatContext = createContext<ChatContextType | undefined>(undefined)

// Provider component
export const ChatProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(chatReducer, initialState)

  // Scroll refs
  const sidebarScrollRef = useRef<HTMLDivElement>(null)
  const targetScrollRef = useRef<HTMLDivElement>(null)

  // Scroll functions
  const scrollToSidebarBottom = useCallback(() => {
    if (sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const scrollToTargetBottom = useCallback(() => {
    if (targetScrollRef.current) {
      targetScrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  // Actions wrapped in useCallback for performance
  const actions = useMemo(
    () => ({
      addSidebarMessage: (message: Omit<Message, 'text'> & { text: string }) =>
        dispatch({ type: 'ADD_SIDEBAR_MESSAGE', payload: message as Message }),

      clearSidebarMessages: () => dispatch({ type: 'CLEAR_SIDEBAR_MESSAGES' }),

      updateSidebarMessage: (index: number, updates: Partial<Message>) =>
        dispatch({
          type: 'UPDATE_SIDEBAR_MESSAGE',
          payload: { index, updates },
        }),

      addTargetMessage: (message: Omit<Message, 'text'> & { text: string }) =>
        dispatch({ type: 'ADD_TARGET_MESSAGE', payload: message as Message }),

      clearTargetMessages: () => dispatch({ type: 'CLEAR_TARGET_MESSAGES' }),

      updateTargetMessage: (index: number, updates: Partial<Message>) =>
        dispatch({
          type: 'UPDATE_TARGET_MESSAGE',
          payload: { index, updates },
        }),

      setSidebarTyping: (isTyping: boolean) =>
        dispatch({ type: 'SET_SIDEBAR_TYPING', payload: isTyping }),

      setTargetTyping: (isTyping: boolean) =>
        dispatch({ type: 'SET_TARGET_TYPING', payload: isTyping }),

      addToOptimisationHistory: (entry: {
        originalPrompt: string
        optimizedPrompt: string
        mode: string
      }) =>
        dispatch({
          type: 'ADD_OPTIMISATION_HISTORY',
          payload: { ...entry, timestamp: Date.now() },
        }),

      clearOptimisationHistory: () =>
        dispatch({ type: 'CLEAR_OPTIMISATION_HISTORY' }),

      scrollToSidebarBottom,
      scrollToTargetBottom,
    }),
    [scrollToSidebarBottom, scrollToTargetBottom]
  )

  // Selectors for derived state (memoized for performance)
  const selectors = useMemo(
    () => ({
      sidebarMessagesCount: state.sidebarMessages.length,
      targetMessagesCount: state.targetMessages.length,
      lastSidebarMessage:
        state.sidebarMessages[state.sidebarMessages.length - 1] || null,
      lastTargetMessage:
        state.targetMessages[state.targetMessages.length - 1] || null,
      hasOptimizedPrompts: state.optimisationHistory.length > 0,
    }),
    [
      state.sidebarMessages,
      state.targetMessages,
      state.optimisationHistory.length,
    ]
  )

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToSidebarBottom()
  }, [state.sidebarMessages, scrollToSidebarBottom])

  useEffect(() => {
    scrollToTargetBottom()
  }, [state.targetMessages, scrollToTargetBottom])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      state,
      actions,
      refs: {
        sidebarScrollRef,
        targetScrollRef,
      },
      selectors,
    }),
    [state, actions, selectors]
  )

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  )
}

// Custom hook to consume context
export const useChatState = (): ChatContextType => {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChatState must be used within a ChatProvider')
  }
  return context
}

// Selectors for specific state slices (for performance optimization)
export const useSidebarChat = () => {
  const {
    state: { sidebarMessages, sidebarIsTyping },
    actions,
  } = useChatState()
  return {
    messages: sidebarMessages,
    isTyping: sidebarIsTyping,
    addMessage: actions.addSidebarMessage,
    clearMessages: actions.clearSidebarMessages,
    updateMessage: actions.updateSidebarMessage,
    setTyping: actions.setSidebarTyping,
    scrollToBottom: actions.scrollToSidebarBottom,
    scrollRef: actions.refs?.sidebarScrollRef,
  }
}

export const useTargetChat = () => {
  const {
    state: { targetMessages, targetIsTyping },
    actions,
  } = useChatState()
  return {
    messages: targetMessages,
    isTyping: targetIsTyping,
    addMessage: actions.addTargetMessage,
    clearMessages: actions.clearTargetMessages,
    updateMessage: actions.updateTargetMessage,
    setTyping: actions.setTargetTyping,
    scrollToBottom: actions.scrollToTargetBottom,
    scrollRef: actions.refs?.targetScrollRef,
  }
}

export const useOptimisationHistory = () => {
  const {
    state: { optimisationHistory },
    actions,
  } = useChatState()
  return {
    history: optimisationHistory,
    addToHistory: actions.addToOptimisationHistory,
    clearHistory: actions.clearOptimisationHistory,
  }
}

export default ChatContext
