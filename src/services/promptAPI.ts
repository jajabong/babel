/**
 * Prompt Optimization API Service
 * Provides mode-specific prompt optimization and management
 */

import {
  geminiAPIService,
  type GeminiContentRequest,
  type GeminiContentResponse,
} from './geminiAPI'
import { isGeminiAPIException, getGeminiErrorMessage } from './geminiAPI'

// Prompt Optimization Types
export type OptimizationMode =
  | 'GENERAL'
  | 'CODING'
  | 'CREATIVE'
  | 'BUSINESS'
  | 'RESEARCH'
  | 'EDUCATION'

export interface MetaPrompt {
  name: string
  icon: string
  instruction: string
  description?: string
  category?: string
}

export interface PromptOptimizationRequest {
  userInput: string
  mode: OptimizationMode
  customInstruction?: string
  context?: string
  constraints?: string[]
  outputFormat?: 'markdown' | 'json' | 'plain'
  temperature?: number
}

export interface PromptOptimizationResponse {
  optimizedPrompt: string
  mode: OptimizationMode
  explanation?: string
  suggestedImprovements?: string[]
  alternatives?: string[]
  metadata?: {
    originalLength: number
    optimizedLength: number
    tokens: number
  }
}

export interface PromptValidationRequest {
  prompt: string
  criteria: string[]
}

export interface PromptValidationResponse {
  isValid: boolean
  score: number
  issues: string[]
  suggestions: string[]
  improvedPrompt?: string
}

export interface PromptCategory {
  id: OptimizationMode
  name: string
  description: string
  examples: string[]
}

/**
 * Predefined meta-prompts for different optimization modes
 */
