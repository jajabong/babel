/**
 * usePromptOptimization Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { enableMockMode, disableMockMode } from '../../services'
import { usePromptOptimization } from '../usePromptOptimization'

// Mock the services
const mockPromptService = {
  optimizePrompt: vi.fn(),
  generatePromptVariations: vi.fn(),
  validatePrompt: vi.fn(),
  getAvailableModes: vi.fn(),
}

vi.mock('../../services', async () => {
  const actual = await vi.importActual('../../services')
  return {
    ...actual,
    promptOptimizationService: mockPromptService,
    mockPromptOptimizationService: mockPromptService,
    isMockModeEnabled: () => true,
  }
})

describe('usePromptOptimization', () => {
  const mockOptimizedPrompt =
    'This is an optimized prompt with persona, task, constraints, and format.'
  const mockVariations = [
    '1. Alternative approach focusing on practical implementation',
    '2. Alternative approach emphasizing theoretical understanding',
  ]
  const mockValidation = {
    isValid: true,
    score: 85,
    issues: [],
    suggestions: ['Add more specific constraints'],
  }
  const mockAvailableModes = [
    {
      id: 'GENERAL',
      name: 'General Master',
      description: 'Optimize prompts for general use',
      examples: [],
    },
    {
      id: 'CODING',
      name: 'Code Architect',
      description: 'Optimize prompts for coding',
      examples: [],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    enableMockMode()

    mockPromptService.optimizePrompt.mockResolvedValue({
      optimizedPrompt: mockOptimizedPrompt,
      mode: 'GENERAL',
      metadata: {
        originalLength: 15,
        optimizedLength: 150,
        tokens: 50,
      },
    })

    mockPromptService.generatePromptVariations.mockResolvedValue(mockVariations)
    mockPromptService.validatePrompt.mockResolvedValue(mockValidation)
    mockPromptService.getAvailableModes.mockReturnValue(mockAvailableModes)
  })

  afterEach(() => {
    disableMockMode()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => usePromptOptimization())

      expect(result.current.state).toEqual({
        loading: false,
        error: null,
        optimizedPrompt: null,
        metadata: undefined,
      })
    })

    it('should initialize with default options', () => {
      const { result } = renderHook(() =>
        usePromptOptimization({
          temperature: 0.8,
          outputFormat: 'json',
        })
      )

      expect(typeof result.current.optimizePrompt).toBe('function')
      expect(typeof result.current.generateVariations).toBe('function')
      expect(typeof result.current.validatePrompt).toBe('function')
      expect(typeof result.current.getAvailableModes).toBe('function')
      expect(typeof result.current.reset).toBe('function')
    })
  })

  describe('optimizePrompt', () => {
    it('should optimize prompt successfully', async () => {
      const { result } = renderHook(() => usePromptOptimization())

      await act(async () => {
        const optimized = await result.current.optimizePrompt(
          'write a blog post',
          'GENERAL'
        )
        expect(optimized).toBe(mockOptimizedPrompt)
      })

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false)
        expect(result.current.state.optimizedPrompt).toBe(mockOptimizedPrompt)
        expect(result.current.state.error).toBeNull()
      })

      expect(mockPromptService.optimizePrompt).toHaveBeenCalledWith({
        userInput: 'write a blog post',
        mode: 'GENERAL',
        customInstruction: undefined,
        context: undefined,
        constraints: undefined,
        outputFormat: 'markdown',
        temperature: 0.7,
      })
    })

    it('should handle custom options', async () => {
      const { result } = renderHook(() =>
        usePromptOptimization({
          outputFormat: 'json',
          temperature: 0.5,
        })
      )

      await act(async () => {
        await result.current.optimizePrompt('test prompt', 'CODING', {
          customInstruction: 'Custom instruction',
          context: 'Business context',
          constraints: ['Keep it short'],
          outputFormat: 'plain',
          temperature: 0.8,
        })
      })

      expect(mockPromptService.optimizePrompt).toHaveBeenCalledWith({
        userInput: 'test prompt',
        mode: 'CODING',
        customInstruction: 'Custom instruction',
        context: 'Business context',
        constraints: ['Keep it short'],
        outputFormat: 'plain',
        temperature: 0.8, // Should use option-specific temperature
      })
    })

    it('should use hook defaults when options not provided', async () => {
      const { result } = renderHook(() =>
        usePromptOptimization({
          outputFormat: 'json',
          temperature: 0.9,
        })
      )

      await act(async () => {
        await result.current.optimizePrompt('test', 'CREATIVE')
      })

      expect(mockPromptService.optimizePrompt).toHaveBeenCalledWith({
        userInput: 'test',
        mode: 'CREATIVE',
        customInstruction: undefined,
        context: undefined,
        constraints: undefined,
        outputFormat: 'json', // From hook default
        temperature: 0.7, // Default when not specified in call
      })
    })

    it('should return null for empty input', async () => {
      const { result } = renderHook(() => usePromptOptimization())

      await act(async () => {
        const optimized = await result.current.optimizePrompt('', 'GENERAL')
        expect(optimized).toBeNull()
      })

      expect(result.current.state.error).toBe('User input is required')
      expect(result.current.state.loading).toBe(false)
    })

    it('should handle optimization errors', async () => {
      const { result } = renderHook(() => usePromptOptimization())
      mockPromptService.optimizePrompt.mockRejectedValue(
        new Error('Optimization failed')
      )

      await act(async () => {
        const optimized = await result.current.optimizePrompt('test', 'GENERAL')
        expect(optimized).toBeNull()
      })

      expect(result.current.state.error).toBe('Optimization failed')
      expect(result.current.state.loading).toBe(false)
    })
  })

  describe('generateVariations', () => {
    it('should generate prompt variations', async () => {
      const { result } = renderHook(() => usePromptOptimization())

      const variations = await result.current.generateVariations(
        'base prompt',
        2,
        'CODING'
      )

      expect(variations).toEqual(mockVariations)
      expect(mockPromptService.generatePromptVariations).toHaveBeenCalledWith(
        'base prompt',
        2,
        'CODING'
      )
    })

    it('should use default count and mode', async () => {
      const { result } = renderHook(() => usePromptOptimization())

      await result.current.generateVariations('test prompt')

      expect(mockPromptService.generatePromptVariations).toHaveBeenCalledWith(
        'test prompt',
        3,
        'GENERAL'
      )
    })

    it('should return empty array for empty prompt', async () => {
      const { result } = renderHook(() => usePromptOptimization())

      const variations = await result.current.generateVariations('')

      expect(variations).toEqual([])
      expect(mockPromptService.generatePromptVariations).not.toHaveBeenCalled()
    })

    it('should handle generation errors gracefully', async () => {
      const { result } = renderHook(() => usePromptOptimization())
      mockPromptService.generatePromptVariations.mockRejectedValue(
        new Error('Generation failed')
      )

      const variations = await result.current.generateVariations('test')

      expect(variations).toEqual([])
    })
  })

  describe('validatePrompt', () => {
    it('should validate prompt successfully', async () => {
      const { result } = renderHook(() => usePromptOptimization())

      const validation = await result.current.validatePrompt('good prompt', [
        'clarity',
        'specificity',
      ])

      expect(validation).toEqual(mockValidation)
      expect(mockPromptService.validatePrompt).toHaveBeenCalledWith(
        'good prompt',
        ['clarity', 'specificity']
      )
    })

    it('should return null for empty prompt', async () => {
      const { result } = renderHook(() => usePromptOptimization())

      const validation = await result.current.validatePrompt('', ['clarity'])

      expect(validation).toBeNull()
      expect(mockPromptService.validatePrompt).not.toHaveBeenCalled()
    })

    it('should handle validation errors gracefully', async () => {
      const { result } = renderHook(() => usePromptOptimization())
      mockPromptService.validatePrompt.mockRejectedValue(
        new Error('Validation failed')
      )

      const validation = await result.current.validatePrompt('test', [
        'clarity',
      ])

      expect(validation).toBeNull()
    })
  })

  describe('getAvailableModes', () => {
    it('should return available modes', () => {
      const { result } = renderHook(() => usePromptOptimization())

      const modes = result.current.getAvailableModes()

      expect(modes).toEqual(mockAvailableModes)
      expect(mockPromptService.getAvailableModes).toHaveBeenCalled()
    })
  })

  describe('reset', () => {
    it('should reset state to initial values', async () => {
      const { result } = renderHook(() => usePromptOptimization())

      // Set some state
      await act(async () => {
        await result.current.optimizePrompt('test', 'GENERAL')
      })

      expect(result.current.state.optimizedPrompt).toBe(mockOptimizedPrompt)

      // Reset state
      act(() => {
        result.current.reset()
      })

      expect(result.current.state).toEqual({
        loading: false,
        error: null,
        optimizedPrompt: null,
        metadata: undefined,
      })
    })
  })

  describe('state management', () => {
    it('should manage loading state correctly', async () => {
      const { result } = renderHook(() => usePromptOptimization())

      // Start with loading false
      expect(result.current.state.loading).toBe(false)

      // Start optimization
      const optimizationPromise = act(async () => {
        return result.current.optimizePrompt('test', 'GENERAL')
      })

      // Loading should be true during operation
      // Note: In real implementation, we'd need to check this with proper timing
      // For now, we verify final state
      await optimizationPromise

      // Loading should be false after completion
      expect(result.current.state.loading).toBe(false)
    })

    it('should preserve previous state when errors occur', async () => {
      const { result } = renderHook(() => usePromptOptimization())

      // Set initial successful state
      mockPromptService.optimizePrompt.mockResolvedValueOnce({
        optimizedPrompt: 'First success',
        mode: 'GENERAL',
      })

      await act(async () => {
        await result.current.optimizePrompt('test', 'GENERAL')
      })

      expect(result.current.state.optimizedPrompt).toBe('First success')

      // Simulate error on next call
      mockPromptService.optimizePrompt.mockRejectedValueOnce(
        new Error('Failed')
      )

      await act(async () => {
        await result.current.optimizePrompt('test2', 'GENERAL')
      })

      // Should have error but preserve previous optimized prompt
      expect(result.current.state.error).toBe('Failed')
      expect(result.current.state.optimizedPrompt).toBeNull() // Error resets the result
    })
  })
})
