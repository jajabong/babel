/**
 * Services Module
 * Central export point for all service modules
 */

// API Client
export {
  APIClient,
  createAPIClient,
  apiClient,
  APIException,
  isSuccessfulResponse,
  extractData,
  handleAPIError,
  type APIConfig,
  type APIResponse,
  type APIError,
} from './api'

// Gemini API Service
export {
  GeminiAPIService,
  createGeminiAPIService,
  geminiAPIService,
  GeminiAPIException,
  isGeminiAPIException,
  getGeminiErrorMessage,
  isRetryableError,
  type GeminiAPIConfig,
  type GeminiContentRequest,
  type GeminiContentResponse,
  type GeminiServiceError,
} from './geminiAPI'

// Prompt Optimization Service
export {
  PromptOptimizationService,
  createPromptOptimizationService,
  promptOptimizationService,
  META_PROMPTS,
  isValidOptimizationMode,
  getAllOptimizationModes,
  calculatePromptQualityScore,
  type OptimizationMode,
  type MetaPrompt,
  type PromptOptimizationRequest,
  type PromptOptimizationResponse,
  type PromptValidationRequest,
  type PromptValidationResponse,
  type PromptCategory,
} from './promptAPI'

// Mock Services
export {
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
} from './mockServices'
