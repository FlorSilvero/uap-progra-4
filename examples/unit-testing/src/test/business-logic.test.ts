import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mensaje } from "@/types";

/**
 * Comprehensive business logic tests for message management
 * These tests focus on the core business rules and edge cases
 * 
 * What should be mocked:
 * - HTTP fetch calls (external dependencies)
 * - Timers and setTimeout (timing-dependent code)
 * - DOM APIs that aren't related to business logic
 * 
 * What should be tested directly:
 * - State transformations
 * - Business logic rules
 * - Data validation
 * - Error handling logic
 * - State consistency
 */

// Mock fetch for testing HTTP calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock timers for testing debounced operations
vi.useFakeTimers();

describe("Message Business Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe("Message Data Validation", () => {
    const validMessage: Mensaje = {
      id: "1",
      description: "Test message",
      likes: 0,
      timestamp: new Date().toISOString(),
      author: "test-user"
    };

    it("should validate message structure", () => {
      // Test valid message
      expect(isValidMessage(validMessage)).toBe(true);
    });

    it("should reject messages with missing required fields", () => {
      const invalidMessages = [
        { ...validMessage, id: "" },
        { ...validMessage, description: "" },
        { ...validMessage, likes: -1 },
        { ...validMessage, timestamp: "invalid-date" },
      ];

      invalidMessages.forEach(message => {
        expect(isValidMessage(message)).toBe(false);
      });
    });

    it("should handle edge cases in message content", () => {
      const edgeCases = [
        { ...validMessage, description: "a".repeat(1000) }, // Very long message
        { ...validMessage, description: "🌟✨🎉" }, // Unicode characters
        { ...validMessage, description: "Line 1\nLine 2\nLine 3" }, // Multiline
        { ...validMessage, description: "!@#$%^&*()_+-=[]{}|;:,.<>?" }, // Special chars
      ];

      edgeCases.forEach(message => {
        expect(isValidMessage(message)).toBe(true);
      });
    });

    it("should handle numeric edge cases", () => {
      const numericEdgeCases = [
        { ...validMessage, likes: 0 },
        { ...validMessage, likes: Number.MAX_SAFE_INTEGER },
        { ...validMessage, likes: 999999 },
      ];

      numericEdgeCases.forEach(message => {
        expect(isValidMessage(message)).toBe(true);
      });
    });
  });

  describe("Message Filtering and Search", () => {
    const messages: Mensaje[] = [
      {
        id: "1",
        description: "Hello world",
        likes: 5,
        timestamp: "2024-01-01T00:00:00Z",
        author: "alice"
      },
      {
        id: "2", 
        description: "JavaScript is awesome",
        likes: 10,
        timestamp: "2024-01-02T00:00:00Z",
        author: "bob"
      },
      {
        id: "3",
        description: "Hello JavaScript developers",
        likes: 3,
        timestamp: "2024-01-03T00:00:00Z",
        author: "charlie"
      }
    ];

    it("should filter messages by search term", () => {
      const result = filterMessages(messages, "hello");
      expect(result).toHaveLength(2);
      expect(result.map(m => m.id)).toEqual(["1", "3"]);
    });

    it("should handle case-insensitive search", () => {
      const result = filterMessages(messages, "HELLO");
      expect(result).toHaveLength(2);
    });

    it("should handle partial word matching", () => {
      const result = filterMessages(messages, "java");
      expect(result).toHaveLength(2);
      expect(result.map(m => m.id)).toEqual(["2", "3"]);
    });

    it("should handle empty search term", () => {
      const result = filterMessages(messages, "");
      expect(result).toEqual(messages);
    });

    it("should handle search terms with special characters", () => {
      const messageWithSpecial: Mensaje = {
        id: "4",
        description: "Message with special chars !@#$%",
        likes: 1,
        timestamp: "2024-01-04T00:00:00Z",
        author: "dave"
      };
      const allMessages = [...messages, messageWithSpecial];
      
      const result = filterMessages(allMessages, "!@#");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("4");
    });

    it("should handle unicode search terms", () => {
      const messageWithUnicode: Mensaje = {
        id: "5",
        description: "Message with emoji 🌟✨🎉",
        likes: 2,
        timestamp: "2024-01-05T00:00:00Z",
        author: "eve"
      };
      const allMessages = [...messages, messageWithUnicode];
      
      const result = filterMessages(allMessages, "🌟");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("5");
    });

    it("should return empty array for no matches", () => {
      const result = filterMessages(messages, "nonexistent");
      expect(result).toHaveLength(0);
    });
  });

  describe("Message Sorting Logic", () => {
    const unsortedMessages: Mensaje[] = [
      {
        id: "1",
        description: "Old message",
        likes: 5,
        timestamp: "2024-01-01T00:00:00Z",
        author: "alice"
      },
      {
        id: "2",
        description: "Popular message",
        likes: 20,
        timestamp: "2024-01-02T00:00:00Z",
        author: "bob"
      },
      {
        id: "3",
        description: "Recent message",
        likes: 3,
        timestamp: "2024-01-03T00:00:00Z",
        author: "charlie"
      }
    ];

    it("should sort messages by timestamp (newest first)", () => {
      const result = sortMessages(unsortedMessages, "timestamp", "desc");
      expect(result.map(m => m.id)).toEqual(["3", "2", "1"]);
    });

    it("should sort messages by timestamp (oldest first)", () => {
      const result = sortMessages(unsortedMessages, "timestamp", "asc");
      expect(result.map(m => m.id)).toEqual(["1", "2", "3"]);
    });

    it("should sort messages by likes (most popular first)", () => {
      const result = sortMessages(unsortedMessages, "likes", "desc");
      expect(result.map(m => m.id)).toEqual(["2", "1", "3"]);
    });

    it("should sort messages by likes (least popular first)", () => {
      const result = sortMessages(unsortedMessages, "likes", "asc");
      expect(result.map(m => m.id)).toEqual(["3", "1", "2"]);
    });

    it("should handle messages with equal sort values", () => {
      const messagesWithEqualLikes: Mensaje[] = [
        {
          id: "1",
          description: "Message A",
          likes: 5,
          timestamp: "2024-01-01T00:00:00Z",
          author: "alice"
        },
        {
          id: "2",
          description: "Message B", 
          likes: 5,
          timestamp: "2024-01-02T00:00:00Z",
          author: "bob"
        }
      ];

      const result = sortMessages(messagesWithEqualLikes, "likes", "desc");
      expect(result).toHaveLength(2);
      // Should maintain relative order or use secondary sort
    });

    it("should handle empty message array", () => {
      const result = sortMessages([], "timestamp", "desc");
      expect(result).toEqual([]);
    });

    it("should handle invalid sort criteria gracefully", () => {
      const result = sortMessages(unsortedMessages, "invalidField" as any, "desc");
      expect(result).toEqual(unsortedMessages); // Should return original order
    });
  });

  describe("Like/Unlike Business Logic", () => {
    it("should increment likes correctly", () => {
      const message: Mensaje = {
        id: "1",
        description: "Test",
        likes: 5,
        timestamp: "2024-01-01T00:00:00Z",
        author: "alice"
      };

      const result = incrementLikes(message);
      expect(result.likes).toBe(6);
      expect(result.id).toBe(message.id);
      expect(result.description).toBe(message.description);
    });

    it("should handle likes starting from zero", () => {
      const message: Mensaje = {
        id: "1",
        description: "Test",
        likes: 0,
        timestamp: "2024-01-01T00:00:00Z",
        author: "alice"
      };

      const result = incrementLikes(message);
      expect(result.likes).toBe(1);
    });

    it("should handle very large like counts", () => {
      const message: Mensaje = {
        id: "1",
        description: "Test",
        likes: Number.MAX_SAFE_INTEGER - 1,
        timestamp: "2024-01-01T00:00:00Z",
        author: "alice"
      };

      const result = incrementLikes(message);
      expect(result.likes).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should prevent overflow in like counts", () => {
      const message: Mensaje = {
        id: "1",
        description: "Test",
        likes: Number.MAX_SAFE_INTEGER,
        timestamp: "2024-01-01T00:00:00Z",
        author: "alice"
      };

      const result = incrementLikes(message);
      // Should either stay at MAX_SAFE_INTEGER or handle overflow gracefully
      expect(result.likes).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
    });

    it("should not mutate original message object", () => {
      const message: Mensaje = {
        id: "1",
        description: "Test",
        likes: 5,
        timestamp: "2024-01-01T00:00:00Z",
        author: "alice"
      };
      const originalLikes = message.likes;

      incrementLikes(message);
      expect(message.likes).toBe(originalLikes);
    });
  });

  describe("Debounced Search Logic", () => {
    it("should debounce search queries", () => {
      vi.useFakeTimers();
      
      const mockSearchFn = vi.fn();
      const debouncedSearch = createDebouncedSearch(mockSearchFn, 500);

      // Rapid calls
      debouncedSearch("test1");
      debouncedSearch("test2");
      debouncedSearch("test3");

      // Should not call immediately
      expect(mockSearchFn).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(500);

      // Should call only once with the latest value
      expect(mockSearchFn).toHaveBeenCalledTimes(1);
      expect(mockSearchFn).toHaveBeenCalledWith("test3");
      
      vi.useRealTimers();
    });

    it("should reset debounce timer on new input", () => {
      vi.useFakeTimers();
      
      const mockSearchFn = vi.fn();
      const debouncedSearch = createDebouncedSearch(mockSearchFn, 500);

      debouncedSearch("test1");
      
      // Advance time but not enough to trigger
      vi.advanceTimersByTime(300);
      expect(mockSearchFn).not.toHaveBeenCalled();

      // New input should reset timer
      debouncedSearch("test2");
      
      // Advance original time (300 + 200 = 500)
      vi.advanceTimersByTime(200);
      expect(mockSearchFn).not.toHaveBeenCalled();

      // Advance remaining time
      vi.advanceTimersByTime(300);
      expect(mockSearchFn).toHaveBeenCalledWith("test2");
      
      vi.useRealTimers();
    });

    it("should handle empty search terms", () => {
      vi.useFakeTimers();
      
      const mockSearchFn = vi.fn();
      const debouncedSearch = createDebouncedSearch(mockSearchFn, 500);

      debouncedSearch("");
      vi.advanceTimersByTime(500);

      expect(mockSearchFn).toHaveBeenCalledWith("");
      
      vi.useRealTimers();
    });

    it("should handle multiple consecutive empty searches", () => {
      vi.useFakeTimers();
      
      const mockSearchFn = vi.fn();
      const debouncedSearch = createDebouncedSearch(mockSearchFn, 500);

      debouncedSearch("");
      debouncedSearch("");
      debouncedSearch("");
      
      vi.advanceTimersByTime(500);

      expect(mockSearchFn).toHaveBeenCalledTimes(1);
      expect(mockSearchFn).toHaveBeenCalledWith("");
      
      vi.useRealTimers();
    });
  });

  describe("Error Handling Business Logic", () => {
    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await fetchMessagesWithErrorHandling("");
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
      expect(result.messages).toEqual([]);
    });

    it("should handle HTTP error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
      });

      const result = await fetchMessagesWithErrorHandling("");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("500");
      expect(result.messages).toEqual([]);
    });

    it("should handle malformed JSON responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON"))
      });

      const result = await fetchMessagesWithErrorHandling("");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("JSON");
      expect(result.messages).toEqual([]);
    });

    it("should handle successful responses", async () => {
      const mockMessages: Mensaje[] = [
        {
          id: "1",
          description: "Test message",
          likes: 5,
          timestamp: "2024-01-01T00:00:00Z",
          author: "alice"
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: mockMessages })
      });

      const result = await fetchMessagesWithErrorHandling("");
      
      expect(result.success).toBe(true);
      expect(result.error).toBe(null);
      expect(result.messages).toEqual(mockMessages);
    });

    it("should handle timeout scenarios", async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Request timeout")), 1000)
        )
      );

      const result = await fetchMessagesWithErrorHandling("", { timeout: 500 });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("timeout");
    });
  });

  describe("State Consistency Business Logic", () => {
    it("should maintain message order consistency", () => {
      const messages: Mensaje[] = [
        { id: "1", description: "First", likes: 1, timestamp: "2024-01-01T00:00:00Z", author: "alice" },
        { id: "2", description: "Second", likes: 2, timestamp: "2024-01-01T01:00:00Z", author: "bob" },
        { id: "3", description: "Third", likes: 3, timestamp: "2024-01-01T02:00:00Z", author: "charlie" }
      ];

      const state = { messages, loading: false, error: null };
      
      // Add new message
      const newMessage: Mensaje = {
        id: "4",
        description: "Fourth",
        likes: 0,
        timestamp: new Date().toISOString(),
        author: "dave"
      };

      const newState = addMessageToState(state, newMessage);
      
      expect(newState.messages).toHaveLength(4);
      expect(newState.messages[3]).toEqual(newMessage);
      expect(newState.messages.slice(0, 3)).toEqual(messages);
    });

    it("should handle duplicate message prevention", () => {
      const messages: Mensaje[] = [
        { id: "1", description: "First", likes: 1, timestamp: "2024-01-01T00:00:00Z", author: "alice" }
      ];

      const state = { messages, loading: false, error: null };
      
      // Try to add duplicate message
      const duplicateMessage: Mensaje = {
        id: "1", // Same ID
        description: "Duplicate",
        likes: 999,
        timestamp: "2024-01-01T00:00:00Z",
        author: "alice"
      };

      const newState = addMessageToState(state, duplicateMessage);
      
      expect(newState.messages).toHaveLength(1);
      expect(newState.messages[0]).toEqual(messages[0]); // Should keep original
    });

    it("should handle message updates correctly", () => {
      const messages: Mensaje[] = [
        { id: "1", description: "First", likes: 1, timestamp: "2024-01-01T00:00:00Z", author: "alice" },
        { id: "2", description: "Second", likes: 2, timestamp: "2024-01-01T01:00:00Z", author: "bob" }
      ];

      const state = { messages, loading: false, error: null };
      
      const updatedMessage: Mensaje = {
        id: "1",
        description: "First",
        likes: 5, // Updated likes
        timestamp: "2024-01-01T00:00:00Z",
        author: "alice"
      };

      const newState = updateMessageInState(state, updatedMessage);
      
      expect(newState.messages).toHaveLength(2);
      expect(newState.messages[0].likes).toBe(5);
      expect(newState.messages[1]).toEqual(messages[1]); // Should remain unchanged
    });

    it("should handle message deletion correctly", () => {
      const messages: Mensaje[] = [
        { id: "1", description: "First", likes: 1, timestamp: "2024-01-01T00:00:00Z", author: "alice" },
        { id: "2", description: "Second", likes: 2, timestamp: "2024-01-01T01:00:00Z", author: "bob" },
        { id: "3", description: "Third", likes: 3, timestamp: "2024-01-01T02:00:00Z", author: "charlie" }
      ];

      const state = { messages, loading: false, error: null };
      
      const newState = deleteMessageFromState(state, "2");
      
      expect(newState.messages).toHaveLength(2);
      expect(newState.messages.map(m => m.id)).toEqual(["1", "3"]);
    });

    it("should handle deletion of non-existent message", () => {
      const messages: Mensaje[] = [
        { id: "1", description: "First", likes: 1, timestamp: "2024-01-01T00:00:00Z", author: "alice" }
      ];

      const state = { messages, loading: false, error: null };
      
      const newState = deleteMessageFromState(state, "999");
      
      expect(newState.messages).toEqual(messages); // Should remain unchanged
    });
  });
});

