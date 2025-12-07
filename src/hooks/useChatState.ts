import { useState, useCallback, useRef, useEffect } from 'react'

import type { Message } from '../components/ui'

export interface ChatStateConfig {
  initialMessages?: Message[]
  maxMessages?: number
  autoScroll?: boolean
}

export interface UseChatStateReturn {
  messages: Message[]
  addMessage: (message: Omit<Message, 'text'> & { text: string }) => void
  addMessages: (messages: Message[]) => void
  clearMessages: () => void
  updateMessage: (index: number, updates: Partial<Message>) => void
  removeMessage: (index: number) => void
  messagesCount: number
  scrollRef: React.RefObject<HTMLDivElement>
  scrollToBottom: () => void
}

export const useChatState = (config?: ChatStateConfig): UseChatStateReturn => {
  const {
    initialMessages = [],
    maxMessages = Infinity,
    autoScroll = true,
  } = config || {}

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [autoScroll])

  const addMessage = useCallback(
    (message: Omit<Message, 'text'> & { text: string }) => {
      setMessages(prev => {
        const newMessages = [...prev, message]

        // Keep only the last maxMessages
        if (newMessages.length > maxMessages) {
          return newMessages.slice(-maxMessages)
        }

        return newMessages
      })
    },
    [maxMessages]
  )

  const addMessages = useCallback(
    (newMessages: Message[]) => {
      setMessages(prev => {
        const combinedMessages = [...prev, ...newMessages]

        // Keep only the last maxMessages
        if (combinedMessages.length > maxMessages) {
          return combinedMessages.slice(-maxMessages)
        }

        return combinedMessages
      })
    },
    [maxMessages]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const updateMessage = useCallback(
    (index: number, updates: Partial<Message>) => {
      setMessages(prev => {
        const newMessages = [...prev]
        if (newMessages[index]) {
          newMessages[index] = { ...newMessages[index], ...updates }
        }
        return newMessages
      })
    },
    []
  )

  const removeMessage = useCallback((index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  return {
    messages,
    addMessage,
    addMessages,
    clearMessages,
    updateMessage,
    removeMessage,
    messagesCount: messages.length,
    scrollRef,
    scrollToBottom,
  }
}
