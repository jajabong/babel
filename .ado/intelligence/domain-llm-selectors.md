# LLM 平台 DOM 选择器研究

**搜索日期**: 2025-01-08
**置信度**: MEDIUM (部分来自 GreasyFork 源代码)

## 关键发现

### 1. 多平台扩展存在
找到了 `ChatGPT / Claude / Gemini WideScreen` 扩展源代码，说明：
- ✅ 三个平台可以同时支持
- ✅ 有成熟的 DOM 操作模式可以参考
- ✅ 各平台有稳定的结构

### 2. 平台特征分析

#### Gemini (gemini.google.com)
- 输入框: `div[contenteditable="true"]`
- 输出区域: `.markdown`
- 特点: Google 使用 React，结构稳定

#### ChatGPT (chatgpt.com)
- 输入框: `#prompt-textarea`
- 输出区域: `.markdown`, `.markdown-prose`
- 特点: OpenAI 频繁更新 UI，需要备用选择器

#### Claude (claude.ai)
- 输入框: `div[contenteditable="true"]`
- 输出区域: `.prose`
- 特点: Anthropic 使用自定义组件

### 3. 潜在问题
- ⚠️ DOM 结构可能随时变化
- ⚠️ 需要多重选择器作为备用
- ⚠️ 流式响应的 DOM 监控需要精确时序

## 参考资料
- [GreasyFork 扩展源代码](https://greasyfork.org/zh-CN/scripts/534072-chatgpt-claude-gemini-widescreen)
