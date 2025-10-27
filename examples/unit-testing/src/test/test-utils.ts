import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

/**
 * Testing utilities for common patterns and edge cases
 * These utilities help maintain consistency across tests and reduce code duplication
 */

/**
 * Utility to test button click behavior with edge cases
 */
export const testButtonClicks = {
  /**
   * Test rapid consecutive clicks
   */
  rapid: (button: HTMLElement, expectedResult: () => void, clicks = 10) => {
    for (let i = 0; i < clicks; i++) {
      fireEvent.click(button);
    }
    expectedResult();
  },

  /**
   * Test double clicks
   */
  double: (button: HTMLElement, expectedResult: () => void) => {
    fireEvent.doubleClick(button);
    expectedResult();
  },

  /**
   * Test clicks with keyboard events
   */
  withKeyboard: (button: HTMLElement, expectedResult: () => void) => {
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyUp(button, { key: "Enter" });
    expectedResult();
  },
};

/**
 * Utility to test async operations with various scenarios
 */
export const testAsync = {
  /**
   * Test async operation with timeout
   */
  withTimeout: async (
    asyncFn: () => Promise<any>,
    timeoutMs = 5000
  ) => {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Test timeout")), timeoutMs)
    );
    
    return Promise.race([asyncFn(), timeoutPromise]);
  },

  /**
   * Test async operation that should fail
   */
  expectFailure: async (
    asyncFn: () => Promise<any>,
    expectedError?: string
  ) => {
    try {
      await asyncFn();
      throw new Error("Expected async operation to fail");
    } catch (error) {
      if (expectedError && error instanceof Error) {
        expect(error.message).toContain(expectedError);
      }
    }
  },

  /**
   * Test multiple concurrent async operations
   */
  concurrent: async (
    asyncFns: (() => Promise<any>)[],
    expectedResults?: any[]
  ) => {
    const results = await Promise.all(asyncFns.map(fn => fn()));
    if (expectedResults) {
      expect(results).toEqual(expectedResults);
    }
    return results;
  },
};

/**
 * Utility to test accessibility features
 */
export const testAccessibility = {
  /**
   * Test keyboard navigation
   */
  keyboardNavigation: (elements: HTMLElement[]) => {
    elements.forEach((element) => {
      element.focus();
      expect(document.activeElement).toBe(element);
    });
  },

  /**
   * Test ARIA attributes
   */
  ariaAttributes: (element: HTMLElement, expectedAttributes: Record<string, string>) => {
    Object.entries(expectedAttributes).forEach(([attr, value]) => {
      expect(element).toHaveAttribute(attr, value);
    });
  },

  /**
   * Test screen reader compatibility
   */
  screenReader: (element: HTMLElement, expectedText: string) => {
    expect(element).toHaveAccessibleName(expectedText);
  },
};

/**
 * Utility to test error scenarios
 */
export const testErrorScenarios = {
  /**
   * Test component with console errors
   */
  withConsoleErrors: (testFn: () => void) => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    try {
      testFn();
    } finally {
      consoleSpy.mockRestore();
    }
  },

  /**
   * Test component with network errors
   */
  withNetworkErrors: async (
    mockFn: ReturnType<typeof vi.fn>,
    errorMessage: string,
    testFn: () => Promise<void>
  ) => {
    mockFn.mockRejectedValueOnce(new Error(errorMessage));
    try {
      await testFn();
    } catch (error) {
      // Errors are expected in this test utility
    }
    expect(mockFn).toHaveBeenCalled();
  },

  /**
   * Test component with invalid props
   */
  withInvalidProps: (renderFn: (props: any) => void, invalidProps: any[]) => {
    invalidProps.forEach(props => {
      expect(() => renderFn(props)).not.toThrow();
    });
  },
};

/**
 * Utility to test performance scenarios
 */
export const testPerformance = {
  /**
   * Test component render time
   */
  renderTime: (renderFn: () => void, maxTimeMs = 100) => {
    const startTime = performance.now();
    renderFn();
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(maxTimeMs);
  },

  /**
   * Test memory usage (basic)
   */
  memoryUsage: (testFn: () => void) => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    testFn();
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Basic check - should not leak excessive memory
    const memoryDiff = finalMemory - initialMemory;
    expect(memoryDiff).toBeLessThan(10 * 1024 * 1024); // 10MB limit
  },
};

/**
 * Utility to create mock functions with enhanced tracking
 */
export const createEnhancedMock = <T extends (...args: any[]) => any>(
  implementation?: T
) => {
  const mock = vi.fn(implementation);
  
  return {
    mock,
    expectCalled: (times?: number) => {
      if (times !== undefined) {
        expect(mock).toHaveBeenCalledTimes(times);
      } else {
        expect(mock).toHaveBeenCalled();
      }
    },
    expectCalledWith: (...args: Parameters<T>) => {
      expect(mock).toHaveBeenCalledWith(...args);
    },
    expectNotCalled: () => {
      expect(mock).not.toHaveBeenCalled();
    },
    getCallHistory: () => mock.mock.calls,
    reset: () => mock.mockClear(),
  };
};

/**
 * Utility to test component state changes
 */
export const testStateChanges = {
  /**
   * Test state changes over time
   */
  overTime: async (
    getState: () => any,
    expectedStates: any[],
    intervalMs = 100
  ) => {
    for (const expectedState of expectedStates) {
      expect(getState()).toEqual(expectedState);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  },

  /**
   * Test state persistence
   */
  persistence: (
    renderComponent: () => void,
    getState: () => any,
    changeState: () => void,
    expectedState: any
  ) => {
    renderComponent();
    changeState();
    expect(getState()).toEqual(expectedState);
    
    // Re-render and check if state persists
    renderComponent();
    expect(getState()).toEqual(expectedState);
  },
};

/**
 * Utility for common test data
 */
export const testData = {
  numbers: {
    zero: 0,
    positive: [1, 5, 10, 100, 999, 1000, 9999],
    negative: [-1, -5, -10, -100, -999],
    decimal: [0.1, 1.5, 2.7, 10.99],
    large: [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1],
    edge: [Number.MIN_VALUE, Number.EPSILON],
  },
  strings: {
    empty: "",
    short: "a",
    normal: "hello world",
    long: "a".repeat(1000),
    special: "!@#$%^&*()_+-=[]{}|;:,.<>?",
    unicode: "🌟✨🎉",
    multiline: "line1\nline2\nline3",
  },
  async: {
    immediate: () => Promise.resolve("immediate"),
    delayed: (ms = 100) => new Promise(resolve => 
      setTimeout(() => resolve("delayed"), ms)
    ),
    rejected: (message = "error") => Promise.reject(new Error(message)),
  },
};

/**
 * Utility to group related tests
 */
export const testGroup = {
  /**
   * Run a test with multiple data sets
   */
  withDataSets: <T>(
    testName: string,
    datasets: { name: string; data: T }[],
    testFn: (data: T) => void
  ) => {
    describe(testName, () => {
      datasets.forEach(({ name, data }) => {
        it(`should work with ${name}`, () => testFn(data));
      });
    });
  },

  /**
   * Run edge case tests
   */
  edgeCases: (testName: string, testFns: Record<string, () => void>) => {
    describe(`${testName} - Edge Cases`, () => {
      Object.entries(testFns).forEach(([caseName, testFn]) => {
        it(`should handle ${caseName}`, testFn);
      });
    });
  },
};