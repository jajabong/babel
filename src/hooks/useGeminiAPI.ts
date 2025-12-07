import { useState, useCallback, useEffect } from 'react'

import {
  geminiAPIService,
  type GeminiAPIConfig,
  type GeminiContentRequest,
  GeminiAPIException,
  getGeminiErrorMessage,
  isMockModeEnabled,
  mockGeminiAPIService,
} from '../services'

export interface GeminiAPIState {
  loading: boolean
  error: string | null
  response: string | null
}

export interface UseGeminiAPIReturn {
  state: GeminiAPIState
  generateContent: (
    prompt: string,
    config?: Partial<GeminiAPIConfig>
  ) => Promise<string | null>
  reset: () => void
}

export const useGeminiAPI = (
  defaultConfig?: Partial<GeminiAPIConfig>
): UseGeminiAPIReturn => {
  const [state, setState] = useState<GeminiAPIState>({
    loading: false,
    error: null,
    response: null,
  })

  // Update service default config when hook config changes
  useEffect(() => {
    if (defaultConfig) {
      geminiAPIService.updateDefaultConfig(defaultConfig)
    }
  }, [defaultConfig])

  const generateContent = useCallback(
    async (
      prompt: string,
      config?: Partial<GeminiAPIConfig>
    ): Promise<string | null> => {
      const finalConfig = { ...defaultConfig, ...config }

      if (!finalConfig.apiKey) {
        setState(prev => ({
          ...prev,
          error: 'API key is required',
          loading: false,
        }))
        return null
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        // Use mock service if in test environment or mock mode is enabled
        const service = isMockModeEnabled()
          ? mockGeminiAPIService
          : geminiAPIService

        // Create the request object
        const request: GeminiContentRequest = {
          prompt,
          config: finalConfig,
        }

        // Call the service
        const response = await service.generateContent(request)

        setState({
          loading: false,
          error: null,
          response: response.text,
        })

        return response.text
      } catch (error) {
        const errorMessage = getGeminiErrorMessage(error)

        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }))

        return null
      }
    },
    [defaultConfig]
  )

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      response: null,
    })
  }, [])

  return {
    state,
    generateContent,
    reset,
  }
}
