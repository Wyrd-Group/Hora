/**
 * marketWireStore.ts — MarketWire agent journalism store.
 *
 * AI journalist agents observe player behavior and auto-generate
 * financial news articles. Articles affect market instrument prices
 * via a drift mechanism.
 */

import { createPersistedStore } from './createPersistedStore';
import { eventBridge, EVENTS } from '../lib/eventBridge';
import {
  ARTICLE_TEMPLATES,
  JOURNALIST_AGENTS,
  MARKET_INDICES,
  type BehaviorTrigger,
  type JournalistAgent,
} from '../data/marketWireTemplates';
import { ALL_INSTRUMENTS, type Instrument } from '../data/instruments';

// ── Types ──

export interface MarketWireArticle {
  id: string;
  templateId: string;
  journalist: JournalistAgent;
  headline: string;
  body: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  category: string;
  publishedAt: number;
  trigger: BehaviorTrigger;
  relatedSymbols: string[];
  marketImpact: number;       // applied drift
  read: boolean;
}

export interface IndexSnapshot {
  id: string;
  symbol: string;
  name: string;
  value: number;
  change: number;             // absolute change
  changePercent: number;       // % change
  history: number[];           // last 20 values
}

interface MarketWireState {
  // Articles
  articles: MarketWireArticle[];
  maxArticles: number;

  // Index tracking
  indices: IndexSnapshot[];

  // Cooldown tracking (templateId → lastFiredAt)
  cooldowns: Record<string, number>;

  // Trade streak tracking
  tradeStreak: { direction: 'win' | 'loss'; count: number; totalPnl: number };

  // Watchlist (symbols the player is tracking)
  watchlist: string[];

  // Net worth milestones already triggered
  triggeredMilestones: number[];

  // Actions
  generateArticle: (trigger: BehaviorTrigger, context: Record<string, string>) => MarketWireArticle | null;
  markAsRead: (articleId: string) => void;
  getUnreadCount: () => number;
  updateIndices: () => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  recordTrade: (pnl: number) => void;
  checkMilestone: (netWorth: number, playerName: string) => void;
}

// ── Helpers ──

let _counter = 0;
function uid(): string {
  return `mw-${Date.now()}-${++_counter}`;
}

function fillTemplate(pattern: string, ctx: Record<string, string>): string {
  return pattern.replace(/\{(\w+)\}/g, (_, key) => ctx[key] ?? `{${key}}`);
}

function getInstrumentBySector(sector: string): Instrument[] {
  return ALL_INSTRUMENTS.filter(i => i.sector === sector);
}

function computeIndexValue(sectors: string[], types: string[]): number {
  let instruments = ALL_INSTRUMENTS;
  if (sectors.length > 0) {
    instruments = instruments.filter(i => sectors.includes(i.sector || ''));
  }
  if (types.length > 0) {
    instruments = instruments.filter(i => types.includes(i.type));
  }
  if (instruments.length === 0) return 1000;
  const avg = instruments.reduce((s, i) => s + i.price, 0) / instruments.length;
  // Normalize to index-scale (multiply by factor to look like a real index)
  return Math.round(avg * 12.5 * 100) / 100;
}

// ── Milestones ──
const MILESTONES = [100_000, 250_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000];

// ── Store ──

