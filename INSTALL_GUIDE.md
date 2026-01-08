# BabelPrompt Chrome 扩展 - 安装和使用指南

**版本**: 2.0.0 (Side Panel Edition)
**更新时间**: 2026-01-05

---

## 什么是 BabelPrompt？

BabelPrompt 是一个 **Chrome 浏览器扩展**，帮助你更好地与 LLM（如 ChatGPT、Gemini、Claude 等）沟通。

### 核心功能

1. **提示词优化** - 将你的简单请求转换为专业的提示词
2. **Side Panel 侧边栏** - 持久显示，随时使用
3. **一键注入** - 直接将优化后的提示词注入到目标网站
4. **多种模式** - 支持通用、代码、创意、商务四种优化模式

---

## 安装方法

### 步骤 1: 打开 Chrome 扩展管理页面

在 Chrome 浏览器地址栏输入：
```
chrome://extensions/
```

或者通过菜单访问：
- 菜单 → 更多工具 → 扩展程序

### 步骤 2: 启用开发者模式

在扩展管理页面右上角，打开 **"开发者模式"** 开关。

### 步骤 3: 加载扩展

1. 点击左上角的 **"加载已解压的扩展程序"** 按钮
2. 选择文件夹：`/Volumes/lds/eva/tasks/app/chrome-extension/`
3. 点击"选择"

### 步骤 4: 验证安装

- 扩展列表中出现 "BabelPrompt"
- Chrome 工具栏出现扩展图标（紫色 "B" 字母图标）

---

## 配置 API Key

### 首次使用

1. **点击扩展图标**，打开 Side Panel 侧边栏
2. **点击右上角设置图标** ⚙️
3. **在设置页面输入 ZhipuAI API Key**

### 获取 ZhipuAI API Key

1. 访问：https://open.bigmodel.cn/
2. 注册/登录账号
3. 进入 "API Key" 页面
4. 创建新的 API Key
5. 复制 API Key 并粘贴到设置页面
6. 点击"保存设置"
7. 点击"测试连接"验证配置

---

## 使用方法

### 基本流程

```
1. 访问目标网站 (ChatGPT/Gemini/Claude 等)
   ↓
2. 点击 Chrome 工具栏的 BabelPrompt 图标
   ↓
3. Side Panel 在左侧打开
   ↓
4. 输入你的原始提示词
   ↓
5. 选择优化模式（通用/代码/创意/商务）
   ↓
6. 点击"优化"按钮
   ↓
7. 查看 AI 优化后的提示词
   ↓
8. 点击"注入到页面"
   ↓
9. 提示词自动注入到右侧网站输入框
```

### 优化模式说明

| 模式 | 图标 | 适用场景 |
|------|------|----------|
| **General** | 🌐 | 通用对话、问答 |
| **Code** | 💻 | 编程、代码生成、技术问题 |
| **Creative** | 🎨 | 创意写作、设计、艺术 |
| **Business** | 💼 | 商业分析、策略、文档 |

### 使用示例

#### 示例 1: 代码模式

**输入**:
```
写一个 Python 函数处理数据
```

**优化后**:
```
你是一位专业的软件工程师。请编写一个 Python 函数来处理数据，要求：

1. 函数名清晰描述功能
2. 添加类型注解
3. 包含完整的文档字符串
4. 处理边界情况和错误
5. 提供使用示例

请针对以下需求：写一个 Python 函数处理数据
```

#### 示例 2: 创意模式

**输入**:
```
写一首关于春天的诗
```

**优化后**:
```
你是一位富有诗意的创意作家。请创作一首关于春天的诗歌，要求：

1. 运用生动的意象和感官描写
2. 体现春天的生机与美好
3. 语言优美流畅，富有韵律感
4. 融入个人情感和独特视角
5. 长度适中（约 8-12 行）

请开始创作一首关于春天的诗。
```

---

## 支持的目标网站

BabelPrompt 可以注入到任何包含文本输入框的网站，特别推荐：

### 完美支持

- ✅ **ChatGPT** - https://chat.openai.com
- ✅ **Gemini** - https://gemini.google.com
- ✅ **Claude** - https://claude.ai
- ✅ **Perplexity** - https://www.perplexity.ai

### 部分支持

- 任何带有 `textarea` 或 `contenteditable` 元素的网站

---

## 快捷键和技巧

### 快捷键

- **Shift + Enter** - 在输入框中换行（不发送）
- **Enter** - 直接发送/优化

### 注入功能

