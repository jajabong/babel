/**
 * Prompt Optimization Hook
 * React hook that uses the prompt optimization service layer
 */

import { useState, useCallback, useEffect } from 'react'

import {
  promptOptimizationService,
  mockPromptOptimizationService,
  type OptimizationMode,
  type PromptOptimizationRequest,
  type PromptOptimizationResponse,
  type PromptValidationRequest,
  type PromptValidationResponse,
  isMockModeEnabled,
  type PromptCategory,
} from '../services'

export interface PromptOptimizationState {
  loading: boolean
  error: string | null
  optimizedPrompt: string | null
  metadata?: {
    originalLength: number
    optimizedLength: number
    tokens: number
  }
}

export interface UsePromptOptimizationReturn {
  state: PromptOptimizationState
  optimizePrompt: (
    userInput: string,
    mode: OptimizationMode,
    options?: {
      customInstruction?: string
      context?: string
      constraints?: string[]
      outputFormat?: 'markdown' | 'json' | 'plain'
      temperature?: number
    }
  ) => Promise<string | null>
  generateVariations: (
    basePrompt: string,
    count?: number,
    mode?: OptimizationMode
  ) => Promise<string[]>
  validatePrompt: (
    prompt: string,
    criteria: string[]
  ) => Promise<PromptValidationResponse | null>
  getAvailableModes: () => PromptCategory[]
  reset: () => void
}

export const usePromptOptimization = (defaultOptions?: {
  temperature?: number
  outputFormat?: 'markdown' | 'json' | 'plain'
}): UsePromptOptimizationReturn => {
  const [state, setState] = useState<PromptOptimizationState>({
    loading: false,
    error: null,
    optimizedPrompt: null,
  })

  // Use mock service if in test environment or mock mode is enabled
  const service = isMockModeEnabled()
    ? mockPromptOptimizationService
    : promptOptimizationService

  const optimizePrompt = useCallback(
    async (
      userInput: string,
      mode: OptimizationMode,
      options?: {
        customInstruction?: string
        context?: string
        constraints?: string[]
        outputFormat?: 'markdown' | 'json' | 'plain'
        temperature?: number
      }
    ): Promise<string | null> => {
      if (!userInput.trim()) {
        setState(prev => ({
          ...prev,
          error: 'User input is required',
          loading: false,
        }))
        return null
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const request: PromptOptimizationRequest = {
          userInput,
          mode,
          customInstruction: options?.customInstruction,
          context: options?.context,
          constraints: options?.constraints,
          outputFormat:
            options?.outputFormat || defaultOptions?.outputFormat || 'markdown',
          temperature:
            options?.temperature || defaultOptions?.temperature || 0.7,
        }

        const response = await service.optimizePrompt(request)

        setState({
          loading: false,
          error: null,
          optimizedPrompt: response.optimizedPrompt,
          metadata: response.metadata,
        })

        return response.optimizedPrompt
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred'

        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }))

        return null
      }
    },
    [defaultOptions, service]
  )

  const generateVariations = useCallback(
    async (
      basePrompt: string,
      count: number = 3,
      mode: OptimizationMode = 'GENERAL'
    ): Promise<string[]> => {
      if (!basePrompt.trim()) {
        return []
      }

      try {
        return await service.generatePromptVariations(basePrompt, count, mode)
      } catch (error) {
        console.error('Failed to generate prompt variations:', error)
        return []
      }
    },
    [service]
  )

  const validatePrompt = useCallback(
    async (
      prompt: string,
      criteria: string[]
    ): Promise<PromptValidationResponse | null> => {
      if (!prompt.trim()) {
        return null
      }

      try {
        const request: PromptValidationRequest = {
          prompt,
          criteria,
        }

        return await service.validatePrompt(request)
      } catch (error) {
        console.error('Failed to validate prompt:', error)
        return null
      }
    },
    [service]
  )

  const getAvailableModes = useCallback((): PromptCategory[] => {
    return service.getAvailableModes()
  }, [service])

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      optimizedPrompt: null,
      metadata: undefined,
    })
  }, [])

  return {
    state,
    optimizePrompt,
    generateVariations,
    validatePrompt,
    getAvailableModes,
    reset,
  }
}