export const useMarketWireStore = createPersistedStore<MarketWireState>(
  'marketwire',
  (set, get) => ({
    articles: [],
    maxArticles: 50,
    indices: [],
    cooldowns: {},
    tradeStreak: { direction: 'win', count: 0, totalPnl: 0 },
    watchlist: ['AAPL', 'NVDA', 'BTC', 'GOOGL', 'TSLA'],
    triggeredMilestones: [],

    generateArticle: (trigger, context) => {
      const state = get();
      const now = Date.now();

      // Find matching templates
      const candidates = ARTICLE_TEMPLATES.filter(t => {
        if (t.trigger !== trigger) return false;
        // Check cooldown
        const lastFired = state.cooldowns[t.id] || 0;
        if (now - lastFired < t.cooldownMs) return false;
        // For crypto-specific articles, only match if crypto instrument
        if (t.id === 'art-crypto-buy' && context.instrumentType !== 'crypto') return false;
        // Skip crypto template for non-crypto large buys
        if (t.id === 'art-large-buy' && context.instrumentType === 'crypto') return false;
        return true;
      });

      if (candidates.length === 0) return null;

      // Pick best matching template (first match)
      const template = candidates[0];
      const journalist = JOURNALIST_AGENTS.find(j => j.id === template.journalist) || JOURNALIST_AGENTS[0];

      // Fill headline and body
      const headline = fillTemplate(template.headlinePattern, context);
      const body = template.bodyPatterns.map(p => fillTemplate(p, context));

      // Determine related symbols
      const relatedSymbols: string[] = [];
      if (context.symbol) relatedSymbols.push(context.symbol);
      if (template.marketImpact.affectedSymbols) {
        relatedSymbols.push(...template.marketImpact.affectedSymbols.map(s => fillTemplate(s, context)));
      }
      if (template.marketImpact.affectedSectors) {
        const sectors = template.marketImpact.affectedSectors.map(s => fillTemplate(s, context));
        for (const sect of sectors) {
          const instruments = getInstrumentBySector(sect);
          relatedSymbols.push(...instruments.slice(0, 3).map(i => i.symbol));
        }
      }

      const article: MarketWireArticle = {
        id: uid(),
        templateId: template.id,
        journalist,
        headline,
        body,
        sentiment: template.sentiment,
        category: template.category,
        publishedAt: now,
        trigger,
        relatedSymbols: [...new Set(relatedSymbols)],
        marketImpact: template.marketImpact.drift,
        read: false,
      };

      // Update state
      set({
        articles: [article, ...state.articles].slice(0, state.maxArticles),
        cooldowns: { ...state.cooldowns, [template.id]: now },
      });

      // Emit event for price drift
      eventBridge.emit(EVENTS.MARKETWIRE_ARTICLE, {
        articleId: article.id,
        drift: template.marketImpact.drift,
        affectedSymbols: relatedSymbols,
        affectedSectors: template.marketImpact.affectedSectors?.map(s => fillTemplate(s, context)) || [],
        sentiment: template.sentiment,
      });

      return article;
    },

    markAsRead: (articleId) => {
      const { articles } = get();
      set({
        articles: articles.map(a => a.id === articleId ? { ...a, read: true } : a),
      });
    },

    getUnreadCount: () => {
      return get().articles.filter(a => !a.read).length;
    },

    updateIndices: () => {
      const indices: IndexSnapshot[] = MARKET_INDICES.map(idx => {
        const prev = get().indices.find(i => i.id === idx.id);
        const value = computeIndexValue(idx.sectors, idx.instrumentTypes);
        const prevValue = prev?.value || value;
        const change = Math.round((value - prevValue) * 100) / 100;
        const changePercent = prevValue > 0 ? Math.round((change / prevValue) * 10000) / 100 : 0;
        const history = prev ? [...prev.history.slice(-19), value] : [value];

        return {
          id: idx.id,
          symbol: idx.symbol,
          name: idx.name,
          value,
          change,
          changePercent,
          history,
        };
      });

      set({ indices });
    },

    addToWatchlist: (symbol) => {
      const { watchlist } = get();
      if (!watchlist.includes(symbol)) {
        set({ watchlist: [...watchlist, symbol].slice(0, 20) });
      }
    },

    removeFromWatchlist: (symbol) => {
      set({ watchlist: get().watchlist.filter(s => s !== symbol) });
    },

    recordTrade: (pnl) => {
      const { tradeStreak } = get();
      const direction: 'win' | 'loss' = pnl >= 0 ? 'win' : 'loss';

      if (direction === tradeStreak.direction) {
        const newStreak = {
          direction,
          count: tradeStreak.count + 1,
          totalPnl: tradeStreak.totalPnl + pnl,
        };
        set({ tradeStreak: newStreak });

        // Trigger streak article at 3+
        if (newStreak.count >= 3) {
          const ctx: Record<string, string> = {
            playerName: 'You',
            streakCount: String(newStreak.count),
            totalGains: Math.abs(newStreak.totalPnl).toLocaleString(),
            totalLosses: Math.abs(newStreak.totalPnl).toLocaleString(),
          };
          get().generateArticle(
            direction === 'win' ? 'winning_streak' : 'losing_streak',
            ctx,
          );
        }
      } else {
        // Streak broken
        set({ tradeStreak: { direction, count: 1, totalPnl: pnl } });
      }
    },

    checkMilestone: (netWorth, playerName) => {
      const { triggeredMilestones } = get();
      for (const m of MILESTONES) {
        if (netWorth >= m && !triggeredMilestones.includes(m)) {
          set({ triggeredMilestones: [...triggeredMilestones, m] });
          get().generateArticle('portfolio_milestone', {
            playerName,
            milestone: m >= 1_000_000 ? `${(m / 1_000_000).toFixed(0)}M` : `${(m / 1_000).toFixed(0)}K`,
            netWorth: netWorth.toLocaleString(),
          });
          break; // one milestone at a time
        }
      }
    },
  }),
  {
    partialize: (state: MarketWireState) => ({
      ...state,
      // Don't persist indices (recomputed)
      indices: [],
    }),
  } as any,
);
