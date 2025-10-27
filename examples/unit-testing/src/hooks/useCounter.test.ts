import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useCounter } from "./useCounter";

describe("useCounter", () => {
  describe("Initialization", () => {
    it("should initialize with the correct value", () => {
      const { result } = renderHook(() => useCounter(5));
      expect(result.current.count).toBe(5);
    });

    it("should initialize with zero when no initial value provided", () => {
      const { result } = renderHook(() => useCounter(0));
      expect(result.current.count).toBe(0);
    });

    it("should initialize with negative values", () => {
      const { result } = renderHook(() => useCounter(-5));
      expect(result.current.count).toBe(-5);
    });

    it("should initialize with large numbers", () => {
      const { result } = renderHook(() => useCounter(999999));
      expect(result.current.count).toBe(999999);
    });

    it("should initialize with decimal numbers (should work as float)", () => {
      const { result } = renderHook(() => useCounter(1.5));
      expect(result.current.count).toBe(1.5);
    });
  });

  describe("Increment functionality", () => {
    it("should increment the count", () => {
      const { result } = renderHook(() => useCounter(0));
      act(() => {
        result.current.increment();
      });
      expect(result.current.count).toBe(1);
    });

    it("should increment multiple times correctly", () => {
      const { result } = renderHook(() => useCounter(0));
      act(() => {
        result.current.increment();
        result.current.increment();
        result.current.increment();
      });
      expect(result.current.count).toBe(3);
    });

    it("should increment from negative numbers", () => {
      const { result } = renderHook(() => useCounter(-3));
      act(() => {
        result.current.increment();
      });
      expect(result.current.count).toBe(-2);
    });

    it("should handle rapid consecutive increments", () => {
      const { result } = renderHook(() => useCounter(0));
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.increment();
        }
      });
      expect(result.current.count).toBe(100);
    });
  });

  describe("Decrement functionality", () => {
    it("should decrement the count", () => {
      const { result } = renderHook(() => useCounter(1));
      act(() => {
        result.current.decrement();
      });
      expect(result.current.count).toBe(0);
    });

    it("should not decrement below 0", () => {
      const { result } = renderHook(() => useCounter(0));
      act(() => {
        result.current.decrement();
      });
      expect(result.current.count).toBe(0);
    });

    it("should not decrement below 0 when called multiple times", () => {
      const { result } = renderHook(() => useCounter(0));
      act(() => {
        result.current.decrement();
        result.current.decrement();
        result.current.decrement();
      });
      expect(result.current.count).toBe(0);
    });

    it("should decrement from positive numbers to zero", () => {
      const { result } = renderHook(() => useCounter(5));
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.decrement();
        }
      });
      expect(result.current.count).toBe(0);
    });

    it("should handle negative initial values correctly", () => {
      const { result } = renderHook(() => useCounter(-5));
      act(() => {
        result.current.decrement();
      });
      // Should apply Math.max(-5 - 1, 0) = Math.max(-6, 0) = 0
      expect(result.current.count).toBe(0);
    });
  });

  describe("Callback functionality", () => {
    it("should call callback on increment", () => {
      const mockCallback = vi.fn();
      const { result } = renderHook(() => useCounter(0, mockCallback));
      
      act(() => {
        result.current.increment();
      });
      
      expect(mockCallback).toHaveBeenCalledWith(1);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it("should call callback on decrement", () => {
      const mockCallback = vi.fn();
      const { result } = renderHook(() => useCounter(1, mockCallback));
      
      act(() => {
        result.current.decrement();
      });
      
      expect(mockCallback).toHaveBeenCalledWith(0);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it("should call callback with correct value on multiple operations", () => {
      const mockCallback = vi.fn();
      const { result } = renderHook(() => useCounter(0, mockCallback));
      
      act(() => {
        result.current.increment();
        result.current.increment();
        result.current.decrement();
      });
      
      expect(mockCallback).toHaveBeenNthCalledWith(1, 1);
      expect(mockCallback).toHaveBeenNthCalledWith(2, 2);
      expect(mockCallback).toHaveBeenNthCalledWith(3, 1);
      expect(mockCallback).toHaveBeenCalledTimes(3);
    });

    it("should call callback even when decrement is blocked at zero", () => {
      const mockCallback = vi.fn();
      const { result } = renderHook(() => useCounter(0, mockCallback));
      
      act(() => {
        result.current.decrement();
      });
      
      expect(mockCallback).toHaveBeenCalledWith(0);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it("should work without callback", () => {
      const { result } = renderHook(() => useCounter(0));
      
      expect(() => {
        act(() => {
          result.current.increment();
          result.current.decrement();
        });
      }).not.toThrow();
      
      expect(result.current.count).toBe(0);
    });
  });

  describe("Edge cases and boundary conditions", () => {
    it("should handle zero initialization correctly", () => {
      const { result } = renderHook(() => useCounter(0));
      expect(result.current.count).toBe(0);
      
      act(() => {
        result.current.increment();
      });
      expect(result.current.count).toBe(1);
      
      act(() => {
        result.current.decrement();
      });
      expect(result.current.count).toBe(0);
    });

    it("should handle mixed increment/decrement operations", () => {
      const { result } = renderHook(() => useCounter(5));
      
      act(() => {
        result.current.increment(); // 6
        result.current.decrement(); // 5
        result.current.decrement(); // 4
        result.current.increment(); // 5
        result.current.increment(); // 6
      });
      
      expect(result.current.count).toBe(6);
    });

    it("should handle very large numbers", () => {
      const { result } = renderHook(() => useCounter(Number.MAX_SAFE_INTEGER - 1));
      
      act(() => {
        result.current.increment();
      });
      
      expect(result.current.count).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should handle fractional operations", () => {
      const { result } = renderHook(() => useCounter(1.5));
      
      act(() => {
        result.current.increment(); // 2.5
        result.current.decrement(); // 1.5
        result.current.decrement(); // 0.5
        result.current.decrement(); // Should be Math.max(-0.5, 0) = 0
      });
      
      expect(result.current.count).toBe(0);
    });
  });

  describe("State consistency", () => {
    it("should maintain state consistency across re-renders", () => {
      const { result, rerender } = renderHook(
        ({ initialValue, callback }) => useCounter(initialValue, callback),
        {
          initialProps: { initialValue: 0, callback: undefined }
        }
      );
      
      act(() => {
        result.current.increment();
      });
      expect(result.current.count).toBe(1);
      
      // Re-render with same props shouldn't reset state
      rerender({ initialValue: 0, callback: undefined });
      expect(result.current.count).toBe(1);
    });

    it("should handle callback changes without affecting count", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const { result, rerender } = renderHook(
        ({ callback }) => useCounter(0, callback),
        { initialProps: { callback: callback1 } }
      );
      
      act(() => {
        result.current.increment();
      });
      expect(result.current.count).toBe(1);
      expect(callback1).toHaveBeenCalledWith(1);
      
      // Change callback
      rerender({ callback: callback2 });
      
      act(() => {
        result.current.increment();
      });
      expect(result.current.count).toBe(2);
      expect(callback2).toHaveBeenCalledWith(2);
      expect(callback1).toHaveBeenCalledTimes(1);
    });
  });
});
