interface RateLimitRecord {
  timestamps: number[];
}

export class InMemoryRateLimiter {
  private ipMap = new Map<string, RateLimitRecord>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 20, windowSeconds: number = 600) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;

    // Periodic cleanup of expired records every 5 minutes
    if (typeof setInterval !== 'undefined') {
      const timer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
      if (timer.unref) {
        timer.unref(); // Don't hold Node process open
      }
    }
  }

  /**
   * Checks whether the given client identifier is within rate limits.
   */
  public check(clientId: string): {
    allowed: boolean;
    remaining: number;
    resetSeconds: number;
    totalLimit: number;
  } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const record = this.ipMap.get(clientId) || { timestamps: [] };

    // Filter out timestamps outside current sliding window
    const recentTimestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (recentTimestamps.length >= this.maxRequests) {
      const oldestInWindow = recentTimestamps[0];
      const resetMs = oldestInWindow + this.windowMs - now;
      const resetSeconds = Math.max(1, Math.ceil(resetMs / 1000));

      return {
        allowed: false,
        remaining: 0,
        resetSeconds,
        totalLimit: this.maxRequests,
      };
    }

    // Add current timestamp and save
    recentTimestamps.push(now);
    this.ipMap.set(clientId, { timestamps: recentTimestamps });

    const remaining = this.maxRequests - recentTimestamps.length;
    const resetSeconds = Math.ceil(this.windowMs / 1000);

    return {
      allowed: true,
      remaining,
      resetSeconds,
      totalLimit: this.maxRequests,
    };
  }

  /**
   * Resets rate limit records (useful for testing).
   */
  public reset(): void {
    this.ipMap.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [ip, record] of this.ipMap.entries()) {
      const active = record.timestamps.filter((ts) => ts > windowStart);
      if (active.length === 0) {
        this.ipMap.delete(ip);
      } else {
        this.ipMap.set(ip, { timestamps: active });
      }
    }
  }
}

// Global instance for serverless runtime
declare global {
  var __globalRateLimiter: InMemoryRateLimiter | undefined;
}

export function getRateLimiter(
  maxRequests: number = 20,
  windowSeconds: number = 600
): InMemoryRateLimiter {
  if (!global.__globalRateLimiter) {
    global.__globalRateLimiter = new InMemoryRateLimiter(maxRequests, windowSeconds);
  }
  return global.__globalRateLimiter;
}