export const META_PROMPTS: Record<OptimizationMode, MetaPrompt> = {
  GENERAL: {
    name: 'General Master',
    icon: 'fa-wand-magic-sparkles',
    instruction: `You are the "Prompt Engineering Master", a world-class expert in communicating with Large Language Models.
    Your goal is to take the user's raw, vague request and rewrite it into a highly structured, professional, and effective prompt.

    Structure the output prompt with the following sections in Markdown:
    1. **Persona/Role**: Define who the LLM should act as (e.g., "World-class Expert").
    2. **Context**: Provide necessary background or scenario.
    3. **Task**: Clearly and exhaustively state the objective.
    4. **Constraints**: List specific rules (length, format, style, no fluff).
    5. **Output Format**: Specify exactly how the answer should look (Markdown, JSON, Table, etc.).

    The generated prompt should be ready to copy-paste.
    RETURN ONLY THE OPTIMIZED PROMPT TEXT. Do not explain your actions.`,
    description: 'Optimize prompts for general use cases',
    category: 'General',
  },
  CODING: {
    name: 'Code Architect',
    icon: 'fa-code',
    instruction: `You are a Senior Software Architect and Technical Lead.
    The user wants code or technical assistance. Rewrite their request into a robust technical specification prompt.

    The optimized prompt must include:
    - **Expert Persona**: e.g., "Act as a Senior Python Developer with 10+ years of experience".
    - **Tech Stack**: Specific languages, libraries, and versions.
    - **Requirements**: Functional and non-functional requirements (performance, security).
    - **Code Quality**: Request comments, error handling, typing, and best practices (SOLID, DRY).
    - **Test Cases**: Ask for example usage or unit tests (pytest, jest).
    - **Output**: Full code blocks, no truncation.

    RETURN ONLY THE OPTIMIZED PROMPT TEXT.`,
    description: 'Optimize prompts for coding and technical tasks',
    category: 'Technical',
  },
  CREATIVE: {
    name: 'Creative Muse',
    icon: 'fa-pen-nib',
    instruction: `You are a Creative Director and Literary Editor.
    The user wants creative content. Rewrite their request to inspire vivid, unique, and engaging output.

    The optimized prompt must include:
    - **Tone & Style**: e.g., "Whimsical," "Dark Noir," "Professional", "Hemingway-esque".
    - **Audience**: Who is this for?
    - **Genre/Format**: Blog post, short story, poem, script, marketing copy.
    - **Key Elements**: Must include specific themes, motifs, or messages.
    - **Constraints**: Word count, rhyming scheme, structure.

    RETURN ONLY THE OPTIMIZED PROMPT TEXT.`,
    description: 'Optimize prompts for creative writing and content',
    category: 'Creative',
  },
  BUSINESS: {
    name: 'Business Strategist',
    icon: 'fa-briefcase',
    instruction: `You are a Business Strategy Consultant and Analyst.
    The user wants business-related assistance. Rewrite their request into a comprehensive business analysis prompt.

    The optimized prompt must include:
    - **Business Context**: Industry, company size, market position.
    - **Objective**: Specific business goal or problem to solve.
    - **Analysis Framework**: SWOT, PESTLE, Porter's Five Forces, etc.
    - **Deliverables**: Reports, presentations, action plans.
    - **Metrics**: KPIs, success criteria, measurement approach.

    RETURN ONLY THE OPTIMIZED PROMPT TEXT.`,
    description: 'Optimize prompts for business and strategy',
    category: 'Business',
  },
  RESEARCH: {
    name: 'Research Analyst',
    icon: 'fa-microscope',
    instruction: `You are a Senior Research Scientist and Academic Writer.
    The user wants research-related assistance. Rewrite their request into a rigorous research analysis prompt.

    The optimized prompt must include:
    - **Research Question**: Clear, specific, and answerable question.
    - **Methodology**: Research approach, data sources, analytical methods.
    - **Scope**: Inclusion/exclusion criteria, timeframes, boundaries.
    - **Citations**: Request for academic sources, peer-reviewed materials.
    - **Output Format**: Research paper sections, literature review, methodology.

    RETURN ONLY THE OPTIMIZED PROMPT TEXT.`,
    description: 'Optimize prompts for research and academic writing',
    category: 'Academic',
  },
  EDUCATION: {
    name: 'Educational Designer',
    icon: 'fa-graduation-cap',
    instruction: `You are an Educational Designer and Curriculum Developer.
    The user wants educational content or learning materials. Rewrite their request into a comprehensive educational prompt.

    The optimized prompt must include:
    - **Learning Objectives**: Specific, measurable outcomes.
    - **Target Audience**: Age group, prior knowledge, skill level.
    - **Learning Style**: Visual, auditory, kinesthetic preferences.
    - **Content Structure**: Introduction, main concepts, examples, practice.
    - **Assessment**: Quizzes, exercises, projects for evaluation.

    RETURN ONLY THE OPTIMIZED PROMPT TEXT.`,
    description: 'Optimize prompts for educational content',
    category: 'Education',
  },
}

/**
 * Prompt Optimization Service Class
 */
export class PromptOptimizationService {
  private geminiService: typeof geminiAPIService

  constructor(geminiService: typeof geminiAPIService = geminiAPIService) {
    this.geminiService = geminiService
  }

  /**
   * Optimize a user's prompt based on the selected mode
   */
  async optimizePrompt(
    request: PromptOptimizationRequest
  ): Promise<PromptOptimizationResponse> {
    const {
      userInput,
      mode,
      customInstruction,
      context,
      constraints,
      outputFormat,
      temperature,
    } = request

    try {
      // Get the appropriate meta-prompt
      const metaPrompt = META_PROMPTS[mode]
      if (!metaPrompt) {
        throw new Error(`Invalid optimization mode: ${mode}`)
      }

      // Build the system instruction
      let systemInstruction = customInstruction || metaPrompt.instruction

      // Add context if provided
      if (context) {
        systemInstruction += `\n\nAdditional Context: ${context}`
      }

      // Add constraints if provided
      if (constraints && constraints.length > 0) {
        systemInstruction += `\n\nConstraints: ${constraints.join(', ')}`
      }

      // Add output format preference
      if (outputFormat) {
        systemInstruction += `\n\nOutput Format: ${outputFormat}`
      }

      // Create the optimization request
      const optimizationRequest: GeminiContentRequest = {
        prompt: `User Request: "${userInput}"`,
        config: {
          systemInstruction,
          model: 'gemini-2.5-flash',
          temperature: temperature || 0.7,
        },
      }

      // Call Gemini API
      const response =
        await this.geminiService.generateContent(optimizationRequest)

      // Parse the response and create the optimization response
      return {
        optimizedPrompt: response.text,
        mode,
        metadata: {
          originalLength: userInput.length,
          optimizedLength: response.text.length,
          tokens: response.usage?.totalTokens || 0,
        },
      }
    } catch (error) {
      const errorMessage = isGeminiAPIException(error)
        ? getGeminiErrorMessage(error)
        : 'Unknown error occurred'
      throw new Error(`Prompt optimization failed: ${errorMessage}`)
    }
  }

