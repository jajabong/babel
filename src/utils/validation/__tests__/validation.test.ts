/**
 * Validation Tests
 * Tests input validation, sanitization, and security functions
 */

import { ValidationError } from '../../errors/types'
import {
  Validator,
  Sanitizer,
  Validation,
  RateLimiter,
  VALIDATION_CONSTANTS,
  createSchemaValidator,
} from '../validation'

describe('Validator', () => {
  let validator: Validator

  beforeEach(() => {
    validator = new Validator('test_context')
  })

  it('should validate required fields', () => {
    validator.required(null, 'testField')
    const result = validator.getResult()

    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('required')
    expect(result.errors[0].fieldName).toBe('testField')
  })

  it('should validate string length', () => {
    validator.length('test', 5, 10, 'testField')
    let result = validator.getResult()
    expect(result.isValid).toBe(false)

    validator.reset()
    validator.length('testing', 5, 10, 'testField')
    result = validator.getResult()
    expect(result.isValid).toBe(true)
  })

  it('should validate email format', () => {
    validator.email('invalid-email', 'email')
    let result = validator.getResult()
    expect(result.isValid).toBe(false)

    validator.reset()
    validator.email('test@example.com', 'email')
    result = validator.getResult()
    expect(result.isValid).toBe(true)
  })

  it('should validate URL format', () => {
    validator.url('invalid-url', 'url')
    let result = validator.getResult()
    expect(result.isValid).toBe(false)

    validator.reset()
    validator.url('https://example.com', 'url')
    result = validator.getResult()
    expect(result.isValid).toBe(true)
  })

  it('should validate password strength', () => {
    validator.password('weak', 'password')
    let result = validator.getResult()
    expect(result.isValid).toBe(false)

    validator.reset()
    validator.password('StrongPass123!', 'password')
    result = validator.getResult()
    expect(result.isValid).toBe(true)
  })

  it('should validate numeric values', () => {
    validator.numeric('abc', 'number')
    let result = validator.getResult()
    expect(result.isValid).toBe(false)

    validator.reset()
    validator.numeric(5, 1, 10, 'number')
    result = validator.getResult()
    expect(result.isValid).toBe(true)
  })

  it('should handle custom validation', () => {
    validator.custom(
      'test',
      value => value === 'valid',
      'Custom validation failed',
      'customField'
    )
    let result = validator.getResult()
    expect(result.isValid).toBe(false)

    validator.reset()
    validator.custom(
      'valid',
      value => value === 'valid',
      'Custom validation failed',
      'customField'
    )
    result = validator.getResult()
    expect(result.isValid).toBe(true)
  })
})

