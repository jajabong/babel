/**
 * Prompt Optimization Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  PromptOptimizationService,
  createPromptOptimizationService,
  META_PROMPTS,
  isValidOptimizationMode,
  getAllOptimizationModes,
  calculatePromptQualityScore,
  type OptimizationMode,
  type PromptOptimizationRequest,
} from '../promptAPI'

// Mock Gemini service
const mockGeminiService = {
  generateContent: vi.fn(),
}

vi.mock('./geminiAPI', () => ({
  geminiAPIService: mockGeminiService,
  mockGeminiAPIService: mockGeminiService,
  isGeminiAPIException: vi.fn(() => false),
  getGeminiErrorMessage: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Unknown error'
  ),
}))

describe('PromptOptimizationService', () => {
  let service: PromptOptimizationService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PromptOptimizationService()

    // Mock successful Gemini response
    mockGeminiService.generateContent.mockResolvedValue({
      text: 'Optimized prompt with persona, context, task, constraints, and output format.',
      usage: { totalTokens: 50 },
    })
  })

  describe('optimizePrompt', () => {
    it('should optimize prompt successfully', async () => {
      const request: PromptOptimizationRequest = {
        userInput: 'write a blog post',
        mode: 'GENERAL',
      }

      const response = await service.optimizePrompt(request)

      expect(response.optimizedPrompt).toContain('Optimized prompt')
      expect(response.mode).toBe('GENERAL')
      expect(response.metadata).toBeDefined()
      expect(response.metadata?.originalLength).toBe(15)
      expect(response.metadata?.tokens).toBe(50)
    })

    it('should handle different optimization modes', async () => {
      const codingRequest: PromptOptimizationRequest = {
        userInput: 'create a function',
        mode: 'CODING',
      }

      const codingResponse = await service.optimizePrompt(codingRequest)
      expect(codingResponse.mode).toBe('CODING')

      const creativeRequest: PromptOptimizationRequest = {
        userInput: 'write a story',
        mode: 'CREATIVE',
      }

      const creativeResponse = await service.optimizePrompt(creativeRequest)
      expect(creativeResponse.mode).toBe('CREATIVE')
    })

    it('should use custom instructions when provided', async () => {
      const request: PromptOptimizationRequest = {
        userInput: 'test prompt',
        mode: 'GENERAL',
        customInstruction: 'Custom optimization instruction',
      }

      await service.optimizePrompt(request)

      expect(mockGeminiService.generateContent).toHaveBeenCalledWith({
        prompt: 'User Request: "test prompt"',
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining(
            'Custom optimization instruction'
          ),
        }),
      })
    })

    it('should include context when provided', async () => {
      const request: PromptOptimizationRequest = {
        userInput: 'test prompt',
        mode: 'GENERAL',
        context: 'This is for a business presentation',
      }

      await service.optimizePrompt(request)

      expect(mockGeminiService.generateContent).toHaveBeenCalledWith({
        prompt: 'User Request: "test prompt"',
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining(
            'This is for a business presentation'
          ),
        }),
      })
    })

    it('should include constraints when provided', async () => {
      const request: PromptOptimizationRequest = {
        userInput: 'test prompt',
        mode: 'GENERAL',
        constraints: ['Keep it under 100 words', 'Use formal tone'],
      }

      await service.optimizePrompt(request)

      expect(mockGeminiService.generateContent).toHaveBeenCalledWith({
        prompt: 'User Request: "test prompt"',
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining(
            'Keep it under 100 words, Use formal tone'
          ),
        }),
      })
    })

    it('should handle API errors', async () => {
      mockGeminiService.generateContent.mockRejectedValue(
        new Error('API Error')
      )

      const request: PromptOptimizationRequest = {
        userInput: 'test prompt',
        mode: 'GENERAL',
      }

      await expect(service.optimizePrompt(request)).rejects.toThrow(
        'Prompt optimization failed: API Error'
      )
    })

    it('should throw error for invalid mode', async () => {
      const request: PromptOptimizationRequest = {
        userInput: 'test prompt',
        mode: 'INVALID' as OptimizationMode,
      }

      await expect(service.optimizePrompt(request)).rejects.toThrow(
        'Invalid optimization mode'
      )
    })
  })

  describe('generatePromptVariations', () => {
    it('should generate prompt variations', async () => {
      mockGeminiService.generateContent.mockResolvedValue({
        text: '1. Variation 1\n2. Variation 2\n3. Variation 3',
      })

      const variations = await service.generatePromptVariations(
        'base prompt',
        3,
        'GENERAL'
      )

      expect(variations).toHaveLength(3)
      expect(variations[0]).toContain('Variation 1')
      expect(variations[1]).toContain('Variation 2')
      expect(variations[2]).toContain('Variation 3')
    })

    it('should handle default count and mode', async () => {
      mockGeminiService.generateContent.mockResolvedValue({
        text: '1. First variation\n2. Second variation\n3. Third variation',
      })

      const variations = await service.generatePromptVariations('test prompt')

      expect(variations).toHaveLength(3)
      expect(mockGeminiService.generateContent).toHaveBeenCalledWith({
        prompt: expect.stringContaining('test prompt'),
        config: expect.objectContaining({
          temperature: 0.8,
        }),
      })
    })

    it('should return empty array for empty prompt', async () => {
      const variations = await service.generatePromptVariations('', 3)
      expect(variations).toEqual([])
    })
  })

  describe('validatePrompt', () => {
    it('should validate good prompt', async () => {
      mockGeminiService.generateContent.mockResolvedValue({
        text: JSON.stringify({
          isValid: true,
          score: 85,
          issues: [],
          suggestions: [],
        }),
      })

      const result = await service.validatePrompt(
        'This is a specific, well-formatted prompt with clear output requirements.',
        ['clarity', 'specificity']
      )

      expect(result).toBeDefined()
      expect(result!.isValid).toBe(true)
      expect(result!.score).toBe(85)
      expect(result!.issues).toHaveLength(0)
    })

    it('should identify prompt issues', async () => {
      mockGeminiService.generateContent.mockResolvedValue({
        text: JSON.stringify({
          isValid: false,
          score: 45,
          issues: ['Too vague', 'Missing output format'],
          suggestions: ['Be more specific', 'Define output format'],
          improvedPrompt: 'Improved version with more details',
        }),
      })

      const result = await service.validatePrompt('vague prompt', [
        'clarity',
        'specificity',
      ])

      expect(result).toBeDefined()
      expect(result!.isValid).toBe(false)
      expect(result!.score).toBe(45)
      expect(result!.issues).toContain('Too vague')
      expect(result!.suggestions).toContain('Be more specific')
      expect(result!.improvedPrompt).toBe('Improved version with more details')
    })

    it('should handle JSON parsing errors', async () => {
      mockGeminiService.generateContent.mockResolvedValue({
        text: 'Invalid JSON response',
      })

      const result = await service.validatePrompt('test prompt', ['clarity'])

      expect(result).toBeDefined()
      expect(result!.isValid).toBe(true)
      expect(result!.issues).toContain('Unable to parse detailed analysis')
    })

    it('should return null for empty prompt', async () => {
      const result = await service.validatePrompt('', ['clarity'])
      expect(result).toBeNull()
    })
  })

  describe('getAvailableModes', () => {
    it('should return all available modes', () => {
      const modes = service.getAvailableModes()

      expect(modes).toHaveLength(6) // GENERAL, CODING, CREATIVE, BUSINESS, RESEARCH, EDUCATION
      expect(modes.map(m => m.id)).toContain('GENERAL')
      expect(modes.map(m => m.id)).toContain('CODING')
      expect(modes.map(m => m.id)).toContain('CREATIVE')
    })

    it('should include mode metadata', () => {
      const modes = service.getAvailableModes()
      const generalMode = modes.find(m => m.id === 'GENERAL')

      expect(generalMode).toBeDefined()
      expect(generalMode!.name).toBe('General Master')
      expect(generalMode!.description).toBeDefined()
    })
  })

  describe('getMetaPrompt', () => {
    it('should return meta-prompt for valid mode', () => {
      const metaPrompt = service.getMetaPrompt('CODING')
      expect(metaPrompt).toBeDefined()
      expect(metaPrompt!.name).toBe('Code Architect')
      expect(metaPrompt!.icon).toBe('fa-code')
    })

    it('should return null for invalid mode', () => {
      const metaPrompt = service.getMetaPrompt('INVALID' as OptimizationMode)
      expect(metaPrompt).toBeNull()
    })
  })

  describe('createCustomMetaPrompt', () => {
    it('should create custom meta-prompt', () => {
      const customPrompt = service.createCustomMetaPrompt(
        'Custom Mode',
        'fa-custom',
        'Custom instruction for optimization',
        'Custom description'
      )

      expect(customPrompt.name).toBe('Custom Mode')
      expect(customPrompt.icon).toBe('fa-custom')
      expect(customPrompt.instruction).toBe(
        'Custom instruction for optimization'
      )
      expect(customPrompt.description).toBe('Custom description')
    })
  })

  describe('analyzePromptMetrics', () => {
    it('should analyze prompt metrics', async () => {
      mockGeminiService.generateContent.mockResolvedValue({
        text: JSON.stringify({
          improvementScore: 75,
          clarityScore: 80,
          specificityScore: 70,
          actionabilityScore: 85,
        }),
      })

      const metrics = await service.analyzePromptMetrics(
        'short prompt',
        'much longer and more detailed prompt with specific requirements and clear structure',
        'GENERAL'
      )

      expect(metrics.improvementScore).toBe(75)
      expect(metrics.clarityScore).toBe(80)
      expect(metrics.specificityScore).toBe(70)
      expect(metrics.actionabilityScore).toBe(85)
    })

    it('should return fallback metrics on error', async () => {
      mockGeminiService.generateContent.mockRejectedValue(
        new Error('Analysis failed')
      )

      const metrics = await service.analyzePromptMetrics(
        'prompt1',
        'prompt2',
        'GENERAL'
      )

      expect(metrics.improvementScore).toBe(50)
      expect(metrics.clarityScore).toBe(50)
      expect(metrics.specificityScore).toBe(50)
      expect(metrics.actionabilityScore).toBe(50)
    })
  })
})

describe('META_PROMPTS', () => {
  it('should contain all required modes', () => {
    expect(META_PROMPTS.GENERAL).toBeDefined()
    expect(META_PROMPTS.CODING).toBeDefined()
    expect(META_PROMPTS.CREATIVE).toBeDefined()
    expect(META_PROMPTS.BUSINESS).toBeDefined()
    expect(META_PROMPTS.RESEARCH).toBeDefined()
    expect(META_PROMPTS.EDUCATION).toBeDefined()
  })

  it('should have consistent meta-prompt structure', () => {
    Object.values(META_PROMPTS).forEach(metaPrompt => {
      expect(metaPrompt.name).toBeDefined()
      expect(metaPrompt.icon).toBeDefined()
      expect(metaPrompt.instruction).toBeDefined()
      expect(metaPrompt.instruction).toContain(
        'RETURN ONLY THE OPTIMIZED PROMPT TEXT'
      )
    })
  })
})

describe('Utility functions', () => {
  describe('isValidOptimizationMode', () => {
    it('should validate correct modes', () => {
      expect(isValidOptimizationMode('GENERAL')).toBe(true)
      expect(isValidOptimizationMode('CODING')).toBe(true)
      expect(isValidOptimizationMode('CREATIVE')).toBe(true)
    })

    it('should reject invalid modes', () => {
      expect(isValidOptimizationMode('INVALID')).toBe(false)
      expect(isValidOptimizationMode('invalid')).toBe(false)
      expect(isValidOptimizationMode('')).toBe(false)
    })
  })

  describe('getAllOptimizationModes', () => {
    it('should return all optimization modes', () => {
      const modes = getAllOptimizationModes()
      expect(modes).toHaveLength(6)
      expect(modes).toContain('GENERAL')
      expect(modes).toContain('CODING')
      expect(modes).toContain('CREATIVE')
      expect(modes).toContain('BUSINESS')
      expect(modes).toContain('RESEARCH')
      expect(modes).toContain('EDUCATION')
    })
  })

  describe('calculatePromptQualityScore', () => {
    it('should score empty prompt as 0', () => {
      expect(calculatePromptQualityScore('')).toBe(0)
      expect(calculatePromptQualityScore('   ')).toBe(0)
    })

    it('should score good prompts higher', () => {
      const goodPrompt = `Act as a senior software developer. Create a function that validates user input.
      The function should include error handling and type checking. Provide the output in TypeScript format
      with comprehensive documentation. Ensure the code follows SOLID principles and includes unit tests.`

      const score = calculatePromptQualityScore(goodPrompt)
      expect(score).toBeGreaterThan(70)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('should score basic prompts lower', () => {
      const basicPrompt = 'write code'
      const score = calculatePromptQualityScore(basicPrompt)
      expect(score).toBeLessThan(30)
    })

    it('should reward specific elements', () => {
      // Test with specific instructions
      const specificPrompt =
        'Please provide a detailed analysis with step-by-step instructions'
      const score1 = calculatePromptQualityScore(specificPrompt)

      // Test with persona
      const personaPrompt = 'Act as an expert data scientist'
      const score2 = calculatePromptQualityScore(personaPrompt)

      // Test with format specification
      const formatPrompt =
        'Provide the response in JSON format with markdown tables'
      const score3 = calculatePromptQualityScore(formatPrompt)

      expect(score1).toBeGreaterThan(10)
      expect(score2).toBeGreaterThan(10)
      expect(score3).toBeGreaterThan(10)
    })
  })
})

describe('createPromptOptimizationService', () => {
  it('should create service instance', () => {
    const service = createPromptOptimizationService()
    expect(service).toBeInstanceOf(PromptOptimizationService)
  })
})
