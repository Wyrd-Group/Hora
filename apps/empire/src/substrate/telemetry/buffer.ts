/**
 * substrate/telemetry/buffer.ts — local Supabase buffer writer.
 *
 * Per AEGIS_BUILD_SPEC.md §12.2 + Phase 1 build brief task J.
 *
 * Phase 0 inserted directly from `emit()` in events.ts; this Phase 1
 * file is the durable buffer-write helper that:
 *
 *   1. Inserts a row into `substrate_telemetry_events_buffer` (Phase 0
 *      migration).
 *   2. Tags rows with the player's pseudonymous token rather than real
 *      identity (§12.3).
 *   3. Returns a Promise<void> that never throws — telemetry must
 *      never break gameplay.
 *
 * The nightly drain lives in `upload.ts`.
 */

import { supabase } from '../../lib/supabase';
import type { SubstrateEventType } from './events';

export interface BufferRow {
  user_id: string;
  event_type: SubstrateEventType;
  payload: Record<string, unknown>;
  player_pseudonym?: string | null;
}

export async function bufferEvent(row: BufferRow): Promise<void> {
  try {
    await supabase.from('substrate_telemetry_events_buffer').insert(row);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[substrate/telemetry/buffer] insert failed:', (err as Error)?.message);
  }
}

/** Read the next batch of pending (un-uploaded) events. */
export async function readPendingBatch(limit = 1000): Promise<Array<{
  id: string;
  user_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}>> {
  try {
    const { data, error } = await supabase
      .from('substrate_telemetry_events_buffer')
      .select('id, user_id, event_type, payload, created_at')
      .is('uploaded_at', null)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Array<{
      id: string;
      user_id: string;
      event_type: string;
      payload: Record<string, unknown>;
      created_at: string;
    }>;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[substrate/telemetry/buffer] readPendingBatch failed:', (err as Error)?.message);
    return [];
  }
}

/** Mark rows as uploaded (drain step). */
export async function markUploaded(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await supabase
      .from('substrate_telemetry_events_buffer')
      .update({ uploaded_at: new Date().toISOString() })
      .in('id', ids);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[substrate/telemetry/buffer] markUploaded failed:', (err as Error)?.message);
  }
}
