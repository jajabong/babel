// BabelPrompt v4.0 - Side Panel Main Logic
// Two-Pass Optimization Mode: Auto-inject and extract response
document.addEventListener('DOMContentLoaded', () => {
  const promptInput = document.getElementById('promptInput')
  const optimizeBtn = document.getElementById('optimizeBtn')
  const cancelBtn = document.getElementById('cancelBtn')
  const settingsBtn = document.getElementById('settingsBtn')
  const modeButtons = document.querySelectorAll('.mode-btn')
  const errorToast = document.getElementById('errorToast')
  const progressContainer = document.getElementById('progressContainer')
  const progressText = document.getElementById('progressText')
  const progressSteps = document.querySelectorAll('.progress-step')
  const historyList = document.getElementById('historyList')
  const clearHistoryBtn = document.getElementById('clearHistoryBtn')

  let currentMode = 'general'
  let isProcessing = false
  let shouldCancel = false
  let currentTabId = null

  const HISTORY_KEY = 'babelprompt_history'
  const MAX_HISTORY = 10

  // Initialize
  loadHistory()

  // Listen for progress updates from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'PROGRESS_UPDATE') {
      updateProgress(message.step, message.text)
    }
  })

  // Mode selection
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      currentMode = btn.dataset.mode
    })
  })

  // Open settings
  settingsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage()
    } else {
      window.open(chrome.runtime.getURL('settings.html'))
    }
  })

  // Cancel button
  cancelBtn.addEventListener('click', () => {
    if (isProcessing) {
      shouldCancel = true
      showError('正在取消...')
      // Note: Actual cancellation happens on next message check
      setProcessingState(false)
      hideProgress()
    }
  })

  // Clear history
  clearHistoryBtn.addEventListener('click', () => {
    chrome.storage.local.set({ [HISTORY_KEY]: [] }, () => {
      loadHistory()
      showError('历史记录已清空')
    })
  })

  // Optimize button - Two-Pass Mode
  optimizeBtn.addEventListener('click', handleOptimize)
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleOptimize()
    }
  })

  // Main optimization handler
  async function handleOptimize() {
    const text = promptInput.value.trim()
    if (!text) {
      showError('请输入你的需求')
      return
    }

    if (isProcessing) return

    shouldCancel = false
    isProcessing = true
    currentTabId = null

    setProcessingState(true)
    showProgress()
    updateProgress(1, '正在注入 Meta-Prompt...')

    console.log('[BabelPrompt] Starting optimization:', { text, mode: currentMode })

    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab || !tab.url) {
        showError('无法获取当前页面')
        setProcessingState(false)
        hideProgress()
        return
      }

      currentTabId = tab.id
      console.log('[BabelPrompt] Active tab:', tab.url)

      // Check if valid URL (not chrome://, edge://, etc.)
      if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
        showError('请在网页上使用（如 claude.ai）')
        setProcessingState(false)
        hideProgress()
        return
      }

      // Send message with retry - content script may not be ready
      const sendWithRetry = async (retryCount = 0) => {
        if (shouldCancel) {
          console.log('[BabelPrompt] Cancelled by user')
          setProcessingState(false)
          hideProgress()
          return
        }

        console.log(`[BabelPrompt] Sending message (attempt ${retryCount + 1})`)

        chrome.tabs.sendMessage(tab.id, {
          type: 'TWO_PASS_OPTIMIZE',
          prompt: text,
          mode: currentMode
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[BabelPrompt] Error:', chrome.runtime.lastError.message)

            // Content script not ready, try to inject it
            if (retryCount < 2) {
              console.log('[BabelPrompt] Injecting content script...')
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
              }, () => {
                if (chrome.runtime.lastError) {
                  showError('无法注入脚本: ' + chrome.runtime.lastError.message)
                  setProcessingState(false)
                  hideProgress()
                } else {
                  console.log('[BabelPrompt] Content script injected, retrying...')
                  setTimeout(() => sendWithRetry(retryCount + 1), 500)
                }
              })
            } else {
              showError('Content script 加载失败，请刷新页面后重试')
              setProcessingState(false)
              hideProgress()
            }
            return
          }

          console.log('[BabelPrompt] Response:', response)

          if (response && response.success) {
            // Success! Clear input and save to history
            console.log('[BabelPrompt] Success!')
            promptInput.value = ''
            updateProgress(4, '完成！')
            addToHistory(text, currentMode)
            setTimeout(() => {
              setProcessingState(false)
              hideProgress()
            }, 1500)
          } else {
            showError(response?.error || '处理失败')
            setProcessingState(false)
            hideProgress()
          }
        })
      }

      sendWithRetry()

    } catch (error) {
      console.error('[BabelPrompt] Exception:', error)
      showError(error.message)
      setProcessingState(false)
      hideProgress()
    }
  }

  // Show error toast
  function showError(message) {
    errorToast.textContent = message
    errorToast.classList.remove('hidden')

    setTimeout(() => {
      errorToast.classList.add('hidden')
    }, 3000)
  }

  // Set processing state
  function setProcessingState(processing) {
    isProcessing = processing
    optimizeBtn.disabled = processing

    if (processing) {
      optimizeBtn.classList.add('hidden')
      cancelBtn.classList.remove('hidden')
    } else {
      optimizeBtn.classList.remove('hidden')
      cancelBtn.classList.add('hidden')
    }
  }

  // Progress indicator functions
  function showProgress() {
    progressContainer.classList.remove('hidden')
    resetProgressSteps()
  }

  function hideProgress() {
    setTimeout(() => {
      progressContainer.classList.add('hidden')
    }, 500)
  }

  function updateProgress(step, text) {
    progressText.textContent = text

    progressSteps.forEach((stepEl, index) => {
      const stepNum = index + 1
      stepEl.classList.remove('active', 'completed')

      if (stepNum < step) {
        stepEl.classList.add('completed')
      } else if (stepNum === step) {
        stepEl.classList.add('active')
      }
    })
  }

  function resetProgressSteps() {
    progressSteps.forEach(step => {
      step.classList.remove('active', 'completed')
    })
  }

  // History functions
  function loadHistory() {
    chrome.storage.local.get([HISTORY_KEY], (result) => {
      const history = result[HISTORY_KEY] || []
      renderHistory(history)
    })
  }

  function renderHistory(history) {
    if (history.length === 0) {
      historyList.innerHTML = '<div class="history-empty">暂无历史记录</div>'
      return
    }

    historyList.innerHTML = history.map((item, index) => `
      <div class="history-item" data-index="${index}">
        <div class="history-header-row">
          <span class="history-mode">${getModeLabel(item.mode)}</span>
          <span class="history-time">${formatTime(item.timestamp)}</span>
        </div>
        <div class="history-prompt">${escapeHtml(truncateText(item.prompt, 50))}</div>
        <button class="history-reuse" data-prompt="${escapeHtml(item.prompt)}" data-mode="${item.mode}">
          <i class="fas fa-redo"></i> 重用
        </button>
      </div>
    `).join('')

    // Add click handlers for reuse buttons
    document.querySelectorAll('.history-reuse').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prompt = e.currentTarget.dataset.prompt
        const mode = e.currentTarget.dataset.mode
        promptInput.value = prompt
        // Update mode button
        modeButtons.forEach(b => {
          b.classList.remove('active')
          if (b.dataset.mode === mode) {
            b.classList.add('active')
            currentMode = mode
          }
        })
      })
    })
  }

  function addToHistory(prompt, mode) {
    chrome.storage.local.get([HISTORY_KEY], (result) => {
      const history = result[HISTORY_KEY] || []

      // Add new item to beginning
      history.unshift({
        prompt,
        mode,
        timestamp: Date.now()
      })

      // Keep only MAX_HISTORY items
      const trimmed = history.slice(0, MAX_HISTORY)

      chrome.storage.local.set({ [HISTORY_KEY]: trimmed }, () => {
        loadHistory()
      })
    })
  }

  function getModeLabel(mode) {
    const labels = {
      general: '通用',
      code: '代码',
      creative: '创意',
      business: '商务'
    }
    return labels[mode] || mode
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return date.toLocaleDateString('zh-CN')
  }

  function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // ========== Platform Detection (v4.1) ==========

  /**
   * Detect LLM platform from URL
   * @param {string} url - Tab URL
   * @returns {object|null} Platform object with id and name, or null
   */
  function detectPlatform(url) {
    if (!url) return null

    const hostname = new URL(url).hostname.toLowerCase()

    // Platform detection patterns
    if (hostname.includes('gemini.google.com')) {
      return { id: 'gemini', name: 'Gemini', icon: '💎' }
    }
    if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) {
      return { id: 'chatgpt', name: 'ChatGPT', icon: '🤖' }
    }
    if (hostname.includes('claude.ai')) {
      return { id: 'claude', name: 'Claude', icon: '🧠' }
    }

    return null
  }

  /**
   * Detect current active tab's platform
   */
  async function detectCurrentPlatform() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab || !tab.url) {
        updatePlatformIndicator(null)
        return
      }

      const platform = detectPlatform(tab.url)
      updatePlatformIndicator(platform)
    } catch (error) {
      console.error('[BabelPrompt] Platform detection error:', error)
      updatePlatformIndicator(null)
    }
  }

  /**
   * Update platform indicator UI
   * @param {object|null} platform - Platform object or null
   */
  function updatePlatformIndicator(platform) {
    const indicator = document.getElementById('platformIndicator')
    const icon = indicator.querySelector('.platform-icon')
    const name = indicator.querySelector('.platform-name')

    if (!platform) {
      icon.textContent = '⚠️'
      name.textContent = '不支持'
      indicator.style.opacity = '0.6'
      updateOptimizeButton(null)
      return
    }

    icon.textContent = platform.icon
    name.textContent = platform.name
    indicator.style.opacity = '1'
    updateOptimizeButton(platform)
  }

  /**
   * Update optimize button text based on platform
   * @param {object|null} platform - Platform object or null
   */
  function updateOptimizeButton(platform) {
    const btn = document.getElementById('optimizeBtn')
    if (platform) {
      btn.innerHTML = `<i class="fas fa-magic"></i> 优化并注入到 ${platform.name}`
    } else {
      btn.innerHTML = `<i class="fas fa-magic"></i> 优化并注入`
    }
  }

  // Listen for tab activation
  chrome.tabs.onActivated.addListener(() => {
    detectCurrentPlatform()
  })

  // Listen for tab updates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      detectCurrentPlatform()
    }
  })

  // Initialize platform detection
  detectCurrentPlatform()
})