// Mock implementations of business logic functions
// These would normally be imported from your actual business logic modules

function isValidMessage(message: any): message is Mensaje {
  return (
    message &&
    typeof message.id === "string" &&
    message.id.length > 0 &&
    typeof message.description === "string" &&
    message.description.length > 0 &&
    typeof message.likes === "number" &&
    message.likes >= 0 &&
    typeof message.timestamp === "string" &&
    !isNaN(Date.parse(message.timestamp)) &&
    typeof message.author === "string" &&
    message.author.length > 0
  );
}

function filterMessages(messages: Mensaje[], searchTerm: string): Mensaje[] {
  if (!searchTerm) return messages;
  
  const lowerSearchTerm = searchTerm.toLowerCase();
  return messages.filter(message =>
    message.description.toLowerCase().includes(lowerSearchTerm)
  );
}

function sortMessages(
  messages: Mensaje[],
  sortBy: keyof Mensaje,
  order: "asc" | "desc"
): Mensaje[] {
  if (!["timestamp", "likes", "description", "author"].includes(sortBy)) {
    return messages;
  }

  return [...messages].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === "timestamp") {
      comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    } else if (sortBy === "likes") {
      comparison = a.likes - b.likes;
    } else {
      comparison = a[sortBy].localeCompare(b[sortBy]);
    }
    
    return order === "desc" ? -comparison : comparison;
  });
}

