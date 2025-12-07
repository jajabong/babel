# Mock Services Demonstration

## Overview

This document demonstrates how the mock services work and how they enable reliable testing without real API dependencies.

## Mock Service Configuration

### Basic Mock Mode Enablement

```typescript
import { enableMockMode, disableMockMode, isMockModeEnabled } from '../services'

// Enable mock mode for testing
enableMockMode({
  delay: 100,        // Simulate network latency
  errorRate: 0.1,    // 10% chance of errors
  customResponses: {
    '/custom-endpoint': { custom: 'response' }
  }
})

console.log(isMockModeEnabled()) // true

// Disable mock mode
disableMockMode()
```

### Mock Service Selection

The mock services automatically detect when they should be used:

```typescript
// In hooks - automatic selection based on environment
const service = isMockModeEnabled() ? mockGeminiAPIService : geminiAPIService

// In tests - mocked to always return true
vi.mock('../../services', () => ({
  ...actual,
  isMockModeEnabled: () => true,
  mockGeminiAPIService: mockGeminiService
}))
```

## Gemini API Mock Demonstrations

### Content Generation Based on Prompt Type

```typescript
// Mock service responds differently based on prompt content
const mockService = new MockGeminiAPIService()

// Coding prompt returns coding-optimized template
const codingResponse = await mockService.generateContent({
  prompt: 'create a function in Python',
  config: { apiKey: 'test-key' }
})

console.log(codingResponse.text)
// Output:
// **Expert Persona**: Act as a Senior Software Developer with 15+ years of experience...
// **Tech Stack**: Python 3.9+, specific libraries...
// **Requirements**: Functional and non-functional requirements...
// **Code Quality**: Request comments, error handling, typing...
```

### Creative Prompt Handling

```typescript
const creativeResponse = await mockService.generateContent({
  prompt: 'write a short story about magic',
  config: { apiKey: 'test-key' }
})

console.log(creativeResponse.text)
// Output:
// **Tone & Style**: Evocative, immersive, and literary...
// **Audience**: Readers of contemporary literary fiction...
// **Genre/Format**: Short story with narrative depth...
```

### Streaming Response Simulation

```typescript
// Mock streaming generates content word by word
const stream = mockService.generateContentStream({
  prompt: 'explain quantum computing',
  config: { apiKey: 'test-key' }
})

const chunks: string[] = []
for await (const chunk of stream) {
  chunks.push(chunk)
  console.log(`Received chunk: "${chunk}"`)
}

// Output:
// Received chunk: "This"
// Received chunk: " is"
// Received chunk: " a"
// Received chunk: " mock"
// Received chunk: " response"
// Received chunk: " from"
// Received chunk: " the"
// Received chunk: " Gemini"
// Received chunk: " API."
```

## Prompt Optimization Mock Demonstrations

### Mode-Specific Optimization

```typescript
const mockPromptService = new MockPromptOptimizationService()

// General optimization
const generalResponse = await mockPromptService.optimizePrompt({
  userInput: 'write a blog post',
  mode: 'GENERAL'
})

console.log(generalResponse.optimizedPrompt)
// Output:
// **Persona/Role**: Act as a world-class expert in prompt engineering.
// **Context**: The user is seeking assistance with optimizing their communication...
// **Task**: Analyze the user's request and provide a comprehensive, structured prompt...

// Coding optimization
const codingResponse = await mockPromptService.optimizePrompt({
  userInput: 'create a sorting function',
  mode: 'CODING'
})

console.log(codingResponse.optimizedPrompt)
// Output:
// **Expert Persona**: Act as a Senior Software Developer with 15+ years of experience...
// **Tech Stack**: Specific languages, libraries, and versions...
```

### Prompt Validation

```typescript
// Good prompt validation
const goodPromptValidation = await mockPromptService.validatePrompt(
  'Create a detailed API endpoint with authentication, error handling, and comprehensive documentation.',
  ['clarity', 'specificity', 'completeness']
)

console.log(goodPromptValidation)
// Output:
// {
//   isValid: true,
//   score: 85,
//   issues: [],
//   suggestions: ['Consider adding more specific constraints'],
//   improvedPrompt: undefined
// }

// Poor prompt validation
const poorPromptValidation = await mockPromptService.validatePrompt(
  'write code',
  ['clarity', 'specificity']
)

console.log(poorPromptValidation)
// Output:
// {
//   isValid: false,
//   score: 45,
//   issues: ['Prompt is too vague', 'Missing output format specification'],
//   suggestions: [
//     'Add specific context and requirements',
//     'Define desired output format clearly',
//     'Include persona or role specification'
//   ],
//   improvedPrompt: 'Improved version of: write code'
// }
```

### Variation Generation

```typescript
const variations = await mockPromptService.generatePromptVariations(
  'Create a user authentication system',
  3,
  'CODING'
)

console.log(variations)
// Output:
// [
//   '1. Variation for "Create a user authentication system..." Alternative approach: Focus on practical implementation steps and real-world examples.',
//   '2. Variation for "Create a user authentication system..." Alternative approach: Emphasize theoretical framework and conceptual understanding.',
//   '3. Variation for "Create a user authentication system..." Alternative approach: Prioritize user experience and accessibility considerations.'
// ]
```

## HTTP Client Mock Demonstrations

### Basic HTTP Operations

