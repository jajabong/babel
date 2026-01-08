# Project Context for BabelPrompt Chrome Extension

## Project Overview

**BabelPrompt v4.0** - A free Chrome extension that automatically optimizes user prompts using a two-pass mode. The extension injects prompts into LLM platforms (Gemini/ChatGPT/Claude) and streams the results back.

**Core Value**: Zero-cost prompt optimization using existing LLM sessions

## Technology Stack

- **Runtime**: Browser (Chrome/Chromium Extensions Manifest V3)
- **Framework**: Vanilla JavaScript (no build tools)
- **Target LLMs**: Gemini, ChatGPT, Claude
- **Injection Method**: Content Scripts + MutationObserver
- **UI**: Side Panel API (Chrome 114+)

## Architecture

### Three-Layer Fallback (Original Design - Now Simplified)

```
Layer 1: API (Paid) - ❌ DISABLED (Free version only)
Layer 2: Web (Zero Cost) - ✅ PRIMARY - Uses active LLM tab
Layer 3: Local (Offline) - ⚫ OPTIONAL - Chrome Built-in AI (experimental)
```

### Two-Pass Mode Flow

```
User Input → Meta-Prompt Generation → Inject to LLM (1st)
                                      → LLM Response
                                      → Extract & Inject Again (2nd)
                                      → Final Result
```

### Key Components

| Component | File | Responsibility |
|-----------|------|----------------|
| **Content Script** | `content.js` | LLM detection, prompt injection, response extraction |
| **Side Panel** | `sidepanel.html/js` | User interface, mode selection |
| **Prompt Engine** | `lib/prompt_engine.js` | Meta-Prompt generation |
| **Background** | `background.js` | Extension lifecycle, cross-tab communication |

## Code Conventions

- **File Structure**: Flat structure (no bundlers)
- **Naming**:
  - Functions: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Classes: `PascalCase`
- **Styling**: Plain CSS (no preprocessors)
- **Comments**: JSDoc style for functions
- **Testing**: Manual testing (no automated tests yet)

## Dependencies & Constraints

### Chrome Extension Permissions
- `activeTab` - Access current tab
- `storage` - Save settings
- `scripting` - Inject content scripts
- `tabs` - Tab management
- `sidePanel` - Side panel API
- `host_permissions`: `https://*/*`, `http://*/*`

### Key Constraints
- **No external APIs** - All processing happens in browser
- **No build step** - Direct file loading
- **Manifest V3** - Modern Chrome extension format
- **Content Security Policy** - No inline scripts

### Performance Requirements
- Injection latency: < 100ms
- Streaming extraction: Real-time (300ms intervals)
- Memory: < 50MB for content script

## Development Workflow

### Version Control
```bash
# Branch naming
feature/two-pass-implementation
fix/llm-detection-gemini
refactor/sidepanel-ui

# Commit format
feat: add two-pass optimization flow
fix: correct Gemini input selector
docs: update CLAUDE.md
```

### Testing Approach
1. **Manual Testing**: Load unpacked extension in Chrome
2. **LLM Testing**: Test on each target platform (Gemini/ChatGPT/Claude)
3. **Edge Cases**: Test with various prompt lengths and types

### Deployment
```bash
# 1. Update version in manifest.json
# 2. Load unpacked extension for testing
# 3. Zip for Chrome Web Store distribution
zip -r babelprompt-v4.0.zip . -x "*.git*" "*.DS_Store"
```

## Known Limitations

### Current Constraints
- **LLM Platform Detection**: URL-based only (may break with platform changes)
- **Streaming Extraction**: Heuristic-based (2-second stability check)
- **Error Handling**: Limited feedback to user
- **Test Coverage**: No automated tests

### Platform-Specific Issues
| Platform | Status | Notes |
|----------|--------|-------|
| Gemini | 🟢 Tested | Stable selectors |
| ChatGPT | 🟡 Partial | Selectors may change |
| Claude | 🟡 Partial | Streaming detection needs work |

### Future Work
- Automated E2E tests
- Fallback selector strategies
- User analytics (opt-in)
- More LLM platforms (Grok, DeepSeek, etc.)

## Configuration Files

### LLM Platform Config (Planned)
```javascript
const LLM_CONFIG = {
  gemini: {
    domains: ['gemini.google.com'],
    input: 'div[contenteditable="true"]',
    output: ['.markdown'],
    submit: 'button[aria-label*="send"]'
  },
  // ...
}
```

### Stream Config (Planned)
```javascript
const STREAM_CONFIG = {
  checkInterval: 300,      // ms between checks
  minBatchSize: 50,        // chars before batch
  stabilityTimeout: 2000,  // ms to wait for completion
  typingSpeed: 30          // ms per character
}
```

## Session Log

### [2026-01-08] - Architecture Cleanup & Restructure
**Status**: ✅ COMPLETED

**Changes**:
- ✅ Removed React project remnants (index.tsx, src/)
- ✅ Flattened project structure (moved chrome-extension/* to root)
- ✅ Updated README.md to reflect Side Panel architecture
- ✅ Reduced code by 30% (content.js: 957 → 667 lines)
- ✅ Cleaned up 80+ obsolete files

**Project Structure**:
```
.
├── manifest.json          # v4.0.0
├── background.js          # Service worker
├── content.js             # Content script (667 lines)
├── sidepanel.*            # Side Panel UI
├── lib/                   # Libraries
├── .ado/                  # ADO documentation
└── README.md              # Updated documentation
```

### [2025-01-08] - Initial Assessment by ADO v3.0
**Status**: 🟢 READY FOR DEVELOPMENT

**Objective**: Implement two-pass optimization mode with streaming injection

**Requirements Confirmed**:
- ✅ Free (no paid APIs)
- ✅ Two-pass mode (Meta-Prompt → Optimized Prompt → Result)
- ✅ Multi-LLM support (Gemini/ChatGPT/Claude)
- ✅ Auto-detect LLM platform
- ✅ Batch injection (50 char threshold, 30ms typing)
- ✅ Error display in Side Panel

**Next Steps**:
1. Test on target LLM platforms
2. Add automated E2E tests
3. Improve error handling and fallback
