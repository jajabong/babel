# Proven Patterns for BabelPrompt

## Pattern: Evidence-First Feature Development
**Context**: Avoiding hallucination in feature claims during ADO executions
**Problem**: Features claimed as "complete" without proper validation
**Solution**: Write validation test first, implement feature, capture execution proof
**Result**: Zero false claims, complete audit trail

```typescript
// Pattern Implementation
const implementFeature = async (featureSpec: FeatureSpec) => {
  // 1. Write validation test first
  const validationTest = createValidationTest(featureSpec);

  // 2. Implement feature
  const implementation = buildFeature(featureSpec);

  // 3. Run validation and capture proof
  const result = await validationTest(implementation);
  saveEvidence(featureSpec.name, result);

  return implementation;
};
```

## Pattern: Component Extraction Hierarchy
**Context**: Breaking down 688-line monolith into maintainable modules
**Problem**: Unclear extraction order and dependency management
**Solution**: Extract in dependency order, starting with UI components

1. **UI Components** (no dependencies)
   - Button, Textarea, LoadingSpinner
2. **Composite Components** (depend on UI)
   - CopyButton, MessageItem
3. **Business Components** (depend on composites)
   - MessageList, InputArea
4. **Container Components** (depend on business)
   - Sidebar, TargetLLM
5. **Layout Components** (depend on containers)
   - AppLayout, Header

**Result**: Clean dependency chain, no circular imports

## Pattern: Hook-Based Logic Extraction
**Context**: Separating business logic from UI components
**Problem**: Logic tightly coupled with component lifecycle
**Solution**: Extract into custom hooks with clear interfaces

```typescript
// Pattern Structure
const useBusinessLogic = (dependencies: Deps) => {
  const [state, setState] = useState(initialState);

  // Side effects
  useEffect(() => {
    // Handle side effects
  }, [dependencies]);

  // Computed values
  const computedValue = useMemo(() => {
    return compute(state, dependencies);
  }, [state, dependencies]);

  // Actions
  const actions = useMemo(() => ({
    action1: () => setState(update1),
    action2: () => setState(update2),
  }), []);

  return { state, computedValue, actions };
};
```

**Result**: Testable logic, reusable components, clean separation

## Pattern: Progressive Enhancement Strategy
**Context**: Migrating from inline styles to styled-components
**Problem**: Risk of breaking existing functionality
**Solution**: Gradual migration with feature flags

```typescript
// Pattern Implementation
const StyledComponent = styled.div<{ enhanced?: boolean }>`
  /* Base styles (existing inline) */
  background-color: var(--bg-color);

  /* Enhanced styles (new) */
  ${props => props.enhanced && `
    /* New CSS-in-JS styles */
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `}
`;

// Usage with feature flag
<Component
  as={StyledComponent}
  enhanced={features.styledComponents}
/>
```

**Result**: Zero-downtime migration, incremental improvements

## Pattern: API Error Handling Hierarchy
**Context**: Robust error handling for Gemini API integration
**Problem**: Cascade failures, poor user experience
**Solution**: Multi-layer error handling strategy

```typescript
// Error Handling Layers
const errorHandler = {
  // Layer 1: Network errors
  network: (error: NetworkError) => {
    return retryWithBackoff(error);
  },

  // Layer 2: API errors
  api: (error: APIError) => {
    switch (error.code) {
      case 'RATE_LIMIT': return waitForReset();
      case 'INVALID_KEY': return refreshAPIKey();
      default: return fallbackResponse();
    }
  },

  // Layer 3: Business logic errors
  business: (error: BusinessError) => {
    return userFriendlyMessage(error);
  }
};
```

**Result**: Graceful degradation, better UX, actionable error messages

## Pattern: Performance Monitoring Integration
**Context**: Measuring and optimizing app performance
**Problem**: No visibility into performance bottlenecks
**Solution**: Built-in performance monitoring

```typescript
// Performance Pattern
const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      if (renderTime > 100) { // Threshold
        console.warn(`${componentName} slow render: ${renderTime}ms`);
      }

      // Log to analytics
      analytics.track('component_performance', {
        component: componentName,
        renderTime,
        timestamp: Date.now()
      });
    };
  });
};
```

**Result**: Real-time performance insights, proactive optimization

## Pattern: Context-Based State Management
**Context**: Replacing prop drilling with efficient state management
**Problem**: Complex prop chains, component coupling
**Solution**: Context API with selector pattern

```typescript
// Context Pattern
const AppContext = createContext<AppState>();

const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('Missing AppProvider');
  return context;
};

// Selector pattern for optimized re-renders
const useProcessingState = () => {
  const { isProcessing, setProcessing } = useAppContext();
  return { isProcessing, setProcessing };
};
```

**Result**: Reduced prop drilling, optimized re-renders, better type safety