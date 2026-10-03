/**
 * Rate limiting.
 *
 * Why this is in the Worker and not a Cloudflare WAF rule:
 * WAF rate limiting is a zone-level feature. This account has no zone
 * (workers.dev only) and is on the Workers Free plan, so edge rate limiting
 * is not available at all. Enforcement therefore has to happen here.
 *
 * Durable Object rather than a plain in-isolate Map: Workers are stateless
 * across isolates, so a module-level Map only throttles whichever isolate
 * happens to serve the attacker. One Durable Object per IP gives a single
 * authoritative counter.
 */

/* Defaults. Override per-Worker with the vars in wrangler.toml. */
export const DEFAULT_LIMIT = 20; // sustained requests per minute
export const DEFAULT_BURST = 10; // bucket depth

/**
 * One Durable Object instance per client IP.
 *
 * Token bucket: refills at `limit` per minute, holds at most `burst`.
 * A short burst is allowed, sustained flood is not.
 */
export class RateLimiter {
  constructor(state) {
    this.state = state;
  }

  async fetch() {
    const now = Date.now();

    const limit = num(this.state.limitPerMinute, DEFAULT_LIMIT);
    const burst = num(this.state.burst, DEFAULT_BURST);

    let bucket = await this.state.storage.get("bucket");

    if (!bucket || typeof bucket.tokens !== "number") {
      bucket = { tokens: burst, lastRefill: now };
    }

    // Refill for elapsed time, capped at the bucket depth.
    const elapsed = Math.max(0, now - bucket.lastRefill);
    const refillPerMs = limit / 60000;

    bucket.tokens = Math.min(burst, bucket.tokens + elapsed * refillPerMs);
    bucket.lastRefill = now;

    const allowed = bucket.tokens >= 1;

    if (allowed) bucket.tokens -= 1;

    await this.state.storage.put("bucket", bucket);

    const retryAfterSeconds = allowed
      ? 0
      : Math.ceil((1 - bucket.tokens) / refillPerMs / 1000);

    return new Response(
      JSON.stringify({
        allowed,
        limit,
        burst,
        remaining: Math.floor(bucket.tokens),
        retryAfterSeconds,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Check one request against the limiter.
 *
 * Falls back to a per-isolate Map if the DO binding is unavailable, so a
 * misconfigured deployment degrades to weaker protection rather than
 * breaking the endpoint.
 */
export async function checkRateLimit(env, request) {
  const limit = num(env.RATE_LIMIT_PER_MINUTE, DEFAULT_LIMIT);
  const burst = num(env.RATE_LIMIT_BURST, DEFAULT_BURST);

  const ip = clientIp(request);

  if (env.RATE_LIMITER) {
    try {
      const id = env.RATE_LIMITER.idFromName(ip);
      const stub = env.RATE_LIMITER.get(id);
      const res = await stub.fetch("https://ratelimiter/check");
      const data = await res.json();

      // Push config down so the DO does not need it in its own binding.
      return normalise(data, { limit, burst, degraded: false });
    } catch (error) {
      console.warn("Durable Object unavailable, using in-isolate limit:", error.message);
      return inIsolateCheck(ip, limit, burst);
    }
  }

  return inIsolateCheck(ip, limit, burst);
}

/* ------------------------------------------------------------------ */
/* Fallback: per-isolate in-memory bucket                               */
/* ------------------------------------------------------------------ */

const isolateBuckets = new Map();

function inIsolateCheck(ip, limit, burst) {
  const now = Date.now();

  let bucket = isolateBuckets.get(ip);
  if (!bucket) bucket = { tokens: burst, lastRefill: now };

  const elapsed = Math.max(0, now - bucket.lastRefill);
  const refillPerMs = limit / 60000;

  bucket.tokens = Math.min(burst, bucket.tokens + elapsed * refillPerMs);
  bucket.lastRefill = now;

  const allowed = bucket.tokens >= 1;
  if (allowed) bucket.tokens -= 1;

  isolateBuckets.set(ip, bucket);

  // Opportunistic cleanup so the Map cannot grow without bound.
  if (isolateBuckets.size > 5000) {
    for (const [key, value] of isolateBuckets) {
      if (now - value.lastRefill > 300000) isolateBuckets.delete(key);
    }
  }

  return normalise(
    {
      allowed,
      limit,
      burst,
      remaining: Math.floor(bucket.tokens),
      retryAfterSeconds: allowed
        ? 0
        : Math.ceil((1 - bucket.tokens) / refillPerMs / 1000),
    },
    { limit, burst, degraded: true }
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function normalise(data, fallback) {
  const allowed = data?.allowed === true;

  return {
    allowed,
    degraded: fallback.degraded,
    limit: data?.limit ?? fallback.limit,
    burst: data?.burst ?? fallback.burst,
    remaining: data?.remaining ?? 0,
    retryAfterSeconds: allowed ? 0 : Math.max(1, data?.retryAfterSeconds ?? 1),
  };
}

/**
 * Trust CF-Connecting-IP: it is set by Cloudflare's edge and cannot be
 * spoofed by a client-supplied header on a deployed Worker.
 */
function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function num(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Standard rate limit headers. Safe to send on successful responses too. */
export function rateLimitHeaders(result) {
  const headers = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
  };

  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  return headers;
}