function incrementLikes(message: Mensaje): Mensaje {
  const newLikes = message.likes >= Number.MAX_SAFE_INTEGER 
    ? Number.MAX_SAFE_INTEGER 
    : message.likes + 1;
    
  return {
    ...message,
    likes: newLikes
  };
}

function createDebouncedSearch(
  searchFn: (term: string) => void,
  delay: number
): (term: string) => void {
  let timeoutId: number | undefined;
  
  return (term: string) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      searchFn(term);
    }, delay);
  };
}

async function fetchMessagesWithErrorHandling(
  search: string,
  options: { timeout?: number } = {}
): Promise<{ success: boolean; messages: Mensaje[]; error: string | null }> {
  try {
    const controller = new AbortController();
    if (options.timeout) {
      setTimeout(() => controller.abort(), options.timeout);
    }

    const response = await fetch(`/api/messages?search=${search}`, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      messages: data.messages || [],
      error: null
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      messages: [],
      error: errorMessage
    };
  }
}

function addMessageToState(
  state: { messages: Mensaje[]; loading: boolean; error: string | null },
  newMessage: Mensaje
): typeof state {
  // Prevent duplicates
  if (state.messages.some(msg => msg.id === newMessage.id)) {
    return state;
  }

  return {
    ...state,
    messages: [...state.messages, newMessage]
  };
}

function updateMessageInState(
  state: { messages: Mensaje[]; loading: boolean; error: string | null },
  updatedMessage: Mensaje
): typeof state {
  return {
    ...state,
    messages: state.messages.map(msg => 
      msg.id === updatedMessage.id ? updatedMessage : msg
    )
  };
}

function deleteMessageFromState(
  state: { messages: Mensaje[]; loading: boolean; error: string | null },
  messageId: string
): typeof state {
  return {
    ...state,
    messages: state.messages.filter(msg => msg.id !== messageId)
  };
}