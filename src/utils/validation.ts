/**
 * Input Validation and Sanitization Utilities
 * Provides comprehensive input validation, sanitization, and security checks
 */

import { ValidationError } from '../errors/types'

// Configuration constants
export const VALIDATION_CONSTANTS = {
  // Text input limits
  MAX_INPUT_LENGTH: 50000,
  MAX_PROMPT_LENGTH: 20000,
  MAX_USERNAME_LENGTH: 50,
  MAX_EMAIL_LENGTH: 254,
  MAX_URL_LENGTH: 2048,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,

  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 1000,

  // File limits
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,

  // Security patterns
  XSS_PATTERNS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
  ],

  SQL_INJECTION_PATTERNS: [
    /('|\;|\-\-|\s+(or|and)\s+.*(=|like))/gi,
    /(union\s+select)/gi,
    /(insert\s+into)/gi,
    /(delete\s+from)/gi,
    /(drop\s+(table|database))/gi,
    /(exec\s*\(|execute\s*\()/gi,
  ],

  MALICIOUS_PATTERNS: [
    /eval\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /Function\s*\(/gi,
    /document\.cookie/gi,
    /document\.write/gi,
    /window\.location/gi,
    /document\.domain/gi,
  ],
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
  sanitizedValue?: string
  metadata?: Record<string, unknown>
}

export interface ValidationRule {
  name: string
  validator: (value: unknown) => boolean | string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationSchema {
  [field: string]: ValidationRule[]
}

/**
 * Core Validation Class
 */
export class Validator {
  private errors: ValidationError[] = []
  private warnings: string[] = []

  constructor(private context?: string) {}

  /**
   * Add validation error
   */
  private addError(
    message: string,
    fieldName?: string,
    invalidValue?: unknown
  ): void {
    this.errors.push(
      new ValidationError(message, fieldName, invalidValue, {
        component: this.context,
        action: 'validation',
        additionalData: {
          validationContext: this.context,
        },
      })
    )
  }

  /**
   * Add warning
   */
  private addWarning(message: string): void {
    this.warnings.push(message)
  }

  /**
   * Check if value is required and present
   */
  required(value: unknown, fieldName?: string): this {
    if (value === null || value === undefined || value === '') {
      this.addError(`${fieldName || 'Field'} is required`, fieldName, value)
    }
    return this
  }

  /**
   * Check string length
   */
  length(value: string, min: number, max: number, fieldName?: string): this {
    if (typeof value !== 'string') {
      this.addError(
        `${fieldName || 'Field'} must be a string`,
        fieldName,
        value
      )
      return this
    }

    if (value.length < min) {
      this.addError(
        `${fieldName || 'Field'} must be at least ${min} characters long`,
        fieldName,
        value
      )
    }

    if (value.length > max) {
      this.addError(
        `${fieldName || 'Field'} must be no more than ${max} characters long`,
        fieldName,
        value
      )
    }

    return this
  }

  /**
   * Check if value matches pattern
   */
  pattern(
    value: string,
    regex: RegExp,
    message: string,
    fieldName?: string
  ): this {
    if (typeof value !== 'string') {
      this.addError(
        `${fieldName || 'Field'} must be a string`,
        fieldName,
        value
      )
      return this
    }

    if (!regex.test(value)) {
      this.addError(message, fieldName, value)
    }

    return this
  }

  /**
   * Validate email format
   */
  email(value: string, fieldName?: string): this {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return this.pattern(
      value,
      emailRegex,
      `${fieldName || 'Field'} must be a valid email address`,
      fieldName
    )
  }

  /**
   * Validate URL format
   */
  url(value: string, fieldName?: string): this {
    try {
      new URL(value)
    } catch {
      this.addError(
        `${fieldName || 'Field'} must be a valid URL`,
        fieldName,
        value
      )
    }
    return this
  }

  /**
   * Validate password strength
   */
  password(value: string, fieldName?: string): this {
    if (typeof value !== 'string') {
      this.addError(
        `${fieldName || 'Field'} must be a string`,
        fieldName,
        value
      )
      return this
    }

    this.length(
      value,
      VALIDATION_CONSTANTS.MIN_PASSWORD_LENGTH,
      VALIDATION_CONSTANTS.MAX_PASSWORD_LENGTH,
      fieldName
    )

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(value)) {
      this.addError(
        `${fieldName || 'Field'} must contain at least one lowercase letter`,
        fieldName,
        value
      )
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(value)) {
      this.addError(
        `${fieldName || 'Field'} must contain at least one uppercase letter`,
        fieldName,
        value
      )
    }

    // Check for at least one number
    if (!/\d/.test(value)) {
      this.addError(
        `${fieldName || 'Field'} must contain at least one number`,
        fieldName,
        value
      )
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
      this.addError(
        `${fieldName || 'Field'} must contain at least one special character`,
        fieldName,
        value
      )
    }

    return this
  }

  /**
   * Validate username format
   */
  username(value: string, fieldName?: string): this {
    this.length(value, 3, VALIDATION_CONSTANTS.MAX_USERNAME_LENGTH, fieldName)
    return this.pattern(
      value,
      /^[a-zA-Z0-9_-]+$/,
      `${fieldName || 'Field'} may only contain letters, numbers, underscores, and hyphens`,
      fieldName
    )
  }

  /**
   * Validate numeric value
   */
  numeric(
    value: unknown,
    min?: number,
    max?: number,
    fieldName?: string
  ): this {
    const num = Number(value)

    if (isNaN(num)) {
      this.addError(
        `${fieldName || 'Field'} must be a valid number`,
        fieldName,
        value
      )
      return this
    }

    if (min !== undefined && num < min) {
      this.addError(
        `${fieldName || 'Field'} must be at least ${min}`,
        fieldName,
        value
      )
    }

    if (max !== undefined && num > max) {
      this.addError(
        `${fieldName || 'Field'} must be no more than ${max}`,
        fieldName,
        value
      )
    }

    return this
  }

  /**
   * Validate against custom function
   */
  custom(
    value: unknown,
    validator: (value: unknown) => boolean | string,
    message: string,
    fieldName?: string
  ): this {
    const result = validator(value)
    if (result === false) {
      this.addError(message, fieldName, value)
    } else if (typeof result === 'string') {
      this.addError(result, fieldName, value)
    }
    return this
  }

  /**
   * Get validation result
   */
  getResult(): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
    }
  }

  /**
   * Reset validator state
   */
  reset(): void {
    this.errors = []
    this.warnings = []
  }
}

/**
 * Input Sanitization Utilities
 */
export class Sanitizer {
  /**
   * Sanitize HTML to prevent XSS
   */
  static sanitizeHTML(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }

    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  /**
   * Check for XSS patterns
   */
  static containsXSS(input: string): boolean {
    if (typeof input !== 'string') {
      return false
    }

    return VALIDATION_CONSTANTS.XSS_PATTERNS.some(pattern =>
      pattern.test(input)
    )
  }

  /**
   * Check for SQL injection patterns
   */
  static containsSQLInjection(input: string): boolean {
    if (typeof input !== 'string') {
      return false
    }

    return VALIDATION_CONSTANTS.SQL_INJECTION_PATTERNS.some(pattern =>
      pattern.test(input)
    )
  }

  /**
   * Check for malicious JavaScript patterns
   */
  static containsMaliciousJS(input: string): boolean {
    if (typeof input !== 'string') {
      return false
    }

    return VALIDATION_CONSTANTS.MALICIOUS_PATTERNS.some(pattern =>
      pattern.test(input)
    )
  }

  /**
   * Remove potentially dangerous characters
   */
  static removeDangerousChars(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }

    // Remove null bytes and control characters (except common whitespace)
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  }

  /**
   * Normalize whitespace
   */
  static normalizeWhitespace(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }

    return input.replace(/\s+/g, ' ').trim()
  }

  /**
   * Sanitize user input for prompts
   */
  static sanitizePromptInput(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }

    let sanitized = input

    // Remove dangerous characters
    sanitized = this.removeDangerousChars(sanitized)

    // Normalize whitespace
    sanitized = this.normalizeWhitespace(sanitized)

    // Limit length
    if (sanitized.length > VALIDATION_CONSTANTS.MAX_PROMPT_LENGTH) {
      sanitized = sanitized.substring(0, VALIDATION_CONSTANTS.MAX_PROMPT_LENGTH)
    }

    return sanitized
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }

    return input
      .replace(/[^a-zA-Z0-9\-_\.]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase()
  }

  /**
   * Sanitize for logging (remove sensitive data)
   */
  static sanitizeForLogging(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }

    // Remove common sensitive patterns
    return input
      .replace(/password[=:]\s*[^\s&]+/gi, 'password=***')
      .replace(/token[=:]\s*[^\s&]+/gi, 'token=***')
      .replace(/key[=:]\s*[^\s&]+/gi, 'key=***')
      .replace(/secret[=:]\s*[^\s&]+/gi, 'secret=***')
      .replace(/authorization[=:]\s*[^\s&]+/gi, 'authorization=***')
  }
}

