import { RATE_LIMIT } from "./config";

/**
 * In-memory IP-based rate limiter. Suitable for single-instance dev/MVP.
 *
 * Limitations:
 *   - state is lost on process restart (and per-instance in serverless
 *     deployments — Vercel runs each invocation in a fresh container in the
 *     worst case, so this becomes effectively no-op there)
 *   - production should swap for Upstash Redis or Vercel KV (drop-in: same
 *     check() signature).
 *
 * Used as a soft guard against accidental loops or trivial DoS during
 * the MVP phase. Combined with the Replicate dashboard hard cap, it keeps
 * the budget bounded.
 */

interface Bucket {
  /** Timestamps of recent successful checks within the window. */
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.windowMs;

  const bucket = buckets.get(ip) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => t > windowStart);

  const allowed = bucket.hits.length < RATE_LIMIT.generationsPerHour;
  if (allowed) {
    bucket.hits.push(now);
    buckets.set(ip, bucket);
  } else {
    buckets.set(ip, bucket);
  }

  const oldestHit = bucket.hits[0];
  const resetMs = oldestHit
    ? Math.max(0, oldestHit + RATE_LIMIT.windowMs - now)
    : 0;

  return {
    allowed,
    remaining: Math.max(0, RATE_LIMIT.generationsPerHour - bucket.hits.length),
    resetMs,
  };
}

/**
 * Best-effort client IP extraction from a Next.js Request.
 * Falls back to "unknown" so malformed requests still hit the same bucket
 * (preventing total bypass).
 */
export function clientIpFromRequest(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
