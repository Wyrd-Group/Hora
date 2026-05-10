/**
 * newsStore.ts — Zustand store for the news/bulletin system.
 * Manages visible bulletins, read state, and refresh cycles.
 */

import { createPersistedStore } from './createPersistedStore';
import { eventBridge, EVENTS } from '../lib/eventBridge';
import {
  ALL_BULLETINS,
  MARKET_BULLETINS,
  CRYPTO_BULLETINS,
  MACRO_BULLETINS,
  NEWS_ORGS,
  type BulletinTemplate,
} from '../data/bulletins';
import type { Bulletin } from '../types/social';

// ── Helpers ──

let _counter = 0;
function uid(): string {
  return `blt-${Date.now()}-${++_counter}`;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function templateToBulletin(t: BulletinTemplate): Bulletin {
  const org = NEWS_ORGS[t.source];
  return {
    id: uid(),
    headline: t.headline,
    body: t.body.join('\n\n'),
    source: org?.name ?? t.source,
    sentiment: t.sentiment,
    category: t.category,
    publishedAt: Date.now() - Math.floor(Math.random() * 7200000), // spread over 2h
    financialTerms: t.terms,
  };
}

// ── Store Shape ──

interface NewsState {
  bulletins: Bulletin[];
  readBulletins: string[];
  lastRefresh: number;

  // Actions
  refreshBulletins: (category?: string) => void;
  markAsRead: (bulletinId: string) => void;
  getUnreadCount: () => number;
}

const MAX_BULLETINS = 20;

export const useNewsStore = createPersistedStore<NewsState>(
  'news',
  (set, get) => ({
    bulletins: [],
    readBulletins: [],
    lastRefresh: 0,

    refreshBulletins: (category?: string) => {
      let pool: BulletinTemplate[];
      switch (category) {
        case 'markets':
          pool = MARKET_BULLETINS;
          break;
        case 'crypto':
          pool = CRYPTO_BULLETINS;
          break;
        case 'macro':
          pool = MACRO_BULLETINS;
          break;
        default:
          pool = ALL_BULLETINS;
      }

      const count = 5 + Math.floor(Math.random() * 4); // 5-8
      const selected = pickRandom(pool, count);
      const newBulletins = selected.map(templateToBulletin);

      // Merge with existing, cap at MAX
      const existing = get().bulletins;
      const merged = [...newBulletins, ...existing].slice(0, MAX_BULLETINS);

      set({
        bulletins: merged,
        lastRefresh: Date.now(),
      });

      eventBridge.emit(EVENTS.NEWS_REFRESH, { count: newBulletins.length });
    },

    markAsRead: (bulletinId: string) => {
      const { readBulletins } = get();
      if (!readBulletins.includes(bulletinId)) {
        set({ readBulletins: [...readBulletins, bulletinId].slice(-100) });
      }
    },

    getUnreadCount: () => {
      const { bulletins, readBulletins } = get();
      return bulletins.filter((b) => !readBulletins.includes(b.id)).length;
    },
  }),
);