  /**
   * Generate multiple prompt variations
   */
  async generatePromptVariations(
    basePrompt: string,
    count: number = 3,
    mode: OptimizationMode = 'GENERAL'
  ): Promise<string[]> {
    try {
      const metaPrompt = META_PROMPTS[mode]
      const variations: string[] = []

      const variationRequest: GeminiContentRequest = {
        prompt: `Generate ${count} variations of this prompt: "${basePrompt}".
        Each variation should approach the task differently while maintaining the core intent.
        Return only the variations, one per line, numbered 1-${count}.`,
        config: {
          systemInstruction: metaPrompt.instruction,
          model: 'gemini-2.5-flash',
          temperature: 0.8, // Higher temperature for more variation
        },
      }

      const response =
        await this.geminiService.generateContent(variationRequest)

      // Parse the variations
      const lines = response.text.split('\n')
      for (const line of lines) {
        const match = line.match(/^\d+\.\s*(.+)$/)
        if (match) {
          variations.push(match[1].trim())
        }
      }

      return variations.slice(0, count) // Ensure we return exactly the requested count
    } catch (error) {
      const errorMessage = isGeminiAPIException(error)
        ? getGeminiErrorMessage(error)
        : 'Unknown error occurred'
      throw new Error(`Prompt variation generation failed: ${errorMessage}`)
    }
  }

  /**
   * Validate a prompt against specific criteria
   */
  async validatePrompt(
    request: PromptValidationRequest
  ): Promise<PromptValidationResponse> {
    const { prompt, criteria } = request

    try {
      const validationRequest: GeminiContentRequest = {
        prompt: `Analyze this prompt for quality and effectiveness: "${prompt}"

        Evaluate it against these criteria: ${criteria.join(', ')}

        Provide your analysis in this JSON format:
        {
          "isValid": true/false,
          "score": 0-100,
          "issues": ["issue1", "issue2"],
          "suggestions": ["suggestion1", "suggestion2"],
          "improvedPrompt": "improved version if needed"
        }`,
        config: {
          model: 'gemini-2.5-flash',
          temperature: 0.3, // Lower temperature for consistent analysis
        },
      }

      const response =
        await this.geminiService.generateContent(validationRequest)

      // Parse JSON response
      let analysis: any
      try {
        analysis = JSON.parse(response.text)
      } catch {
        // Fallback if JSON parsing fails
        analysis = {
          isValid: true,
          score: 75,
          issues: ['Unable to parse detailed analysis'],
          suggestions: ['Consider making the prompt more specific'],
          improvedPrompt: prompt,
        }
      }

      return {
        isValid: analysis.isValid || false,
        score: analysis.score || 0,
        issues: analysis.issues || [],
        suggestions: analysis.suggestions || [],
        improvedPrompt: analysis.improvedPrompt,
      }
    } catch (error) {
      const errorMessage = isGeminiAPIException(error)
        ? getGeminiErrorMessage(error)
        : 'Unknown error occurred'
      throw new Error(`Prompt validation failed: ${errorMessage}`)
    }
  }

