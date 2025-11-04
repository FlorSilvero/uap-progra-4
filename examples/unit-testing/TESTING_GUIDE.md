# Comprehensive Unit Testing Guide

This document outlines the comprehensive unit testing strategy implemented for this application using Vitest and Testing Library.

## Testing Philosophy

### What Should Be Mocked vs. Tested Directly

#### **Mock These (External Dependencies):**
- **HTTP API calls** (fetch, axios) - Use `vi.mock()` to control responses
- **External services** - Mock to avoid network dependencies
- **Timers and delays** - Use `vi.useFakeTimers()` for predictable tests
- **Browser APIs** - Mock `localStorage`, `sessionStorage`, etc.
- **Third-party libraries** - Mock when testing integration, not the library itself
- **Environment variables** - Mock to test different configurations

#### **Test Directly (Business Logic):**
- **Pure functions** - State transformations, calculations, validations
- **Component behavior** - User interactions, rendering, state changes
- **Business rules** - Data validation, filtering, sorting logic
- **Error handling** - How the app responds to various error conditions
- **State management** - Store updates, mutations, selectors

## Test Structure and Organization

### 1. Component Tests (`*.test.tsx`)
- **Rendering tests** - Component displays correctly
- **Interaction tests** - Button clicks, form submissions, user events
- **Props tests** - Different prop combinations and edge cases
- **State tests** - Component state changes over time
- **Accessibility tests** - ARIA attributes, keyboard navigation

### 2. Hook Tests (`*.test.ts`)
- **Initialization** - Hook starts with correct initial state
- **State updates** - Hook state changes correctly
- **Side effects** - useEffect behavior and cleanup
- **Edge cases** - Boundary conditions and error scenarios
- **Callback handling** - Function props and event handlers

### 3. Service Tests (`*.test.ts`)
- **API interactions** - Mocked HTTP calls and responses
- **Data transformations** - Input/output validation
- **Error scenarios** - Network errors, malformed data
- **Performance** - Async behavior and timing

### 4. Business Logic Tests (`business-logic.test.ts`)
- **Data validation** - Input sanitization and validation rules
- **State transformations** - Pure function testing
- **Complex logic** - Algorithms, calculations, business rules
- **Edge cases** - Boundary conditions, null/undefined handling

### 5. Integration Tests (`integration.test.tsx`)
- **Full user flows** - Complete interactions across components
- **Component integration** - How components work together
- **State management** - Cross-component state sharing
- **Real-world scenarios** - Typical user behavior patterns

## Edge Cases and Boundary Testing

### Numeric Edge Cases
```typescript
// Always test these numeric boundaries
const numericEdgeCases = [
  0,                           // Zero
  -1,                          // Negative
  Number.MAX_SAFE_INTEGER,     // Maximum safe integer
  Number.MIN_SAFE_INTEGER,     // Minimum safe integer
  Number.POSITIVE_INFINITY,    // Infinity
  Number.NEGATIVE_INFINITY,    // Negative infinity
  NaN,                         // Not a number
  0.1 + 0.2,                  // Floating point precision
  1.5,                         // Decimal numbers
  Number.EPSILON,              // Smallest representable number
];
```

### String Edge Cases
```typescript
const stringEdgeCases = [
  "",                          // Empty string
  " ",                         // Whitespace only
  "a",                         // Single character
  "a".repeat(1000),           // Very long string
  "🌟✨🎉",                    // Unicode/emoji
  "Line 1\nLine 2",           // Multiline
  "!@#$%^&*()_+-=[]{}|;:,.<>?", // Special characters
  null,                        // Null
  undefined,                   // Undefined
];
```

### Array Edge Cases
```typescript
const arrayEdgeCases = [
  [],                          // Empty array
  [null],                      // Array with null
  [undefined],                 // Array with undefined
  new Array(1000).fill(0),     // Very large array
  [1, "string", null, {}],     // Mixed types
];
```

### Object Edge Cases
```typescript
const objectEdgeCases = [
  {},                          // Empty object
  null,                        // Null
  undefined,                   // Undefined
  { nested: { deep: { object: true } } }, // Deeply nested
  Object.create(null),         // Object without prototype
];
```

## Test Utilities and Helpers

### Custom Render Utilities
```typescript
// Custom render with providers
function renderWithProviders(ui: React.ReactElement, options = {}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </Provider>
  );
  
  return render(ui, { wrapper: Wrapper, ...options });
}
```

### Mock Factories
```typescript
// Reusable mock data factories
const createMockMessage = (overrides = {}): Mensaje => ({
  id: Math.random().toString(36),
  description: "Test message",
  likes: 0,
  timestamp: new Date().toISOString(),
  author: "test-user",
  ...overrides,
});
```

### Async Testing Patterns
```typescript
// Wait for async operations
await waitFor(() => {
  expect(screen.getByText("Loading...")).not.toBeInTheDocument();
});

// Find elements that appear asynchronously
const result = await screen.findByText("Data loaded");

// Test loading states
expect(screen.getByText("Loading...")).toBeInTheDocument();
fireEvent.click(loadButton);
await waitFor(() => {
  expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
});
```

