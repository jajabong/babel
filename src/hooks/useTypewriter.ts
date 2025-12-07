import { useState, useEffect, useRef, useCallback } from 'react'

export interface TypewriterConfig {
  text?: string
  speed?: number
  onComplete?: () => void
  enabled?: boolean
  batchSize?: number
}

export interface UseTypewriterReturn {
  displayText: string
  isTyping: boolean
  start: (text: string, config?: Partial<TypewriterConfig>) => void
  stop: () => void
  reset: () => void
}

export const useTypewriter = (
  defaultConfig?: TypewriterConfig
): UseTypewriterReturn => {
  const [displayText, setDisplayText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentText, setCurrentText] = useState('')
  const [currentConfig, setCurrentConfig] = useState<TypewriterConfig>({
    speed: 1,
    enabled: true,
    batchSize: 5,
    ...defaultConfig,
  })

  const currentIndexRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const stopTyping = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsTyping(false)
  }, [])

  const reset = useCallback(() => {
    stopTyping()
    setDisplayText('')
    setCurrentText('')
    currentIndexRef.current = 0
  }, [stopTyping])

  const start = useCallback(
    (text: string, config?: Partial<TypewriterConfig>) => {
      const newConfig = { ...currentConfig, ...config }

      if (!newConfig.enabled) {
        setDisplayText(text)
        return
      }

      reset()
      setCurrentText(text)
      setCurrentConfig(newConfig)
      setIsTyping(true)
      currentIndexRef.current = 0

      const typeChar = () => {
        if (currentIndexRef.current < text.length) {
          const batchSize = newConfig.batchSize || 5
          const nextIndex = Math.min(
            currentIndexRef.current + batchSize,
            text.length
          )

          setDisplayText(text.substring(0, nextIndex))
          currentIndexRef.current = nextIndex

          if (nextIndex < text.length) {
            animationFrameRef.current = requestAnimationFrame(typeChar)
          } else {
            setIsTyping(false)
            if (newConfig.onComplete) {
              timeoutRef.current = setTimeout(() => {
                newConfig.onComplete?.()
              }, 600) // Auto-submit delay from original code
            }
          }
        }
      }

      typeChar()
    },
    [currentConfig, reset]
  )

  useEffect(() => {
    if (defaultConfig?.text) {
      start(defaultConfig.text)
    }
  }, [])

  useEffect(() => {
    return () => {
      stopTyping()
    }
  }, [stopTyping])

  return {
    displayText,
    isTyping,
    start,
    stop: stopTyping,
    reset,
  }
}
