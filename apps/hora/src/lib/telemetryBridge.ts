/**
 * telemetryBridge.ts — Auto-captures events from eventBridge and Zustand stores
 * into the telemetry system. Import once at app startup.
 */

import { eventBridge, EVENTS } from './eventBridge';
import { trackEvent } from './telemetry';

let initialized = false;

/**
 * Wire all eventBridge events to the telemetry system.
 * Call once after initTelemetry().
 */
export function initTelemetryBridge(): void {
  if (initialized) return;
  initialized = true;

  // Map eventBridge events to telemetry event types
  const EVENT_MAP: Record<string, string> = {
    [EVENTS.TRADE_EXECUTED]: 'trade_executed',
    [EVENTS.LESSON_COMPLETED]: 'lesson_completed',
    [EVENTS.QUIZ_COMPLETED]: 'quiz_completed',
    [EVENTS.FOCUS_COMPLETED]: 'focus_session_complete',
    [EVENTS.MISSION_COMPLETED]: 'mission_completed',
    [EVENTS.FOLLOWER_CHANGE]: 'follower_change',
    [EVENTS.EVENT_TRIGGERED]: 'event_triggered',
    [EVENTS.AP_AWARDED]: 'ap_awarded',
    [EVENTS.BPXP_AWARDED]: 'bpxp_awarded',

    // Living World events
    [EVENTS.VENTURE_FOUNDED]: 'venture_founded',
    [EVENTS.VENTURE_INVESTED]: 'venture_invested',
    [EVENTS.VENTURE_FRANCHISED]: 'venture_franchised',
    [EVENTS.PARTNERSHIP_FORMED]: 'partnership_formed',
    [EVENTS.SUPPLY_CHAIN_ESTABLISHED]: 'supply_chain_established',
    [EVENTS.WORLD_EVENT_STARTED]: 'world_event_started',
    [EVENTS.WORLD_EVENT_EXPIRED]: 'world_event_expired',
    [EVENTS.WORLD_NODE_PURCHASED]: 'world_node_purchased',
  };

  for (const [bridgeEvent, telemetryType] of Object.entries(EVENT_MAP)) {
    eventBridge.on(bridgeEvent, (payload: any) => {
      trackEvent(
        telemetryType,
        payload?.id || payload?.nodeId || payload?.targetId,
        payload,
      );
    });
  }
}
