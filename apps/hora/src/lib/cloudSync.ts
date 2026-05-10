/**
 * Cloud Sync — saves/loads Zustand game state to Supabase profiles table.
 * Debounced auto-save on every state change. Full load on login.
 */
import { supabase } from './supabase';
import { z } from 'zod';
import { createLogger } from './logger';

const log = createLogger('cloudsync');

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 3000; // Save at most every 3 seconds

/**
 * Loose schema for cloud-loaded game state.
 * Validates critical numeric fields have sane types/defaults.
 * `.passthrough()` allows any additional keys for forward compatibility.
 */
const GameStateSchema = z.object({
  balance: z.number().nonnegative().default(100000),
  netWorth: z.number().default(100000),
  portfolio: z.record(z.any()).default({}),
  completedLessons: z.array(z.string()).default([]),
  passedExams: z.array(z.string()).default([]),
  ecflScore: z.number().default(0),
  flouLevel: z.number().int().min(0).max(10).default(0),
  ceoExperience: z.number().nonnegative().default(0),
}).passthrough();

/**
 * Load game state from Supabase for the current user.
 * Returns the stored JSONB game_state, or null if no saved state.
 * Validates schema to prevent corrupt/malicious data from crashing the client.
 */
export async function loadGameState(userId: string): Promise<Record<string, any> | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('game_state, display_name')
      .eq('id', userId)
      .single();

    if (error) {
      log.error('Load error', error);
      return null;
    }

    // Empty object = brand new account, no saved state yet
    if (!data?.game_state || Object.keys(data.game_state).length === 0) {
      return null;
    }

    const parsed = GameStateSchema.safeParse(data.game_state);
    if (!parsed.success) {
      log.error('Invalid game state schema, returning raw data with warning', parsed.error.issues);
      // Return raw data rather than blocking the user — the hydration layer
      // has its own ?? defaults for every field
      return data.game_state;
    }

    return parsed.data;
  } catch (err) {
    log.error('Load exception', err);
    return null;
  }
}

/**
 * Save game state to Supabase. Debounced — call freely on every change.
 */
export function saveGameState(userId: string, state: Record<string, any>) {
  if (saveTimer) clearTimeout(saveTimer);

  saveTimer = setTimeout(async () => {
    try {
      // Strip functions and UI-only state before saving
      const { game_state } = stripNonSerializable(state);

      const { error } = await supabase
        .from('profiles')
        .update({ game_state })
        .eq('id', userId);

      if (error) {
        log.error('Save error', error);
      }
    } catch (err) {
      log.error('Save exception', err);
    }
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Force an immediate save (used on sign-out or page unload).
 */
export async function saveGameStateNow(userId: string, state: Record<string, any>) {
  if (saveTimer) clearTimeout(saveTimer);
  try {
    const { game_state } = stripNonSerializable(state);
    await supabase
      .from('profiles')
      .update({ game_state })
      .eq('id', userId);
  } catch (err) {
    log.error('Immediate save error', err);
  }
}

/**
 * Strip functions and transient UI state from the Zustand snapshot.
 */
function stripNonSerializable(state: Record<string, any>) {
  const skipKeys = new Set([
    // Functions (actions) — these are recreated by Zustand
    'processTick', 'purchaseNode', 'purchaseNamingRights', 'upgradeNode',
    'selectNode', 'setActiveTab', 'setTerminalOpen', 'setAthenaOpen',
    'setPackOpen', 'setLeftRailOpen', 'setShowRoutes', 'setSectorFilter',
    'startProject', 'executeCrime', 'decryptIntel', 'openPack',
    'setCompanyCountry', 'setResidencyCountry', 'setStructureCooldown',
    'setResidencyCooldown', 'setJurisdictionCooldown', 'getCooldownRemaining',
    'payFine', 'setDifficulty', 'markLessonComplete', 'markExamPassed',
    'addEcflScore', 'setFlouLevel', 'buyInstrument', 'sellInstrument',
    'pushTickerEvent', 'addMoney', 'setBuildings', 'transfer',
    'buyAsset', 'allocateToFund', 'executeShadowOp',
    'getOwnedNodes', 'getMarketNodes', 'getRivalNodes', 'getNodeById',
    'socialLikePost', 'socialFollow', 'socialPublishPost',
    'buildRoute', 'upgradeRoute', 'startResearch',
    'setAthenaSignal',
    // Transient UI state — don't persist to cloud
    'selectedNodeId', 'terminalOpen', 'athenaOpen', 'packOpen',
    'leftRailOpen', 'showRoutes',
  ]);

  const game_state: Record<string, any> = {};
  for (const [key, value] of Object.entries(state)) {
    if (skipKeys.has(key)) continue;
    if (typeof value === 'function') continue;
    game_state[key] = value;
  }

  return { game_state };
}
