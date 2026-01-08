/**
 * BabelPrompt Prompt Engine
 * Handles the generation of Meta-Prompts based on user input and selected mode.
 */
class PromptEngine {
  constructor() {
    this.templates = {
      general: {
        role: "You are an expert Prompt Engineer.",
        instruction: "Transform the user's raw request into a structured, professional prompt that yields the best results from AI models.",
        format: `
Please structure the optimized prompt as follows:
1. **Role**: Define the persona (e.g., "Act as an expert...").
2. **Context**: Provide necessary background.
3. **Task**: Clearly state the objective.
4. **Constraints**: List any limitations or requirements.
5. **Format**: Specify the desired output format.
`
      },
      code: {
        role: "You are a Senior Software Architect and Prompt Engineer.",
        instruction: "Convert the user's coding request into a detailed technical specification prompt.",
        format: `
Please structure the optimized prompt as follows:
1. **Tech Stack**: Specify languages, frameworks, and versions.
2. **Requirement**: Detailed functional requirement.
3. **Input/Output**: Example data or signatures.
4. **Constraints**: Performance, security, or style guidelines.
5. **Code Style**: e.g., "Clean Code", "Functional", "OOP".
`
      },
      creative: {
        role: "You are a Creative Director and Muse.",
        instruction: "Expand the user's idea into a rich, inspiring prompt for creative generation.",
        format: `
Please structure the optimized prompt as follows:
1. **Tone & Style**: e.g., "Whimsical", "Dark", "Professional".
2. **Audience**: Who is this for?
3. **Core Idea**: The central theme expanded.
4. **Inspiration**: References or moods.
`
      },
      business: {
        role: "You are a McKinsey Consultant and Strategy Expert.",
        instruction: "Refine the user's business query into a strategic, actionable prompt.",
        format: `
Please structure the optimized prompt as follows:
1. **Objective**: The business goal.
2. **Context**: Market situation or internal context.
3. **Key Questions**: Specific points to address.
4. **Output Requirement**: e.g., "Executive Summary", "Action Plan".
`
      }
    };
  }

  /**
   * Generates a Meta-Prompt to send to the LLM.
   * @param {string} userPrompt - The raw input from the user.
   * @param {string} mode - The selected mode (general, code, creative, business).
   * @returns {string} The constructed Meta-Prompt.
   */
  getMetaPrompt(userPrompt, mode = 'general') {
    const template = this.templates[mode] || this.templates.general;

    return `
${template.role}
${template.instruction}

${template.format}

---
**User's Raw Request:**
"${userPrompt}"

---
**Your Task:**
Output ONLY the optimized prompt. Do not include any introductory or concluding remarks. The output should be ready to copy-paste.
    `.trim();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PromptEngine;
} else {
  window.PromptEngine = PromptEngine;
}
