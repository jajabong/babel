# BabelPrompt Chrome Extension v4.0

零成本 AI 提示词优化 Chrome 扩展，使用两次提问模式自动优化用户提示词。

## 核心特性

- **两次提问模式** - 自动注入 Meta-Prompt，提取优化结果，再次注入获取最终答案
- **零成本** - 利用现有 LLM 会话，无需付费 API
- **多平台支持** - Gemini、ChatGPT、Claude
- **智能注入** - 打字机效果，自动提交
- **Side Panel** - Chrome 114+ 侧边栏界面
- **历史记录** - 本地保存最近 10 条优化记录

## 安装方法

### 开发者模式安装

1. **准备图标文件**

   ```bash
   # 在 icons/ 目录下添加 PNG 图标文件
   # 需要以下尺寸：16x16, 32x32, 48x48, 128x128
   ```

2. **打开 Chrome 扩展管理页**
   - 访问 `chrome://extensions/`
   - 或菜单 → 更多工具 → 扩展程序

3. **启用开发者模式**
   - 打开右上角的"开发者模式"开关

4. **加载扩展程序**
   - 点击"加载已解压的扩展程序"
   - 选择项目根目录

5. **验证安装**
   - 点击工具栏中的扩展图标
   - Side Panel 应从右侧打开

## 使用方法

### 基本使用流程

1. **打开目标 LLM 网站**
   - 访问 Gemini、ChatGPT 或 Claude

2. **打开 Side Panel**
   - 点击 Chrome 工具栏中的 BabelPrompt 图标
   - 侧边栏将从右侧打开

3. **输入原始请求**
   ```
   创建一个 todo 应用
   ```

4. **选择优化模式**
   - **General** - 通用提示词优化
   - **Code** - 代码和编程任务
   - **Creative** - 创意和设计任务

5. **执行优化**
   - 点击"优化提示词"按钮
   - 扩展自动完成两次提问流程

### 两次提问模式说明

```
第 1 次：注入 Meta-Prompt → LLM 返回优化后的提示词
         ↓
第 2 次：提取优化结果 → 再次注入 → LLM 返回最终答案
```

### 进度指示器

优化过程中会显示 4 步进度：

1. **正在注入 Meta-Prompt...**
2. **提取优化结果...**
3. **注入优化后的提示词...**
4. **完成！**

## 测试场景

### 推荐测试网站

| 平台 | URL | 状态 |
|------|-----|------|
| Gemini | https://gemini.google.com | 🟢 已测试 |
| ChatGPT | https://chat.openai.com | 🟡 部分支持 |
| Claude | https://claude.ai | 🟡 部分支持 |

### 测试步骤

1. **基础功能测试**
   ```
   输入: "创建一个todo应用"
   模式: Code
   预期: 两次提问后获得最终代码
   ```

2. **创意功能测试**
   ```
   输入: "写一首关于春天的诗"
   模式: Creative
   预期: 获得创意诗作
   ```

## 故障排除

### 常见问题

**Q: 扩展无法加载**
- 检查 manifest.json 语法
- 确认图标文件存在
- 查看 chrome://extensions/ 的错误信息

**Q: 注入失败**
- 确认目标页面有输入框
- 刷新页面后重试
- 检查浏览器控制台日志

**Q: Side Panel 不显示**
- 确认 Chrome 版本 >= 114
- 检查是否启用了 Side Panel API
- 尝试重新加载扩展

### 调试方法

1. **查看控制台日志**
   ```javascript
   // 在目标网页按 F12 打开开发者工具
   // Console 中查看 "BabelPrompt" 相关日志
   ```

2. **检查扩展状态**
   - 访问 chrome://extensions/
   - 查看错误和警告信息

## 开发说明

### 文件结构

```
.
├── manifest.json          # v4.0 扩展清单
├── background.js          # 后台服务脚本
├── content.js             # 内容脚本 (667 行)
├── content.css            # 内容脚本样式
├── sidepanel.html         # Side Panel 界面
├── sidepanel.js           # Side Panel 逻辑
├── sidepanel.css          # Side Panel 样式
├── settings.html          # 设置页面
├── settings.js            # 设置逻辑
├── icons/                 # 图标文件
├── lib/                   # 库文件
│   ├── prompt_engine.js   # 提示词引擎
│   └── fallback_manager.js
├── .ado/                  # ADO 项目文档
└── README.md              # 本文件
```

### 核心组件

| 组件 | 文件 | 职责 |
|------|------|------|
| Content Script | content.js | LLM 检测、提示词注入、响应提取 |
| Side Panel | sidepanel.js | 用户界面、模式选择、进度显示 |
| Background | background.js | 扩展生命周期、跨标签通信 |
| Prompt Engine | lib/prompt_engine.js | Meta-Prompt 生成 |

### 权限说明

- `activeTab` - 访问当前活动标签页
- `storage` - 保存设置和历史记录
- `scripting` - 注入内容脚本
- `tabs` - 标签页管理
- `sidePanel` - 侧边栏 API
- `host_permissions` - 访问所有网站

### 安全考虑

- 所有脚本经过内容安全策略检查
- 不收集用户隐私数据
- 本地处理，不传输到外部服务器

## 更新日志

### v4.0.0 (2026-01-08)

- ✅ 两次提问模式实现
- ✅ Side Panel 界面
- ✅ 多平台支持 (Gemini/ChatGPT/Claude)
- ✅ 流式响应提取
- ✅ 历史记录功能
- ✅ 架构清理 (减少 30% 代码)

### v1.0.0

- ✅ 基础扩展结构
- ✅ Popup 界面
- ✅ 内容脚本注入

## 下一步计划

- [ ] 添加更多 LLM 平台支持 (Grok, DeepSeek)
- [ ] 自动化 E2E 测试
- [ ] 用户自定义提示词模板
- [ ] 错误处理和降级方案优化

## 技术支持

如遇问题，请提供：

1. Chrome 版本信息
2. 目标网站 URL
3. 浏览器控制台日志
4. chrome://extensions/ 错误信息

## 许可证

MIT License
