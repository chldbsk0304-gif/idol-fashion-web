// IP-based sliding-window-ish rate limiter (fixed window, good enough for MVP).
//
// Same caveat as result-store: backed by a globalThis-pinned Map so dev HMR
// and serverless cold starts don't fragment counters across module instances.
// Per-IP buckets are scoped by a route key so /api/analyze and /api/match
// don't share quota.

import type { NextRequest } from 'next/server';

interface Bucket {
  count: number;
  resetAt: number;
}

const GLOBAL_KEY = Symbol.for('@fitmatch/rate-limit');
type GlobalScope = typeof globalThis & { [GLOBAL_KEY]?: Map<string, Bucket> };
const g = globalThis as GlobalScope;
const buckets: Map<string, Bucket> = g[GLOBAL_KEY] ?? (g[GLOBAL_KEY] = new Map());

export interface RateLimitConfig {
  /** Window size in ms (default 60_000 = 1 minute). */
  windowMs?: number;
  /** Max calls per IP within the window. */
  max: number;
  /** Identifier so different routes don't share quota. */
  scope: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

/** Best-effort IP extraction from common proxy headers and req.ip. */
export function ipFrom(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  // req.ip is set by Vercel's runtime; treat as optional in case types drift.
  return (req as NextRequest & { ip?: string }).ip || '0.0.0.0';
}

export function rateLimit(
  req: NextRequest,
  { windowMs = 60_000, max, scope }: RateLimitConfig,
): RateLimitResult {
  const ip = ipFrom(req);
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: max - 1,
      resetAt: now + windowMs,
      retryAfterSec: 0,
    };
  }

  existing.count += 1;
  const allowed = existing.count <= max;
  return {
    allowed,
    remaining: Math.max(0, max - existing.count),
    resetAt: existing.resetAt,
    retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
  };
}

/** Standard response headers a caller can attach. */
export function rateLimitHeaders(r: RateLimitResult, max: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(max),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(Math.floor(r.resetAt / 1000)),
    ...(r.retryAfterSec > 0 ? { 'Retry-After': String(r.retryAfterSec) } : {}),
  };
}
