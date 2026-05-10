/**
 * Simple in-memory sliding-window rate limiter for Netlify Functions.
 *
 * Note: Netlify Functions are stateless across cold starts, so this
 * rate limiter only works within a single warm instance. For stricter
 * enforcement, upgrade to Netlify Blobs or Redis post-launch.
 *
 * This still provides meaningful protection against burst abuse
 * since Netlify keeps functions warm for ~15 minutes.
 */

const WINDOW_MS = 60_000; // 1-minute sliding window

/** @type {Map<string, { count: number, windowStart: number }>} */
const store = new Map();

// Periodic cleanup to prevent memory leaks in long-lived instances
const CLEANUP_INTERVAL = 5 * 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      store.delete(key);
    }
  }
}

/**
 * Check if a request should be rate-limited.
 * @param {string} identifier - User ID or IP address
 * @param {string} endpoint - Function name (for per-endpoint limits)
 * @param {number} maxPerMinute - Maximum requests per minute
 * @returns {boolean} true if rate-limited (should reject), false if OK
 */
export function checkRateLimit(identifier, endpoint, maxPerMinute = 60) {
  cleanup();

  const key = `${identifier}:${endpoint}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  if (entry.count > maxPerMinute) {
    return true; // Rate limited
  }

  return false;
}

/**
 * Get the client IP from the request (for unauthenticated rate limiting).
 */
export function getClientIp(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}
