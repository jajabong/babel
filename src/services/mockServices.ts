/**
 * Mock Services for Testing and Development
 * Provides mock implementations of API services for testing without real API calls
 */

import type { APIConfig, APIResponse } from './api'
import type {
  GeminiContentRequest,
  GeminiContentResponse,
  GeminiAPIConfig,
} from './geminiAPI'
import type {
  OptimizationMode,
  PromptOptimizationRequest,
  PromptOptimizationResponse,
  PromptValidationRequest,
  PromptValidationResponse,
} from './promptAPI'
import { META_PROMPTS } from './promptAPI'

// Mock Configuration Types
export interface MockConfig {
  delay?: number
  errorRate?: number
  alwaysError?: boolean
  customResponses?: Record<string, any>
}

// Mock Response Templates
const MOCK_GEMINI_RESPONSES: Record<string, Partial<GeminiContentResponse>> = {
  default: {
    text: 'This is a mock response from the Gemini API.',
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
  },
  general_prompt: {
    text: `**Persona/Role**: Act as a world-class expert in prompt engineering.

**Context**: The user is seeking assistance with optimizing their communication with Large Language Models to achieve better results.

**Task**: Analyze the user's request and provide a comprehensive, structured prompt that will elicit the desired response from an LLM.

**Constraints**:
- Keep the response under 500 words
- Use clear, actionable language
- Include specific examples where relevant
- Avoid ambiguity

**Output Format**:
- Use Markdown formatting
- Include clear section headers
- Provide step-by-step instructions`,
  },
  coding_prompt: {
    text: `**Expert Persona**: Act as a Senior Software Developer with 15+ years of experience in modern web development, specializing in React, TypeScript, and best practices.

**Tech Stack**:
- Frontend: React 18+, TypeScript, Tailwind CSS
- Backend: Node.js, Express, PostgreSQL
- Testing: Jest, React Testing Library
- Tools: Webpack, ESLint, Prettier

**Requirements**:
- Provide a complete, production-ready solution
- Include comprehensive error handling
- Add TypeScript types for all functions
- Follow SOLID principles and DRY methodology
- Include unit tests with >80% coverage
- Document complex business logic

**Code Quality Requirements**:
- Use meaningful variable and function names
- Add JSDoc comments for all public methods
- Implement proper TypeScript interfaces
- Handle edge cases and error scenarios
- Use async/await for asynchronous operations

**Test Cases Required**:
- Unit tests for all business logic
- Integration tests for API endpoints
- Component tests for React components
- Performance tests for critical paths
- Accessibility tests for UI components

**Output Format**:
- Provide complete code files with proper imports
- Include configuration files (package.json, tsconfig.json)
- Add setup instructions in README.md
- Format code with Prettier and ESLint rules
- Include type definitions in separate .d.ts files`,
  },
  creative_prompt: {
    text: `**Tone & Style**: Evocative, immersive, and literary. Use vivid sensory details and emotional depth. Write in a style reminiscent of magical realism with poetic undertones.

**Audience**: Readers of contemporary literary fiction who appreciate nuanced character development and atmospheric storytelling.

**Genre/Format**: Short story with narrative depth, approximately 1500-2000 words.

**Key Elements**:
- Central theme of transformation and self-discovery
- Use of symbolism and metaphor throughout
- Rich sensory descriptions of setting
- Internal monologue revealing character psychology
- Unexpected but organic plot development

**Constraints**:
- Present tense narrative voice
- Limited third-person perspective
- Each scene must advance plot or develop character
- Include at least three distinct sensory experiences
- End with a resonant, thought-provoking conclusion

**Atmosphere**: Dreamlike yet grounded in emotional reality. Balance the fantastical with the deeply human.

**Output Format**:
- Standard manuscript formatting
- Paragraph breaks for pacing
- Dialogue properly attributed
- Include brief author's note explaining creative choices`,
  },
  business_prompt: {
    text: `**Business Context**: Technology startup in SaaS industry, Series A funding stage, 50-100 employees, B2B market focus.

**Business Objective**: Develop comprehensive market entry strategy for new product line targeting enterprise customers in the healthcare technology sector.

**Analysis Framework Required**:
- **SWOT Analysis**: Internal capabilities and external market factors
- **PESTLE Analysis**: Political, Economic, Social, Technological, Legal, Environmental factors
- **Porter's Five Forces**: Competitive landscape analysis
- **Market Sizing**: TAM, SAM, SOM calculations
- **Competitive Analysis**: Direct and indirect competitor mapping
- **Go-to-Market Strategy**: Channel selection and partnership opportunities

**Deliverables**:
- Executive summary (1-page)
- Detailed market analysis report (15-20 pages)
- Financial projections (3-year forecast)
- Risk assessment and mitigation strategies
- Implementation timeline with key milestones
- Resource allocation recommendations

**Key Success Metrics**:
- Market penetration rate (target: 15% in 24 months)
- Customer acquisition cost (CAC) and lifetime value (LTV) ratios
- Revenue growth projections (quarterly tracking)
- Customer satisfaction scores (NPS > 70)
- Competitive market share analysis

**Constraints & Considerations**:
- Healthcare industry compliance requirements (HIPAA, FDA)
- Limited initial marketing budget ($500K)
- Need for strategic partnerships with established players
- Integration requirements with existing healthcare systems
- Data security and privacy considerations`,
  },
}

