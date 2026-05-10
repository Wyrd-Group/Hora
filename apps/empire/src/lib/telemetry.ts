/**
 * telemetry.ts — Total Telemetry Engine
 *
 * Records EVERY single user action. Powers AI analysis,
 * player-dev rewards, innovation detection, and behavioral coaching.
 *
 * Features:
 * - Batched writes (flush every 5s or 50 events)
 * - Session tracking with UUID
 * - Offline buffer (localStorage fallback)
 * - <1ms per event capture
 */

import { supabase } from './supabase';

// ── Types ──

export interface TelemetryEvent {
  event_type: string;
  target_id?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

// ── Module State ──

const SESSION_ID = crypto.randomUUID();
let buffer: TelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let userId: string | null = null;
let isOnline = true;

const FLUSH_INTERVAL_MS = 5000;
const FLUSH_THRESHOLD = 50;
const OFFLINE_STORAGE_KEY = 'aether-telemetry-offline';

// ── Public API ──

/**
 * Track a single event. Fire-and-forget.
 * Cost: <1ms per call (just pushes to buffer).
 */
export function trackEvent(
  eventType: string,
  targetId?: string,
  metadata?: Record<string, any>,
): void {
  buffer.push({
    event_type: eventType,
    target_id: targetId,
    metadata,
    timestamp: new Date().toISOString(),
  });

  if (buffer.length >= FLUSH_THRESHOLD) {
    flush();
  }
}

/**
 * Initialize telemetry for a user session.
 * Call once on app startup after auth.
 */
let _listenersAttached = false;
const _onOnline = () => { isOnline = true; flushOfflineBuffer(); };
const _onOffline = () => { isOnline = false; };

export function initTelemetry(uid: string): void {
  userId = uid;

  // Start flush interval
  if (!flushTimer) {
    flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  }

  // Listen for online/offline — attach only once to prevent listener accumulation
  if (typeof window !== 'undefined' && !_listenersAttached) {
    _listenersAttached = true;
    window.addEventListener('online', _onOnline);
    window.addEventListener('offline', _onOffline);
    window.addEventListener('beforeunload', flush);
  }

  // Flush any offline buffer from previous session
  flushOfflineBuffer();

  // Track session start
  trackEvent('session_start', undefined, { session_id: SESSION_ID });
}

/**
 * End telemetry session. Call on logout or page unload.
 */
export function endTelemetry(): void {
  trackEvent('session_end');
  flush();

  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

/**
 * Get current session ID.
 */
export function getSessionId(): string {
  return SESSION_ID;
}

// ── Internal ──

async function flush(): Promise<void> {
  if (buffer.length === 0 || !userId) return;

  const batch = buffer.splice(0); // drain buffer

  if (!isOnline) {
    saveToOfflineBuffer(batch);
    return;
  }

  const events = batch.map(e => ({
    user_id: userId,
    event_type: e.event_type,
    target_id: e.target_id || null,
    metadata: e.metadata || {},
    session_id: SESSION_ID,
    timestamp: e.timestamp,
  }));

  try {
    const { error } = await supabase.rpc('batch_insert_telemetry', {
      p_events: JSON.stringify(events),
    });

    if (error) {
      console.warn('[Telemetry] Batch insert failed, buffering offline:', error.message);
      saveToOfflineBuffer(batch);
    }
  } catch {
    saveToOfflineBuffer(batch);
  }
}

function saveToOfflineBuffer(events: TelemetryEvent[]): void {
  try {
    const existing = JSON.parse(localStorage.getItem(OFFLINE_STORAGE_KEY) || '[]');
    existing.push(...events);
    // Cap offline buffer at 1000 events
    if (existing.length > 1000) existing.splice(0, existing.length - 1000);
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage full or unavailable — drop events
  }
}

async function flushOfflineBuffer(): Promise<void> {
  if (!isOnline || !userId) return;

  try {
    const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (!raw) return;
    const events: TelemetryEvent[] = JSON.parse(raw);
    if (events.length === 0) return;

    localStorage.removeItem(OFFLINE_STORAGE_KEY);

    // Re-add to buffer for normal flush
    buffer.push(...events);
    await flush();
  } catch {
    // Corrupted offline buffer — clear it
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
  }
}
