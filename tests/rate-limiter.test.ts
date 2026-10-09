import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRateLimiter } from '../src/lib/rate-limiter';

describe('In-Memory Rate Limiter', () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter(3, 60); // 3 requests per 60 seconds
  });

  it('allows requests within limit', () => {
    const res1 = limiter.check('192.168.1.1');
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check('192.168.1.1');
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check('192.168.1.1');
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it('blocks requests exceeding limit', () => {
    limiter.check('192.168.1.2');
    limiter.check('192.168.1.2');
    limiter.check('192.168.1.2');

    const blocked = limiter.check('192.168.1.2');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetSeconds).toBeGreaterThan(0);
  });

  it('tracks distinct IP addresses independently', () => {
    limiter.check('10.0.0.1');
    limiter.check('10.0.0.1');
    limiter.check('10.0.0.1');

    // 10.0.0.1 is now blocked
    expect(limiter.check('10.0.0.1').allowed).toBe(false);

    // 10.0.0.2 is still allowed
    expect(limiter.check('10.0.0.2').allowed).toBe(true);
  });
});