/**
 * Validation Functions
 */
export const Validation = {
  /**
   * Validate prompt input
   */
  validatePrompt(input: string, fieldName = 'prompt'): ValidationResult {
    const validator = new Validator('prompt_validation')

    validator
      .required(input, fieldName)
      .length(input, 1, VALIDATION_CONSTANTS.MAX_PROMPT_LENGTH, fieldName)

    // Security checks
    if (Sanitizer.containsXSS(input)) {
      validator.addError(
        'Input contains potentially dangerous content',
        fieldName,
        input
      )
    }

    if (Sanitizer.containsSQLInjection(input)) {
      validator.addError('Input contains suspicious patterns', fieldName, input)
    }

    const result = validator.getResult()
    result.sanitizedValue = Sanitizer.sanitizePromptInput(input)

    return result
  },

  /**
   * Validate email
   */
  validateEmail(email: string, fieldName = 'email'): ValidationResult {
    const validator = new Validator('email_validation')

    validator
      .required(email, fieldName)
      .length(email, 5, VALIDATION_CONSTANTS.MAX_EMAIL_LENGTH, fieldName)
      .email(email, fieldName)

    return validator.getResult()
  },

  /**
   * Validate username
   */
  validateUsername(username: string, fieldName = 'username'): ValidationResult {
    const validator = new Validator('username_validation')

    validator.required(username, fieldName).username(username, fieldName)

    return validator.getResult()
  },

  /**
   * Validate password
   */
  validatePassword(password: string, fieldName = 'password'): ValidationResult {
    const validator = new Validator('password_validation')

    validator.required(password, fieldName).password(password, fieldName)

    return validator.getResult()
  },

  /**
   * Validate API key format
   */
  validateApiKey(apiKey: string, fieldName = 'apiKey'): ValidationResult {
    const validator = new Validator('api_key_validation')

    if (apiKey) {
      validator
        .length(apiKey, 10, 100, fieldName)
        .pattern(
          apiKey,
          /^[a-zA-Z0-9_-]+$/,
          'API key contains invalid characters',
          fieldName
        )
    }

    return validator.getResult()
  },

  /**
   * Validate user message/chat input
   */
  validateMessage(input: string, fieldName = 'message'): ValidationResult {
    const validator = new Validator('message_validation')

    validator
      .required(input, fieldName)
      .length(input, 1, VALIDATION_CONSTANTS.MAX_INPUT_LENGTH, fieldName)

    // Basic security checks
    if (Sanitizer.containsXSS(input)) {
      validator.addError(
        'Message contains potentially dangerous content',
        fieldName,
        input
      )
    }

    const result = validator.getResult()
    result.sanitizedValue = Sanitizer.removeDangerousChars(input)

    return result
  },

  /**
   * Validate settings configuration
   */
  validateSettings(settings: Record<string, unknown>): ValidationResult {
    const validator = new Validator('settings_validation')
    const errors: ValidationError[] = []

    // Validate temperature
    if (settings.temperature !== undefined) {
      validator.numeric(settings.temperature, 0, 2, 'temperature')
    }

    // Validate output format
    if (settings.outputFormat !== undefined) {
      const validFormats = ['markdown', 'plain', 'json']
      if (!validFormats.includes(String(settings.outputFormat))) {
        validator.addError(
          'Invalid output format',
          'outputFormat',
          settings.outputFormat
        )
      }
    }

    // Validate API key
    if (settings.apiKey !== undefined) {
      const apiKeyResult = Validation.validateApiKey(
        String(settings.apiKey),
        'apiKey'
      )
      errors.push(...apiKeyResult.errors)
    }

    const result = validator.getResult()
    result.errors.push(...errors)

    return result
  },

  /**
   * Validate file upload
   */
  validateFile(file: File, allowedTypes: string[] = []): ValidationResult {
    const validator = new Validator('file_validation')
    const errors: ValidationError[] = []

    // Check file size
    if (file.size > VALIDATION_CONSTANTS.MAX_FILE_SIZE_BYTES) {
      validator.addError(
        `File size exceeds maximum limit of ${VALIDATION_CONSTANTS.MAX_FILE_SIZE_MB}MB`,
        'file',
        file.name
      )
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      validator.addError(
        `File type ${file.type} is not allowed`,
        'file',
        file.name
      )
    }

    // Check filename
    const sanitizedName = Sanitizer.sanitizeFilename(file.name)
    if (sanitizedName !== file.name) {
      validator.addWarning('Filename was sanitized for security')
    }

    const result = validator.getResult()
    result.sanitizedValue = sanitizedName

    return result
  },
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
  private static requests: Map<string, number[]> = new Map()

  /**
   * Check if request is allowed based on rate limits
   */
  static isAllowed(
    identifier: string,
    windowMs: number = 60000,
    maxRequests: number = VALIDATION_CONSTANTS.MAX_REQUESTS_PER_MINUTE
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const windowStart = now - windowMs

    // Get existing requests for this identifier
    let requests = this.requests.get(identifier) || []

    // Remove old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart)

    // Check if under limit
    const allowed = requests.length < maxRequests
    const remaining = Math.max(0, maxRequests - requests.length)
    const resetTime =
      requests.length > 0 ? Math.max(...requests) + windowMs : now + windowMs

    // Add current request if allowed
    if (allowed) {
      requests.push(now)
      this.requests.set(identifier, requests)
    }

    return { allowed, remaining, resetTime }
  }

  /**
   * Clear rate limiter data for identifier
   */
  static clear(identifier: string): void {
    this.requests.delete(identifier)
  }

  /**
   * Clear all rate limiter data
   */
  static clearAll(): void {
    this.requests.clear()
  }
}

