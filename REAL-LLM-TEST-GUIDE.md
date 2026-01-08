# BabelPrompt v4.0 - 真实 LLM 平台测试指南

## 🚀 快速开始（3分钟）

### 步骤 1: 加载扩展

1. 打开 Chrome，访问 `chrome://extensions/`
2. 打开右上角的 **"开发者模式"**
3. 点击 **"加载已解压的扩展程序"**
4. 选择文件夹: `/Volumes/lds/eva/tasks/babel/chrome-extension/`
5. 确认扩展加载成功（看到 BabelPrompt 图标）

### 步骤 2: 打开 LLM 平台并登录

**Claude.ai**:
- 访问 `https://claude.ai/new`
- 如果需要，登录你的账号

**Gemini**:
- 访问 `https://gemini.google.com/`
- 如果需要，登录你的账号

**ChatGPT**:
- 访谈 `https://chatgpt.com/`
- 如果需要，登录你的账号

### 步骤 3: 打开 BabelPrompt Side Panel

1. 点击 Chrome 工具栏中的 **BabelPrompt 扩展图标**
2. 点击 **"Open BabelPrompt Side Panel"**
3. 右侧会打开 BabelPrompt 面板

### 步骤 4: 测试两次提问功能

1. 在 Side Panel 中选择模式: **General**
2. 输入框输入: `写一个 Python 爬虫`
3. 点击 **"优化并注入"** 按钮

## ✅ 预期结果

### Side Panel 行为

- 按钮显示 **"处理中..."**
- 输入框自动清空
- 按钮恢复为 **"优化并注入"**

### LLM 页面行为

**第 1 次注入**（你应该看到）:
- 输入框自动出现打字效果
- 注入内容类似:
  ```
  You are a prompt engineering expert. Optimize the following user prompt...

  Original user prompt:
  """
  写一个 Python 爬虫
  """

  Please provide an optimized version...
  ```
- 自动点击发送按钮

**等待 LLM 响应**（几秒钟）:
- LLM 返回优化后的 prompt

**第 2 次注入**（你应该看到）:
- 输入框再次自动出现打字效果
- 注入内容是 LLM 优化后的 prompt（结构化的需求）
- 自动点击发送按钮

**最终结果**:
- LLM 根据优化后的 prompt 返回最终答案

## 🔍 如何验证成功

### 检查点 1: Side Panel 控制台

1. 右键点击扩展图标 → **"检查"**（这会打开 Side Panel 的调试）
2. 切换到 **Console** 标签
3. 应该看到:
   ```
   [BabelPrompt] Starting optimization: {text: "写一个 Python 爬虫", mode: "general"}
   [BabelPrompt] Active tab: https://claude.ai/new
   [BabelPrompt] Sending message (attempt 1)
   [BabelPrompt] Response: {success: true}
   [BabelPrompt] Success!
   ```

### 检查点 2: LLM 页面控制台

1. 在 LLM 页面按 **F12**
2. 切换到 **Console** 标签
3. 应该看到:
   ```
   BabelPrompt: Content script loaded successfully
   BabelPrompt: Platform detected claude
   BabelPrompt: Starting two-pass optimization...
   BabelPrompt: Meta-Prompt generated...
   BabelPrompt: Pass 1 - Injecting Meta-Prompt
   ```

### 检查点 3: 目测验证

- ✅ 看到打字效果注入
- ✅ 输入框内容是 Meta-Prompt（包含优化指令）
- ✅ 自动点击了发送按钮
- ✅ 第二次注入了优化后的 prompt
- ✅ 完成两次提问循环

## 🐛 故障排查

### 问题 1: 点击按钮没有任何反应

**可能原因**: Content script 未加载

**解决方案**:
1. 刷新 LLM 页面（Cmd+R）
2. 等待页面完全加载
3. 再次点击"优化并注入"

### 问题 2: Side Panel 显示错误

**常见错误及解决方案**:

| 错误消息 | 原因 | 解决方案 |
|---------|------|----------|
| "请在网页上使用" | 当前不是 HTTP/HTTPS 页面 | 在 LLM 页面使用 |
| "Content script 加载失败" | Content script 未注入 | 刷新页面 |
| "未检测到支持的 LLM 平台" | 不在 Claude/Gemini/ChatGPT | 在支持的页面使用 |

### 问题 3: 注入了但没有自动提交

**可能原因**: 提交按钮选择器不匹配

**解决方案**:
1. 检查 LLM 页面控制台是否有 `BabelPrompt: Clicking submit button` 日志
2. 手动点击发送按钮完成测试

### 问题 4: 只注入了一次

**可能原因**: 流式提取超时

**解决方案**:
1. 等待更长时间（可能 LLM 响应慢）
2. 检查网络连接

## 📊 测试结果报告

测试完成后，请记录:

```
平台: [Claude / Gemini / ChatGPT]
输入: 写一个 Python 爬虫

结果:
☐ 第1次注入成功（Meta-Prompt）
☐ 自动提交成功
☐ LLM 返回优化 prompt
☐ 第2次注入成功（优化后的 prompt）
☐ 自动提交成功
☐ 最终结果显示

问题: [如果有问题，请描述]
```

## 🎯 成功标志

✅ 扩展加载无错误
✅ Side Panel 可以打开
✅ 能检测到 LLM 平台
✅ 第1次注入有打字效果
✅ 自动点击提交按钮
✅ 第2次注入有打字效果
✅ 再次自动点击提交按钮
✅ 完成完整的两次提问循环

## 📝 下一步

测试成功后:
1. ✅ 尝试不同的输入（代码、创意写作等）
2. ✅ 测试不同的模式（Code、Creative）
3. ✅ 在其他 LLM 平台测试

测试失败后:
1. 📸 截图 Side Panel 和 LLM 页面的控制台
2. 📋 复制错误消息
3. 📧 反馈问题详情

---

**测试页面优先级**:
1. ⭐⭐⭐ Claude.ai (最稳定)
2. ⭐⭐ Gemini
3. ⭐ ChatGPT (UI 可能变化)