const MOCK_PROMPT_VARIATIONS: Record<string, string[]> = {
  default: [
    'Alternative approach: Focus on practical implementation steps and real-world examples.',
    'Alternative approach: Emphasize theoretical framework and conceptual understanding.',
    'Alternative approach: Prioritize user experience and accessibility considerations.',
  ],
}

const MOCK_VALIDATION_RESPONSES: Record<string, PromptValidationResponse> = {
  good_prompt: {
    isValid: true,
    score: 85,
    issues: [],
    suggestions: ['Consider adding more specific constraints'],
  },
  needs_improvement: {
    isValid: false,
    score: 45,
    issues: ['Prompt is too vague', 'Missing output format specification'],
    suggestions: [
      'Add specific context and requirements',
      'Define desired output format clearly',
      'Include persona or role specification',
    ],
    improvedPrompt: 'Improved prompt with better structure and clarity',
  },
}

/**
 * Mock API Client
 */
export class MockAPIClient {
  private config: MockConfig

  constructor(config: MockConfig = {}) {
    this.config = {
      delay: 100,
      errorRate: 0,
      alwaysError: false,
      customResponses: {},
      ...config,
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private shouldError(): boolean {
    return (
      this.config.alwaysError || Math.random() < (this.config.errorRate || 0)
    )
  }

  private getMockResponse(key: string, fallback: any): any {
    return this.config.customResponses?.[key] || fallback
  }

  async get<T>(endpoint: string): Promise<APIResponse<T>> {
    await this.delay(this.config.delay || 0)

    if (this.shouldError()) {
      throw new Error('Mock GET request failed')
    }

    const data = this.getMockResponse(endpoint, { mock: true })
    return {
      data,
      success: true,
      status: 200,
    }
  }

  async post<T>(endpoint: string, data?: unknown): Promise<APIResponse<T>> {
    await this.delay(this.config.delay || 0)

    if (this.shouldError()) {
      throw new Error('Mock POST request failed')
    }

    const responseData = this.getMockResponse(endpoint, { ...data, mock: true })
    return {
      data: responseData,
      success: true,
      status: 201,
    }
  }

  async put<T>(endpoint: string, data?: unknown): Promise<APIResponse<T>> {
    await this.delay(this.config.delay || 0)

    if (this.shouldError()) {
      throw new Error('Mock PUT request failed')
    }

    const responseData = this.getMockResponse(endpoint, {
      ...data,
      mock: true,
      updated: true,
    })
    return {
      data: responseData,
      success: true,
      status: 200,
    }
  }

  async delete<T>(endpoint: string): Promise<APIResponse<T>> {
    await this.delay(this.config.delay || 0)

    if (this.shouldError()) {
      throw new Error('Mock DELETE request failed')
    }

    return {
      data: { deleted: true } as T,
      success: true,
      status: 204,
    }
  }
}

/**
 * Mock Gemini API Service
 */
export class MockGeminiAPIService {
  private config: MockConfig

  constructor(config: MockConfig = {}) {
    this.config = {
      delay: 200,
      errorRate: 0,
      alwaysError: false,
      customResponses: {},
      ...config,
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private shouldError(): boolean {
    return (
      this.config.alwaysError || Math.random() < (this.config.errorRate || 0)
    )
  }

  private selectMockResponse(prompt: string): Partial<GeminiContentResponse> {
    // Check for specific prompt patterns
    const lowerPrompt = prompt.toLowerCase()

    if (lowerPrompt.includes('coding') || lowerPrompt.includes('code')) {
      return MOCK_GEMINI_RESPONSES.coding_prompt
    }

    if (
      lowerPrompt.includes('creative') ||
      lowerPrompt.includes('story') ||
      lowerPrompt.includes('write')
    ) {
      return MOCK_GEMINI_RESPONSES.creative_prompt
    }

    if (
      lowerPrompt.includes('business') ||
      lowerPrompt.includes('strategy') ||
      lowerPrompt.includes('market')
    ) {
      return MOCK_GEMINI_RESPONSES.business_prompt
    }

    return MOCK_GEMINI_RESPONSES.general_prompt
  }

  async generateContent(
    request: GeminiContentRequest
  ): Promise<GeminiContentResponse> {
    await this.delay(this.config.delay || 0)

    if (this.shouldError()) {
      throw new Error('Mock Gemini API call failed')
    }

    const mockResponse = this.selectMockResponse(request.prompt)

    return {
      text: mockResponse.text || MOCK_GEMINI_RESPONSES.default.text!,
      usage: mockResponse.usage || MOCK_GEMINI_RESPONSES.default.usage!,
      finishReason:
        mockResponse.finishReason ||
        MOCK_GEMINI_RESPONSES.default.finishReason!,
      safetyRatings:
        mockResponse.safetyRatings ||
        MOCK_GEMINI_RESPONSES.default.safetyRatings!,
    }
  }

  async *generateContentStream(
    request: GeminiContentRequest
  ): AsyncGenerator<string, void, unknown> {
    await this.delay(this.config.delay || 0)

    if (this.shouldError()) {
      throw new Error('Mock Gemini streaming failed')
    }

    const mockResponse = this.selectMockResponse(request.prompt)
    const text = mockResponse.text || MOCK_GEMINI_RESPONSES.default.text!
    const words = text.split(' ')

    // Stream word by word for realistic effect
    for (let i = 0; i < words.length; i++) {
      await this.delay(50) // Short delay between words
      yield words[i] + (i < words.length - 1 ? ' ' : '')
    }
  }

  async validateAPIKey(apiKey: string): Promise<boolean> {
    await this.delay(this.config.delay || 0)

    if (this.shouldError()) {
      return false
    }

    // Mock validation - accept non-empty strings
    return apiKey.length > 0
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    await this.delay(this.config.delay || 0)

    if (this.shouldError()) {
      throw new Error('Failed to fetch models')
    }

    return [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ]
  }

  updateDefaultConfig(): void {
    // Mock implementation - no-op
  }

  getDefaultConfig(): Partial<GeminiAPIConfig> {
    return {}
  }
}

/**
 * Mock Prompt Optimization Service
 */
export class MockPromptOptimizationService {
  private config: MockConfig

  constructor(config: MockConfig = {}) {
    this.config = {
      delay: 300,
      errorRate: 0,
      alwaysError: false,
      ...config,
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private shouldError(): boolean {
    return (
      this.config.alwaysError || Math.random() < (this.config.errorRate || 0)
    )
  }

  async optimizePrompt(
    request: PromptOptimizationRequest
  ): Promise<PromptOptimizationResponse> {
    await this.delay(this.config.delay || 0)

    if (this.shouldError()) {
      throw new Error('Mock prompt optimization failed')
    }

    const { userInput, mode } = request
    const metaPrompt = META_PROMPTS[mode]

    // Select appropriate mock response based on mode
    let optimizedText: string
    switch (mode) {
      case 'CODING':
        optimizedText = MOCK_GEMINI_RESPONSES.coding_prompt.text!
        break
      case 'CREATIVE':
        optimizedText = MOCK_GEMINI_RESPONSES.creative_prompt.text!
        break
      case 'BUSINESS':
        optimizedText = MOCK_GEMINI_RESPONSES.business_prompt.text!
        break
      default:
        optimizedText = MOCK_GEMINI_RESPONSES.general_prompt.text!
    }

    return {
      optimizedPrompt: optimizedText,
      mode,
      metadata: {
        originalLength: userInput.length,
        optimizedLength: optimizedText.length,
        tokens: Math.floor(optimizedText.length / 4), // Rough estimate
      },
    }
  }

  async generatePromptVariations(
    basePrompt: string,
    count: number = 3,
    mode: OptimizationMode = 'GENERAL'
  ): Promise<string[]> {
    await this.delay(this.config.delay || 0)

    if (this.shouldError()) {
      throw new Error('Mock prompt variation generation failed')
    }

    const variations = MOCK_PROMPT_VARIATIONS.default.slice(0, count)

    // Customize variations based on base prompt
    return variations.map(
      (variation, index) =>
        `${index + 1}. ${variation.replace('Alternative approach:', `Variation for "${basePrompt.slice(0, 50)}..."`)}`
    )
  }

  async validatePrompt(
    request: PromptValidationRequest
  ): Promise<PromptValidationResponse> {
    await this.delay(this.config.delay || 0)

    if (this.shouldError()) {
      throw new Error('Mock prompt validation failed')
    }

    const { prompt } = request

    // Simple validation logic
    if (
      prompt.length > 100 &&
      prompt.includes('specific') &&
      prompt.includes('format')
    ) {
      return MOCK_VALIDATION_RESPONSES.good_prompt
    } else {
      return {
        ...MOCK_VALIDATION_RESPONSES.needs_improvement,
        improvedPrompt: `Improved version of: ${prompt}`,
      }
    }
  }

  getAvailableModes() {
    return Object.entries(META_PROMPTS).map(([mode, metaPrompt]) => ({
      id: mode as OptimizationMode,
      name: metaPrompt.name,
      description: metaPrompt.description || '',
      examples: [],
    }))
  }

  getMetaPrompt(mode: OptimizationMode) {
    return META_PROMPTS[mode] || null
  }

  createCustomMetaPrompt(
    name: string,
    icon: string,
    instruction: string,
    description?: string
  ) {
    return { name, icon, instruction, description }
  }

  async analyzePromptMetrics(
    originalPrompt: string,
    optimizedPrompt: string,
    mode: OptimizationMode
  ) {
    await this.delay(this.config.delay || 0)

    // Calculate mock metrics
    const originalScore = originalPrompt.length
    const optimizedScore = optimizedPrompt.length
    const improvement = optimizedScore > originalScore ? 20 : -10

    return {
      improvementScore: Math.max(0, Math.min(100, 50 + improvement)),
      clarityScore: 75,
      specificityScore: 80,
      actionabilityScore: 85,
    }
  }
}

/**
 * Mock Service Factory
 */
export class MockServiceFactory {
  private static mockConfig: MockConfig = {}

  static setMockConfig(config: MockConfig): void {
    this.mockConfig = { ...this.mockConfig, ...config }
  }

  static getMockConfig(): MockConfig {
    return { ...this.mockConfig }
  }

  static createMockAPIClient(): MockAPIClient {
    return new MockAPIClient(this.mockConfig)
  }

  static createMockGeminiAPIService(): MockGeminiAPIService {
    return new MockGeminiAPIService(this.mockConfig)
  }

  static createMockPromptOptimizationService(): MockPromptOptimizationService {
    return new MockPromptOptimizationService(this.mockConfig)
  }

  static reset(): void {
    this.mockConfig = {}
  }
}

/**
 * Utility functions for testing
 */

/**
 * Enable mock mode for all services
 */
export function enableMockMode(config: MockConfig = {}): void {
  MockServiceFactory.setMockConfig(config)
}

/**
 * Disable mock mode
 */
export function disableMockMode(): void {
  MockServiceFactory.reset()
}

/**
 * Check if mock mode is enabled
 */
export function isMockModeEnabled(): boolean {
  return Object.keys(MockServiceFactory.getMockConfig()).length > 0
}

/**
 * Configure mock delays for testing
 */
export function setMockDelays(
  apiDelay: number,
  geminiDelay: number,
  promptDelay: number
): void {
  MockServiceFactory.setMockConfig({
    delay: apiDelay,
  })
}

/**
 * Configure mock error rates
 */
export function setMockErrorRates(
  errorRate: number,
  alwaysError: boolean = false
): void {
  MockServiceFactory.setMockConfig({
    errorRate,
    alwaysError,
  })
}

/**
 * Add custom mock responses
 */
export function addCustomMockResponses(responses: Record<string, any>): void {
  const currentConfig = MockServiceFactory.getMockConfig()
  MockServiceFactory.setMockConfig({
    ...currentConfig,
    customResponses: {
      ...currentConfig.customResponses,
      ...responses,
    },
  })
}

// Export default instances
export const mockAPIClient = MockServiceFactory.createMockAPIClient()
export const mockGeminiAPIService =
  MockServiceFactory.createMockGeminiAPIService()
export const mockPromptOptimizationService =
  MockServiceFactory.createMockPromptOptimizationService()
