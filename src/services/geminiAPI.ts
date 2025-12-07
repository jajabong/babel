/**
 * Gemini API Service
 * Provides abstraction layer for Google Gemini API interactions
 */

import { GoogleGenAI, GenerateContentConfig, Content } from '@google/genai'

import {
  APIError,
  NetworkError,
  ValidationError,
  BusinessLogicError,
  ErrorSeverity,
  ErrorCategory,
  reportError,
  addBreadcrumb,
  toAppError,
} from '../errors'
import { Validation } from '../utils/validation'

import { handleAPIError } from './api'

// Gemini API Configuration Types
export interface GeminiAPIConfig {
  apiKey: string
  model?: string
  temperature?: number
  topP?: number
  topK?: number
  maxOutputTokens?: number
  systemInstruction?: string
  safetySettings?: Array<{
    category: string
    threshold: string
  }>
}

export interface GeminiContentRequest {
  prompt: string
  config?: Partial<GeminiAPIConfig>
  conversationHistory?: Array<{
    role: 'user' | 'model'
    parts: Array<{ text: string }>
  }>
}

export interface GeminiContentResponse {
  text: string
  usage?: {
    promptTokens: number
    candidatesTokens: number
    totalTokens: number
  }
  finishReason?: string
  safetyRatings?: Array<{
    category: string
    probability: string
  }>
}

export interface GeminiServiceError {
  message: string
  code: string
  details?: unknown
}

/**
 * Custom Gemini API Error Class (deprecated - use AppError instead)
 * @deprecated Use APIError or other AppError subclasses instead
 */
export class GeminiAPIException extends APIError {
  constructor(error: GeminiServiceError) {
    super(error.message, undefined, undefined, {
      component: 'GeminiAPIService',
      action: 'api_call',
      additionalData: {
        geminiCode: error.code,
        geminiDetails: error.details,
      },
    })
    this.name = 'GeminiAPIException'
  }
}

/**
 * Gemini API Service Class
 * Provides high-level interface for Gemini API operations
 */
export class GeminiAPIService {
  private defaultConfig: Partial<GeminiAPIConfig>
  private apiClient: GoogleGenAI | null = null

  constructor(defaultConfig: Partial<GeminiAPIConfig> = {}) {
    this.defaultConfig = defaultConfig
  }

  /**
   * Initialize the Gemini API client
   */
  private initializeClient(apiKey: string): GoogleGenAI {
    if (!this.apiClient || this.defaultConfig.apiKey !== apiKey) {
      this.apiClient = new GoogleGenAI({ apiKey })
      this.defaultConfig.apiKey = apiKey
    }
    return this.apiClient
  }

  /**
   * Build GenerateContentConfig from GeminiAPIConfig
   */
  private buildGenerateConfig(
    config: Partial<GeminiAPIConfig>
  ): GenerateContentConfig {
    return {
      systemInstruction: config.systemInstruction,
      temperature: config.temperature,
      topP: config.topP,
      topK: config.topK,
      maxOutputTokens: config.maxOutputTokens,
      safetySettings: config.safetySettings,
    }
  }

  /**
   * Build content array for generation request
   */
  private buildContent(
    prompt: string,
    conversationHistory?: Array<{
      role: 'user' | 'model'
      parts: Array<{ text: string }>
    }>
  ): Content[] {
    const contents: Content[] = []

    // Add conversation history if provided
    if (conversationHistory) {
      contents.push(...conversationHistory)
    }

    // Add current prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    })

    return contents
  }

  /**
   * Generate content using Gemini API
   */
  async generateContent(
    request: GeminiContentRequest
  ): Promise<GeminiContentResponse> {
    const { prompt, config, conversationHistory } = request
    const finalConfig = { ...this.defaultConfig, ...config }

    try {
      // Add breadcrumb for API call start
      addBreadcrumb('Starting Gemini API content generation', 'http', 'info', {
        model: finalConfig.model || 'gemini-2.5-flash',
        promptLength: prompt.length,
        hasHistory: !!conversationHistory?.length,
      })

      // Validate inputs
      const promptValidation = Validation.validateMessage(prompt, 'prompt')
      if (!promptValidation.isValid) {
        const error = new ValidationError(
          'Invalid prompt content',
          'prompt',
          prompt,
          {
            component: 'GeminiAPIService',
            action: 'generateContent',
          }
        )
        reportError(error, {
          context: 'gemini_prompt_validation',
          additionalData: { prompt: prompt.substring(0, 200) },
        })
        throw error
      }

      if (!finalConfig.apiKey) {
        throw new ValidationError('API key is required', 'apiKey', undefined, {
          component: 'GeminiAPIService',
          action: 'generateContent',
        })
      }

      // Initialize client
      const client = this.initializeClient(finalConfig.apiKey)

      // Build generation request
      const generateConfig = this.buildGenerateConfig(finalConfig)
      const contents = this.buildContent(prompt, conversationHistory)

      // Make API call
      const response = await client.models.generateContent({
        model: finalConfig.model || 'gemini-2.5-flash',
        config: generateConfig,
        contents,
      })

      // Handle response
      if (!response.text) {
        throw new GeminiAPIException({
          message: 'Empty response from Gemini API',
          code: 'EMPTY_RESPONSE',
        })
      }

      return {
        text: response.text,
        usage: response.usage
          ? {
              promptTokens: response.usage.promptTokens || 0,
              candidatesTokens: response.usage.candidatesTokens || 0,
              totalTokens: response.usage.totalTokens || 0,
            }
          : undefined,
        finishReason: response.finishReason,
        safetyRatings: response.safetyRatings?.map(rating => ({
          category: rating.category,
          probability: rating.probability,
        })),
      }
    } catch (error) {
      // Handle different error types
      if (error instanceof GeminiAPIException) {
        throw error
      }

      // Handle GoogleGenAI specific errors
      if (error instanceof Error) {
        // Check for common API errors
        if (error.message.includes('API key')) {
          throw new GeminiAPIException({
            message: 'Invalid API key',
            code: 'INVALID_API_KEY',
            details: error.message,
          })
        }

        if (
          error.message.includes('quota') ||
          error.message.includes('rate limit')
        ) {
          throw new GeminiAPIException({
            message: 'API quota exceeded or rate limit reached',
            code: 'QUOTA_EXCEEDED',
            details: error.message,
          })
        }

        if (
          error.message.includes('model') ||
          error.message.includes('not found')
        ) {
          throw new GeminiAPIException({
            message: 'Model not available or invalid',
            code: 'MODEL_ERROR',
            details: error.message,
          })
        }

        if (error.message.includes('timeout')) {
          throw new GeminiAPIException({
            message: 'Request timeout',
            code: 'TIMEOUT',
            details: error.message,
          })
        }

        if (
          error.message.includes('content') ||
          error.message.includes('policy')
        ) {
          throw new GeminiAPIException({
            message: 'Content policy violation',
            code: 'CONTENT_POLICY',
            details: error.message,
          })
        }

        // Generic API error
        throw new GeminiAPIException({
          message: `Gemini API error: ${error.message}`,
          code: 'API_ERROR',
          details: error.message,
        })
      }

      // Unknown error
      throw new GeminiAPIException({
        message: 'Unknown error occurred while calling Gemini API',
        code: 'UNKNOWN_ERROR',
        details: error,
      })
    }
  }

