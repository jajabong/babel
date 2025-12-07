import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  enableMockMode,
  disableMockMode,
  addCustomMockResponses,
} from '../../services'
import { useGeminiAPI } from '../useGeminiAPI'

// Mock the services
const mockGeminiService = {
  generateContent: vi.fn(),
  updateDefaultConfig: vi.fn(),
}

vi.mock('../../services', async () => {
  const actual = await vi.importActual('../../services')
  return {
    ...actual,
    geminiAPIService: mockGeminiService,
    mockGeminiAPIService: mockGeminiService,
    isMockModeEnabled: () => true,
  }
})

describe('useGeminiAPI', () => {
  const mockApiKey = 'test-api-key'
  const mockPrompt = 'Test prompt'
  const mockResponse = 'Test response'

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    enableMockMode()
    mockGeminiService.generateContent.mockResolvedValue({
      text: mockResponse,
      usage: {
        promptTokens: 10,
        candidatesTokens: 20,
        totalTokens: 30,
      },
    })
  })

  afterEach(() => {
    disableMockMode()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useGeminiAPI())

    expect(result.current.state).toEqual({
      loading: false,
      error: null,
      response: null,
    })
  })

  it('should initialize with default config', () => {
    const { result } = renderHook(() =>
      useGeminiAPI({ apiKey: mockApiKey, temperature: 0.5 })
    )

    expect(typeof result.current.generateContent).toBe('function')
    expect(typeof result.current.reset).toBe('function')
  })

  it('should return error when API key is missing', async () => {
    const { result } = renderHook(() => useGeminiAPI())

    await act(async () => {
      const response = await result.current.generateContent(mockPrompt)
      expect(response).toBeNull()
    })

    expect(result.current.state.loading).toBe(false)
    expect(result.current.state.error).toBe('API key is required')
  })

  it('should handle successful API call', async () => {
    const { result } = renderHook(() => useGeminiAPI({ apiKey: mockApiKey }))

    await act(async () => {
      const response = await result.current.generateContent(mockPrompt)
      expect(response).toBe(mockResponse)
    })

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false)
      expect(result.current.state.response).toBe(mockResponse)
      expect(result.current.state.error).toBeNull()
    })

    expect(mockGeminiService.generateContent).toHaveBeenCalledWith({
      prompt: mockPrompt,
      config: {
        apiKey: mockApiKey,
        model: 'gemini-2.5-flash',
        temperature: 0.7,
      },
    })
  })

  it('should handle API error', async () => {
    const mockError = new Error('API Error')
    mockGeminiService.generateContent.mockRejectedValue(mockError)

    const { result } = renderHook(() => useGeminiAPI({ apiKey: mockApiKey }))

    await act(async () => {
      const response = await result.current.generateContent(mockPrompt)
      expect(response).toBeNull()
    })

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false)
      expect(result.current.state.error).toBe('API Error')
      expect(result.current.state.response).toBeNull()
    })
  })

  it('should use custom config parameters', async () => {
    const customConfig = {
      model: 'custom-model',
      temperature: 0.5,
      systemInstruction: 'Custom instruction',
    }

    const { result } = renderHook(() => useGeminiAPI({ apiKey: mockApiKey }))

    await act(async () => {
      await result.current.generateContent(mockPrompt, customConfig)
    })

    expect(mockGeminiService.generateContent).toHaveBeenCalledWith({
      prompt: mockPrompt,
      config: {
        apiKey: mockApiKey,
        model: 'custom-model',
        temperature: 0.5,
        systemInstruction: 'Custom instruction',
      },
    })
  })

  it('should reset state correctly', () => {
    const { result } = renderHook(() => useGeminiAPI({ apiKey: mockApiKey }))

    // Simulate some state
    act(() => {
      // We can't directly set state, but we can test reset functionality
      result.current.reset()
    })

    expect(result.current.state).toEqual({
      loading: false,
      error: null,
      response: null,
    })
  })

  it('should handle unknown errors gracefully', async () => {
    mockGeminiService.generateContent.mockRejectedValue('Unknown error')

    const { result } = renderHook(() => useGeminiAPI({ apiKey: mockApiKey }))

    await act(async () => {
      const response = await result.current.generateContent(mockPrompt)
      expect(response).toBeNull()
    })

    expect(result.current.state.error).toBe('Unknown error occurred')
  })

  it('should update service default config when hook config changes', () => {
    const { rerender } = renderHook(({ config }) => useGeminiAPI(config), {
      initialProps: { config: { apiKey: mockApiKey } },
    })

    expect(mockGeminiService.updateDefaultConfig).toHaveBeenCalledWith({
      apiKey: mockApiKey,
    })

    rerender({ config: { apiKey: 'new-key', temperature: 0.5 } })

    expect(mockGeminiService.updateDefaultConfig).toHaveBeenCalledWith({
      apiKey: 'new-key',
      temperature: 0.5,
    })
  })
})
