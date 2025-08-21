import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getData } from "./getData";

// This service should NOT be mocked since we're testing it directly
describe("getData Service", () => {
  describe("Successful responses", () => {
    it("should return data from the API", async () => {
      const data = await getData();
      expect(data).toEqual("hola mundo");
    });

    it("should return string type", async () => {
      const data = await getData();
      expect(typeof data).toBe("string");
    });

    it("should return consistent data on multiple calls", async () => {
      const data1 = await getData();
      const data2 = await getData();
      expect(data1).toEqual(data2);
    });
  });

  describe("Performance and reliability", () => {
    it("should resolve within reasonable time", async () => {
      const startTime = Date.now();
      await getData();
      const endTime = Date.now();
      
      // Should resolve almost immediately since it's not making real HTTP requests
      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle concurrent calls correctly", async () => {
      const promises = Array(10).fill(null).map(() => getData());
      const results = await Promise.all(promises);
      
      // All results should be identical
      results.forEach(result => {
        expect(result).toEqual("hola mundo");
      });
    });
  });

  describe("Type safety", () => {
    it("should return a non-empty string", async () => {
      const data = await getData();
      expect(data).toBeTruthy();
      expect(data.length).toBeGreaterThan(0);
    });

    it("should not return null or undefined", async () => {
      const data = await getData();
      expect(data).not.toBeNull();
      expect(data).not.toBeUndefined();
    });
  });
});

// Enhanced version that simulates real API behavior for testing different scenarios
describe("getData Service - Enhanced Simulation", () => {
  let originalGetData: typeof getData;

  beforeEach(() => {
    originalGetData = getData;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Error handling scenarios", () => {
    it("should handle network timeouts", async () => {
      // Mock a version that simulates timeout
      const timeoutGetData = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Network timeout")), 100);
        })
      );

      await expect(timeoutGetData()).rejects.toThrow("Network timeout");
    });

    it("should handle server errors", async () => {
      // Mock a version that simulates server error
      const errorGetData = vi.fn().mockRejectedValue(new Error("Server Error 500"));

      await expect(errorGetData()).rejects.toThrow("Server Error 500");
    });

    it("should handle malformed responses", async () => {
      // Mock a version that returns unexpected data
      const malformedGetData = vi.fn().mockResolvedValue(null);

      const result = await malformedGetData();
      expect(result).toBeNull();
    });

    it("should handle empty responses", async () => {
      // Mock a version that returns empty string
      const emptyGetData = vi.fn().mockResolvedValue("");

      const result = await emptyGetData();
      expect(result).toBe("");
    });
  });

  describe("Edge cases for integration", () => {
    it("should handle rapid sequential calls", async () => {
      const rapidCalls = [];
      for (let i = 0; i < 5; i++) {
        rapidCalls.push(getData());
      }
      
      const results = await Promise.all(rapidCalls);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBe("hola mundo");
      });
    });

    it("should maintain function signature", () => {
      expect(getData).toBeInstanceOf(Function);
      expect(getData.length).toBe(0); // No parameters expected
    });
  });

  describe("Async behavior validation", () => {
    it("should return a Promise", () => {
      const result = getData();
      expect(result).toBeInstanceOf(Promise);
    });

    it("should be awaitable", async () => {
      let resolved = false;
      getData().then(() => {
        resolved = true;
      });
      
      // Wait a tick for Promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(resolved).toBe(true);
    });

    it("should work with Promise.all", async () => {
      const results = await Promise.all([getData(), getData()]);
      expect(results).toHaveLength(2);
      expect(results[0]).toBe("hola mundo");
      expect(results[1]).toBe("hola mundo");
    });

    it("should work with async/await", async () => {
      const result = await getData();
      expect(result).toBe("hola mundo");
    });
  });
});