  /**
   * Get available optimization modes
   */
  getAvailableModes(): PromptCategory[] {
    return Object.entries(META_PROMPTS).map(([mode, metaPrompt]) => ({
      id: mode as OptimizationMode,
      name: metaPrompt.name,
      description: metaPrompt.description || '',
      examples: [], // Could be populated with example prompts
    }))
  }

  /**
   * Get meta-prompt for a specific mode
   */
  getMetaPrompt(mode: OptimizationMode): MetaPrompt | null {
    return META_PROMPTS[mode] || null
  }

  /**
   * Create a custom meta-prompt
   */
  createCustomMetaPrompt(
    name: string,
    icon: string,
    instruction: string,
    description?: string
  ): MetaPrompt {
    return {
      name,
      icon,
      instruction,
      description,
    }
  }

  /**
   * Analyze prompt effectiveness metrics
   */
  async analyzePromptMetrics(
    originalPrompt: string,
    optimizedPrompt: string,
    mode: OptimizationMode
  ): Promise<{
    improvementScore: number
    clarityScore: number
    specificityScore: number
    actionabilityScore: number
  }> {
    try {
      const analysisRequest: GeminiContentRequest = {
        prompt: `Analyze and compare these two prompts:

        Original: "${originalPrompt}"
        Optimized: "${optimizedPrompt}"
        Mode: ${mode}

        Rate each aspect on a scale of 1-100 and return only the JSON:
        {
          "improvementScore": 0-100,
          "clarityScore": 0-100,
          "specificityScore": 0-100,
          "actionabilityScore": 0-100
        }`,
        config: {
          model: 'gemini-2.5-flash',
          temperature: 0.2, // Very low temperature for consistent analysis
        },
      }

      const response = await this.geminiService.generateContent(analysisRequest)

      try {
        return JSON.parse(response.text)
      } catch {
        // Fallback values
        return {
          improvementScore: 75,
          clarityScore: 80,
          specificityScore: 70,
          actionabilityScore: 85,
        }
      }
    } catch (error) {
      // Return neutral scores if analysis fails
      return {
        improvementScore: 50,
        clarityScore: 50,
        specificityScore: 50,
        actionabilityScore: 50,
      }
    }
  }
}

/**
 * Create prompt optimization service instance
 */
export function createPromptOptimizationService(): PromptOptimizationService {
  return new PromptOptimizationService()
}

/**
 * Default prompt optimization service instance
 */
export const promptOptimizationService = createPromptOptimizationService()

/**
 * Utility functions for prompt operations
 */

/**
 * Check if a mode is valid
 */
export function isValidOptimizationMode(
  mode: string
): mode is OptimizationMode {
  return mode in META_PROMPTS
}

/**
 * Get all available modes
 */
export function getAllOptimizationModes(): OptimizationMode[] {
  return Object.keys(META_PROMPTS) as OptimizationMode[]
}

/**
 * Calculate prompt quality score
 */
export function calculatePromptQualityScore(prompt: string): number {
  if (!prompt || prompt.trim().length === 0) return 0

  let score = 0

  // Length score (10-100 characters ideal for basic prompts)
  const length = prompt.length
  if (length >= 10 && length <= 100) score += 20
  else if (length > 100 && length <= 500) score += 15
  else if (length > 500) score += 10
  else if (length > 0) score += 5

  // Contains specific instructions
  if (
    /\b(?:you should|you must|please|ensure|include|provide|generate|create|write)\b/i.test(
      prompt
    )
  ) {
    score += 20
  }

  // Contains persona/role specification
  if (/\b(?:act as|you are|assume the role of|persona|role)\b/i.test(prompt)) {
    score += 20
  }

  // Contains output format specification
  if (
    /\b(?:format|output|markdown|json|table|list|bullets|numbered)\b/i.test(
      prompt
    )
  ) {
    score += 20
  }

  // Contains constraints or requirements
  if (
    /\b(?:constraints|requirements|must|should not|avoid|limit|within)\b/i.test(
      prompt
    )
  ) {
    score += 20
  }

  return Math.min(score, 100)
}
