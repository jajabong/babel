# BabelPrompt 迁移指南

## 从旧版本升级到 v4.0

本指南帮助您从早期版本的 BabelPrompt 升级到 v4.0 Side Panel 架构。

---

## 版本对比

### v1.0.0 → v4.0.0 主要变化

| 特性 | v1.0.0 | v4.0.0 |
|------|--------|--------|
| **用户界面** | Popup 弹出窗口 | Side Panel 侧边栏 |
| **操作模式** | 单次注入 | 两次提问模式 |
| **平台支持** | 基础支持 | Gemini/ChatGPT/Claude |
| **代码结构** | React + TypeScript | 纯 JavaScript |
| **构建工具** | Vite + Webpack | 无需构建 |
| **文件数量** | ~76 个文件 | ~61 个文件 (-20%) |
| **代码行数** | 957 行 (content.js) | 667 行 (content.js) (-30%) |

---

## 架构变化

### 1. UI 架构迁移

**v1.0.0 (Popup 架构)**
```
用户点击扩展图标
    ↓
Popup 窗口弹出
    ↓
用户输入并点击按钮
    ↓
关闭 Popup
```

**v4.0.0 (Side Panel 架构)**
```
用户点击扩展图标
    ↓
Side Panel 从右侧打开
    ↓
用户在 LLM 页面与 Side Panel 交互
    ↓
保持打开状态，持续可用
```

### 2. 文件结构变化

**删除的文件**
```bash
# React 项目文件
❌ src/
❌ index.tsx
❌ tsconfig.json
❌ vite.config.ts
❌ vitest.config.ts

# Popup 界面
❌ popup.html
❌ popup.js
❌ popup.css

# 旧测试文件
❌ test-page.html
❌ debug-test.js
❌ manifest-test.json
```

**新增的文件**
```bash
# Side Panel 界面
✅ sidepanel.html
✅ sidepanel.js
✅ sidepanel.css

# 文档
✅ TEST-GUIDE.md
✅ REAL-LLM-TEST-GUIDE.md
✅ MIGRATION_GUIDE.md (本文件)
✅ CLEANUP_SUMMARY.md
```

**保留的文件**
```bash
✅ manifest.json (更新至 v4.0.0)
✅ content.js (优化，减少 30% 代码)
✅ background.js
✅ settings.html
✅ lib/prompt_engine.js
```

---

## 升级步骤

### 步骤 1: 备份旧版本

```bash
# 如果你有旧版本，先备份
cp -r babelprompt babelprompt-backup
```

### 步骤 2: 移除旧扩展

1. 打开 `chrome://extensions/`
2. 找到 BabelPrompt 扩展
3. 点击"移除"按钮

### 步骤 3: 加载新版本

1. 下载或克隆 v4.0.0 代码
2. 打开 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择新的 BabelPrompt 文件夹

### 步骤 4: 验证安装

- [ ] 扩展图标出现在工具栏
- [ ] 点击图标能看到 "Open BabelPrompt Side Panel"
- [ ] Side Panel 能从右侧打开
- [ ] 界面显示正常（4 种模式按钮）

---

## 功能变化

### 新增功能

**两次提问模式** (核心功能)
```
旧版本: 用户手动输入 → 一次注入 → 手动复制结果
新版本: 用户输入 → 自动两次提问 → 直接获得最终答案
```

**进度指示器**
```
旧版本: 无进度反馈
新版本: 4 步进度显示
  1. 正在注入 Meta-Prompt...
  2. 提取优化结果...
  3. 注入优化后的提示词...
  4. 完成！
```

**历史记录**
```
旧版本: 无历史记录
新版本: 本地保存最近 10 条优化记录
```

### 移除的功能

**Popup 界面**
- 原因: Side Panel 提供更好的用户体验
- 影响: 需要适应新的交互方式

**React/TypeScript 支持**
- 原因: 简化架构，无需构建步骤
- 影响: 代码更简单，易于维护

---

## 使用方式变化

### 旧版本 (v1.0.0)

1. 点击扩展图标
2. Popup 窗口弹出
3. 输入提示词
4. 选择模式
5. 点击"注入"
6. Popup 关闭
7. 手动查看 LLM 响应

