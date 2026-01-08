// Content Script for BabelPrompt Extension
; (function () {
  'use strict'

  // Configuration
  const CONFIG = {
    highlightedInputClass: 'babelprompt-highlighted',
    floatingButtonClass: 'babelprompt-floating-btn',
  }

  // LLM Platform Configuration (v4.0)
  const LLM_CONFIG = {
    gemini: {
      domains: ['gemini.google.com'],
      input: 'div[contenteditable="true"]',
      output: ['.markdown', '[data-message-author-role="assistant"]'],
      submit: 'button[aria-label*="send"]'
    },
    chatgpt: {
      domains: ['chatgpt.com', 'chat.openai.com'],
      input: '#prompt-textarea',
      output: ['.markdown', '.markdown-prose'],
      submit: 'button[data-testid="send-button"]'
    },
    claude: {
      domains: ['claude.ai'],
      input: 'div[contenteditable="true"]',
      output: [
        '[data-message-author-role="assistant"]',
        '.font-claude-message',
        '.prose',
        '.markdown',
        '[data-is-streaming="false"]'
      ],
      submit: 'button[aria-label*="Send"]'
    }
  }

  // Stream Injection Configuration (v4.0)
  const STREAM_CONFIG = {
    checkInterval: 300,      // Check every 300ms
    minBatchSize: 50,        // Minimum 50 chars before injection
    stabilityTimeout: 3000,  // 3 seconds no change = complete (increased for Claude)
    typingBatchSize: 30,     // Characters per batch (increased for speed)
    typingDelay: 10          // Delay between batches in ms (reduced for speed)
  }

  let isProcessing = false
  let lastDetectedInput = null

  // Initialize content script
  function init() {
    console.log('BabelPrompt content script initialized')
    setupInputDetection()
    setupFloatingButton()
    setupMessageListener()
    detectInputFields()
  }

  // Set up automatic input field detection
  function setupInputDetection() {
    // Initial detection
    detectInputFields()

    // Watch for DOM changes
    const observer = new MutationObserver(mutations => {
      setTimeout(detectInputFields, 500)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    })
  }

  // Detect and highlight input fields
  function detectInputFields() {
    const selectors = [
      'textarea:not([readonly])',
      'div[contenteditable="true"]',
      'input[type="text"]:not([readonly])',
    ]

    const inputs = document.querySelectorAll(selectors.join(', '))

    inputs.forEach(input => {
      if (shouldHighlightInput(input)) {
        highlightInput(input)
      } else {
        unhighlightInput(input)
      }
    })

    lastDetectedInput = inputs[inputs.length - 1] || null
  }

  // Check if input should be highlighted
  function shouldHighlightInput(input) {
    // Skip very small inputs (likely search fields)
    const rect = input.getBoundingClientRect()
    if (rect.width < 200 || rect.height < 40) {
      return false
    }

    // Check if it's likely a prompt input
    const placeholder = input.placeholder?.toLowerCase() || ''
    const className = input.className?.toLowerCase() || ''

    const promptKeywords = [
      'prompt',
      'ask',
      'question',
      'message',
      'chat',
      'enter',
      'type',
      'what',
      'how',
      'describe',
      'explain',
      'write',
      'create',
    ]

    return (
      promptKeywords.some(
        keyword => placeholder.includes(keyword) || className.includes(keyword)
      ) || rect.height > 60
    ) // Large textareas
  }

  // Highlight input field
  function highlightInput(input) {
    if (input.classList.contains(CONFIG.highlightedInputClass)) {
      return
    }

    input.classList.add(CONFIG.highlightedInputClass)

    // Add subtle glow effect
    if (
      input.tagName.toLowerCase() === 'textarea' ||
      input.tagName.toLowerCase() === 'input'
    ) {
      input.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.3)'
    } else {
      input.style.outline = '2px solid rgba(139, 92, 246, 0.3)'
    }

    // Add hover effect to show it's detected
    input.addEventListener('mouseenter', () => {
      if (
        input.tagName.toLowerCase() === 'textarea' ||
        input.tagName.toLowerCase() === 'input'
      ) {
        input.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'
      } else {
        input.style.outline = '2px solid rgba(139, 92, 246, 0.5)'
      }
    })

    input.addEventListener('mouseleave', () => {
      if (
        input.tagName.toLowerCase() === 'textarea' ||
        input.tagName.toLowerCase() === 'input'
      ) {
        input.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.3)'
      } else {
        input.style.outline = '2px solid rgba(139, 92, 246, 0.3)'
      }
    })
  }

  // Remove highlight from input field
  function unhighlightInput(input) {
    input.classList.remove(CONFIG.highlightedInputClass)
    input.style.boxShadow = ''
    input.style.outline = ''
  }

  // Create floating action button
  function setupFloatingButton() {
    const button = document.createElement('div')
    button.className = CONFIG.floatingButtonClass
    button.innerHTML = `
      <div class="babelprompt-btn-content">
        <i class="fas fa-magic"></i>
        <span>BabelPrompt</span>
      </div>
    `

    document.body.appendChild(button)

    // Button click handler
    button.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' })
    })
  }

  // Set up message listener from background script
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'TWO_PASS_OPTIMIZE':
          twoPassOptimization(message.prompt, message.mode, sendResponse)
          return true

        case 'GET_INPUT_FIELDS':
          const inputs = document.querySelectorAll(
            'textarea:not([readonly]), div[contenteditable="true"]'
          )
          sendResponse({
            success: true,
            inputs: Array.from(inputs).map(input => ({
              tagName: input.tagName,
              placeholder: input.placeholder,
              id: input.id,
              className: input.className,
            })),
          })
          break

        default:
          sendResponse({ success: false, error: 'Unknown message type' })
      }
    })
  }

  // Find the best input field for injection
  function findBestInputTarget() {
    const selectors = [
      'textarea:focus',
      'textarea:not([readonly])',
      'div[contenteditable="true"]:focus',
      'div[contenteditable="true"]',
      'input[type="text"]:focus',
      'input[type="text"]:not([readonly])',
    ]

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector)
      for (const element of elements) {
        if (isElementVisible(element)) {
          return element
        }
      }
    }

    return null
  }

  // Check if element is visible
  function isElementVisible(element) {
    const rect = element.getBoundingClientRect()
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      window.getComputedStyle(element).display !== 'none' &&
      window.getComputedStyle(element).visibility !== 'hidden'
    )
  }

  // Clear input element
  function clearInput(element) {
    const isContentEditable = element.getAttribute('contenteditable') === 'true'

    if (
      element.tagName.toLowerCase() === 'textarea' ||
      element.tagName.toLowerCase() === 'input'
    ) {
      element.value = ''
      element.dispatchEvent(new Event('input', { bubbles: true }))
    } else if (isContentEditable) {
      // For contenteditable, clear using textContent and trigger events
      element.textContent = ''
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      element.textContent = ''
      element.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }

  // Type text with animation
  function typeWithAnimation(element, text, callback) {
    let index = 0
    const batchSize = STREAM_CONFIG.typingBatchSize || 30
    const delay = STREAM_CONFIG.typingDelay || 10

    // For contenteditable elements, we need to handle text insertion differently
    const isContentEditable = element.getAttribute('contenteditable') === 'true'

    function typeBatch() {
      if (index < text.length) {
        const nextIndex = Math.min(index + batchSize, text.length)
        const batch = text.substring(index, nextIndex)

        if (
          element.tagName.toLowerCase() === 'textarea' ||
          element.tagName.toLowerCase() === 'input'
        ) {
          // For textarea and input elements
          element.value = element.value + batch
          element.dispatchEvent(new Event('input', { bubbles: true }))
        } else if (isContentEditable) {
          // For contenteditable divs, use textContent and append
          const currentText = element.textContent || ''
          element.textContent = currentText + batch
          // Only trigger input event during typing (change event at the end)
          element.dispatchEvent(new Event('input', { bubbles: true }))
        } else {
          // Fallback for other elements
          element.textContent = element.textContent + batch
          element.dispatchEvent(new Event('input', { bubbles: true }))
        }

        index = nextIndex
        setTimeout(typeBatch, delay)
      } else {
        // Typing completed - trigger change event once
        if (isContentEditable) {
          element.dispatchEvent(new Event('change', { bubbles: true }))
        }

        // Small delay before submit
        setTimeout(() => {
          attemptAutoSubmit(element)
          callback()
        }, 200)
      }
    }

    typeBatch()
  }

  // Attempt to auto-submit after injection
  function attemptAutoSubmit(element) {
    const llm = detectLLMPlatform()

    // Use platform-specific submit selector if available
    if (llm && llm.submit) {
      const submitButton = document.querySelector(llm.submit)
      if (submitButton && isElementVisible(submitButton) && !submitButton.disabled) {
        console.log('BabelPrompt: Clicking platform-specific submit button')
        submitButton.click()
        return
      }
    }

    // Fallback: Look for submit buttons
    const submitSelectors = [
      'button[type="submit"]',
      '[data-testid*="send"]',
      '[aria-label*="send" i]',
      '[aria-label*="submit" i]',
      '.send-button',
      '.submit-button',
    ]

    for (const selector of submitSelectors) {
      const buttons = document.querySelectorAll(selector)
      for (const button of buttons) {
        const buttonText = (button.textContent || '').toLowerCase()
        if (
          (buttonText.includes('send') ||
            buttonText.includes('submit') ||
            buttonText.includes('发送')) &&
          isElementVisible(button) &&
          !button.disabled
        ) {
          console.log('BabelPrompt: Clicking fallback submit button')
          button.click()
          return
        }
      }
    }

    // Try keyboard shortcuts
    console.log('BabelPrompt: Trying keyboard shortcut (Ctrl+Enter)')
    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        ctrlKey: true,
        bubbles: true,
      })
    )
  }

  // ====== NEW v4.0 FUNCTIONS: Two-Pass Optimization ======

  /**
   * Generate Meta-Prompt for first pass optimization
   * @param {string} userPrompt - User's original input
   * @param {string} mode - Optimization mode (general/code/creative)
   * @returns {string} Generated meta-prompt
   */
  function generateMetaPrompt(userPrompt, mode) {
    const modeInstructions = {
      general: 'You are a prompt engineering expert. Optimize the following user prompt to be more clear, structured, and effective.',
      code: 'You are a technical prompt expert. Optimize the following coding-related prompt to include proper context, requirements, and output specifications.',
      creative: 'You are a creative writing prompt expert. Enhance the following creative prompt with vivid details, clear constraints, and inspiring direction.',
      business: 'You are a business strategy expert. Optimize the following business-related prompt to include clear objectives, context, and actionable insights.'
    }

    const instruction = modeInstructions[mode] || modeInstructions.general

    return `${instruction}

Original user prompt:
"""
${userPrompt}
"""

Please provide an optimized version of this prompt that:
1. Has clear context and background
2. Specifies the desired output format
3. Includes relevant constraints or requirements
4. Uses precise and unambiguous language

Return ONLY the optimized prompt, without any explanations or meta-commentary.`
  }

  /**
   * Detect LLM platform based on current URL
   * @returns {Object|null} LLM configuration or null if not detected
   */
  function detectLLMPlatform() {
    const hostname = window.location.hostname
    for (const [name, config] of Object.entries(LLM_CONFIG)) {
      if (config.domains.some(domain => hostname.includes(domain))) {
        console.log(`BabelPrompt: Detected ${name} platform`)
        return { name, ...config }
      }
    }
    console.warn('BabelPrompt: No supported LLM platform detected')
    return null
  }

  /**
   * Find input field based on detected LLM platform
   * @returns {Element|null} Input element or null
   */
  function findLLMInput() {
    const llm = detectLLMPlatform()
    if (!llm) {
      // Fallback to generic detection
      return findBestInputTarget()
    }

    // Use platform-specific input selector
    const inputElement = document.querySelector(llm.input)
    if (inputElement && isElementVisible(inputElement)) {
      return inputElement
    }

    // Fallback to generic detection
    return findBestInputTarget()
  }

  /**
   * Main two-pass optimization flow
   * @param {string} userPrompt - User's raw input
   * @param {string} mode - Selected mode (general, code, creative, business)
   * @param {function} sendResponse - Chrome message response callback
   */
  async function twoPassOptimization(userPrompt, mode, sendResponse) {
    if (isProcessing) {
      sendResponse({ success: false, error: '正在处理中，请稍候' })
      return
    }

    const llm = detectLLMPlatform()
    if (!llm) {
      sendResponse({ success: false, error: '未检测到支持的 LLM 平台。请打开 Gemini、ChatGPT 或 Claude。' })
      return
    }

    isProcessing = true
    console.log('BabelPrompt: Starting two-pass optimization', { userPrompt, mode, platform: llm.name })

    try {
      // Step 1: Generate Meta-Prompt
      const metaPrompt = generateMetaPrompt(userPrompt, mode)
      console.log('BabelPrompt: Meta-Prompt generated', metaPrompt.substring(0, 100) + '...')

      // Step 2: First injection - Meta-Prompt
      console.log('BabelPrompt: Pass 1 - Injecting Meta-Prompt')
      notifyProgress(2, `等待 ${llm.name} 响应...`)
      await injectWithStreaming(metaPrompt)

      // Step 3: Stream extract LLM response
      console.log('BabelPrompt: Pass 1 - Waiting for LLM response')
      const optimizedPrompt = await streamExtractResponse()

      if (!optimizedPrompt || optimizedPrompt.length < 10) {
        throw new Error('LLM 未返回有效的响应')
      }

      console.log('BabelPrompt: Pass 1 complete - Optimized prompt received')

      // Step 4: Second injection - Optimized Prompt
      console.log('BabelPrompt: Pass 2 - Injecting optimized prompt')
      notifyProgress(3, '正在注入优化结果...')
      await injectWithStreaming(optimizedPrompt)

      isProcessing = false
      console.log('BabelPrompt: Two-pass optimization complete!')
      sendResponse({ success: true })
    } catch (error) {
      isProcessing = false
      console.error('BabelPrompt: Two-pass optimization failed', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  /**
   * Notify Side Panel of progress
   * @param {number} step - Current step (1-4)
   * @param {string} text - Progress text
   */
  function notifyProgress(step, text) {
    // Try to send message to side panel
    try {
      chrome.runtime.sendMessage({
        type: 'PROGRESS_UPDATE',
        step: step,
        text: text
      }).catch(() => {
        // Side panel might not be open, that's okay
        console.log('BabelPrompt: Side panel not available for progress update')
      })
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Stream extract LLM response using MutationObserver
   * @returns {Promise<string>} Extracted text
   */
  function streamExtractResponse() {
    return new Promise((resolve) => {
      const llm = detectLLMPlatform()
      if (!llm) {
        console.error('BabelPrompt: No LLM platform detected for extraction')
        resolve(null)
        return
      }

      let lastExtracted = ''
      let lastChangeTime = Date.now()
      let fullText = ''
      let checkCount = 0
      let hasStartedResponding = false
      const maxChecks = 150 // 45 seconds max (150 * 300ms)
      const initialWaitTime = 3000 // Wait 3 seconds before checking stability

      console.log('BabelPrompt: Starting stream extraction for', llm.name)
      console.log('BabelPrompt: Output selectors:', llm.output)

      // Get all message elements before observation starts (to avoid detecting old messages)
      const initialMessageCount = new Map()
      for (const selector of llm.output) {
        try {
          initialMessageCount.set(selector, document.querySelectorAll(selector).length)
        } catch (e) {
          console.warn('BabelPrompt: Invalid selector', selector)
        }
      }

      const observer = new MutationObserver(() => {
        lastChangeTime = Date.now()

        // Try to extract text using platform-specific selectors
        for (const selector of llm.output) {
          try {
            const elements = document.querySelectorAll(selector)
            if (elements.length > 0) {
              // Only look at elements that appeared after we started (new messages)
              const initialCount = initialMessageCount.get(selector) || 0
              const newElements = Array.from(elements).slice(initialCount)

              if (newElements.length > 0) {
                const lastElement = newElements[newElements.length - 1]

                // Get text from the element
                let text = ''
                if (lastElement.innerText) {
                  text = lastElement.innerText
                } else if (lastElement.textContent) {
                  text = lastElement.textContent
                }

                // Clean up the text (remove extra whitespace)
                text = text.trim().replace(/\s+/g, ' ')

                // Check if we have new content that's substantial
                if (text.length > 20 && text !== lastExtracted) {
                  if (!hasStartedResponding) {
                    hasStartedResponding = true
                    console.log('BabelPrompt: LLM started responding!')
                  }

                  lastExtracted = text
                  fullText = text
                  console.log(`BabelPrompt: Extracted ${text.length} characters (using ${selector}, element #${newElements.length})`)
                  console.log('BabelPrompt: Text preview:', text.substring(0, 100) + '...')
                }
              }
            }
          } catch (e) {
            console.warn('BabelPrompt: Error with selector', selector, e)
          }
        }
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      })

      // Check for completion periodically
      const checkInterval = setInterval(() => {
        checkCount++
        const timeSinceLastChange = Date.now() - lastChangeTime

        // Only check for stability if we've seen a response start
        // AND we've waited at least initialWaitTime
        const minWaitTime = hasStartedResponding ? initialWaitTime : 5000
        const shouldCheckStability = hasStartedResponding && (timeSinceLastChange > STREAM_CONFIG.stabilityTimeout)

        if (shouldCheckStability && fullText.length > 50) {
          // DOM stable for 2 seconds and we have content
          clearInterval(checkInterval)
          observer.disconnect()
          console.log('BabelPrompt: Stream extraction complete - DOM stable')
          console.log('BabelPrompt: Final text length:', fullText.length)
          resolve(fullText)
        } else if (checkCount > maxChecks) {
          // Timeout
          clearInterval(checkInterval)
          observer.disconnect()
          if (fullText.length > 50) {
            console.warn('BabelPrompt: Stream extraction timeout but returning partial text')
            resolve(fullText)
          } else {
            console.error('BabelPrompt: Stream extraction timeout - no text extracted')
            console.error('BabelPrompt: hasStartedResponding:', hasStartedResponding)
            console.error('BabelPrompt: fullText.length:', fullText.length)
            resolve(null)
          }
        }

        // Log progress every 10 checks
        if (checkCount % 10 === 0) {
          console.log(`BabelPrompt: Waiting for response... (${checkCount}/${maxChecks}, hasStarted=${hasStartedResponding}, textLength=${fullText.length})`)
        }
      }, STREAM_CONFIG.checkInterval)
    })
  }

  /**
   * Inject text with typing animation and auto-submit
   * @param {string} prompt - Text to inject
   */
  async function injectWithStreaming(prompt) {
    return new Promise((resolve) => {
      const targetInput = findLLMInput()

      if (!targetInput) {
        throw new Error('找不到输入框')
      }

      targetInput.focus()

      // Clear input first to ensure clean state
      console.log('BabelPrompt: Clearing input field')
      clearInput(targetInput)

      // Small delay to ensure clear is processed
      setTimeout(() => {
        // Use existing typeWithAnimation function
        console.log('BabelPrompt: Starting type animation for', prompt.length, 'characters')
        typeWithAnimation(targetInput, prompt, () => {
          // Animation completed, auto-submit
          console.log('BabelPrompt: Type animation completed')
          setTimeout(() => {
            attemptAutoSubmit(targetInput)
            resolve()
          }, 500)
        })
      }, 100)
    })
  }

  // ====== END NEW v4.0 FUNCTIONS ======

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  // Debug: Mark that content script is loaded
  window.babelpromptLoaded = true
  console.log('BabelPrompt: Content script loaded successfully')
  console.log('BabelPrompt: Platform detected', detectLLMPlatform()?.name || 'none')
})()
