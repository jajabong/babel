/**
 * API Configuration and HTTP Client Setup
 * Provides centralized configuration for all API services
 */

// API Configuration Types
export interface APIConfig {
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>
  retryAttempts?: number
  retryDelay?: number
}

export interface APIResponse<T> {
  data: T
  success: boolean
  message?: string
  status: number
  headers?: Record<string, string>
}

export interface APIError {
  message: string
  status?: number
  code?: string
  details?: unknown
}

// Default Configuration
const DEFAULT_CONFIG: Required<APIConfig> = {
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  retryAttempts: 3,
  retryDelay: 1000,
}

// Environment Detection
const isDevelopment = import.meta.env.DEV
const isTest = import.meta.env.MODE === 'test'

/**
 * Custom API Error Class
 */
export class APIException extends Error {
  public readonly status?: number
  public readonly code?: string
  public readonly details?: unknown

  constructor(error: APIError) {
    super(error.message)
    this.name = 'APIException'
    this.status = error.status
    this.code = error.code
    this.details = error.details
  }
}

/**
 * HTTP Client Class
 * Provides centralized API communication with error handling and retry logic
 */
export class APIClient {
  private config: Required<APIConfig>

  constructor(config: Partial<APIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Generic HTTP request method with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    attempt: number = 1
  ): Promise<APIResponse<T>> {
    const url = `${this.config.baseURL}${endpoint}`

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...this.config.headers,
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.config.timeout),
    }

    try {
      const response = await fetch(url, requestOptions)

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response)
        throw new APIException({
          message:
            errorData.message ||
            `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          code: errorData.code,
          details: errorData.details,
        })
      }

      // Parse successful response
      let data: T
      const contentType = response.headers.get('content-type')

      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        data = (await response.text()) as unknown as T
      }

      return {
        data,
        success: true,
        status: response.status,
        headers: this.responseHeadersToObject(response.headers),
      }
    } catch (error) {
      // Handle retry logic
      if (attempt < this.config.retryAttempts && this.shouldRetry(error)) {
        await this.delay(this.config.retryDelay * attempt)
        return this.makeRequest<T>(endpoint, options, attempt + 1)
      }

      // Handle different error types
      if (error instanceof APIException) {
        throw error
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new APIException({
          message: 'Request timeout',
          status: 408,
          code: 'TIMEOUT',
        })
      }

      throw new APIException({
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
      })
    }
  }

  /**
   * Parse error response from API
   */
  private async parseErrorResponse(
    response: Response
  ): Promise<Partial<APIError>> {
    try {
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        return await response.json()
      }
      return { message: await response.text() }
    } catch {
      return { message: `HTTP ${response.status}: ${response.statusText}` }
    }
  }

  /**
   * Convert Headers object to plain object
   */
  private responseHeadersToObject(headers: Headers): Record<string, string> {
    const obj: Record<string, string> = {}
    headers.forEach((value, key) => {
      obj[key] = value
    })
    return obj
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: unknown): boolean {
    if (error instanceof APIException) {
      // Retry on server errors and some client errors
      return (
        error.status === undefined ||
        error.status >= 500 ||
        error.status === 408 ||
        error.status === 429
      )
    }
    return true
  }

  /**
   * Delay function for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * GET request
   */
  async get<T>(
    endpoint: string,
    options: Omit<RequestInit, 'method' | 'body'> = {}
  ): Promise<APIResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    options: Omit<RequestInit, 'method' | 'body'> = {}
  ): Promise<APIResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    options: Omit<RequestInit, 'method' | 'body'> = {}
  ): Promise<APIResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    options: Omit<RequestInit, 'method'> = {}
  ): Promise<APIResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' })
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: unknown,
    options: Omit<RequestInit, 'method' | 'body'> = {}
  ): Promise<APIResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * Update client configuration
   */
  updateConfig(newConfig: Partial<APIConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<APIConfig> {
    return { ...this.config }
  }
}

/**
 * Create API client instance with environment-specific configuration
 */
export function createAPIClient(config?: Partial<APIConfig>): APIClient {
  const envConfig: Partial<APIConfig> = {}

  if (isDevelopment) {
    envConfig.timeout = 60000 // Longer timeout for development
  }

  if (isTest) {
    envConfig.retryAttempts = 1 // Disable retries for tests
    envConfig.timeout = 5000 // Shorter timeout for tests
  }

  return new APIClient({ ...envConfig, ...config })
}

/**
 * Default API client instance
 */
export const apiClient = createAPIClient()

/**
 * Utility functions for common API operations
 */

/**
 * Check if response is successful
 */
export function isSuccessfulResponse<T>(response: APIResponse<T>): boolean {
  return response.success && response.status >= 200 && response.status < 300
}

/**
 * Extract data from successful response or throw error
 */
export function extractData<T>(response: APIResponse<T>): T {
  if (!isSuccessfulResponse(response)) {
    throw new APIException({
      message: response.message || 'Request failed',
      status: response.status,
    })
  }
  return response.data
}

/**
 * Handle API errors consistently
 */
export function handleAPIError(error: unknown): APIException {
  if (error instanceof APIException) {
    return error
  }

  if (error instanceof Error) {
    return new APIException({
      message: error.message,
      code: 'CLIENT_ERROR',
    })
  }

  return new APIException({
    message: 'Unknown error occurred',
    code: 'UNKNOWN_ERROR',
  })
}
