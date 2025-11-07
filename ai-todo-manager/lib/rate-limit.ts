const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

type RateEntry = {
  count: number;
  windowStart: number;
};

type RateResult = {
  allowed: boolean;
  retryAfter?: number;
};

const globalRateLimitStore = globalThis as unknown as {
  __aiTodoRateLimiter?: Map<string, RateEntry>;
};

if (!globalRateLimitStore.__aiTodoRateLimiter) {
  globalRateLimitStore.__aiTodoRateLimiter = new Map();
}

const store = globalRateLimitStore.__aiTodoRateLimiter;

export function rateLimit(identifier: string): RateResult {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry) {
    store.set(identifier, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (now - entry.windowStart > WINDOW_MS) {
    store.set(identifier, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfter = Math.max(0, WINDOW_MS - (now - entry.windowStart));
    return { allowed: false, retryAfter };
  }

  entry.count += 1;
  store.set(identifier, entry);
  return { allowed: true };
}