describe('Sanitizer', () => {
  describe('sanitizeHTML', () => {
    it('should escape HTML characters', () => {
      const input = '<script>alert("xss")</script>'
      const result = Sanitizer.sanitizeHTML(input)

      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    })

    it('should handle empty input', () => {
      expect(Sanitizer.sanitizeHTML('')).toBe('')
      expect(Sanitizer.sanitizeHTML(null as any)).toBe('')
    })

    it('should escape various HTML entities', () => {
      const input = '<div>"test" & \'more\'</div>'
      const result = Sanitizer.sanitizeHTML(input)

      expect(result).toBe(
        '&lt;div&gt;&quot;test&quot; &amp; &#x27;more&#x27;&lt;/div&gt;'
      )
    })
  })

  describe('XSS detection', () => {
    it('should detect script tags', () => {
      const input = '<script>alert("xss")</script>'
      expect(Sanitizer.containsXSS(input)).toBe(true)
    })

    it('should detect javascript: URLs', () => {
      const input = 'javascript:alert("xss")'
      expect(Sanitizer.containsXSS(input)).toBe(true)
    })

    it('should detect on* event handlers', () => {
      const input = '<img onload="alert(\'xss\')" />'
      expect(Sanitizer.containsXSS(input)).toBe(true)
    })

    it('should detect iframe tags', () => {
      const input = '<iframe src="malicious.com"></iframe>'
      expect(Sanitizer.containsXSS(input)).toBe(true)
    })

    it('should not flag safe content', () => {
      const input = 'This is safe content with no scripts'
      expect(Sanitizer.containsXSS(input)).toBe(false)
    })
  })

  describe('SQL injection detection', () => {
    it('should detect SQL injection patterns', () => {
      const inputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        'UNION SELECT * FROM passwords',
        "'; DELETE FROM users; --",
      ]

      inputs.forEach(input => {
        expect(Sanitizer.containsSQLInjection(input)).toBe(true)
      })
    })

    it('should not flag safe SQL-like content', () => {
      const input = 'The user selected all items from the table'
      expect(Sanitizer.containsSQLInjection(input)).toBe(false)
    })
  })

  describe('Malicious JavaScript detection', () => {
    it('should detect dangerous JavaScript patterns', () => {
      const inputs = [
        'eval("malicious code")',
        'setTimeout(function(){ alert("xss") })',
        'document.cookie',
        'document.write("<script>")',
      ]

      inputs.forEach(input => {
        expect(Sanitizer.containsMaliciousJS(input)).toBe(true)
      })
    })

    it('should not flag safe JavaScript references', () => {
      const input = 'The document was written yesterday'
      expect(Sanitizer.containsMaliciousJS(input)).toBe(false)
    })
  })

  describe('removeDangerousChars', () => {
    it('should remove null bytes and control characters', () => {
      const input = 'text\x00with\x08control\x1fcharacters'
      const result = Sanitizer.removeDangerousChars(input)

      expect(result).toBe('textwithcontrolcharacters')
    })

    it('should preserve normal whitespace', () => {
      const input = 'text with\nnormal\twhitespace'
      const result = Sanitizer.removeDangerousChars(input)

      expect(result).toBe(input)
    })
  })

  describe('normalizeWhitespace', () => {
    it('should normalize multiple spaces to single space', () => {
      const input = 'text    with     multiple   spaces'
      const result = Sanitizer.normalizeWhitespace(input)

      expect(result).toBe('text with multiple spaces')
    })

    it('should trim whitespace', () => {
      const input = '   text with spaces   '
      const result = Sanitizer.normalizeWhitespace(input)

      expect(result).toBe('text with spaces')
    })
  })

  describe('sanitizePromptInput', () => {
    it('should sanitize and limit prompt input', () => {
      const longInput = 'a'.repeat(VALIDATION_CONSTANTS.MAX_PROMPT_LENGTH + 100)
      const result = Sanitizer.sanitizePromptInput(longInput)

      expect(result.length).toBeLessThanOrEqual(
        VALIDATION_CONSTANTS.MAX_PROMPT_LENGTH
      )
    })

    it('should remove dangerous characters', () => {
      const input = 'text\x00with\x08control\x1fcharacters'
      const result = Sanitizer.sanitizePromptInput(input)

      expect(result).toBe('text with control characters')
    })
  })

  describe('sanitizeFilename', () => {
    it('should sanitize filenames', () => {
      const input = 'file/name with*special@chars.js'
      const result = Sanitizer.sanitizeFilename(input)

      expect(result).toBe('file_name_with_special_chars.js')
    })

    it('should handle empty input', () => {
      expect(Sanitizer.sanitizeFilename('')).toBe('')
      expect(Sanitizer.sanitizeFilename(null as any)).toBe('')
    })
  })

  describe('sanitizeForLogging', () => {
    it('should remove sensitive information', () => {
      const input = 'password=secret123&token=abc123&key=value'
      const result = Sanitizer.sanitizeForLogging(input)

      expect(result).toBe('password=***&token=***&key=***')
    })

    it('should preserve non-sensitive information', () => {
      const input = 'user=john&role=admin&page=home'
      const result = Sanitizer.sanitizeForLogging(input)

      expect(result).toBe('user=john&role=admin&page=home')
    })
  })
})

describe('Validation', () => {
  describe('validatePrompt', () => {
    it('should validate prompt input successfully', () => {
      const result = Validation.validatePrompt('This is a valid prompt')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedValue).toBe('This is a valid prompt')
    })

    it('should reject empty prompts', () => {
      const result = Validation.validatePrompt('')

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('should reject prompts with XSS', () => {
      const result = Validation.validatePrompt('<script>alert("xss")</script>')

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('dangerous'))).toBe(
        true
      )
    })

    it('should reject prompts with SQL injection', () => {
      const result = Validation.validatePrompt("'; DROP TABLE users; --")

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('suspicious'))).toBe(
        true
      )
    })

    it('should limit prompt length', () => {
      const longPrompt = 'a'.repeat(VALIDATION_CONSTANTS.MAX_PROMPT_LENGTH + 1)
      const result = Validation.validatePrompt(longPrompt)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('no more than'))).toBe(
        true
      )
    })
  })

  describe('validateEmail', () => {
    it('should validate email successfully', () => {
      const result = Validation.validateEmail('test@example.com')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        '',
      ]

      invalidEmails.forEach(email => {
        const result = Validation.validateEmail(email)
        expect(result.isValid).toBe(false)
      })
    })
  })

  describe('validateUsername', () => {
    it('should validate username successfully', () => {
      const result = Validation.validateUsername('valid_user123')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject usernames with special characters', () => {
      const result = Validation.validateUsername('invalid@user')

      expect(result.isValid).toBe(false)
      expect(
        result.errors.some(e => e.message.includes('letters, numbers'))
      ).toBe(true)
    })

    it('should enforce length limits', () => {
      const shortResult = Validation.validateUsername('ab')
      const longResult = Validation.validateUsername('a'.repeat(51))

      expect(shortResult.isValid).toBe(false)
      expect(longResult.isValid).toBe(false)
    })
  })

  describe('validatePassword', () => {
    it('should validate strong password successfully', () => {
      const result = Validation.validatePassword('StrongPass123!')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should require password complexity', () => {
      const weakPasswords = [
        'weak', // too short, no complexity
        'weakpassword', // no numbers, no uppercase, no special chars
        'WEAKPASSWORD', // no numbers, no lowercase, no special chars
        '12345678', // no letters, no special chars
        'password123', // no uppercase, no special chars
      ]

      weakPasswords.forEach(password => {
        const result = Validation.validatePassword(password)
        expect(result.isValid).toBe(false)
      })
    })
  })

  describe('validateMessage', () => {
    it('should validate message successfully', () => {
      const result = Validation.validateMessage('This is a valid message')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject messages with XSS', () => {
      const result = Validation.validateMessage('<script>alert("xss")</script>')

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('dangerous'))).toBe(
        true
      )
    })
  })

  describe('validateSettings', () => {
    it('should validate valid settings', () => {
      const settings = {
        temperature: 0.7,
        outputFormat: 'markdown',
        apiKey: 'valid_key_123',
      }

      const result = Validation.validateSettings(settings)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid temperature', () => {
      const settings = {
        temperature: 3.0, // too high
        outputFormat: 'markdown',
      }

      const result = Validation.validateSettings(settings)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.fieldName === 'temperature')).toBe(true)
    })

    it('should reject invalid output format', () => {
      const settings = {
        temperature: 0.7,
        outputFormat: 'invalid_format',
      }

      const result = Validation.validateSettings(settings)

      expect(result.isValid).toBe(false)
      expect(
        result.errors.some(e => e.message.includes('Invalid output format'))
      ).toBe(true)
    })
  })

  describe('validateFile', () => {
    it('should validate valid file successfully', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const result = Validation.validateFile(file, ['text/plain'])

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject oversized files', () => {
      const largeContent = 'a'.repeat(
        VALIDATION_CONSTANTS.MAX_FILE_SIZE_BYTES + 1
      )
      const file = new File([largeContent], 'large.txt', { type: 'text/plain' })
      const result = Validation.validateFile(file)

      expect(result.isValid).toBe(false)
      expect(
        result.errors.some(e => e.message.includes('File size exceeds'))
      ).toBe(true)
    })

    it('should reject disallowed file types', () => {
      const file = new File(['content'], 'test.exe', {
        type: 'application/octet-stream',
      })
      const result = Validation.validateFile(file, ['text/plain', 'image/jpeg'])

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('File type'))).toBe(
        true
      )
    })
  })
})

