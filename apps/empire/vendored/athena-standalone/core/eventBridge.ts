/**
 * Lightweight typed event bridge for cross-store communication.
 * Replaces the vanilla JS pub/sub (notify/subscribe) pattern.
 */

type Handler<T = any> = (payload: T) => void;

const listeners: Record<string, Handler[]> = {};

export const eventBridge = {
  on<T = any>(event: string, handler: Handler<T>) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(handler);
    return () => {
      listeners[event] = listeners[event].filter(h => h !== handler);
    };
  },

  emit<T = any>(event: string, payload?: T) {
    (listeners[event] || []).forEach(h => h(payload));
  },

  /** Clear all listeners (useful for testing) */
  clear() {
    Object.keys(listeners).forEach(k => delete listeners[k]);
  },
};

// ── Well-known event names ──
export const EVENTS = {
  AP_AWARDED: 'ap:awarded',
  BPXP_AWARDED: 'bpxp:awarded',
  LESSON_COMPLETED: 'curriculum:lessonCompleted',
  QUIZ_COMPLETED: 'curriculum:quizCompleted',
  TRADE_EXECUTED: 'exchange:tradeExecuted',
  FOCUS_COMPLETED: 'focus:sessionCompleted',
  MISSION_COMPLETED: 'missions:completed',
  FOLLOWER_CHANGE: 'social:followerChange',
  EVENT_TRIGGERED: 'events:triggered',
  NEWS_REFRESH: 'news:refresh',

  // Living World Engine events
  VENTURE_FOUNDED: 'world:ventureFounded',
  VENTURE_INVESTED: 'world:ventureInvested',
  VENTURE_FRANCHISED: 'world:ventureFranchised',
  PARTNERSHIP_FORMED: 'world:partnershipFormed',
  SUPPLY_CHAIN_ESTABLISHED: 'world:supplyChainEstablished',
  WORLD_EVENT_STARTED: 'world:eventStarted',
  WORLD_EVENT_EXPIRED: 'world:eventExpired',
  WORLD_SIM_UPDATED: 'world:simUpdated',
  WORLD_NODE_PURCHASED: 'world:nodePurchased',

  // Gemma AI Brain events
  GEMMA_MACRO_NARRATIVE: 'gemma:macro_narrative',
  GEMMA_PORTFOLIO_NARRATIVE: 'gemma:portfolio_narrative',
  GEMMA_BIAS_COACHING: 'gemma:bias_coaching',
  GEMMA_NETWORK_NARRATIVE: 'gemma:network_narrative',
  GEMMA_RISK_NARRATIVE: 'gemma:risk_narrative',
  GEMMA_SENTIMENT_NARRATIVE: 'gemma:sentiment_narrative',
  GEMMA_TRADE_ANALYSIS: 'gemma:trade_analysis',
  GEMMA_EVENT_CONTEXT: 'gemma:event_context',
  GEMMA_DIRECTIVE_RESULT: 'gemma:directive_result',
  GEMMA_MAP_VISION: 'gemma:map_vision',

  // MarketWire agent journalism
  MARKETWIRE_ARTICLE: 'marketwire:article',

  // Expansion engine (Athena real-time game expansion)
  EXPANSION_INSTRUMENT_SPAWNED: 'expansion:instrumentSpawned',
  EXPANSION_EVENT_CREATED: 'expansion:eventCreated',
  EXPANSION_NODE_SPAWNED: 'expansion:nodeSpawned',
  EXPANSION_MISSION_CREATED: 'expansion:missionCreated',
  EXPANSION_MISSION_COMPLETED: 'expansion:missionCompleted',
  EXPANSION_REGIME_SHIFT: 'expansion:regimeShift',
  EXPANSION_NEWS_INJECTED: 'expansion:newsInjected',
  // Infinite Game Engine (player-created features)
  FEATURE_TESTED: 'feature:tested',
  FEATURE_DEPLOYED: 'feature:deployed',
  FEATURE_PUBLISHED: 'feature:published',
} as const;
