# BabelPrompt Architecture Documentation

## Current Architecture (Monolithic)
```
index.tsx (688 lines)
├── META_PROMPTS configuration
├── Type definitions
├── Sidebar component (lines 81-444)
│   ├── Mode selector
│   ├── Chat interface
│   ├── API calls
│   └── Message handling
├── TargetLLM component (lines 446-657)
│   ├── Typewriter effect
│   ├── API simulation
│   └── Message history
└── App component (lines 659-685)
    ├── State management
    └── Component orchestration
```

## Target Architecture (Modular)
```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   └── Header.tsx
│   ├── sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── ModeSelector.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageItem.tsx
│   │   ├── CopyButton.tsx
│   │   └── InputArea.tsx
│   ├── target/
│   │   ├── TargetLLM.tsx
│   │   ├── TargetHeader.tsx
│   │   ├── ChatHistory.tsx
│   │   └── TargetInput.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Textarea.tsx
│       └── LoadingSpinner.tsx
├── hooks/
│   ├── useGeminiAPI.ts
│   ├── useTypewriter.ts
│   ├── useChatState.ts
│   └── useLocalStorage.ts
├── services/
│   ├── api.ts
│   └── promptOptimization.ts
├── types/
│   ├── chat.ts
│   └── prompt.ts
├── constants/
│   ├── metaPrompts.ts
│   └── config.ts
├── styles/
│   ├── variables.css
│   ├── components/
│   └── global.css
└── utils/
    ├── formatting.ts
    └── validation.ts
```

## State Management Strategy

### Current Issues
- Prop drilling through component tree
- State scattered across components
- No global state management

### Proposed Solution
```typescript
// AppContext.tsx
interface AppState {
  isProcessing: boolean;
  pendingPrompt: string | null;
  chatHistory: ChatMessage[];
  selectedMode: ModeKey;
  settings: UserSettings;
}

// Custom hooks for specific state concerns
const useAppState = () => { /* ... */ };
const useChatState = () => { /* ... */ };
const useModeState = () => { /* ... */ };
```

## Component Communication Patterns

### Current Pattern
```typescript
<App>
  <Sidebar onPromptGenerated={handlePromptGenerated} />
  <TargetLLM incomingPrompt={pendingPrompt} />
</App>
```

### Target Pattern
```typescript
<AppProvider>
  <AppLayout>
    <Sidebar />
    <TargetLLM />
  </AppLayout>
</AppProvider>
```

## Data Flow Architecture

### API Layer
```typescript
services/
├── api.ts              // HTTP client configuration
├── geminiAPI.ts        // Gemini-specific API calls
└── promptAPI.ts        // Prompt optimization API
```

### Business Logic Layer
```typescript
hooks/
├── useGeminiAPI.ts     // API state management
├── useOptimization.ts  // Prompt optimization logic
├── useTypewriter.ts    // UI animation logic
└── useValidation.ts    // Input validation
```

## Performance Considerations

### Current Performance Issues
- Large component re-renders
- No memoization
- Inline styles cause re-calculations
- No code splitting

### Optimization Strategy
- React.memo for component memoization
- useMemo/useCallback for expensive operations
- Code splitting with React.lazy
- Virtualization for long message lists
- CSS-in-JS for optimized styles

## Security Architecture

### Current Security Concerns
- API key in frontend code
- No input sanitization
- No error boundaries
- No CSP headers

### Security Improvements
- Backend API proxy for API keys
- Input validation and sanitization
- Error boundaries for graceful failures
- Content Security Policy implementation
- Rate limiting for API calls