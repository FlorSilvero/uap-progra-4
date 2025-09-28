// Rate limiting utility for frontend
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map()
  private maxAttempts: number
  private windowMs: number

  constructor(maxAttempts: number = 5, windowMs: number = 60000) { // 5 attempts per minute
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
  }

  canMakeRequest(key: string): boolean {
    const now = Date.now()
    const record = this.attempts.get(key)

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs })
      return true
    }

    if (record.count >= this.maxAttempts) {
      return false
    }

    record.count++
    return true
  }

  getRemainingTime(key: string): number {
    const record = this.attempts.get(key)
    if (!record) return 0
    
    const now = Date.now()
    return Math.max(0, record.resetTime - now)
  }

  reset(key: string): void {
    this.attempts.delete(key)
  }
}

import { CONFIG } from './constants'

export const authRateLimiter = new RateLimiter(
  CONFIG.AUTH_RATE_LIMIT.maxAttempts, 
  CONFIG.AUTH_RATE_LIMIT.windowMs
)

export const claimRateLimiter = new RateLimiter(
  CONFIG.CLAIM_RATE_LIMIT.maxAttempts, 
  CONFIG.CLAIM_RATE_LIMIT.windowMs
)