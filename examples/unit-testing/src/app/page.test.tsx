import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, test, describe, it, vi, beforeEach, afterEach } from "vitest";
import { axe } from "jest-axe";
import Home from "./page";
import { getData } from "@/services/getData";

// Mock the getData service
const mockGetData = vi.mocked(getData);

vi.mock("@/services/getData", () => ({
  getData: vi.fn(() => Promise.resolve("buenas")),
}));

describe("Home Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Initial Rendering", () => {
    it("renders counter with initial value of 0", () => {
      render(<Home />);

      expect(screen.getByText("Counter")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("renders data section with initial empty state", () => {
      render(<Home />);

      const externalDataElement = screen.getByLabelText("external-data");
      expect(externalDataElement).toHaveTextContent("Data from Service:");
    });

    it("renders both counter and data sections", () => {
      render(<Home />);

      expect(screen.getByText("Counter")).toBeInTheDocument();
      expect(screen.getByLabelText("external-data")).toBeInTheDocument();
    });

    it("applies correct CSS classes for layout", () => {
      const { container } = render(<Home />);
      
      const mainDiv = container.querySelector(".min-h-screen");
      expect(mainDiv).toBeInTheDocument();
      expect(mainDiv).toHaveClass("flex", "items-center", "justify-center");
    });
  });

  describe("Counter Integration", () => {
    test("increments counter when + button is clicked", () => {
      render(<Home />);

      const incrementButton = screen.getByRole("button", { name: "increment" });
      fireEvent.click(incrementButton);

      expect(screen.getByText("1")).toBeInTheDocument();
    });

    test("decrements counter when - button is clicked as long as it's bigger than 0", () => {
      render(<Home />);

      const decrementButton = screen.getByRole("button", { name: "decrement" });
      const incrementButton = screen.getByRole("button", { name: "increment" });
      
      // Start at 0, should stay at 0
      fireEvent.click(decrementButton);
      expect(screen.getByText("0")).toBeInTheDocument();

      // Increment to 2
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      expect(screen.getByText("2")).toBeInTheDocument();

      // Decrement to 1
      fireEvent.click(decrementButton);
      expect(screen.getByText("1")).toBeInTheDocument();

      // Decrement to 0
      fireEvent.click(decrementButton);
      expect(screen.getByText("0")).toBeInTheDocument();

      // Try to decrement below 0, should stay at 0
      fireEvent.click(decrementButton);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    test("multiple increments work correctly", () => {
      render(<Home />);

      const incrementButton = screen.getByRole("button", { name: "increment" });
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);

      expect(screen.getByText("3")).toBeInTheDocument();
    });

    test("counter operations work independently of data fetching", async () => {
      render(<Home />);

      const incrementButton = screen.getByRole("button", { name: "increment" });
      const externalDataElement = screen.getByLabelText("external-data");
      
      // Increment counter
      fireEvent.click(incrementButton);
      expect(screen.getByText("1")).toBeInTheDocument();
      
      // Fetch data
      fireEvent.click(externalDataElement);
      await screen.findByText("Data from Service: buenas");
      
      // Counter should remain unchanged
      expect(screen.getByText("1")).toBeInTheDocument();
      
      // Counter should still work
      fireEvent.click(incrementButton);
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  describe("Data Fetching Integration", () => {
    it("should display data from the service", async () => {
      render(<Home />);

      const externalDataElement = screen.getByLabelText("external-data");
      expect(externalDataElement).toHaveTextContent("Data from Service:");
      expect(mockGetData).not.toHaveBeenCalled();
      
      fireEvent.click(externalDataElement);
      expect(mockGetData).toHaveBeenCalled();
      
      // Wait for the async state update to complete
      await screen.findByText("Data from Service: buenas");
      expect(screen.getByLabelText("external-data")).toHaveTextContent(
        "Data from Service: buenas"
      );
    });

    it("should handle multiple clicks correctly", async () => {
      render(<Home />);

      const externalDataElement = screen.getByLabelText("external-data");
      
      // First click
      fireEvent.click(externalDataElement);
      await screen.findByText("Data from Service: buenas");
      expect(mockGetData).toHaveBeenCalledTimes(1);
      
      // Second click
      fireEvent.click(externalDataElement);
      await waitFor(() => {
        expect(mockGetData).toHaveBeenCalledTimes(2);
      });
      expect(screen.getByLabelText("external-data")).toHaveTextContent(
        "Data from Service: buenas"
      );
    });

    it("should maintain data state after fetching", async () => {
      render(<Home />);

      const externalDataElement = screen.getByLabelText("external-data");
      
      // Fetch data
      fireEvent.click(externalDataElement);
      await screen.findByText("Data from Service: buenas");
      
      // Data should persist without needing to click again
      expect(screen.getByLabelText("external-data")).toHaveTextContent(
        "Data from Service: buenas"
      );
    });

    it("should handle service errors gracefully", async () => {
      mockGetData.mockRejectedValueOnce(new Error("Service unavailable"));
      
      render(<Home />);

      const externalDataElement = screen.getByLabelText("external-data");
      fireEvent.click(externalDataElement);
      
      await waitFor(() => {
        expect(mockGetData).toHaveBeenCalled();
      });
      
      // Component should not crash and should maintain empty state
      expect(externalDataElement).toHaveTextContent("Data from Service:");
    });

    it("should handle slow service responses", async () => {
      mockGetData.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve("slow response"), 100))
      );
      
      render(<Home />);

      const externalDataElement = screen.getByLabelText("external-data");
      fireEvent.click(externalDataElement);
      
      // Initially should show empty state
      expect(externalDataElement).toHaveTextContent("Data from Service:");
      
      // After delay, should show the response
      await screen.findByText("Data from Service: slow response");
    });

    it("should handle empty responses", async () => {
      mockGetData.mockResolvedValueOnce("");
      
      render(<Home />);

      const externalDataElement = screen.getByLabelText("external-data");
      fireEvent.click(externalDataElement);
      
      await waitFor(() => {
        expect(mockGetData).toHaveBeenCalled();
      });
      
      expect(externalDataElement).toHaveTextContent("Data from Service:");
    });

    it("should handle rapid successive clicks", async () => {
      render(<Home />);

      const externalDataElement = screen.getByLabelText("external-data");
      
      // Multiple rapid clicks
      fireEvent.click(externalDataElement);
      fireEvent.click(externalDataElement);
      fireEvent.click(externalDataElement);
      
      await waitFor(() => {
        expect(mockGetData).toHaveBeenCalledTimes(3);
      });
      
      await screen.findByText("Data from Service: buenas");
    });
  });

  describe("Component Integration", () => {
    it("should handle both counter and data operations simultaneously", async () => {
      render(<Home />);

      const incrementButton = screen.getByRole("button", { name: "increment" });
      const decrementButton = screen.getByRole("button", { name: "decrement" });
      const externalDataElement = screen.getByLabelText("external-data");
      
      // Increment counter
      fireEvent.click(incrementButton);
      expect(screen.getByText("1")).toBeInTheDocument();
      
      // Fetch data
      fireEvent.click(externalDataElement);
      
      // Continue counter operations while data is loading
      fireEvent.click(incrementButton);
      fireEvent.click(decrementButton);
      
      expect(screen.getByText("1")).toBeInTheDocument();
      
      // Wait for data to load
      await screen.findByText("Data from Service: buenas");
      
      // Counter should still work after data loading
      fireEvent.click(incrementButton);
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should maintain independent state for both features", async () => {
      render(<Home />);

      const incrementButton = screen.getByRole("button", { name: "increment" });
      const externalDataElement = screen.getByLabelText("external-data");
      
      // Set counter to specific value
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      expect(screen.getByText("3")).toBeInTheDocument();
      
      // Fetch data multiple times
      fireEvent.click(externalDataElement);
      await screen.findByText("Data from Service: buenas");
      
      fireEvent.click(externalDataElement);
      await waitFor(() => {
        expect(mockGetData).toHaveBeenCalledTimes(2);
      });
      
      // Counter should still be at 3
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByLabelText("external-data")).toHaveTextContent(
        "Data from Service: buenas"
      );
    });
  });

  describe("Accessibility Tests", () => {
    it("should not have any accessibility violations", async () => {
      const { container } = render(<Home />);
      const results = await axe(container);
      expect(results.violations.length).toBe(0);
    });

    it("should have proper heading structure", () => {
      render(<Home />);
      
      const heading = screen.getByRole("heading", { name: /counter/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H1");
    });

    it("should have clickable data section with proper label", () => {
      render(<Home />);
      
      const dataSection = screen.getByLabelText("external-data");
      expect(dataSection).toBeInTheDocument();
      expect(dataSection.tagName).toBe("H1");
    });

    it("should have accessible buttons", () => {
      render(<Home />);
      
      const incrementButton = screen.getByRole("button", { name: "increment" });
      const decrementButton = screen.getByRole("button", { name: "decrement" });
      
      expect(incrementButton).toHaveAttribute("aria-label", "increment");
      expect(decrementButton).toHaveAttribute("aria-label", "decrement");
    });

    it("should maintain focus management", () => {
      render(<Home />);
      
      const incrementButton = screen.getByRole("button", { name: "increment" });
      
      incrementButton.focus();
      expect(document.activeElement).toBe(incrementButton);
      
      fireEvent.click(incrementButton);
      // Button should still be focusable after click
      expect(incrementButton).toBeInTheDocument();
    });
  });

  describe("Error Boundaries and Edge Cases", () => {
    it("should handle component remounting", () => {
      const { unmount } = render(<Home />);
      
      // Increment counter before unmounting
      const incrementButton = screen.getByRole("button", { name: "increment" });
      fireEvent.click(incrementButton);
      expect(screen.getByText("1")).toBeInTheDocument();
      
      unmount();
      
      // Re-mount component
      render(<Home />);
      
      expect(screen.getByText("Counter")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByLabelText("external-data")).toHaveTextContent("Data from Service:");
    });

    it("should handle rapid re-renders", () => {
      const { rerender } = render(<Home />);
      
      for (let i = 0; i < 10; i++) {
        rerender(<Home />);
      }
      
      expect(screen.getByText("Counter")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should handle memory cleanup", async () => {
      const { unmount } = render(<Home />);
      
      const externalDataElement = screen.getByLabelText("external-data");
      fireEvent.click(externalDataElement);
      
      // Unmount before async operation completes
      unmount();
      
      // Should not cause memory leaks or errors
      await waitFor(() => {
        expect(mockGetData).toHaveBeenCalled();
      });
    });
  });
});