- 点击"注入到页面"后，扩展会：
  1. 自动找到页面上的输入框
  2. 使用打字机动画效果注入提示词
  3. 尝试自动点击"发送"按钮

### 智能输入框检测

扩展会自动检测页面上的输入框，并用**紫色边框**高亮显示。

---

## 故障排除

### 问题 1: 扩展无法加载

**症状**: 加载扩展时出现错误

**解决方案**:
1. 检查 `manifest.json` 语法是否正确
2. 确保所有文件路径正确
3. 查看 Chrome 扩展页面的错误信息
4. 尝试重新加载扩展（点击"重新加载"按钮）

### 问题 2: Side Panel 无法打开

**症状**: 点击扩展图标没有反应

**解决方案**:
1. 检查 Chrome 版本（需要 114+）
2. 刷新页面后重试
3. 重启 Chrome 浏览器

### 问题 3: API Key 配置失败

**症状**: 保存设置或测试连接失败

**解决方案**:
1. 检查 API Key 是否正确
2. 确认 API Key 有效且未过期
3. 检查网络连接
4. 查看 Chrome DevTools Console（F12）的错误信息

### 问题 4: 注入失败

**症状**: 点击"注入到页面"后没有反应

**解决方案**:
1. 确认目标页面有可用的输入框
2. 刷新目标页面后重试
3. 检查页面是否有脚本阻止
4. 手动点击输入框，然后重试注入

### 问题 5: 优化无响应

**症状**: 点击"优化"按钮后一直加载

**解决方案**:
1. 检查 API Key 配置
2. 查看网络请求是否成功（DevTools Network 面板）
3. 确认 ZhipuAI 服务可用
4. 尝试更换优化模式

---

## 文件结构

```
chrome-extension/
├── manifest.json          # 扩展配置（v2.0.0 - Side Panel）
├── background.js          # 后台服务（Side Panel 初始化）
├── content.js             # 内容脚本（输入框检测、注入）
├── content.css            # 注入样式
├── sidepanel.html         # Side Panel 界面
├── sidepanel.css          # Side Panel 样式
├── sidepanel.js           # Side Panel 逻辑
├── settings.html          # 设置页面
├── settings.js            # 设置逻辑
├── popup.html             # 旧版 Popup（保留）
├── popup.css              # 旧版样式（保留）
├── popup.js               # 旧版逻辑（保留）
├── icons/                 # 图标文件
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── README.md              # 说明文档
└── INSTALL_GUIDE.md       # 本文件
```

---

## 安全说明

### API Key 存储

- ✅ **安全**: API Key 存储在 `chrome.storage.sync` 中
- ✅ **加密**: Chrome 自动加密同步存储
- ✅ **本地**: 不会上传到任何第三方服务器（除了 ZhipuAI 官方 API）
- ❌ **移除**: 旧版本的硬编码 API Key 已完全删除

### 权限说明

| 权限 | 用途 |
|------|------|
| `storage` | 保存 API Key 和设置 |
| `sidePanel` | 打开侧边栏界面 |
| `activeTab` | 访问当前标签页信息 |
| `scripting` | 注入内容脚本 |
| `tabs` | 获取标签页信息 |

---

## 版本历史

### v2.0.0 (2026-01-05) - Side Panel Edition

**新功能**:
- ✨ 使用 Chrome Side Panel API 替代 Popup
- 🔒 移除硬编码 API Key，使用用户配置
- 🎨 全新的 UI 设计
- 🎯 四种优化模式

**修复**:
- 🐛 修复 API Key 安全问题
- 🐛 改进注入逻辑
- 🐛 优化消息传递机制

**删除**:
- ❌ 移除旧的 Gemini API 集成
- ❌ 移除 MockGeminiAPIService

### v1.0.0 (初始版本)

- 基础 Popup 界面
- Gemini API 集成
- 基本的提示词优化功能

---

## 下一步

### 待实现功能

- [ ] 支持自定义优化模板
- [ ] 历史记录功能
- [ ] 快捷键支持
- [ ] 多语言支持
- [ ] 导出优化结果

### 贡献

欢迎提交 Issue 和 Pull Request！

---

## 技术支持

如果遇到问题，请提供以下信息：

1. Chrome 版本信息
2. BabelPrompt 版本（v2.0.0）
3. 目标网站 URL
4. 错误截图或日志
5. 具体操作步骤

---

**许可证**: MIT
**开发者**: EVA Team
**感谢使用 BabelPrompt!** 🚀