describe('RateLimiter', () => {
  beforeEach(() => {
    RateLimiter.clearAll()
  })

  it('should allow requests within limit', () => {
    const identifier = 'test_user'

    for (let i = 0; i < 5; i++) {
      const result = RateLimiter.isAllowed(identifier, 60000, 10)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(10 - i - 1)
    }
  })

  it('should block requests when limit exceeded', () => {
    const identifier = 'test_user'

    // Use up the limit
    for (let i = 0; i < 10; i++) {
      RateLimiter.isAllowed(identifier, 60000, 10)
    }

    // Next request should be blocked
    const result = RateLimiter.isAllowed(identifier, 60000, 10)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('should reset after window expires', async () => {
    const identifier = 'test_user'

    // Use up the limit
    for (let i = 0; i < 10; i++) {
      RateLimiter.isAllowed(identifier, 100, 10) // 100ms window
    }

    // Should be blocked
    let result = RateLimiter.isAllowed(identifier, 100, 10)
    expect(result.allowed).toBe(false)

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150))

    // Should be allowed again
    result = RateLimiter.isAllowed(identifier, 100, 10)
    expect(result.allowed).toBe(true)
  })

  it('should handle multiple identifiers independently', () => {
    const user1 = 'user1'
    const user2 = 'user2'

    // User1 uses up their limit
    for (let i = 0; i < 10; i++) {
      RateLimiter.isAllowed(user1, 60000, 10)
    }

    // User1 should be blocked
    const user1Result = RateLimiter.isAllowed(user1, 60000, 10)
    expect(user1Result.allowed).toBe(false)

    // User2 should still be allowed
    const user2Result = RateLimiter.isAllowed(user2, 60000, 10)
    expect(user2Result.allowed).toBe(true)
  })
})

describe('createSchemaValidator', () => {
  it('should validate data against schema', () => {
    const schema = {
      email: [
        {
          name: 'email',
          validator: (value: unknown) => /\S+@\S+\.\S+/.test(String(value)),
          message: 'Invalid email format',
          severity: 'error' as const,
        },
      ],
      age: [
        {
          name: 'age',
          validator: (value: unknown) => {
            const num = Number(value)
            return !isNaN(num) && num >= 18 && num <= 120
          },
          message: 'Age must be between 18 and 120',
          severity: 'error' as const,
        },
      ],
    }

    const validate = createSchemaValidator(schema)

    // Valid data
    let result = validate({ email: 'test@example.com', age: 25 })
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)

    // Invalid data
    result = validate({ email: 'invalid', age: 15 })
    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveLength(2)
  })

  it('should handle warnings', () => {
    const schema = {
      password: [
        {
          name: 'password_strength',
          validator: (value: unknown) => String(value).length >= 8,
          message: 'Password should be at least 8 characters',
          severity: 'warning' as const,
        },
      ],
    }

    const validate = createSchemaValidator(schema)
    const result = validate({ password: 'weak' })

    expect(result.isValid).toBe(true) // Warnings don't make it invalid
    expect(result.warnings).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
  })
})