## Error Testing Strategies

### Network Error Simulation
```typescript
// Mock fetch to simulate different error conditions
mockFetch.mockRejectedValueOnce(new Error("Network error"));
mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.reject() });
```

### Component Error Boundaries
```typescript
// Test component error handling
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error("Test error");
  return <div>No error</div>;
};

test("should catch and handle component errors", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  
  render(
    <ErrorBoundary>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  );
  
  expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  consoleSpy.mockRestore();
});
```

## Performance Testing

### Render Performance
```typescript
test("should render within performance threshold", () => {
  const startTime = performance.now();
  render(<ExpensiveComponent data={largeDataSet} />);
  const endTime = performance.now();
  
  expect(endTime - startTime).toBeLessThan(100); // 100ms threshold
});
```

### Memory Leak Testing
```typescript
test("should not leak memory on unmount", () => {
  const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  for (let i = 0; i < 100; i++) {
    const { unmount } = render(<Component />);
    unmount();
  }
  
  const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
  const memoryDiff = finalMemory - initialMemory;
  
  expect(memoryDiff).toBeLessThan(10 * 1024 * 1024); // 10MB threshold
});
```

## Accessibility Testing

### Screen Reader Testing
```typescript
test("should be accessible to screen readers", () => {
  render(<Component />);
  
  // Test ARIA labels
  expect(screen.getByLabelText("Button label")).toBeInTheDocument();
  
  // Test roles
  expect(screen.getByRole("button")).toBeInTheDocument();
  
  // Test accessible names
  expect(screen.getByRole("button")).toHaveAccessibleName("Save changes");
});
```

### Keyboard Navigation
```typescript
test("should support keyboard navigation", () => {
  render(<Form />);
  
  const firstInput = screen.getByLabelText("First name");
  const secondInput = screen.getByLabelText("Last name");
  
  firstInput.focus();
  expect(document.activeElement).toBe(firstInput);
  
  fireEvent.keyDown(firstInput, { key: "Tab" });
  expect(document.activeElement).toBe(secondInput);
});
```

### axe-core Integration
```typescript
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

test("should have no accessibility violations", async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Test Coverage Guidelines

### Coverage Targets
- **Statements**: 90%+
- **Branches**: 85%+
- **Functions**: 90%+
- **Lines**: 90%+

### What to Focus Coverage On
1. **Business logic functions** - 100% coverage expected
2. **Error handling paths** - All error scenarios covered
3. **User interaction flows** - All clickable elements tested
4. **State management** - All state changes covered
5. **API integration points** - All endpoints mocked and tested

### Coverage Exclusions
```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.{js,ts}",
        "**/types.ts",
        "**/*.stories.{js,ts,tsx}",
        "src/main.tsx", // Entry point
      ],
    },
  },
});
```

## Debugging Tests

### Debugging Strategies
```typescript
// Use screen.debug() to see current DOM
test("debug failing test", () => {
  render(<Component />);
  screen.debug(); // Prints current DOM
  
  // Or debug specific element
  const button = screen.getByRole("button");
  screen.debug(button);
});

// Use logRoles to see available roles
import { logRoles } from "@testing-library/dom";

test("see available roles", () => {
  const { container } = render(<Component />);
  logRoles(container);
});
```

### Common Test Failures and Solutions

#### "Unable to find element" Errors
```typescript
// Instead of this:
expect(screen.getByText("Loading")).toBeInTheDocument();

// Use this for async content:
await screen.findByText("Loading");

// Or check if it might not exist:
expect(screen.queryByText("Loading")).toBeInTheDocument();
```

#### "Act" Warnings
```typescript
// Wrap state updates in act()
await act(async () => {
  fireEvent.click(button);
  await waitFor(() => {
    expect(screen.getByText("Updated")).toBeInTheDocument();
  });
});
```

## Continuous Integration

### Test Commands
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:watch": "vitest --watch"
  }
}
```

### CI Configuration
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: npm
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Best Practices Summary

1. **Test behavior, not implementation** - Focus on what the user sees and does
2. **Use descriptive test names** - Test names should read like specifications
3. **Keep tests independent** - Each test should be able to run in isolation
4. **Test edge cases thoroughly** - Boundary conditions often reveal bugs
5. **Mock external dependencies** - Tests should be fast and reliable
6. **Test error scenarios** - Happy path is not enough
7. **Maintain test quality** - Tests are code too, keep them clean
8. **Use real user interactions** - Prefer `fireEvent` and `userEvent`
9. **Test accessibility** - Include a11y testing in your test suite
10. **Keep tests fast** - Slow tests discourage running them frequently

## File Organization

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx
│   └── Form/
│       ├── Form.tsx
│       └── Form.test.tsx
├── hooks/
│   ├── useCounter.ts
│   └── useCounter.test.ts
├── services/
│   ├── api.ts
│   └── api.test.ts
├── test/
│   ├── setup.ts
│   ├── test-utils.ts
│   ├── integration.test.tsx
│   └── business-logic.test.ts
└── types.ts
```

This comprehensive testing strategy ensures robust, maintainable, and reliable code that handles edge cases gracefully while providing excellent user experience.