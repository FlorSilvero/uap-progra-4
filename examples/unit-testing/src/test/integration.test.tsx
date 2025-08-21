import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Home from "@/app/page";
import { Counter } from "@/app/Counter";
import { useCounter } from "@/hooks/useCounter";
import { getData } from "@/services/getData";
import {
  testButtonClicks,
  testAsync,
  testAccessibility,
  testErrorScenarios,
  testPerformance,
  createEnhancedMock,
  testData,
  testGroup,
} from "@/test/test-utils";

// Mock the getData service
vi.mock("@/services/getData", () => ({
  getData: vi.fn(() => Promise.resolve("integration test data")),
}));

const mockGetData = vi.mocked(getData);

describe("Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Full Application Flow", () => {
    it("should handle complete user interaction flow", async () => {
      render(<Home />);

      // Initial state verification
      expect(screen.getByText("Counter")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByLabelText("external-data")).toHaveTextContent("Data from Service:");

      // Counter interactions
      const incrementButton = screen.getByRole("button", { name: "increment" });
      const decrementButton = screen.getByRole("button", { name: "decrement" });

      // Test increment sequence
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      expect(screen.getByText("3")).toBeInTheDocument();

      // Test decrement sequence
      fireEvent.click(decrementButton);
      expect(screen.getByText("2")).toBeInTheDocument();

      // Test data fetching
      const dataElement = screen.getByLabelText("external-data");
      fireEvent.click(dataElement);
      expect(mockGetData).toHaveBeenCalled();

      // Wait for data to load
      await screen.findByText("Data from Service: integration test data");

      // Verify counter state is maintained
      expect(screen.getByText("2")).toBeInTheDocument();

      // Continue counter operations after data load
      fireEvent.click(incrementButton);
      expect(screen.getByText("3")).toBeInTheDocument();

      // Test boundary conditions
      fireEvent.click(decrementButton);
      fireEvent.click(decrementButton);
      fireEvent.click(decrementButton);
      expect(screen.getByText("0")).toBeInTheDocument();

      // Test that decrement doesn't go below 0
      fireEvent.click(decrementButton);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should handle rapid user interactions", async () => {
      render(<Home />);

      const incrementButton = screen.getByRole("button", { name: "increment" });
      const dataElement = screen.getByLabelText("external-data");

      // Rapid counter interactions
      testButtonClicks.rapid(incrementButton, () => {
        expect(screen.getByText("10")).toBeInTheDocument();
      });

      // Rapid data fetching - but don't expect exact call count since it's async
      for (let i = 0; i < 5; i++) {
        fireEvent.click(dataElement);
      }
      
      // Just verify that data eventually loads
      await screen.findByText("Data from Service: integration test data");
      expect(mockGetData).toHaveBeenCalled();
    });

    it("should maintain state consistency across complex interactions", () => {
      render(<Home />);

      const incrementButton = screen.getByRole("button", { name: "increment" });
      const decrementButton = screen.getByRole("button", { name: "decrement" });

      // Complex interaction pattern
      fireEvent.click(incrementButton); // 1
      fireEvent.click(incrementButton); // 2
      fireEvent.click(decrementButton); // 1
      fireEvent.click(incrementButton); // 2
      fireEvent.click(incrementButton); // 3
      fireEvent.click(decrementButton); // 2
      fireEvent.click(decrementButton); // 1
      fireEvent.click(decrementButton); // 0
      fireEvent.click(decrementButton); // 0 (should not go below)
      fireEvent.click(incrementButton); // 1

      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  describe("Error Handling Integration", () => {
    it("should gracefully handle service errors", async () => {
      testErrorScenarios.withNetworkErrors(
        mockGetData,
        "Service unavailable",
        async () => {
          render(<Home />);

          const dataElement = screen.getByLabelText("external-data");
          fireEvent.click(dataElement);

          // Component should not crash
          expect(screen.getByText("Counter")).toBeInTheDocument();
          expect(screen.getByText("0")).toBeInTheDocument();
        }
      );
    });

    it("should handle component errors without affecting other features", () => {
      testErrorScenarios.withConsoleErrors(() => {
        render(<Home />);

        // Even if there are console errors, basic functionality should work
        const incrementButton = screen.getByRole("button", { name: "increment" });
        fireEvent.click(incrementButton);
        expect(screen.getByText("1")).toBeInTheDocument();
      });
    });
  });

  describe("Performance Integration", () => {
    it("should render within performance thresholds", () => {
      testPerformance.renderTime(() => {
        render(<Home />);
        expect(screen.getByText("Counter")).toBeInTheDocument();
      });
    });

    it("should handle memory efficiently", () => {
      testPerformance.memoryUsage(() => {
        // Render and unmount multiple times to test memory leaks
        for (let i = 0; i < 10; i++) {
          const { unmount } = render(<Home />);
          unmount();
        }
      });
    });
  });

  describe("Accessibility Integration", () => {
    it("should maintain accessibility across all interactions", () => {
      render(<Home />);

      const dataElement = screen.getByLabelText("external-data");
      const incrementButton = screen.getByRole("button", { name: "increment" });
      const decrementButton = screen.getByRole("button", { name: "decrement" });

      // Test individual element focus
      dataElement.focus();
      expect(document.activeElement).toBe(dataElement);
      
      incrementButton.focus();
      expect(document.activeElement).toBe(incrementButton);
      
      decrementButton.focus();
      expect(document.activeElement).toBe(decrementButton);

      // Test ARIA attributes
      testAccessibility.ariaAttributes(incrementButton, {
        "aria-label": "increment",
      });
      testAccessibility.ariaAttributes(decrementButton, {
        "aria-label": "decrement",
      });

      // Test after interactions
      fireEvent.click(incrementButton);
      incrementButton.focus();
      expect(document.activeElement).toBe(incrementButton);
    });
  });

  describe("Component Integration Edge Cases", () => {
    testGroup.withDataSets(
      "Counter with various initial values",
      [
        { name: "zero", data: 0 },
        { name: "positive", data: 5 },
        { name: "negative", data: -3 },
        { name: "large", data: 999 },
        { name: "decimal", data: 1.5 },
      ],
      (initialValue) => {
        const mockCallback = createEnhancedMock();
        render(<Counter initialCount={initialValue} onChange={mockCallback.mock} />);

        const incrementButton = screen.getByRole("button", { name: "increment" });
        fireEvent.click(incrementButton);

        expect(screen.getByText(String(initialValue + 1))).toBeInTheDocument();
        mockCallback.expectCalledWith(initialValue + 1);
      }
    );

    testGroup.edgeCases("Data fetching scenarios", {
      "empty response": async () => {
        mockGetData.mockResolvedValueOnce("");
        render(<Home />);

        const dataElement = screen.getByLabelText("external-data");
        fireEvent.click(dataElement);

        expect(dataElement).toHaveTextContent("Data from Service:");
      },

      "null response": async () => {
        mockGetData.mockResolvedValueOnce(null as any);
        render(<Home />);

        const dataElement = screen.getByLabelText("external-data");
        fireEvent.click(dataElement);

        expect(dataElement).toHaveTextContent("Data from Service:");
      },

      "very long response": async () => {
        const longResponse = "x".repeat(1000);
        mockGetData.mockResolvedValueOnce(longResponse);
        render(<Home />);

        const dataElement = screen.getByLabelText("external-data");
        fireEvent.click(dataElement);

        await screen.findByText(`Data from Service: ${longResponse}`);
      },

      "unicode response": async () => {
        const unicodeResponse = "🌟✨🎉";
        mockGetData.mockResolvedValueOnce(unicodeResponse);
        render(<Home />);

        const dataElement = screen.getByLabelText("external-data");
        fireEvent.click(dataElement);

        await screen.findByText(`Data from Service: ${unicodeResponse}`);
      },
    });
  });

  describe("Async Operation Integration", () => {
    it("should handle concurrent async operations", async () => {
      mockGetData.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve("concurrent data"), 50)
        )
      );

      render(<Home />);
      const dataElement = screen.getByLabelText("external-data");

      // Start multiple async operations
      await testAsync.concurrent([
        async () => {
          fireEvent.click(dataElement);
          return screen.findByText("Data from Service: concurrent data");
        },
        async () => {
          const incrementButton = screen.getByRole("button", { name: "increment" });
          fireEvent.click(incrementButton);
          return screen.findByText("1");
        },
      ]);

      expect(mockGetData).toHaveBeenCalled();
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("should handle async operations with timeout", async () => {
      mockGetData.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve("timeout test"), 100)
        )
      );

      render(<Home />);
      const dataElement = screen.getByLabelText("external-data");

      await testAsync.withTimeout(async () => {
        fireEvent.click(dataElement);
        return screen.findByText("Data from Service: timeout test");
      }, 200);
    });
  });

  describe("State Management Integration", () => {
    it("should properly isolate component states", () => {
      // Render multiple instances
      const { unmount: unmount1 } = render(<Counter initialCount={5} />);
      expect(screen.getByText("5")).toBeInTheDocument();

      const incrementButton1 = screen.getByRole("button", { name: "increment" });
      fireEvent.click(incrementButton1);
      expect(screen.getByText("6")).toBeInTheDocument();

      unmount1();

      // Render new instance - should not retain previous state
      render(<Counter initialCount={3} />);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should handle component reinitialization correctly", () => {
      // Test that the component behavior is consistent when re-created
      const { unmount } = render(<Counter initialCount={0} />);

      const incrementButton = screen.getByRole("button", { name: "increment" });
      fireEvent.click(incrementButton);
      expect(screen.getByText("1")).toBeInTheDocument();

      unmount();

      // Create new instance - should start fresh
      render(<Counter initialCount={10} />);
      expect(screen.getByText("10")).toBeInTheDocument();
      
      const newIncrementButton = screen.getByRole("button", { name: "increment" });
      fireEvent.click(newIncrementButton);
      expect(screen.getByText("11")).toBeInTheDocument();
    });
  });

  describe("Real-world Usage Patterns", () => {
    it("should handle typical user session", async () => {
      // Reset mock to avoid interference from other tests
      mockGetData.mockClear();
      mockGetData.mockResolvedValue("integration test data");
      
      render(<Home />);

      // User checks initial state
      expect(screen.getByText("0")).toBeInTheDocument();

      // User increments counter several times
      const incrementButton = screen.getByRole("button", { name: "increment" });
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);

      // User checks data
      const dataElement = screen.getByLabelText("external-data");
      fireEvent.click(dataElement);
      await screen.findByText("Data from Service: integration test data");

      // User continues with counter
      fireEvent.click(incrementButton);
      expect(screen.getByText("6")).toBeInTheDocument();

      // User decrements a few times
      const decrementButton = screen.getByRole("button", { name: "decrement" });
      fireEvent.click(decrementButton);
      fireEvent.click(decrementButton);
      expect(screen.getByText("4")).toBeInTheDocument();

      // User checks data again
      fireEvent.click(dataElement);
      expect(mockGetData).toHaveBeenCalledTimes(2);
    });

    it("should handle edge case user behavior", () => {
      render(<Home />);

      const incrementButton = screen.getByRole("button", { name: "increment" });
      const decrementButton = screen.getByRole("button", { name: "decrement" });

      // User mashes decrement button when counter is at 0
      for (let i = 0; i < 20; i++) {
        fireEvent.click(decrementButton);
      }
      expect(screen.getByText("0")).toBeInTheDocument();

      // User increments once then mashes decrement again
      fireEvent.click(incrementButton);
      for (let i = 0; i < 20; i++) {
        fireEvent.click(decrementButton);
      }
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });
});