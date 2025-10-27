import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Counter } from "./Counter";

describe("Counter Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering and Initial State", () => {
    it("renders correctly", () => {
      render(<Counter />);

      expect(
        screen.getByRole("heading", { name: /counter/i })
      ).toBeInTheDocument();
    });

    it("renders with default initial count of 0", () => {
      render(<Counter />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("renders with custom initial count", () => {
      render(<Counter initialCount={5} />);
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("renders with negative initial count", () => {
      render(<Counter initialCount={-3} />);
      expect(screen.getByText("-3")).toBeInTheDocument();
    });

    it("renders with large initial count", () => {
      render(<Counter initialCount={999} />);
      expect(screen.getByText("999")).toBeInTheDocument();
    });

    it("renders with decimal initial count", () => {
      render(<Counter initialCount={1.5} />);
      expect(screen.getByText("1.5")).toBeInTheDocument();
    });

    it("renders increment and decrement buttons", () => {
      render(<Counter />);
      
      expect(screen.getByRole("button", { name: /increment/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /decrement/i })).toBeInTheDocument();
    });
  });

  describe("Increment Functionality", () => {
    it("increments the count", () => {
      const onChangeMock = vi.fn();
      render(<Counter onChange={onChangeMock} />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      fireEvent.click(incrementButton);
      
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(onChangeMock).toHaveBeenCalledWith(1);
    });

    it("increments multiple times correctly", () => {
      const onChangeMock = vi.fn();
      render(<Counter onChange={onChangeMock} />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(onChangeMock).toHaveBeenNthCalledWith(1, 1);
      expect(onChangeMock).toHaveBeenNthCalledWith(2, 2);
      expect(onChangeMock).toHaveBeenNthCalledWith(3, 3);
      expect(onChangeMock).toHaveBeenCalledTimes(3);
    });

    it("increments from negative numbers", () => {
      render(<Counter initialCount={-2} />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      fireEvent.click(incrementButton);
      
      expect(screen.getByText("-1")).toBeInTheDocument();
    });

    it("increments from large numbers", () => {
      render(<Counter initialCount={999} />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      fireEvent.click(incrementButton);
      
      expect(screen.getByText("1000")).toBeInTheDocument();
    });

    it("works without onChange callback", () => {
      render(<Counter />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      
      expect(() => fireEvent.click(incrementButton)).not.toThrow();
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  describe("Decrement Functionality", () => {
    it("decrements the count", () => {
      render(<Counter initialCount={1} />);
      
      const decrementButton = screen.getByRole("button", { name: /decrement/i });
      fireEvent.click(decrementButton);
      
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("decrements multiple times correctly", () => {
      const onChangeMock = vi.fn();
      render(<Counter initialCount={5} onChange={onChangeMock} />);
      
      const decrementButton = screen.getByRole("button", { name: /decrement/i });
      fireEvent.click(decrementButton);
      fireEvent.click(decrementButton);
      
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(onChangeMock).toHaveBeenNthCalledWith(1, 4);
      expect(onChangeMock).toHaveBeenNthCalledWith(2, 3);
      expect(onChangeMock).toHaveBeenCalledTimes(2);
    });

    it("does not decrement below 0", () => {
      const onChangeMock = vi.fn();
      render(<Counter initialCount={0} onChange={onChangeMock} />);
      
      const decrementButton = screen.getByRole("button", { name: /decrement/i });
      fireEvent.click(decrementButton);
      
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(onChangeMock).toHaveBeenCalledWith(0);
    });

    it("decrements to zero from positive numbers", () => {
      render(<Counter initialCount={3} />);
      
      const decrementButton = screen.getByRole("button", { name: /decrement/i });
      fireEvent.click(decrementButton);
      fireEvent.click(decrementButton);
      fireEvent.click(decrementButton);
      
      expect(screen.getByText("0")).toBeInTheDocument();
      
      // Should not go below 0
      fireEvent.click(decrementButton);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("handles negative initial values by resetting to 0", () => {
      render(<Counter initialCount={-5} />);
      
      const decrementButton = screen.getByRole("button", { name: /decrement/i });
      fireEvent.click(decrementButton);
      
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("works without onChange callback", () => {
      render(<Counter initialCount={1} />);
      
      const decrementButton = screen.getByRole("button", { name: /decrement/i });
      
      expect(() => fireEvent.click(decrementButton)).not.toThrow();
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("Mixed Operations", () => {
    it("handles increment and decrement operations together", () => {
      const onChangeMock = vi.fn();
      render(<Counter initialCount={2} onChange={onChangeMock} />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      const decrementButton = screen.getByRole("button", { name: /decrement/i });
      
      fireEvent.click(incrementButton); // 3
      fireEvent.click(decrementButton); // 2
      fireEvent.click(decrementButton); // 1
      fireEvent.click(incrementButton); // 2
      
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(onChangeMock).toHaveBeenNthCalledWith(1, 3);
      expect(onChangeMock).toHaveBeenNthCalledWith(2, 2);
      expect(onChangeMock).toHaveBeenNthCalledWith(3, 1);
      expect(onChangeMock).toHaveBeenNthCalledWith(4, 2);
      expect(onChangeMock).toHaveBeenCalledTimes(4);
    });

    it("reaches zero through mixed operations and stays there", () => {
      render(<Counter initialCount={2} />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      const decrementButton = screen.getByRole("button", { name: /decrement/i });
      
      fireEvent.click(decrementButton); // 1
      fireEvent.click(decrementButton); // 0
      fireEvent.click(decrementButton); // 0 (blocked)
      fireEvent.click(incrementButton); // 1
      fireEvent.click(decrementButton); // 0
      fireEvent.click(decrementButton); // 0 (blocked)
      
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("Button Properties and Accessibility", () => {
    it("increment button has correct aria-label", () => {
      render(<Counter />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      expect(incrementButton).toHaveAttribute("aria-label", "increment");
    });

    it("decrement button has correct aria-label", () => {
      render(<Counter />);
      
      const decrementButton = screen.getByRole("button", { name: /decrement/i });
      expect(decrementButton).toHaveAttribute("aria-label", "decrement");
    });

    it("buttons are clickable", () => {
      render(<Counter />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      const decrementButton = screen.getByRole("button", { name: /decrement/i });
      
      expect(incrementButton).toBeEnabled();
      expect(decrementButton).toBeEnabled();
    });

    it("displays count with proper formatting", () => {
      render(<Counter initialCount={1000} />);
      
      const countDisplay = screen.getByText("1000");
      expect(countDisplay).toHaveClass("text-6xl", "font-mono");
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    it("handles rapid button clicks", () => {
      const onChangeMock = vi.fn();
      render(<Counter onChange={onChangeMock} />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      
      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(incrementButton);
      }
      
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(onChangeMock).toHaveBeenCalledTimes(10);
    });

    it("handles very large numbers", () => {
      render(<Counter initialCount={999999} />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      fireEvent.click(incrementButton);
      
      expect(screen.getByText("1000000")).toBeInTheDocument();
    });

    it("handles decimal numbers correctly", () => {
      render(<Counter initialCount={1.5} />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      fireEvent.click(incrementButton);
      
      expect(screen.getByText("2.5")).toBeInTheDocument();
    });

    it("maintains state consistency during re-renders", () => {
      const { rerender } = render(<Counter initialCount={0} />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      fireEvent.click(incrementButton);
      
      expect(screen.getByText("1")).toBeInTheDocument();
      
      // Re-render with same props - Counter component maintains internal state
      rerender(<Counter initialCount={0} />);
      
      // Since useState only uses initialValue on first render, the state persists
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  describe("Callback Edge Cases", () => {
    it("handles callback that throws error", () => {
      const throwingCallback = vi.fn(() => {
        throw new Error("Callback error");
      });
      
      // Render should not fail even if callback throws
      render(<Counter onChange={throwingCallback} />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      
      // Click should not crash the component
      expect(() => fireEvent.click(incrementButton)).toThrow("Callback error");
    });

    it("handles callback that returns value", () => {
      const returningCallback = vi.fn().mockReturnValue("some value");
      render(<Counter onChange={returningCallback} />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      fireEvent.click(incrementButton);
      
      expect(returningCallback).toHaveBeenCalledWith(1);
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("handles async callback", async () => {
      const asyncCallback = vi.fn().mockResolvedValue("async result");
      render(<Counter onChange={asyncCallback} />);
      
      const incrementButton = screen.getByRole("button", { name: /increment/i });
      fireEvent.click(incrementButton);
      
      expect(asyncCallback).toHaveBeenCalledWith(1);
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });
});