  /**
   * Generate content with streaming response
   */
  async *generateContentStream(
    request: GeminiContentRequest
  ): AsyncGenerator<string, void, unknown> {
    const { prompt, config, conversationHistory } = request
    const finalConfig = { ...this.defaultConfig, ...config }

    try {
      // Validate API key
      if (!finalConfig.apiKey) {
        throw new GeminiAPIException({
          message: 'API key is required',
          code: 'MISSING_API_KEY',
        })
      }

      // Initialize client
      const client = this.initializeClient(finalConfig.apiKey)

      // Build generation request
      const generateConfig = this.buildGenerateConfig(finalConfig)
      const contents = this.buildContent(prompt, conversationHistory)

      // Make streaming API call
      const response = await client.models.generateContentStream({
        model: finalConfig.model || 'gemini-2.5-flash',
        config: generateConfig,
        contents,
      })

      // Stream chunks
      for await (const chunk of response) {
        if (chunk.text) {
          yield chunk.text
        }
      }
    } catch (error) {
      if (error instanceof GeminiAPIException) {
        throw error
      }

      // Handle streaming-specific errors
      if (error instanceof Error) {
        throw new GeminiAPIException({
          message: `Streaming error: ${error.message}`,
          code: 'STREAM_ERROR',
          details: error.message,
        })
      }

      throw new GeminiAPIException({
        message: 'Unknown error occurred during streaming',
        code: 'UNKNOWN_STREAM_ERROR',
        details: error,
      })
    }
  }

  /**
   * Update default configuration
   */
  updateDefaultConfig(newConfig: Partial<GeminiAPIConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...newConfig }
  }

  /**
   * Get current default configuration
   */
  getDefaultConfig(): Partial<GeminiAPIConfig> {
    return { ...this.defaultConfig }
  }

  /**
   * Validate API key by making a simple test call
   */
  async validateAPIKey(apiKey: string): Promise<boolean> {
    try {
      await this.generateContent({
        prompt: 'Hello',
        config: { apiKey, model: 'gemini-2.5-flash' },
      })
      return true
    } catch (error) {
      if (error instanceof GeminiAPIException) {
        return (
          error.code !== 'INVALID_API_KEY' && error.code !== 'MISSING_API_KEY'
        )
      }
      return false
    }
  }

  /**
   * Get available models (mock implementation - would need actual endpoint)
   */
  async getAvailableModels(apiKey: string): Promise<string[]> {
    // This would typically call a Gemini API endpoint to list models
    // For now, return common models
    return [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ]
  }
}

/**
 * Create Gemini API service instance
 */
export function createGeminiAPIService(
  defaultConfig?: Partial<GeminiAPIConfig>
): GeminiAPIService {
  return new GeminiAPIService(defaultConfig)
}

/**
 * Default Gemini API service instance
 */
export const geminiAPIService = createGeminiAPIService()

/**
 * Utility functions for Gemini API operations
 */

/**
 * Check if error is a Gemini API exception
 */
export function isGeminiAPIException(
  error: unknown
): error is GeminiAPIException {
  return error instanceof GeminiAPIException
}

/**
 * Extract error message from Gemini API error
 */
export function getGeminiErrorMessage(error: unknown): string {
  if (isGeminiAPIException(error)) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown error occurred'
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!isGeminiAPIException(error)) {
    return true
  }

  const retryableCodes = [
    'TIMEOUT',
    'QUOTA_EXCEEDED',
    'API_ERROR',
    'UNKNOWN_ERROR',
  ]

  return retryableCodes.includes(error.code)
}
