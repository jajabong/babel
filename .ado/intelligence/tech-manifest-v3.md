# Chrome Extension Manifest V3 - 技术研究

**搜索日期**: 2025-01-08
**置信度**: HIGH (官方文档)

## 关键发现

### 1. Manifest V3 核心变化
- ✅ **Content Security Policy 更严格**: 必须使用对象格式
- ✅ **禁止远程代码**: 只能执行扩展包内的 JavaScript
- ✅ **Background Scripts 改为 Service Workers**: 持久化需要特殊处理

### 2. Content Script 最佳实践
- **性能**: MV3 content script 可能比 MV2 慢，需要优化
- **注册方式**: 在 manifest.json 中声明，支持 CSS 和 JS
- **运行时机**: `document_idle` 是推荐选项（默认）

### 3. 与本项目相关的要求
- ✅ 已使用 Manifest V3
- ✅ 已正确配置权限
- ⚠️ 需要优化 content script 性能

## 参考资料
- [Chrome 官方迁移指南](https://developer.chrome.com/docs/extensions/develop/migrate)
- [Manifest V3 完整指南](https://css-tricks.com/how-to-transition-to-manifest-v3-for-chrome-extensions/)
