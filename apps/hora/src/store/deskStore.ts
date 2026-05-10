import { createPersistedStore } from './createPersistedStore';

// ── Types ──

export type DeskTab = 'briefing' | 'podcasts' | 'watchlists' | 'digest';

export interface UserWatchlist {
  name: string;
  instruments: string[];
}

// ── Store ──

interface DeskState {
  activeTab: DeskTab;
  watchlists: UserWatchlist[];
  listenedPodcasts: string[];
  readDigests: string[];

  // Actions
  setActiveTab: (tab: DeskTab) => void;
  createWatchlist: (name: string, instruments: string[]) => void;
  removeWatchlist: (index: number) => void;
  addToWatchlist: (index: number, instrumentId: string) => void;
  removeFromWatchlist: (index: number, instrumentId: string) => void;
  markPodcastListened: (podcastId: string) => void;
  markDigestRead: (digestId: string) => void;
}

export const useDeskStore = createPersistedStore<DeskState>(
  'desk',
  (set, _get) => ({
    activeTab: 'briefing',
    watchlists: [],
    listenedPodcasts: [],
    readDigests: [],

    setActiveTab(tab) {
      set({ activeTab: tab });
    },

    createWatchlist(name, instruments) {
      set(s => ({
        watchlists: [...s.watchlists, { name, instruments }],
      }));
    },

    removeWatchlist(index) {
      set(s => ({
        watchlists: s.watchlists.filter((_, i) => i !== index),
      }));
    },

    addToWatchlist(index, instrumentId) {
      set(s => {
        const updated = [...s.watchlists];
        if (!updated[index]) return s;
        if (updated[index].instruments.includes(instrumentId)) return s;
        updated[index] = {
          ...updated[index],
          instruments: [...updated[index].instruments, instrumentId],
        };
        return { watchlists: updated };
      });
    },

    removeFromWatchlist(index, instrumentId) {
      set(s => {
        const updated = [...s.watchlists];
        if (!updated[index]) return s;
        updated[index] = {
          ...updated[index],
          instruments: updated[index].instruments.filter(id => id !== instrumentId),
        };
        return { watchlists: updated };
      });
    },

    markPodcastListened(podcastId) {
      set(s => {
        if (s.listenedPodcasts.includes(podcastId)) return s;
        return { listenedPodcasts: [...s.listenedPodcasts, podcastId] };
      });
    },

    markDigestRead(digestId) {
      set(s => {
        if (s.readDigests.includes(digestId)) return s;
        return { readDigests: [...s.readDigests, digestId] };
      });
    },
  }),
);