### 新版本 (v4.0.0)

1. 打开 LLM 网站 (Claude/Gemini/ChatGPT)
2. 点击扩展图标
3. 选择 "Open BabelPrompt Side Panel"
4. Side Panel 从右侧打开
5. 输入提示词
6. 选择模式
7. 点击"优化并注入"
8. **自动化完成两次提问**
9. 在 LLM 页面查看最终结果

---

## 配置迁移

### Manifest V3 变化

**新增权限**
```json
{
  "permissions": [
    "sidePanel"  // 新增：Side Panel API
  ],
  "side_panel": {
    "default_path": "sidepanel.html"  // 新增配置
  }
}
```

### Chrome 版本要求

- **旧版本**: Chrome 88+
- **新版本**: Chrome 114+ (Side Panel API 要求)

---

## 常见问题

### Q1: 为什么从 Popup 改为 Side Panel？

**A**: Side Panel 提供更好的用户体验：
- ✅ 不会遮挡 LLM 页面内容
- ✅ 可以保持打开状态
- ✅ 更大的工作空间
- ✅ 更方便的多轮交互

### Q2: 旧版本的设置会保留吗？

**A**: 不会。由于架构变化，存储结构已更新：
- 旧版本设置无法迁移
- 需要重新配置偏好设置

### Q3: 我可以同时安装旧版和新版吗？

**A**: 不可以。Chrome 扩展机制限制：
- 同一扩展只能安装一个版本
- 需要先卸载旧版本

### Q4: 两次提问模式会消耗更多 Token 吗？

**A**: 会，但收益更高：
- 第 1 次: ~200-500 tokens (Meta-Prompt + 优化结果)
- 第 2 次: ~100-300 tokens (优化后的 prompt)
- 总计: ~300-800 tokens
- **收益**: 获得结构化、专业的提示词，大幅提升最终结果质量

### Q5: 如何回滚到旧版本？

**A**: 如果你有备份：
1. 在 `chrome://extensions/` 移除 v4.0.0
2. 加载备份的旧版本文件夹
3. **注意**: 不建议回滚，v4.0.0 有重大改进

---

## 兼容性矩阵

| Chrome 版本 | v1.0.0 | v4.0.0 |
|-------------|--------|--------|
| Chrome 88-113 | ✅ 支持 | ❌ 不支持 |
| Chrome 114-120 | ✅ 支持 | ✅ 支持 |
| Chrome 121+ | ✅ 支持 | ✅ 推荐 |

| LLM 平台 | v1.0.0 | v4.0.0 |
|----------|--------|--------|
| Gemini | 🟡 基础支持 | 🟢 完整支持 |
| ChatGPT | 🟡 基础支持 | 🟢 完整支持 |
| Claude | 🟡 基础支持 | 🟢 完整支持 |

---

## 升级检查清单

升级前：
- [ ] 备份旧版本（如有需要）
- [ ] 确认 Chrome 版本 >= 114
- [ ] 记录当前设置和偏好

升级后：
- [ ] 移除旧版本扩展
- [ ] 加载新版本扩展
- [ ] 测试 Side Panel 打开
- [ ] 测试两次提问功能
- [ ] 验证 LLM 平台兼容性
- [ ] 重新配置设置（如需要）

---

## 技术支持

如果升级过程中遇到问题：

1. **查看日志**
   - LLM 页面: F12 → Console
   - Side Panel: 右键扩展图标 → "检查"

2. **提供反馈**
   - Chrome 版本
   - 旧版本号
   - 错误信息
   - 操作步骤

3. **已知问题**
   - 首次加载可能需要刷新 LLM 页面
   - 某些 LLM 平台选择器可能需要更新

---

## 相关文档

- [README.md](./README.md) - 项目概述
- [INSTALL_GUIDE.md](./INSTALL_GUIDE.md) - 安装指南
- [TEST-GUIDE.md](./TEST-GUIDE.md) - 测试指南
- [CLAUDE.md](./CLAUDE.md) - 开发文档
- [CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md) - 清理详情

---

**迁移指南版本**: 1.0
**最后更新**: 2026-01-08
**适用版本**: v1.0.0 → v4.0.0
