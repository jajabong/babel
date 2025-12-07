/**
 * Gemini API Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  GeminiAPIService,
  createGeminiAPIService,
  GeminiAPIException,
  isGeminiAPIException,
  getGeminiErrorMessage,
  isRetryableError,
  type GeminiContentRequest,
} from '../geminiAPI'

// Mock GoogleGenAI
const mockGoogleGenAI = vi.fn()
const mockGenerateContent = vi.fn()
const mockModels = {
  generateContent: mockGenerateContent,
}

vi.mock('@google/genai', () => ({
  GoogleGenAI: mockGoogleGenAI,
}))

describe('GeminiAPIService', () => {
  let service: GeminiAPIService
  const mockApiKey = 'test-api-key'

  beforeEach(() => {
    vi.clearAllMocks()
    service = new GeminiAPIService()
    mockGoogleGenAI.mockImplementation(() => ({
      models: mockModels,
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const serviceWithConfig = new GeminiAPIService({
        temperature: 0.5,
        model: 'custom-model',
      })

      const config = serviceWithConfig.getDefaultConfig()
      expect(config.temperature).toBe(0.5)
      expect(config.model).toBe('custom-model')
    })
  })

  describe('generateContent', () => {
    const mockResponse = {
      text: 'Generated response',
      usage: {
        promptTokens: 10,
        candidatesTokens: 20,
        totalTokens: 30,
      },
      finishReason: 'STOP',
      safetyRatings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          probability: 'NEGLIGIBLE',
        },
      ],
    }

    it('should generate content successfully', async () => {
      mockGenerateContent.mockResolvedValue(mockResponse)

      const request: GeminiContentRequest = {
        prompt: 'Test prompt',
        config: { apiKey: mockApiKey },
      }

      const response = await service.generateContent(request)

      expect(response.text).toBe('Generated response')
      expect(response.usage).toEqual(mockResponse.usage)
      expect(response.finishReason).toBe('STOP')
      expect(mockGoogleGenAI).toHaveBeenCalledWith({ apiKey: mockApiKey })
    })

    it('should throw error when API key is missing', async () => {
      const request: GeminiContentRequest = {
        prompt: 'Test prompt',
        config: { apiKey: '' },
      }

      await expect(service.generateContent(request)).rejects.toThrow(
        GeminiAPIException
      )
    })

    it('should throw error when response is empty', async () => {
      mockGenerateContent.mockResolvedValue({ text: '' })

      const request: GeminiContentRequest = {
        prompt: 'Test prompt',
        config: { apiKey: mockApiKey },
      }

      await expect(service.generateContent(request)).rejects.toThrow(
        GeminiAPIException
      )
    })

    it('should handle API errors correctly', async () => {
      const apiError = new Error('API key invalid')
      mockGenerateContent.mockRejectedValue(apiError)

      const request: GeminiContentRequest = {
        prompt: 'Test prompt',
        config: { apiKey: 'invalid-key' },
      }

      await expect(service.generateContent(request)).rejects.toThrow(
        GeminiAPIException
      )
    })

    it('should use custom config parameters', async () => {
      mockGenerateContent.mockResolvedValue(mockResponse)

      const request: GeminiContentRequest = {
        prompt: 'Test prompt',
        config: {
          apiKey: mockApiKey,
          model: 'custom-model',
          temperature: 0.8,
          systemInstruction: 'Custom instruction',
        },
      }

      await service.generateContent(request)

      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: 'custom-model',
        config: {
          systemInstruction: 'Custom instruction',
          temperature: 0.8,
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Test prompt' }],
          },
        ],
      })
    })

    it('should handle conversation history', async () => {
      mockGenerateContent.mockResolvedValue(mockResponse)

      const request: GeminiContentRequest = {
        prompt: 'Current question',
        config: { apiKey: mockApiKey },
        conversationHistory: [
          {
            role: 'user',
            parts: [{ text: 'Previous question' }],
          },
          {
            role: 'model',
            parts: [{ text: 'Previous answer' }],
          },
        ],
      }

      await service.generateContent(request)

      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        config: {},
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Previous question' }],
          },
          {
            role: 'model',
            parts: [{ text: 'Previous answer' }],
          },
          {
            role: 'user',
            parts: [{ text: 'Current question' }],
          },
        ],
      })
    })
  })

  describe('generateContentStream', () => {
    it('should stream content successfully', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { text: 'Hello' }
          yield { text: ' world' }
          yield { text: '!' }
        },
      }

      mockGenerateContent.mockResolvedValue(mockStream)

      const request: GeminiContentRequest = {
        prompt: 'Test prompt',
        config: { apiKey: mockApiKey },
      }

      const chunks: string[] = []
      for await (const chunk of service.generateContentStream(request)) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Hello', ' world', '!'])
    })

    it('should handle streaming errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Stream error'))

      const request: GeminiContentRequest = {
        prompt: 'Test prompt',
        config: { apiKey: mockApiKey },
      }

      const stream = service.generateContentStream(request)
      await expect(stream.next()).rejects.toThrow(GeminiAPIException)
    })
  })

  describe('validateAPIKey', () => {
    it('should validate valid API key', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'Validation successful',
      })

      const isValid = await service.validateAPIKey(mockApiKey)
      expect(isValid).toBe(true)
    })

    it('should reject invalid API key', async () => {
      const apiError = new Error('Invalid API key')
      mockGenerateContent.mockRejectedValue(apiError)

      const isValid = await service.validateAPIKey('invalid-key')
      expect(isValid).toBe(false)
    })
  })

  describe('getAvailableModels', () => {
    it('should return available models', async () => {
      const models = await service.getAvailableModels(mockApiKey)
      expect(models).toContain('gemini-2.5-flash')
      expect(models).toContain('gemini-2.5-pro')
      expect(models).toContain('gemini-1.5-flash')
      expect(models).toContain('gemini-1.5-pro')
    })
  })

  describe('configuration management', () => {
    it('should update default config', () => {
      service.updateDefaultConfig({ temperature: 0.9 })
      const config = service.getDefaultConfig()
      expect(config.temperature).toBe(0.9)
    })

    it('should get current default config', () => {
      const config = service.getDefaultConfig()
      expect(config).toBeDefined()
    })
  })
})

describe('GeminiAPIException', () => {
  it('should create exception with error details', () => {
    const error = new GeminiAPIException({
      message: 'Gemini API error',
      code: 'GEMINI_ERROR',
      details: { error: 'details' },
    })

    expect(error.message).toBe('Gemini API error')
    expect(error.code).toBe('GEMINI_ERROR')
    expect(error.details).toEqual({ error: 'details' })
    expect(error.name).toBe('GeminiAPIException')
  })
})

describe('Utility functions', () => {
  describe('isGeminiAPIException', () => {
    it('should identify GeminiAPIException', () => {
      const error = new GeminiAPIException({
        message: 'Test error',
        code: 'TEST',
      })

      expect(isGeminiAPIException(error)).toBe(true)
    })

    it('should reject other error types', () => {
      const error = new Error('Regular error')
      expect(isGeminiAPIException(error)).toBe(false)
    })
  })

  describe('getGeminiErrorMessage', () => {
    it('should extract message from GeminiAPIException', () => {
      const error = new GeminiAPIException({
        message: 'Gemini error',
        code: 'GEMINI',
      })

      expect(getGeminiErrorMessage(error)).toBe('Gemini error')
    })

    it('should extract message from regular Error', () => {
      const error = new Error('Regular error')
      expect(getGeminiErrorMessage(error)).toBe('Regular error')
    })

    it('should handle unknown errors', () => {
      expect(getGeminiErrorMessage('unknown')).toBe('Unknown error occurred')
    })
  })

  describe('isRetryableError', () => {
    it('should identify retryable error codes', () => {
      const retryableError = new GeminiAPIException({
        message: 'Timeout error',
        code: 'TIMEOUT',
      })

      expect(isRetryableError(retryableError)).toBe(true)
    })

    it('should reject non-retryable error codes', () => {
      const nonRetryableError = new GeminiAPIException({
        message: 'Invalid request',
        code: 'INVALID_REQUEST',
      })

      expect(isRetryableError(nonRetryableError)).toBe(false)
    })

    it('should treat unknown errors as retryable', () => {
      expect(isRetryableError('unknown error')).toBe(true)
    })
  })
})

describe('createGeminiAPIService', () => {
  it('should create Gemini API service instance', () => {
    const service = createGeminiAPIService({
      temperature: 0.8,
      model: 'gemini-pro',
    })

    expect(service).toBeInstanceOf(GeminiAPIService)
    const config = service.getDefaultConfig()
    expect(config.temperature).toBe(0.8)
    expect(config.model).toBe('gemini-pro')
  })

  it('should create service with default config', () => {
    const service = createGeminiAPIService()
    expect(service).toBeInstanceOf(GeminiAPIService)
  })
})
