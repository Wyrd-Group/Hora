/**
 * eventsStore.ts — Zustand store for random event system.
 * Manages active events, cooldowns, and history.
 */

import { createPersistedStore } from './createPersistedStore';
import { eventBridge, EVENTS } from '../lib/eventBridge';
import { RANDOM_EVENTS } from '../data/randomEvents';
import type { GameEvent } from '../types/social';

// ── Store Shape ──

interface EventHistoryEntry {
  eventId: string;
  choiceIndex: number;
  timestamp: number;
}

interface EventsState {
  activeEvent: GameEvent | null;
  eventHistory: EventHistoryEntry[];
  cooldowns: Record<string, number>; // eventId -> tick when available

  // Actions
  triggerRandomEvent: (netWorth: number, structures: string[]) => GameEvent | null;
  resolveEvent: (choiceIndex: number) => Record<string, number> | null;
  dismissEvent: () => void;
  isOnCooldown: (eventId: string, currentTick?: number) => boolean;
}

export const useEventsStore = createPersistedStore<EventsState>(
  'events',
  (set, get) => ({
    activeEvent: null,
    eventHistory: [],
    cooldowns: {},

    triggerRandomEvent: (netWorth: number, structures: string[]) => {
      const state = get();
      if (state.activeEvent) return null; // already showing one

      const currentTick = Date.now();

      // Filter eligible events
      const eligible = RANDOM_EVENTS.filter((evt) => {
        // Net worth gate
        if (evt.minNetWorth && netWorth < evt.minNetWorth) return false;
        // Structure requirement
        if (evt.requiresStructure && !structures.includes(evt.requiresStructure)) return false;
        // Cooldown check
        const cd = state.cooldowns[evt.id];
        if (cd && currentTick < cd) return false;
        return true;
      });

      if (eligible.length === 0) return null;

      // 60% chance of event firing when eligible
      if (Math.random() > 0.6) return null;

      const event = eligible[Math.floor(Math.random() * eligible.length)];
      set({ activeEvent: event });
      return event;
    },

    resolveEvent: (choiceIndex: number) => {
      const { activeEvent, eventHistory, cooldowns } = get();
      if (!activeEvent) return null;

      const option = activeEvent.options[choiceIndex];
      if (!option) return null;

      const currentTick = Date.now();
      const cooldownUntil = currentTick + activeEvent.cooldownTicks * 60000; // convert ticks to ms

      // Record in history (cap at 100)
      const newHistory = [
        ...eventHistory,
        { eventId: activeEvent.id, choiceIndex, timestamp: currentTick },
      ].slice(-100);

      set({
        activeEvent: null,
        eventHistory: newHistory,
        cooldowns: { ...cooldowns, [activeEvent.id]: cooldownUntil },
      });

      eventBridge.emit(EVENTS.EVENT_TRIGGERED, {
        eventId: activeEvent.id,
        choice: option.label,
        effects: option.effects,
      });

      return option.effects;
    },

    dismissEvent: () => {
      set({ activeEvent: null });
    },

    isOnCooldown: (eventId: string, currentTick?: number) => {
      const cd = get().cooldowns[eventId];
      if (!cd) return false;
      return (currentTick ?? Date.now()) < cd;
    },
  }),
);
