# BabelPrompt v4.0 测试指南

## 快速测试（5分钟）

### 步骤 1: 加载扩展

1. 打开 Chrome，访问 `chrome://extensions/`
2. 启用"开发者模式"（右上角开关）
3. 点击"加载已解压的扩展程序"
4. 选择此文件夹：`/Volumes/lds/eva/tasks/babel/chrome-extension/`
5. 确认扩展加载成功（看到 BabelPrompt 图标）

### 步骤 2: 打开测试页面

在 Chrome 中打开：
```
file:///Volumes/lds/eva/tasks/babel/chrome-extension/test-llm-page.html
```

或者直接双击 `test-llm-page.html` 文件

### 步骤 3: 打开 Side Panel

1. 点击 Chrome 工具栏中的 BabelPrompt 扩展图标
2. 点击 "Open BabelPrompt Side Panel"
3. 右侧会打开 BabelPrompt 面板

### 步骤 4: 测试注入功能

在 BabelPrompt Side Panel 中：

1. 选择模式：General（默认）
2. 输入框输入：`写一个 Python 爬虫`
3. 点击 "优化并注入" 按钮

**预期结果：**

✅ **Side Panel**:
- 按钮显示 "处理中..."
- 输入框清空
- 按钮恢复 "优化并注入"

✅ **测试页面**:
- 看到打字效果注入 Meta-Prompt（包含优化指令）
- 自动点击 "Send Message" 按钮
- 页面显示 AI 响应
- 看到第二次注入（优化后的 prompt）
- 再次自动点击发送

### 步骤 5: 查看日志

**Side Panel 日志**:
1. 右键点击扩展图标 → "检查弹出内容"
2. 查看 Console 标签，应该看到：
   ```
   [BabelPrompt] Starting optimization: {text: "写一个 Python 爬虫", mode: "general"}
   [BabelPrompt] Active tab: file://...
   [BabelPrompt] Sending message (attempt 1)
   [BabelPrompt] Response: {success: true}
   ```

**页面日志**:
1. 在测试页面按 F12
2. 查看 Console，应该看到：
   ```
   BabelPrompt: Content script loaded successfully
   BabelPrompt: Platform detected none (测试页面不是 LLM)
   BabelPrompt: Starting two-pass optimization...
   ```

## 常见问题

### Q1: 点击按钮没有反应？

**检查：**
1. Side Panel 控制台是否有错误
2. 是否正确打开了测试页面
3. 扩展是否成功加载

**解决：**
- 刷新测试页面
- 重新加载扩展

### Q2: 显示 "Content script 加载失败"？

**原因：** Content script 可能未注入到页面

**解决：**
1. 刷新测试页面
2. 等待页面完全加载后再点击按钮

### Q3: 注入了但没有自动提交？

**检查：**
1. 页面控制台是否有 `BabelPrompt: Clicking submit button` 日志
2. 提交按钮是否可点击

**解决：**
- 可能是选择器问题，检查测试页面的按钮属性

## 在真实 LLM 测试

### Claude.ai
1. 访问 `https://claude.ai/new` 并登录
2. 打开 BabelPrompt Side Panel
3. 输入需求，点击"优化并注入"

### Gemini
1. 访问 `https://gemini.google.com/`
2. 打开 BabelPrompt Side Panel
3. 输入需求，点击"优化并注入"

### ChatGPT
1. 访谈 `https://chatgpt.com/` 并登录
2. 打开 BabelPrompt Side Panel
3. 输入需求，点击"优化并注入"

## 调试技巧

### 查看所有日志

在页面的控制台运行：
```javascript
console.log('BabelPrompt loaded:', window.babelpromptLoaded)
console.log('Detected platform:', window.location.hostname)
```

### 手动测试注入

在控制台运行：
```javascript
// 找到输入框
const input = document.querySelector('div[contenteditable="true"]')
input.focus()
input.textContent = 'Test message from BabelPrompt'
input.dispatchEvent(new Event('input', { bubbles: true }))

// 查找并点击提交按钮
const btn = document.querySelector('button[aria-label*="send" i]')
if (btn) btn.click()
```

## 成功标志

✅ 扩展加载无错误
✅ 测试页面打开正常
✅ Side Panel 可以打开
✅ 输入内容后点击按钮有反应
✅ 页面出现打字效果
✅ 自动点击提交按钮
✅ 完成两次注入循环

## 下一步

测试成功后，可以：
1. 在真实 LLM 平台测试
2. 尝试不同的模式（Code、Creative）
3. 调整优化提示词
4. 添加更多 LLM 平台支持
