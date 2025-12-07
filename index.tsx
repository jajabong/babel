import React, { Suspense, startTransition } from 'react'
import { createRoot } from 'react-dom/client'

import {
  Button,
  CopyButton,
  LoadingSpinner,
  MessageItem,
  Textarea,
  PerformanceDashboard,
} from './src/components/ui'
import type { Message } from './src/components/ui'
import { CombinedProviders } from './src/contexts'
import {
  useAppState,
  useSidebarChat,
  useTargetChat,
  useSettings,
  useChatSettings,
} from './src/contexts'
import {
  ErrorBoundary,
  AsyncErrorBoundary,
  reportError,
  addBreadcrumb,
  setUser,
} from './src/errors'
import {
  useGeminiAPI,
  usePromptOptimization,
  useTypewriter,
  usePerformanceMonitor,
  type OptimizationMode,
} from './src/hooks'
import { META_PROMPTS } from './src/services'
import { Validation } from './src/utils/validation'

type ModeKey = OptimizationMode

// Message type is now imported from MessageItem component

// --- Components ---

const Sidebar = React.memo(() => {
  const [input, setInput] = React.useState('')
  const [showSettings, setShowSettings] = React.useState(false)

  // Use context instead of props
  const { state: appState, actions: appActions } = useAppState()
  const {
    messages,
    addMessage,
    scrollRef: messagesEndRef,
    setTyping,
  } = useSidebarChat()
  const { settings, actions: settingsActions } = useSettings()
  const { selectedMode, setSelectedMode } = useChatSettings()
  const { recordInteraction } = usePerformanceMonitor()

  const [mode, setMode] = React.useState<ModeKey>(selectedMode)

  const {
    optimizePrompt,
    state: { loading: isGenerating, error: optimizeError },
  } = usePromptOptimization({
    temperature: 0.7,
    outputFormat: 'markdown',
  })

  const handleSubmit = React.useCallback(async () => {
    if (!input.trim() || appState.isProcessing || isGenerating) return

    const recordSubmitInteraction = recordInteraction('prompt-submission')

    // Validate input
    const validation = Validation.validatePrompt(input, 'userInput')
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        addMessage({
          role: 'system',
          text: `❌ ${error.userMessage}`,
        })
      })
      return
    }

    const userText = validation.sanitizedValue || input
    setInput('')
    addMessage({ role: 'user', text: userText })
    setTyping(true)

    // Add breadcrumb for user action
    addBreadcrumb('User submitted prompt for optimization', 'user', 'info', {
      inputLength: userText.length,
      mode,
    })

    try {
      const optimizedPromptText = await optimizePrompt(userText, mode, {
        temperature: settings.temperature,
        outputFormat: settings.outputFormat as 'markdown' | 'plain' | 'json',
      })

      setTyping(false)

      if (optimizedPromptText) {
        // Validate the response
        const responseValidation = Validation.validateMessage(
          optimizedPromptText,
          'optimizedResponse'
        )
        if (!responseValidation.isValid) {
          addMessage({
            role: 'master',
            text: '⚠️ The optimized prompt contains potentially unsafe content. Please review and try again.',
          })
          reportError(new Error('Invalid optimized prompt response'), {
            context: 'prompt_optimization_validation',
            additionalData: {
              originalInput: userText,
              response: optimizedPromptText,
            },
          })
          return
        }

        // Use startTransition for non-urgent state updates
        startTransition(() => {
          // 1. Show the optimized prompt
          addMessage({
            role: 'master',
            text: responseValidation.sanitizedValue || optimizedPromptText,
            isOptimizedPrompt: true,
          })

          // 2. Show injection status and trigger injection via context
          setTimeout(() => {
            addMessage({
              role: 'system',
              text: '⚡ Auto-injecting into Gemini...',
            })
            // Set processing state and pending prompt via context
            appActions.setProcessing(true)
            appActions.setPendingPrompt(
              responseValidation.sanitizedValue || optimizedPromptText
            )
          }, 800)

          // Add breadcrumb for successful optimization
          addBreadcrumb(
            'Prompt optimization completed successfully',
            'log',
            'info',
            {
              mode,
              outputLength: optimizedPromptText.length,
            }
          )
        })
      } else {
        const error = new Error(optimizeError || 'Unknown optimization error')
        reportError(error, {
          context: 'prompt_optimization_failure',
          additionalData: { input: userText, mode },
        })

        addMessage({
          role: 'master',
          text: '❌ Unable to generate optimized prompt. Please check your connection and try again.',
        })
      }
    } catch (error) {
      setTyping(false)

      // Report the error
      reportError(error, {
        context: 'prompt_optimization_exception',
        additionalData: { input: userText, mode, error: String(error) },
      })

      addMessage({
        role: 'master',
        text: '❌ An unexpected error occurred while optimizing your prompt. Please try again.',
      })
    }

    recordSubmitInteraction()
  }, [
    input,
    appState.isProcessing,
    isGenerating,
    addMessage,
    mode,
    settings,
    optimizePrompt,
    appActions,
    setTyping,
    recordInteraction,
    reportError,
    addBreadcrumb,
  ])

  return (
    <div
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #333',
        color: 'var(--text-sidebar)',
        boxShadow: '4px 0 15px rgba(0,0,0,0.4)',
        zIndex: 10,
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        height: '100%', // Ensure full height
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px',
          backgroundColor: 'var(--bg-sidebar-header)',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background:
                'linear-gradient(135deg, var(--accent-color), #0d7a5f)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i
              className='fa-solid fa-brain'
              style={{ color: '#fff', fontSize: '1.2rem' }}
            ></i>
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: '1.1rem',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            BabelPrompt
          </h2>
        </div>
        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant='ghost'
          icon='fa-gear'
        />
      </div>

      {showSettings && (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#2d2d2d',
            borderBottom: '1px solid #333',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ marginBottom: '10px', color: '#fff', fontWeight: 600 }}>
            API Settings
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type='password'
              value='****************'
              disabled
              style={{
                flex: 1,
                background: '#1e1e1e',
                border: '1px solid #444',
                padding: '6px 10px',
                borderRadius: '4px',
                color: '#888',
              }}
            />
            <button
              style={{
                background: 'var(--accent-color)',
                border: 'none',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'default',
                fontSize: '0.75rem',
              }}
            >
              Updated
            </button>
          </div>
        </div>
      )}

      {/* Mode Selector */}
      <div
        style={{
          padding: '15px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
        }}
      >
        {(Object.keys(META_PROMPTS) as ModeKey[]).map(key => (
          <Button
            key={key}
            onClick={() => {
              setMode(key)
              setSelectedMode(key)
            }}
            variant='mode'
            icon={META_PROMPTS[key].icon}
            style={{
              backgroundColor:
                mode === key
                  ? 'var(--accent-color)'
                  : 'var(--bg-sidebar-input)',
              border:
                mode === key
                  ? '1px solid var(--accent-hover)'
                  : '1px solid transparent',
              fontWeight: mode === key ? 600 : 400,
            }}
          >
            {META_PROMPTS[key].name}
          </Button>
        ))}
      </div>

      {/* Chat Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '15px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          minHeight: 0, // Crucial for flex scrolling
        }}
      >
        {messages.map((msg, idx) => (
          <MessageItem key={idx} message={msg} index={idx} variant='sidebar' />
        ))}
        {isGenerating && (
          <LoadingSpinner
            variant='analyzing'
            text='Analyzing & Optimizing...'
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: '20px',
          borderTop: '1px solid #333',
          backgroundColor: 'var(--bg-sidebar-header)',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder='Type your raw request here...'
            variant='sidebar'
          />
          <Button
            onClick={handleSubmit}
            disabled={appState.isProcessing || isGenerating || !input.trim()}
            variant='ghost'
            icon='fa-paper-plane'
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              color:
                input.trim() && !appState.isProcessing && !isGenerating
                  ? 'var(--accent-color)'
                  : '#666',
              fontSize: '1.2rem',
            }}
          />
        </div>
        <div
          style={{
            marginTop: '10px',
            fontSize: '0.7rem',
            color: '#666',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <i className='fa-solid fa-shield-halved'></i>
          <span>Privacy Mode: Input only sent to BabelPrompt</span>
        </div>
      </div>
    </div>
  )
})

Sidebar.displayName = 'Sidebar'

const TargetLLM = React.memo(() => {
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  // Use context instead of props
  const { state: appState, actions: appActions } = useAppState()
  const {
    messages,
    addMessage,
    scrollRef: messagesEndRef,
    setTyping,
  } = useTargetChat()
  const { settings } = useSettings()
  const { recordInteraction } = usePerformanceMonitor()

  const {
    generateContent: getGeminiResponse,
    state: { loading: isTyping, error: geminiError },
  } = useGeminiAPI({
    apiKey: settings.apiKey,
    model: 'gemini-2.5-flash',
  })

  const handleSend = React.useCallback(
    async (text: string) => {
      const recordApiInteraction = recordInteraction('gemini-api-call')

      // Validate input text
      const validation = Validation.validateMessage(text, 'geminiInput')
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          addMessage({
            role: 'system',
            text: `❌ ${error.userMessage}`,
          })
        })
        setTyping(false)
        appActions.setProcessing(false)
        appActions.setPendingPrompt(null)
        return
      }

      const sanitizedText = validation.sanitizedValue || text
      addMessage({ role: 'user', text: sanitizedText })
      setTyping(true)

      // Add breadcrumb for API call
      addBreadcrumb('Sending request to Gemini API', 'http', 'info', {
        inputLength: sanitizedText.length,
        model: 'gemini-2.5-flash',
      })

      try {
        const response = await getGeminiResponse(sanitizedText)

        if (response) {
          // Validate the response
          const responseValidation = Validation.validateMessage(
            response,
            'geminiResponse'
          )
          if (!responseValidation.isValid) {
            addMessage({
              role: 'ai',
              text: '⚠️ I received a response that contains potentially unsafe content. Please try rephrasing your prompt.',
            })
            reportError(new Error('Invalid Gemini API response'), {
              context: 'gemini_response_validation',
              additionalData: {
                input: sanitizedText,
                response: response.substring(0, 500), // Log first 500 chars for debugging
              },
            })
          } else {
            // Use startTransition for non-urgent UI updates
            startTransition(() => {
              addMessage({
                role: 'ai',
                text: responseValidation.sanitizedValue || response,
              })

              // Add breadcrumb for successful response
              addBreadcrumb(
                'Gemini API response received successfully',
                'http',
                'info',
                {
                  responseLength: response.length,
                }
              )
            })
          }
        } else {
          const error = new Error(geminiError || 'No response from Gemini API')
          reportError(error, {
            context: 'gemini_api_failure',
            additionalData: { input: sanitizedText, error: geminiError },
          })

          addMessage({
            role: 'ai',
            text: "❌ I apologize, but I'm having trouble connecting to the Gemini service right now. Please check your connection and try again.",
          })
        }
      } catch (error) {
        // Report the error
        reportError(error, {
          context: 'gemini_api_exception',
          additionalData: {
            input: sanitizedText,
            error: String(error),
            errorType:
              error instanceof Error ? error.constructor.name : 'unknown',
          },
        })

        addMessage({
          role: 'ai',
          text: '❌ I apologize, but I encountered an unexpected error while processing your request. Please try again in a moment.',
        })
      } finally {
        setTyping(false)
        // Reset processing state via context after injection is complete
        appActions.setProcessing(false)
        appActions.setPendingPrompt(null)
      }

      recordApiInteraction()
    },
    [
      addMessage,
      getGeminiResponse,
      geminiError,
      setTyping,
      appActions,
      recordInteraction,
      reportError,
      addBreadcrumb,
    ]
  )

  const {
    displayText: inputValue,
    isTyping: isTypingEffect,
    start: startTypewriter,
  } = useTypewriter({
    speed: 1,
    batchSize: 5,
    onComplete: () => {
      if (appState.pendingPrompt) {
        handleSend(appState.pendingPrompt)
      }
    },
  })

  // Start typewriter effect when incomingPrompt changes
  React.useEffect(() => {
    if (appState.pendingPrompt) {
      startTypewriter(appState.pendingPrompt)
    }
  }, [appState.pendingPrompt, startTypewriter])

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: 'var(--bg-target)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        height: '100%', // Ensure full height
      }}
    >
      {/* Mock Header */}
      <div
        style={{
          padding: '15px 20px',
          borderBottom: '1px solid #e5e5e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            color: '#444',
          }}
        >
          <span>Gemini (Target Website)</span>
          <span
            style={{
              fontSize: '0.7rem',
              background: '#e5e5e5',
              padding: '2px 6px',
              borderRadius: '4px',
              color: '#666',
            }}
          >
            SIMULATION
          </span>
        </div>
        <div style={{ display: 'flex', gap: '15px', color: '#666' }}>
          <i className='fa-solid fa-clock-rotate-left'></i>
          <i className='fa-solid fa-gear'></i>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#ff8b8b',
            }}
          ></div>
        </div>
      </div>

      {/* Chat History */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 15%',
          display: 'flex',
          flexDirection: 'column',
          gap: '30px',
          paddingTop: '40px',
          paddingBottom: '20px',
          minHeight: 0,
        }}
      >
        {messages.map((msg, idx) => (
          <MessageItem
            key={idx}
            message={msg as any} // Type cast needed since TargetLLM uses different message format
            index={idx}
            variant='target'
          />
        ))}
        {isTyping && <LoadingSpinner variant='gemini' text='Thinking...' />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '30px 15%', paddingBottom: '50px' }}>
        <div style={{ position: 'relative' }}>
          <Textarea
            ref={inputRef}
            value={inputValue}
            readOnly
            placeholder='Enter a prompt here'
            variant='target'
          />
          <Button
            disabled
            variant='secondary'
            icon='fa-arrow-up'
            style={{
              position: 'absolute',
              right: '15px',
              bottom: '12px',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'not-allowed',
            }}
          />
        </div>
        <div
          style={{
            textAlign: 'center',
            marginTop: '10px',
            color: '#888',
            fontSize: '0.75rem',
          }}
        >
          Gemini may display inaccurate info, including about people, so
          double-check its responses.
        </div>
      </div>
    </div>
  )
})

