/* eslint-disable no-restricted-globals */
// ============================================================================
// AEGIS Empire — Service Worker
// ============================================================================
// Strategy:
//   * App shell (index.html, favicon, manifest, icons) → precache on install
//   * Static build output (/assets/*.js, *.css, *.woff2) → cache-first, versioned
//   * API calls (Supabase, Stripe, AI providers) → NEVER cached, always network
//   * Map tiles, CDN images → stale-while-revalidate, capped at 100 entries
//
// The service worker version is bumped on every deploy to invalidate old caches.
// Bump CACHE_VERSION when changing caching behavior so old SWs flush properly.
// ============================================================================

const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE = `aegis-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `aegis-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `aegis-runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/icon-512.png',
];

// Origins that must always hit the network — writes, auth, AI, payments.
const NETWORK_ONLY_HOSTS = [
  'supabase.co',
  'supabase.in',
  'stripe.com',
  'api.openai.com',
  'api.anthropic.com',
  'sentry.io',
  'ingest.sentry.io',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![APP_SHELL_CACHE, STATIC_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

function isNetworkOnly(url) {
  return NETWORK_ONLY_HOSTS.some((host) => url.host.endsWith(host));
}

function isVersionedAsset(url) {
  // Vite emits /assets/<name>-<hash>.{js,css,woff2,...}
  return url.origin === self.location.origin && /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\./.test(url.pathname);
}

function isImageAsset(url) {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip non-http requests (chrome-extension://, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Network-only for auth/data/AI providers — never risk stale data.
  if (isNetworkOnly(url)) return;

  // Navigation → network-first with offline shell fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Cache a fresh copy of the shell for offline.
          const copy = res.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put('/', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/').then((cached) => cached || new Response('Offline', { status: 503 }))),
    );
    return;
  }

  // Versioned Vite assets — immutable, cache-first.
  if (isVersionedAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
            return res;
          }),
      ),
    );
    return;
  }

  // Images — stale-while-revalidate, cap the cache.
  if (isImageAsset(url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((res) => {
              cache.put(request, res.clone()).catch(() => {});
              trimCache(RUNTIME_CACHE, 100);
              return res;
            })
            .catch(() => cached);
          return cached || network;
        }),
      ),
    );
    return;
  }

  // Everything else — network-first, fall back to cache if offline.
  event.respondWith(
    fetch(request).catch(() => caches.match(request)),
  );
});

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
    }
  } catch {
    /* swallow */
  }
}

// Allow the app to force an immediate SW update (e.g. after a deploy banner).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
