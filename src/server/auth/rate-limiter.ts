/**
 * Rate Limiter
 * 
 * Implements rate limiting using an in-memory Map store.
 * Supports IP-based and email-based rate limiting.
 * 
 * For production with multiple servers, replace with Redis.
 */

import { logAuthEvent } from '@/lib/logger';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory store for rate limit counters
 * In production, replace with Redis for distributed rate limiting
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();

  /**
   * Get the current count and reset time for a key
   */
  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    // Clean up expired entries
    if (entry.resetAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  /**
   * Set or update the count for a key
   */
  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  /**
   * Delete a key from the store
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Clean up expired entries (should be called periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton instance
const store = new RateLimitStore();

// Cleanup expired entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => store.cleanup(), 60000);
}

/**
 * Check if a request is within the rate limit
 * 
 * @param key - Unique identifier for the rate limit (e.g., "ip:192.168.1.1" or "email:user@example.com")
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @param context - Optional context for logging (ipAddress, email, requestId)
 * @returns true if the request is allowed, false if rate limit exceeded
 */
export async function checkLimit(
  key: string,
  limit: number,
  windowMs: number,
  context?: {
    ipAddress?: string;
    email?: string;
    requestId?: string;
  }
): Promise<boolean> {
  // Disable rate limiting in development mode
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Handle zero limit edge case
  if (limit === 0) {
    return false;
  }

  const now = Date.now();
  const entry = store.get(key);

  // No entry or expired entry - allow and create new entry
  if (!entry) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  // Entry exists and not expired
  if (entry.count >= limit) {
    // Rate limit exceeded - log the violation
    logAuthEvent('auth.rate_limit.exceeded', {
      outcome: 'failure',
      ipAddress: context?.ipAddress,
      email: context?.email,
      requestId: context?.requestId,
      metadata: {
        key,
        limit,
        windowMs,
        count: entry.count,
        resetAt: new Date(entry.resetAt).toISOString(),
      },
    });
    
    return false;
  }

  // Increment count
  entry.count++;
  store.set(key, entry);
  return true;
}

/**
 * Get the number of remaining attempts for a key
 * 
 * @param key - Unique identifier for the rate limit
 * @param limit - Maximum number of requests allowed in the window
 * @returns Number of remaining attempts (0 if limit exceeded)
 */
export async function getRemainingAttempts(
  key: string,
  limit: number
): Promise<number> {
  const entry = store.get(key);

  if (!entry) {
    return limit;
  }

  return Math.max(0, limit - entry.count);
}

/**
 * Get the time in seconds until the rate limit resets
 * 
 * @param key - Unique identifier for the rate limit
 * @returns Seconds until reset, or 0 if no limit is active
 */
export async function getResetTime(key: string): Promise<number> {
  const entry = store.get(key);

  if (!entry) {
    return 0;
  }

  const now = Date.now();
  const resetIn = Math.ceil((entry.resetAt - now) / 1000);
  return Math.max(0, resetIn);
}

/**
 * Reset the rate limit for a key (for testing)
 * 
 * @param key - Unique identifier for the rate limit
 */
export async function resetLimit(key: string): Promise<void> {
  store.delete(key);
}

/**
 * Clear all rate limits (for testing)
 */
export async function clearAllLimits(): Promise<void> {
  store.clear();
}

/**
 * Rate limit configuration for different endpoints
 */
export const RATE_LIMITS = {
  // Sign-in: 5 attempts per IP per minute
  SIGNIN_IP: {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  // Sign-in: 3 attempts per email per 15 minutes
  SIGNIN_EMAIL: {
    limit: 3,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Password reset: 3 requests per email per hour
  PASSWORD_RESET: {
    limit: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Registration: 10 registrations per IP per hour
  SIGNUP_IP: {
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Resend verification: 3 requests per email per hour
  RESEND_VERIFICATION: {
    limit: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
} as const;

/**
 * Helper to create rate limit keys
 */
export const createRateLimitKey = {
  ip: (ip: string) => `ip:${ip}`,
  email: (email: string) => `email:${email.toLowerCase()}`,
  signInIp: (ip: string) => `signin:ip:${ip}`,
  signInEmail: (email: string) => `signin:email:${email.toLowerCase()}`,
  passwordReset: (email: string) => `reset:email:${email.toLowerCase()}`,
  signupIp: (ip: string) => `signup:ip:${ip}`,
  resendVerification: (email: string) => `resend-verification:email:${email.toLowerCase()}`,
} as const;
