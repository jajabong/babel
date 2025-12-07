/**
 * API Client Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  APIClient,
  createAPIClient,
  APIException,
  extractData,
  handleAPIError,
  isSuccessfulResponse,
} from '../api'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('APIClient', () => {
  let client: APIClient

  beforeEach(() => {
    mockFetch.mockClear()
    client = new APIClient()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const config = client.getConfig()
      expect(config.timeout).toBe(30000)
      expect(config.retryAttempts).toBe(3)
      expect(config.retryDelay).toBe(1000)
      expect(config.headers['Content-Type']).toBe('application/json')
    })

    it('should merge custom config with defaults', () => {
      const customClient = new APIClient({
        timeout: 5000,
        headers: { 'Custom-Header': 'value' },
      })

      const config = customClient.getConfig()
      expect(config.timeout).toBe(5000)
      expect(config.retryAttempts).toBe(3) // Should keep default
      expect(config.headers['Custom-Header']).toBe('value')
      expect(config.headers['Content-Type']).toBe('application/json')
    })
  })

  describe('HTTP methods', () => {
    const mockResponse = { data: 'test' }
    const mockHeaders = new Headers({
      'content-type': 'application/json',
    })

    it('should make GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        json: () => Promise.resolve(mockResponse),
      })

      const response = await client.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(response.data).toEqual(mockResponse)
      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
    })

    it('should make POST request with data', async () => {
      const postData = { name: 'test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: mockHeaders,
        json: () => Promise.resolve(mockResponse),
      })

      const response = await client.post('/test', postData)

      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
        })
      )
      expect(response.status).toBe(201)
    })

    it('should make PUT request with data', async () => {
      const putData = { id: 1, name: 'updated' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        json: () => Promise.resolve(mockResponse),
      })

      await client.put('/test/1', putData)

      expect(mockFetch).toHaveBeenCalledWith(
        '/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putData),
        })
      )
    })

    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: mockHeaders,
        json: () => Promise.resolve({}),
      })

      await client.delete('/test/1')

      expect(mockFetch).toHaveBeenCalledWith(
        '/test/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('should make PATCH request with data', async () => {
      const patchData = { name: 'patched' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        json: () => Promise.resolve(mockResponse),
      })

      await client.patch('/test/1', patchData)

      expect(mockFetch).toHaveBeenCalledWith(
        '/test/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patchData),
        })
      )
    })
  })

  describe('error handling', () => {
    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        json: () => Promise.resolve({ message: 'Resource not found' }),
      })

      await expect(client.get('/not-found')).rejects.toThrow(APIException)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(client.get('/test')).rejects.toThrow(APIException)
    })

    it('should handle timeout errors', async () => {
      const timeoutClient = new APIClient({ timeout: 100 })
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            setTimeout(
              () => reject(new DOMException('AbortError', 'AbortError')),
              200
            )
          })
      )

      await expect(timeoutClient.get('/slow')).rejects.toThrow(APIException)
    })

    it('should retry failed requests', async () => {
      const retryClient = new APIClient({ retryAttempts: 2, retryDelay: 10 })

      // Fail first attempt, succeed second
      mockFetch
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ data: 'success after retry' }),
        })

      const response = await retryClient.get('/retry-test')

      expect(response.data).toEqual({ data: 'success after retry' })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('content type handling', () => {
    it('should parse JSON responses', async () => {
      const jsonData = { message: 'JSON response' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(jsonData),
      })

      const response = await client.get('/json')
      expect(response.data).toEqual(jsonData)
    })

    it('should parse text responses', async () => {
      const textData = 'Plain text response'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve(textData),
      })

      const response = await client.get('/text')
      expect(response.data).toBe(textData)
    })
  })
})

describe('API Exception', () => {
  it('should create APIException with error details', () => {
    const error = new APIException({
      message: 'Test error',
      status: 400,
      code: 'BAD_REQUEST',
      details: { field: 'value' },
    })

    expect(error.message).toBe('Test error')
    expect(error.status).toBe(400)
    expect(error.code).toBe('BAD_REQUEST')
    expect(error.details).toEqual({ field: 'value' })
    expect(error.name).toBe('APIException')
  })
})

describe('Utility functions', () => {
  describe('isSuccessfulResponse', () => {
    it('should return true for successful response', () => {
      const response = {
        success: true,
        status: 200,
        data: 'test',
      }
      expect(isSuccessfulResponse(response)).toBe(true)
    })

    it('should return false for failed response', () => {
      const response = {
        success: false,
        status: 400,
        data: null,
      }
      expect(isSuccessfulResponse(response)).toBe(false)
    })

    it('should return false for non-2xx status codes', () => {
      const response = {
        success: true,
        status: 300,
        data: 'test',
      }
      expect(isSuccessfulResponse(response)).toBe(false)
    })
  })

  describe('extractData', () => {
    it('should extract data from successful response', () => {
      const response = {
        success: true,
        status: 200,
        data: { message: 'success' },
      }
      expect(extractData(response)).toEqual({ message: 'success' })
    })

    it('should throw error for failed response', () => {
      const response = {
        success: false,
        status: 400,
        message: 'Bad request',
      }
      expect(() => extractData(response)).toThrow('Bad request')
    })
  })

  describe('handleAPIError', () => {
    it('should return APIException as-is', () => {
      const apiError = new APIException({
        message: 'API Error',
        code: 'API_ERROR',
      })
      const result = handleAPIError(apiError)
      expect(result).toBe(apiError)
    })

    it('should wrap generic Error in APIException', () => {
      const genericError = new Error('Generic error')
      const result = handleAPIError(genericError)
      expect(result).toBeInstanceOf(APIException)
      expect(result.message).toBe('Generic error')
      expect(result.code).toBe('CLIENT_ERROR')
    })

    it('should wrap unknown errors in APIException', () => {
      const result = handleAPIError('Unknown error')
      expect(result).toBeInstanceOf(APIException)
      expect(result.message).toBe('Unknown error occurred')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })
  })
})

describe('createAPIClient', () => {
  it('should create API client with default config', () => {
    const client = createAPIClient()
    expect(client).toBeInstanceOf(APIClient)
  })

  it('should create API client with custom config', () => {
    const client = createAPIClient({ timeout: 5000 })
    const config = client.getConfig()
    expect(config.timeout).toBe(5000)
  })
})
