/**
 * Mock Services Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  MockAPIClient,
  MockGeminiAPIService,
  MockPromptOptimizationService,
  MockServiceFactory,
  enableMockMode,
  disableMockMode,
  isMockModeEnabled,
  setMockDelays,
  setMockErrorRates,
  addCustomMockResponses,
  mockAPIClient,
  mockGeminiAPIService,
  mockPromptOptimizationService,
  type MockConfig,
} from '../mockServices'

describe('MockAPIClient', () => {
  let client: MockAPIClient

  beforeEach(() => {
    client = new MockAPIClient()
  })

  describe('HTTP methods', () => {
    it('should make GET request', async () => {
      const response = await client.get('/test')

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(response.data).toEqual({ mock: true })
    })

    it('should make POST request with data', async () => {
      const postData = { name: 'test' }
      const response = await client.post('/test', postData)

      expect(response.success).toBe(true)
      expect(response.status).toBe(201)
      expect(response.data).toEqual({ ...postData, mock: true })
    })

    it('should make PUT request with data', async () => {
      const putData = { name: 'updated' }
      const response = await client.put('/test', putData)

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(response.data).toEqual({ ...putData, mock: true, updated: true })
    })

    it('should make DELETE request', async () => {
      const response = await client.delete('/test')

      expect(response.success).toBe(true)
      expect(response.status).toBe(204)
      expect(response.data).toEqual({ deleted: true })
    })

    it('should make PATCH request with data', async () => {
      const patchData = { name: 'patched' }
      const response = await client.patch('/test', patchData)

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(response.data).toEqual({ ...patchData, mock: true, updated: true })
    })
  })

  describe('error handling', () => {
    it('should throw errors when configured', async () => {
      const errorClient = new MockAPIClient({ alwaysError: true })

      await expect(errorClient.get('/test')).rejects.toThrow(
        'Mock GET request failed'
      )
      await expect(errorClient.post('/test', {})).rejects.toThrow(
        'Mock POST request failed'
      )
    })

    it('should handle error rate', async () => {
      const errorClient = new MockAPIClient({ errorRate: 1.0 }) // 100% error rate

      await expect(errorClient.get('/test')).rejects.toThrow(
        'Mock GET request failed'
      )
    })

    it('should use custom responses when configured', async () => {
      const customClient = new MockAPIClient({
        customResponses: {
          '/custom': { custom: 'response' },
        },
      })

      const response = await customClient.get('/custom')
      expect(response.data).toEqual({ custom: 'response' })
    })
  })

  describe('configuration', () => {
    it('should accept custom config', () => {
      const config: MockConfig = {
        delay: 500,
        errorRate: 0.2,
        alwaysError: false,
      }

      const customClient = new MockAPIClient(config)
      // Config is tested implicitly through behavior
      expect(customClient).toBeInstanceOf(MockAPIClient)
    })
  })
})

describe('MockGeminiAPIService', () => {
  let service: MockGeminiAPIService

  beforeEach(() => {
    service = new MockGeminiAPIService()
  })

  describe('generateContent', () => {
    it('should generate content based on prompt type', async () => {
      const codingResponse = await service.generateContent({
        prompt: 'create a function in Python',
        config: { apiKey: 'test-key' },
      })

      expect(codingResponse.text).toContain('Senior Software Developer')
      expect(codingResponse.usage).toBeDefined()
      expect(codingResponse.finishReason).toBe('STOP')
    })

    it('should handle creative prompts', async () => {
      const creativeResponse = await service.generateContent({
        prompt: 'write a short story',
        config: { apiKey: 'test-key' },
      })

      expect(creativeResponse.text).toContain('Creative Director')
      expect(creativeResponse.text).toContain('Tone & Style')
    })

    it('should handle business prompts', async () => {
      const businessResponse = await service.generateContent({
        prompt: 'analyze market trends',
        config: { apiKey: 'test-key' },
      })

      expect(businessResponse.text).toContain('Business Strategy Consultant')
      expect(businessResponse.text).toContain('SWOT Analysis')
    })

    it('should throw error when API key is missing', async () => {
      await expect(
        service.generateContent({
          prompt: 'test',
          config: { apiKey: '' },
        })
      ).rejects.toThrow('API key is required')
    })

    it('should handle configured errors', async () => {
      const errorService = new MockGeminiAPIService({ alwaysError: true })

      await expect(
        errorService.generateContent({
          prompt: 'test',
          config: { apiKey: 'test-key' },
        })
      ).rejects.toThrow('Mock Gemini API call failed')
    })
  })

  describe('generateContentStream', () => {
    it('should stream content word by word', async () => {
      const stream = service.generateContentStream({
        prompt: 'stream test',
        config: { apiKey: 'test-key' },
      })

      const chunks: string[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks.join('')).toContain('mock response')
    })

    it('should handle streaming errors', async () => {
      const errorService = new MockGeminiAPIService({ alwaysError: true })
      const stream = errorService.generateContentStream({
        prompt: 'test',
        config: { apiKey: 'test-key' },
      })

      await expect(stream.next()).rejects.toThrow(
        'Mock Gemini streaming failed'
      )
    })
  })

  describe('validateAPIKey', () => {
    it('should validate non-empty API key', async () => {
      const isValid = await service.validateAPIKey('valid-key')
      expect(isValid).toBe(true)
    })

    it('should reject empty API key', async () => {
      const isValid = await service.validateAPIKey('')
      expect(isValid).toBe(false)
    })

    it('should handle configured errors', async () => {
      const errorService = new MockGeminiAPIService({ errorRate: 1.0 })
      const isValid = await errorService.validateAPIKey('test-key')
      expect(isValid).toBe(false)
    })
  })

  describe('getAvailableModels', () => {
    it('should return available models', async () => {
      const models = await service.getAvailableModels('test-key')
      expect(models).toContain('gemini-2.5-flash')
      expect(models).toContain('gemini-2.5-pro')
      expect(models).toContain('gemini-1.5-flash')
      expect(models).toContain('gemini-1.5-pro')
    })
  })

  describe('configuration management', () => {
    it('should handle config updates', () => {
      service.updateDefaultConfig({ model: 'test-model' })
      // Mock implementation is no-op, just test it doesn't throw
      expect(true).toBe(true)
    })

    it('should return current config', () => {
      const config = service.getDefaultConfig()
      expect(config).toEqual({})
    })
  })
})

describe('MockPromptOptimizationService', () => {
  let service: MockPromptOptimizationService

  beforeEach(() => {
    service = new MockPromptOptimizationService()
  })

  describe('optimizePrompt', () => {
    it('should optimize prompt for GENERAL mode', async () => {
      const response = await service.optimizePrompt({
        userInput: 'test prompt',
        mode: 'GENERAL',
      })

      expect(response.optimizedPrompt).toContain('Persona/Role')
      expect(response.mode).toBe('GENERAL')
      expect(response.metadata).toBeDefined()
      expect(response.metadata!.originalLength).toBe(11)
    })

    it('should optimize prompt for CODING mode', async () => {
      const response = await service.optimizePrompt({
        userInput: 'write code',
        mode: 'CODING',
      })

      expect(response.optimizedPrompt).toContain('Senior Software Developer')
      expect(response.mode).toBe('CODING')
      expect(response.optimizedPrompt).toContain('Tech Stack')
    })

    it('should handle custom options', async () => {
      const response = await service.optimizePrompt({
        userInput: 'test',
        mode: 'CREATIVE',
        customInstruction: 'Custom instruction',
        context: 'Business context',
        constraints: ['Constraint 1', 'Constraint 2'],
        outputFormat: 'json',
        temperature: 0.8,
      })

      expect(response.optimizedPrompt).toBeDefined()
      expect(response.mode).toBe('CREATIVE')
    })

    it('should handle configured errors', async () => {
      const errorService = new MockPromptOptimizationService({
        alwaysError: true,
      })

      await expect(
        errorService.optimizePrompt({
          userInput: 'test',
          mode: 'GENERAL',
        })
      ).rejects.toThrow('Mock prompt optimization failed')
    })

    it('should return null for empty input', async () => {
      const response = await service.optimizePrompt({
        userInput: '',
        mode: 'GENERAL',
      })

      expect(response.optimizedPrompt).toBe(null)
    })
  })

  describe('generatePromptVariations', () => {
    it('should generate variations', async () => {
      const variations = await service.generatePromptVariations(
        'base prompt',
        2,
        'GENERAL'
      )

      expect(variations).toHaveLength(2)
      expect(variations[0]).toContain('1.')
      expect(variations[1]).toContain('2.')
    })

    it('should use default count and mode', async () => {
      const variations = await service.generatePromptVariations('test prompt')

      expect(variations).toHaveLength(3)
    })

    it('should return empty array for empty prompt', async () => {
      const variations = await service.generatePromptVariations('')
      expect(variations).toEqual([])
    })
  })

  describe('validatePrompt', () => {
    it('should validate good prompt', async () => {
      const goodPrompt =
        'This is a specific prompt with format requirements and clear instructions.'
      const response = await service.validatePrompt(goodPrompt, [
        'clarity',
        'specificity',
      ])

      expect(response!.isValid).toBe(true)
      expect(response!.score).toBe(85)
      expect(response!.issues).toHaveLength(0)
    })

    it('should identify prompt issues', async () => {
      const response = await service.validatePrompt('vague', ['clarity'])

      expect(response!.isValid).toBe(false)
      expect(response!.score).toBe(45)
      expect(response!.issues.length).toBeGreaterThan(0)
      expect(response!.suggestions.length).toBeGreaterThan(0)
      expect(response!.improvedPrompt).toBeDefined()
    })

    it('should return null for empty prompt', async () => {
      const response = await service.validatePrompt('', ['clarity'])
      expect(response).toBeNull()
    })
  })

  describe('utility methods', () => {
    it('should get available modes', () => {
      const modes = service.getAvailableModes()
      expect(modes).toHaveLength(6)
      expect(modes[0].name).toBeDefined()
    })

    it('should get meta-prompt for mode', () => {
      const metaPrompt = service.getMetaPrompt('CODING')
      expect(metaPrompt).toBeDefined()
      expect(metaPrompt!.name).toBe('Code Architect')
    })

    it('should return null for invalid mode', () => {
      const metaPrompt = service.getMetaPrompt('INVALID' as any)
      expect(metaPrompt).toBeNull()
    })

    it('should create custom meta-prompt', () => {
      const custom = service.createCustomMetaPrompt(
        'Custom',
        'fa-custom',
        'Instruction',
        'Description'
      )
      expect(custom.name).toBe('Custom')
      expect(custom.icon).toBe('fa-custom')
      expect(custom.instruction).toBe('Instruction')
      expect(custom.description).toBe('Description')
    })

    it('should analyze prompt metrics', async () => {
      const metrics = await service.analyzePromptMetrics(
        'short',
        'much longer detailed prompt',
        'GENERAL'
      )

      expect(metrics.improvementScore).toBeDefined()
      expect(metrics.clarityScore).toBe(75)
      expect(metrics.specificityScore).toBe(80)
      expect(metrics.actionabilityScore).toBe(85)
    })
  })
})

describe('MockServiceFactory', () => {
  beforeEach(() => {
    MockServiceFactory.reset()
  })

  describe('configuration management', () => {
    it('should set and get mock config', () => {
      const config: MockConfig = {
        delay: 1000,
        errorRate: 0.3,
        alwaysError: false,
        customResponses: { '/test': { custom: true } },
      }

      MockServiceFactory.setMockConfig(config)
      const retrievedConfig = MockServiceFactory.getMockConfig()

      expect(retrievedConfig).toEqual(config)
    })

    it('should merge configs when setting', () => {
      MockServiceFactory.setMockConfig({ delay: 500 })
      MockServiceFactory.setMockConfig({ errorRate: 0.2 })

      const config = MockServiceFactory.getMockConfig()
      expect(config.delay).toBe(500)
      expect(config.errorRate).toBe(0.2)
    })

    it('should reset config', () => {
      MockServiceFactory.setMockConfig({ delay: 1000 })
      MockServiceFactory.reset()

      const config = MockServiceFactory.getMockConfig()
      expect(Object.keys(config)).toHaveLength(0)
    })
  })

  describe('service creation', () => {
    it('should create mock API client', () => {
      MockServiceFactory.setMockConfig({ delay: 200 })
      const client = MockServiceFactory.createMockAPIClient()
      expect(client).toBeInstanceOf(MockAPIClient)
    })

    it('should create mock Gemini service', () => {
      MockServiceFactory.setMockConfig({ errorRate: 0.5 })
      const service = MockServiceFactory.createMockGeminiAPIService()
      expect(service).toBeInstanceOf(MockGeminiAPIService)
    })

    it('should create mock prompt service', () => {
      MockServiceFactory.setMockConfig({ alwaysError: true })
      const service = MockServiceFactory.createMockPromptOptimizationService()
      expect(service).toBeInstanceOf(MockPromptOptimizationService)
    })
  })
})

describe('Global mock functions', () => {
  beforeEach(() => {
    disableMockMode()
  })

  afterEach(() => {
    disableMockMode()
  })

  describe('enableMockMode / disableMockMode', () => {
    it('should enable and disable mock mode', () => {
      expect(isMockModeEnabled()).toBe(false)

      enableMockMode({ delay: 100 })
      expect(isMockModeEnabled()).toBe(true)

      disableMockMode()
      expect(isMockModeEnabled()).toBe(false)
    })
  })

  describe('setMockDelays', () => {
    it('should set mock delays', () => {
      setMockDelays(500, 1000, 1500)
      // Config is set internally, tested through factory
      expect(isMockModeEnabled()).toBe(true)
    })
  })

  describe('setMockErrorRates', () => {
    it('should set error rates', () => {
      setMockErrorRates(0.3, false)
      expect(isMockModeEnabled()).toBe(true)

      setMockErrorRates(1.0, true)
      expect(isMockModeEnabled()).toBe(true)
    })
  })

  describe('addCustomMockResponses', () => {
    it('should add custom responses', () => {
      addCustomMockResponses({
        '/api/test': { custom: 'response' },
        '/api/error': null,
      })

      expect(isMockModeEnabled()).toBe(true)
    })
  })

  describe('isMockModeEnabled', () => {
    it('should detect mock mode status', () => {
      expect(isMockModeEnabled()).toBe(false)

      enableMockMode()
      expect(isMockModeEnabled()).toBe(true)

      disableMockMode()
      expect(isMockModeEnabled()).toBe(false)
    })
  })
})

describe('Default export instances', () => {
  it('should export default mock instances', () => {
    expect(mockAPIClient).toBeInstanceOf(MockAPIClient)
    expect(mockGeminiAPIService).toBeInstanceOf(MockGeminiAPIService)
    expect(mockPromptOptimizationService).toBeInstanceOf(
      MockPromptOptimizationService
    )
  })
})