```typescript
const mockClient = new MockAPIClient()

// GET request
const getResponse = await mockClient.get('/api/users')
console.log(getResponse)
// Output:
// {
//   data: { mock: true },
//   success: true,
//   status: 200,
//   headers: {}
// }

// POST request with data
const postResponse = await mockClient.post('/api/users', {
  name: 'John Doe',
  email: 'john@example.com'
})

console.log(postResponse)
// Output:
// {
//   data: { name: 'John Doe', email: 'john@example.com', mock: true },
//   success: true,
//   status: 201
// }
```

### Error Simulation

```typescript
// Always error configuration
const errorClient = new MockAPIClient({ alwaysError: true })

try {
  await errorClient.get('/api/test')
} catch (error) {
  console.log(error.message)
  // Output: "Mock GET request failed"
}

// Random error rate
const randomErrorClient = new MockAPIClient({ errorRate: 0.5 })

for (let i = 0; i < 10; i++) {
  try {
    const response = await randomErrorClient.get('/api/test')
    console.log(`Request ${i}: Success`)
  } catch (error) {
    console.log(`Request ${i}: Failed - ${error.message}`)
  }
}
// Output (varies):
// Request 0: Success
// Request 1: Failed - Mock GET request failed
// Request 2: Success
// Request 3: Failed - Mock GET request failed
// ...
```

### Custom Responses

```typescript
const customClient = new MockAPIClient({
  customResponses: {
    '/api/users': [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
    '/api/error': null
  }
})

// Custom response for specific endpoint
const usersResponse = await customClient.get('/api/users')
console.log(usersResponse.data)
// Output: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]

// Error simulation
try {
  await customClient.get('/api/error')
} catch (error) {
  console.log(error.message)
  // Output: "Mock GET request failed"
}
```

## Testing Scenarios

### Component Testing with Mocks

```typescript
// Test component that uses prompt optimization
import { renderHook, act } from '@testing-library/react'
import { usePromptOptimization } from '../hooks'
import { enableMockMode } from '../services'

// Enable mock mode for testing
beforeEach(() => {
  enableMockMode({
    delay: 0,  // No delay for fast tests
    errorRate: 0  // No random errors
  })
})

test('optimizes prompt successfully', async () => {
  const { result } = renderHook(() => usePromptOptimization())

  await act(async () => {
    const optimized = await result.current.optimizePrompt(
      'write a blog post',
      'GENERAL'
    )

    expect(optimized).toContain('Persona/Role')
    expect(optimized).toContain('Context')
    expect(optimized).toContain('Task')
  })

  expect(result.current.state.loading).toBe(false)
  expect(result.current.state.error).toBeNull()
})
```

### Error Scenario Testing

```typescript
import { MockPromptOptimizationService } from '../services'

test('handles optimization errors', async () => {
  const errorService = new MockPromptOptimizationService({ alwaysError: true })

  // Mock the service to always return errors
  vi.mock('../services', () => ({
    ...actual,
    mockPromptOptimizationService: errorService,
    isMockModeEnabled: () => true
  }))

  const { result } = renderHook(() => usePromptOptimization())

  await act(async () => {
    const optimized = await result.current.optimizePrompt('test', 'GENERAL')
    expect(optimized).toBeNull()
  })

  expect(result.current.state.error).toBe('Mock prompt optimization failed')
})
```

## Performance Benefits

### Reduced Test Execution Time

```typescript
// Real API call (slow)
console.time('Real API Call')
await realGeminiService.generateContent({ prompt: 'test', config: { apiKey: 'key' } })
console.timeEnd('Real API Call')
// Output: Real API Call: 2345ms

// Mock API call (fast)
console.time('Mock API Call')
await mockGeminiService.generateContent({ prompt: 'test', config: { apiKey: 'key' } })
console.timeEnd('Mock API Call')
// Output: Mock API Call: 2ms
```

### Eliminated Network Dependencies

```typescript
// Tests work without internet connection
test('works offline', async () => {
  enableMockMode() // No internet needed

  const response = await mockGeminiService.generateContent({
    prompt: 'test prompt',
    config: { apiKey: 'test-key' }
  })

  expect(response.text).toBeDefined()
  expect(response.usage).toBeDefined()
})
```

## Configuration Examples

### Development Environment

```typescript
// vite.config.ts or similar
if (import.meta.env.DEV) {
  enableMockMode({
    delay: 100,    // Simulate realistic network delay
    errorRate: 0.05 // 5% random errors for testing resilience
  })
}
```

### CI/CD Environment

```typescript
// For automated testing
if (import.meta.env.MODE === 'test') {
  enableMockMode({
    delay: 0,      // Fast tests
    errorRate: 0,  // Predictable results
    customResponses: {
      // Specific test scenarios
      '/api/slow-response': new Promise(resolve =>
        setTimeout(() => resolve({ data: 'slow' }), 1000)
      )
    }
  })
}
```

## Conclusion

The mock services provide comprehensive testing capabilities that:

1. **Eliminate External Dependencies**: Tests run without API keys or internet access
2. **Simulate Real Behavior**: Response patterns match actual API behavior
3. **Enable Error Testing**: Configurable error scenarios for resilience testing
4. **Improve Performance**: Dramatically faster test execution
5. **Ensure Reliability**: Consistent, predictable test results

This demonstrates successful implementation of a robust mock system that enables reliable testing while maintaining realistic API behavior simulation.