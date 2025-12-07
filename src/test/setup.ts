import '@testing-library/jest-dom'

// Mock environment variables
process.env.API_KEY = 'test-api-key'
process.env.GEMINI_API_KEY = 'test-gemini-key'

// Mock GoogleGenAI to avoid actual API calls during tests
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => 'Mocked AI response',
        },
      }),
    }),
  })),
}))

// Mock clipboard API - Use Object.defineProperty with configurable: true to allow userEvent to override
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
  configurable: true,
})

// Global test utilities
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