/**
 * Create validation schema validator
 */
export function createSchemaValidator(schema: ValidationSchema) {
  return (data: Record<string, unknown>): ValidationResult => {
    const allErrors: ValidationError[] = []
    const allWarnings: string[] = []
    const sanitizedData: Record<string, unknown> = {}

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field]
      const validator = new Validator(`schema_validation_${field}`)

      // Apply all rules for this field
      for (const rule of rules) {
        const result = rule.validator(value)
        if (result === false) {
          if (rule.severity === 'error') {
            validator.addError(rule.message, field, value)
          } else {
            validator.addWarning(rule.message)
          }
        } else if (typeof result === 'string') {
          if (rule.severity === 'error') {
            validator.addError(result, field, value)
          } else {
            validator.addWarning(result)
          }
        }
      }

      const fieldResult = validator.getResult()
      allErrors.push(...fieldResult.errors)
      allWarnings.push(...fieldResult.warnings)

      // Use sanitized value if available, otherwise use original
      if (fieldResult.sanitizedValue !== undefined) {
        sanitizedData[field] = fieldResult.sanitizedValue
      } else if (value !== undefined) {
        sanitizedData[field] = value
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      sanitizedValue: JSON.stringify(sanitizedData),
      metadata: { sanitizedData },
    }
  }
}

export default {
  Validator,
  Sanitizer,
  Validation,
  RateLimiter,
  VALIDATION_CONSTANTS,
  createSchemaValidator,
}
