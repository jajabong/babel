document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey')
  const apiModelInput = document.getElementById('apiModel')
  const saveBtn = document.getElementById('saveBtn')
  const testBtn = document.getElementById('testBtn')
  const toast = document.getElementById('toast')
  const statusDot = document.getElementById('statusDot')
  const statusText = document.getElementById('statusText')
  const toggleVisibility = document.getElementById('toggleVisibility')
  const currentConfig = document.getElementById('currentConfig')

  // 加载已保存的配置
  loadConfig()

  // 切换密码显示/隐藏
  toggleVisibility.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text'
      toggleVisibility.textContent = '🙈'
    } else {
      apiKeyInput.type = 'password'
      toggleVisibility.textContent = '👁️'
    }
  })

  // 保存设置
  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim()
    const apiModel = apiModelInput.value.trim()

    if (!apiKey) {
      showToast('请输入有效的 API Key', 'error')
      return
    }

    const config = {
      zhipuApiKey: apiKey,
      zhipuApiModel: apiModel || 'claude-3-sonnet-20240229',
      updatedAt: new Date().toISOString()
    }

    chrome.storage.sync.set(config, () => {
      showToast('设置已保存！', 'success')
      updateStatus(true)
      updateCurrentConfig(config)
    })
  })

  // 测试连接
  testBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim()
    const apiModel = apiModelInput.value.trim() || 'claude-3-sonnet-20240229'

    if (!apiKey) {
      showToast('请先输入 API Key', 'error')
      return
    }

    testBtn.disabled = true
    testBtn.textContent = '测试中...'

    try {
      const response = await fetch('https://open.bigmodel.cn/api/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: apiModel,
          max_tokens: 50,
          messages: [{
            role: 'user',
            content: 'Hello'
          }]
        })
      })

      if (response.ok) {
        showToast('连接测试成功！', 'success')
        updateStatus(true)
      } else {
        const error = await response.text()
        showToast(`连接失败: ${response.status} ${response.statusText}`, 'error')
        console.error('API Test Error:', error)
      }
    } catch (error) {
      showToast(`连接失败: ${error.message}`, 'error')
      console.error('API Test Exception:', error)
    } finally {
      testBtn.disabled = false
      testBtn.textContent = '测试连接'
    }
  })

  function loadConfig() {
    chrome.storage.sync.get(['zhipuApiKey', 'zhipuApiModel', 'updatedAt'], (result) => {
      if (result.zhipuApiKey) {
        apiKeyInput.value = result.zhipuApiKey
        updateStatus(true)
      } else {
        updateStatus(false)
      }

      if (result.zhipuApiModel) {
        apiModelInput.value = result.zhipuApiModel
      }

      updateCurrentConfig(result)
    })
  }

  function updateStatus(isConfigured) {
    if (isConfigured) {
      statusDot.className = 'status-dot configured'
      statusText.textContent = '已配置'
    } else {
      statusDot.className = 'status-dot not-configured'
      statusText.textContent = '未配置'
    }
  }

  function updateCurrentConfig(config) {
    const hasKey = !!config.zhipuApiKey
    const maskedKey = hasKey ? `${config.zhipuApiKey.substring(0, 8)}...${config.zhipuApiKey.substring(config.zhipuApiKey.length - 4)}` : '未设置'
    const model = config.zhipuApiModel || 'claude-3-sonnet-20240229'
    const updated = config.updatedAt ? new Date(config.updatedAt).toLocaleString('zh-CN') : '未知'

    currentConfig.innerHTML = `
      <div><strong>API Key:</strong> ${maskedKey}</div>
      <div style="margin-top: 5px;"><strong>模型:</strong> ${model}</div>
      <div style="margin-top: 5px;"><strong>更新时间:</strong> ${updated}</div>
    `
  }

  function showToast(message, type = 'success') {
    toast.textContent = message
    toast.className = `show ${type}`
    setTimeout(() => {
      toast.className = ''
    }, 3000)
  }
})