TargetLLM.displayName = 'TargetLLM'

const App = React.memo(() => {
  const { recordRender } = usePerformanceMonitor()

  // Initialize error reporting and session tracking
  React.useEffect(() => {
    recordRender('app-initialization')

    // Set user context (could be enhanced with actual user authentication)
    setUser('anonymous_user', {
      sessionId: crypto.randomUUID(),
      userAgent: navigator.userAgent,
    })

    // Add breadcrumb for app initialization
    addBreadcrumb('Application initialized', 'log', 'info')

    // Global error handler for unhandled errors
    const handleError = (event: ErrorEvent) => {
      reportError(event.error, {
        context: 'global_error_handler',
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    }

    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('error', handleError)
    }
  }, [recordRender])

  return (
    <ErrorBoundary
      component='App'
      onError={(error, errorInfo) => {
        // Report error to monitoring service
        reportError(error, {
          context: 'app_error_boundary',
          additionalData: {
            componentStack: errorInfo.componentStack,
          },
        })

        // Add breadcrumb for error boundary trigger
        addBreadcrumb(
          `Error boundary caught: ${error.message}`,
          'error',
          'error'
        )
      }}
      maxRetries={3}
      enableLogging={true}
    >
      <CombinedProviders>
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
          <Suspense fallback={<div>Loading Sidebar...</div>}>
            <AsyncErrorBoundary
              component='Sidebar'
              onError={(error, errorId) => {
                reportError(error, {
                  context: 'sidebar_async_error',
                  additionalData: { errorId },
                })
              }}
              maxRetries={2}
            >
              <Sidebar />
            </AsyncErrorBoundary>
          </Suspense>

          <Suspense fallback={<div>Loading Target Chat...</div>}>
            <AsyncErrorBoundary
              component='TargetLLM'
              onError={(error, errorId) => {
                reportError(error, {
                  context: 'target_llm_async_error',
                  additionalData: { errorId },
                })
              }}
              maxRetries={2}
            >
              <TargetLLM />
            </AsyncErrorBoundary>
          </Suspense>
        </div>

        {/* Performance Dashboard */}
        <PerformanceDashboard />
      </CombinedProviders>
    </ErrorBoundary>
  )
})

App.displayName = 'App'

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
