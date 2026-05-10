/**
 * replayStore.ts -- Zustand store for Market Replay engine.
 * Manages scenario playback, tick-by-tick price data, trading, limit orders, and derivatives.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getScenarioById } from '../data/replayScenarios';
import type { ReplayAnnotation } from '../data/replayScenarios';
import { eventBridge, EVENTS } from '../lib/eventBridge';
import { useCardEconomyStore } from './cardEconomyStore';
import { useBattlePassStore } from './battlePassStore';
import { getCachedReplayPrices, clearPriceCache } from '../lib/replayPriceGenerator';

// ── Types ──────────────────────────────────────────────────────────

interface ReplayHolding {
  qty: number;
  avgCost: number;
}

interface TradeRecord {
  tick: number;
  instrumentId: string;
  side: 'buy' | 'sell';
  qty: number;
  price: number;
  total: number;
  orderType?: 'market' | 'limit' | 'derivative';
}

interface CompletedScenario {
  stars: number;
  returnPct: number;
  date: number;
}

// ── Limit Orders ──────────────────────────────────────────────────

interface LimitOrder {
  id: string;
  instrumentId: string;
  side: 'buy' | 'sell';
  qty: number;
  triggerPrice: number;
  condition: 'above' | 'below'; // execute when price goes above/below trigger
  createdTick: number;
  status: 'active' | 'filled' | 'cancelled';
}

// ── Derivatives ───────────────────────────────────────────────────

interface OptionPosition {
  id: string;
  instrumentId: string;
  type: 'call' | 'put';
  strikePrice: number;
  premium: number; // cost paid per contract
  qty: number; // number of contracts (each = 100 units)
  expiryTick: number;
  openTick: number;
  status: 'open' | 'exercised' | 'expired';
}

interface LeveragedPosition {
  id: string;
  instrumentId: string;
  side: 'long' | 'short';
  leverage: 2 | 5 | 10;
  entryPrice: number;
  qty: number;
  margin: number; // collateral locked
  liquidationPrice: number;
  openTick: number;
  status: 'open' | 'closed' | 'liquidated';
}

interface ReplayState {
  // ── Scenario state ──
  activeScenarioId: string | null;
  currentTick: number;
  isPlaying: boolean;
  playbackSpeed: 1 | 2 | 5 | 10;

  // ── Trading state ──
  replayBalance: number;
  replayHoldings: Record<string, ReplayHolding>;
  tradeHistory: TradeRecord[];
  holdingSince: Record<string, number>;

  // ── Limit Orders ──
  limitOrders: LimitOrder[];

  // ── Derivatives ──
  optionPositions: OptionPosition[];
  leveragedPositions: LeveragedPosition[];

  // ── Persistent progress ──
  completedScenarios: Record<string, CompletedScenario>;

  // ── Actions ──
  loadScenario: (scenarioId: string) => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: 1 | 2 | 5 | 10) => void;
  advanceTick: () => void;
  seekToTick: (tick: number) => void;
  executeTrade: (instrumentId: string, qty: number, price: number, side: 'buy' | 'sell') => boolean;
  completeScenario: () => { stars: number; returnPct: number };
  resetScenario: () => void;

  // ── Limit Order Actions ──
  placeLimitOrder: (order: Omit<LimitOrder, 'id' | 'createdTick' | 'status'>) => void;
  cancelLimitOrder: (orderId: string) => void;
  processLimitOrders: () => void;

  // ── Derivative Actions ──
  buyOption: (instrumentId: string, type: 'call' | 'put', strikePrice: number, qty: number, expiryTicks: number) => boolean;
  exerciseOption: (optionId: string) => boolean;
  openLeveraged: (instrumentId: string, side: 'long' | 'short', leverage: 2 | 5 | 10, qty: number) => boolean;
  closeLeveraged: (positionId: string) => boolean;
  processDerivatives: () => void;

  // ── Derived getters ──
  getPortfolioValue: () => number;
  getReturnPct: () => number;
  getCurrentPrices: () => Record<string, number>;
  getVisibleAnnotations: () => ReplayAnnotation[];
  getMaxHoldTicks: () => number;
}

// ── Helpers ───────────────────────────────────────────────────────

let _nextId = 1;
function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${_nextId++}`;
}

// Black-Scholes-ish option premium (simplified)
function calcOptionPremium(
  currentPrice: number,
  strikePrice: number,
  type: 'call' | 'put',
  ticksToExpiry: number,
  volatility = 0.3,
): number {
  const timeYears = ticksToExpiry / 250; // ~250 ticks ≈ 1 year
  const intrinsic = type === 'call'
    ? Math.max(0, currentPrice - strikePrice)
    : Math.max(0, strikePrice - currentPrice);
  const timeValue = currentPrice * volatility * Math.sqrt(Math.max(0.001, timeYears)) * 0.4;
  return Math.max(0.01, intrinsic + timeValue);
}

// ── Store ──────────────────────────────────────────────────────────

export const useReplayStore = create<ReplayState>()(
  persist(
    (set, get) => ({
      // ── Initial state ──
      activeScenarioId: null,
      currentTick: 0,
      isPlaying: false,
      playbackSpeed: 1,
      replayBalance: 10000,
      replayHoldings: {},
      tradeHistory: [],
      holdingSince: {},
      limitOrders: [],
      optionPositions: [],
      leveragedPositions: [],
      completedScenarios: {},

      // ── Actions ──

      loadScenario: (scenarioId: string) => {
        const scenario = getScenarioById(scenarioId);
        if (!scenario) return;
        set({
          activeScenarioId: scenarioId,
          currentTick: 0,
          isPlaying: false,
          playbackSpeed: 1,
          replayBalance: scenario.startingBalance,
          replayHoldings: {},
          tradeHistory: [],
          holdingSince: {},
          limitOrders: [],
          optionPositions: [],
          leveragedPositions: [],
        });
      },

      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),

      setSpeed: (speed) => set({ playbackSpeed: speed }),

      advanceTick: () => {
        const { activeScenarioId, currentTick } = get();
        const scenario = activeScenarioId ? getScenarioById(activeScenarioId) : null;
        if (!scenario) return;
        // Free sim (live market) never stops — wrap around to keep generating prices
        if (currentTick >= scenario.duration - 1) {
          if (activeScenarioId === '__free_sim__') {
            // Continue — price generator will extrapolate beyond scenario duration
            set({ currentTick: currentTick + 1 });
          } else {
            set({ isPlaying: false });
            return;
          }
        } else {
          set({ currentTick: currentTick + 1 });
        }
        // Process limit orders and derivatives at new tick
        get().processLimitOrders();
        get().processDerivatives();
      },

      seekToTick: (tick: number) => {
        const { activeScenarioId } = get();
        const scenario = activeScenarioId ? getScenarioById(activeScenarioId) : null;
        if (!scenario) return;
        const clamped = Math.max(0, Math.min(tick, scenario.duration - 1));
        set({ currentTick: clamped });
      },

      executeTrade: (instrumentId, qty, price, side) => {
        const state = get();
        const total = qty * price;

        if (side === 'buy') {
          if (state.replayBalance < total) return false;
          const existing = state.replayHoldings[instrumentId] ?? { qty: 0, avgCost: 0 };
          const newQty = existing.qty + qty;
          const newAvg = newQty > 0
            ? (existing.avgCost * existing.qty + total) / newQty
            : 0;

          set({
            replayBalance: state.replayBalance - total,
            replayHoldings: {
              ...state.replayHoldings,
              [instrumentId]: { qty: newQty, avgCost: newAvg },
            },
            holdingSince: {
              ...state.holdingSince,
              [instrumentId]: state.holdingSince[instrumentId] ?? state.currentTick,
            },
            tradeHistory: [
              ...state.tradeHistory,
              { tick: state.currentTick, instrumentId, side, qty, price, total },
            ],
          });
        } else {
          // sell
          const existing = state.replayHoldings[instrumentId];
          if (!existing || existing.qty < qty) return false;
          const newQty = existing.qty - qty;
          const newHoldings = { ...state.replayHoldings };
          const newHoldingSince = { ...state.holdingSince };

          if (newQty <= 0) {
            delete newHoldings[instrumentId];
            delete newHoldingSince[instrumentId];
          } else {
            newHoldings[instrumentId] = { qty: newQty, avgCost: existing.avgCost };
          }

          set({
            replayBalance: state.replayBalance + total,
            replayHoldings: newHoldings,
            holdingSince: newHoldingSince,
            tradeHistory: [
              ...state.tradeHistory,
              { tick: state.currentTick, instrumentId, side, qty, price, total },
            ],
          });
        }

        eventBridge.emit(EVENTS.TRADE_EXECUTED, {
          instrumentId,
          qty,
          price,
          side,
          context: 'replay',
        });

        return true;
      },

      // ── Limit Orders ──

      placeLimitOrder: (order) => {
        const state = get();
        const newOrder: LimitOrder = {
          ...order,
          id: genId('lmt'),
          createdTick: state.currentTick,
          status: 'active',
        };
        set({ limitOrders: [...state.limitOrders, newOrder] });
      },

      cancelLimitOrder: (orderId) => {
        set((s) => ({
          limitOrders: s.limitOrders.map((o) =>
            o.id === orderId ? { ...o, status: 'cancelled' as const } : o,
          ),
        }));
      },

      processLimitOrders: () => {
        const state = get();
        const scenario = state.activeScenarioId ? getScenarioById(state.activeScenarioId) : null;
        if (!scenario) return;

        const allPrices = getCachedReplayPrices(scenario);
        const activeOrders = state.limitOrders.filter((o) => o.status === 'active');
        if (activeOrders.length === 0) return;

        let updated = false;
        const newOrders = [...state.limitOrders];

        for (let i = 0; i < newOrders.length; i++) {
          const order = newOrders[i];
          if (order.status !== 'active') continue;

          const prices = allPrices[order.instrumentId];
          if (!prices) continue;
          const currentPrice = prices[Math.min(state.currentTick, prices.length - 1)];

          let triggered = false;
          if (order.condition === 'above' && currentPrice >= order.triggerPrice) triggered = true;
          if (order.condition === 'below' && currentPrice <= order.triggerPrice) triggered = true;

          if (triggered) {
            const success = get().executeTrade(order.instrumentId, order.qty, currentPrice, order.side);
            newOrders[i] = { ...order, status: success ? 'filled' : 'cancelled' };
            updated = true;
          }
        }

        if (updated) {
          set({ limitOrders: newOrders });
        }
      },

      // ── Derivatives ──

      buyOption: (instrumentId, type, strikePrice, qty, expiryTicks) => {
        const state = get();
        const scenario = state.activeScenarioId ? getScenarioById(state.activeScenarioId) : null;
        if (!scenario) return false;

        const allPrices = getCachedReplayPrices(scenario);
        const prices = allPrices[instrumentId];
        if (!prices) return false;
        const currentPrice = prices[Math.min(state.currentTick, prices.length - 1)];

        const premium = calcOptionPremium(currentPrice, strikePrice, type, expiryTicks);
        const totalCost = premium * qty * 100; // each contract = 100 units

        if (state.replayBalance < totalCost) return false;

        const option: OptionPosition = {
          id: genId('opt'),
          instrumentId,
          type,
          strikePrice,
          premium,
          qty,
          expiryTick: state.currentTick + expiryTicks,
          openTick: state.currentTick,
          status: 'open',
        };

        set({
          replayBalance: state.replayBalance - totalCost,
          optionPositions: [...state.optionPositions, option],
          tradeHistory: [
            ...state.tradeHistory,
            {
              tick: state.currentTick,
              instrumentId,
              side: 'buy',
              qty: qty * 100,
              price: premium,
              total: totalCost,
              orderType: 'derivative',
            },
          ],
        });
        return true;
      },

      exerciseOption: (optionId) => {
        const state = get();
        const scenario = state.activeScenarioId ? getScenarioById(state.activeScenarioId) : null;
        if (!scenario) return false;

        const optIdx = state.optionPositions.findIndex((o) => o.id === optionId);
        if (optIdx === -1) return false;
        const option = state.optionPositions[optIdx];
        if (option.status !== 'open') return false;

        const allPrices = getCachedReplayPrices(scenario);
        const prices = allPrices[option.instrumentId];
        if (!prices) return false;
        const currentPrice = prices[Math.min(state.currentTick, prices.length - 1)];

        let payout = 0;
        if (option.type === 'call' && currentPrice > option.strikePrice) {
          payout = (currentPrice - option.strikePrice) * option.qty * 100;
        } else if (option.type === 'put' && currentPrice < option.strikePrice) {
          payout = (option.strikePrice - currentPrice) * option.qty * 100;
        }

        const newOptions = [...state.optionPositions];
        newOptions[optIdx] = { ...option, status: 'exercised' };

        set({
          replayBalance: state.replayBalance + payout,
          optionPositions: newOptions,
          tradeHistory: [
            ...state.tradeHistory,
            {
              tick: state.currentTick,
              instrumentId: option.instrumentId,
              side: 'sell',
              qty: option.qty * 100,
              price: payout / (option.qty * 100) || 0,
              total: payout,
              orderType: 'derivative',
            },
          ],
        });
        return true;
      },

      openLeveraged: (instrumentId, side, leverage, qty) => {
        const state = get();
        const scenario = state.activeScenarioId ? getScenarioById(state.activeScenarioId) : null;
        if (!scenario) return false;

        const allPrices = getCachedReplayPrices(scenario);
        const prices = allPrices[instrumentId];
        if (!prices) return false;
        const entryPrice = prices[Math.min(state.currentTick, prices.length - 1)];

        const notional = entryPrice * qty;
        const margin = notional / leverage;
        if (state.replayBalance < margin) return false;

        // Liquidation: when loss = margin (i.e. 100% of collateral gone)
        const liquidationPrice = side === 'long'
          ? entryPrice * (1 - 1 / leverage)
          : entryPrice * (1 + 1 / leverage);

        const position: LeveragedPosition = {
          id: genId('lev'),
          instrumentId,
          side,
          leverage,
          entryPrice,
          qty,
          margin,
          liquidationPrice,
          openTick: state.currentTick,
          status: 'open',
        };

        set({
          replayBalance: state.replayBalance - margin,
          leveragedPositions: [...state.leveragedPositions, position],
          tradeHistory: [
            ...state.tradeHistory,
            {
              tick: state.currentTick,
              instrumentId,
              side: 'buy',
              qty,
              price: entryPrice,
              total: margin,
              orderType: 'derivative',
            },
          ],
        });
        return true;
      },

      closeLeveraged: (positionId) => {
        const state = get();
        const scenario = state.activeScenarioId ? getScenarioById(state.activeScenarioId) : null;
        if (!scenario) return false;

        const posIdx = state.leveragedPositions.findIndex((p) => p.id === positionId);
        if (posIdx === -1) return false;
        const pos = state.leveragedPositions[posIdx];
        if (pos.status !== 'open') return false;

        const allPrices = getCachedReplayPrices(scenario);
        const prices = allPrices[pos.instrumentId];
        if (!prices) return false;
        const currentPrice = prices[Math.min(state.currentTick, prices.length - 1)];

        const priceDelta = pos.side === 'long'
          ? currentPrice - pos.entryPrice
          : pos.entryPrice - currentPrice;
        const pnl = priceDelta * pos.qty * pos.leverage;
        const payout = Math.max(0, pos.margin + pnl);

        const newPositions = [...state.leveragedPositions];
        newPositions[posIdx] = { ...pos, status: 'closed' };

        set({
          replayBalance: state.replayBalance + payout,
          leveragedPositions: newPositions,
          tradeHistory: [
            ...state.tradeHistory,
            {
              tick: state.currentTick,
              instrumentId: pos.instrumentId,
              side: 'sell',
              qty: pos.qty,
              price: currentPrice,
              total: payout,
              orderType: 'derivative',
            },
          ],
        });
        return true;
      },

      processDerivatives: () => {
        const state = get();
        const scenario = state.activeScenarioId ? getScenarioById(state.activeScenarioId) : null;
        if (!scenario) return;

        const allPrices = getCachedReplayPrices(scenario);

        // Process option expirations
        const newOptions = state.optionPositions.map((opt) => {
          if (opt.status !== 'open') return opt;
          if (state.currentTick >= opt.expiryTick) {
            const prices = allPrices[opt.instrumentId];
            if (!prices) return { ...opt, status: 'expired' as const };
            const finalPrice = prices[Math.min(opt.expiryTick, prices.length - 1)];

            let payout = 0;
            if (opt.type === 'call' && finalPrice > opt.strikePrice) {
              payout = (finalPrice - opt.strikePrice) * opt.qty * 100;
            } else if (opt.type === 'put' && finalPrice < opt.strikePrice) {
              payout = (opt.strikePrice - finalPrice) * opt.qty * 100;
            }

            if (payout > 0) {
              set((s) => ({
                replayBalance: s.replayBalance + payout,
                tradeHistory: [
                  ...s.tradeHistory,
                  {
                    tick: state.currentTick,
                    instrumentId: opt.instrumentId,
                    side: 'sell' as const,
                    qty: opt.qty * 100,
                    price: payout / (opt.qty * 100),
                    total: payout,
                    orderType: 'derivative' as const,
                  },
                ],
              }));
              return { ...opt, status: 'exercised' as const };
            }
            return { ...opt, status: 'expired' as const };
          }
          return opt;
        });

        // Process leveraged position liquidations
        const newLeveraged = state.leveragedPositions.map((pos) => {
          if (pos.status !== 'open') return pos;
          const prices = allPrices[pos.instrumentId];
          if (!prices) return pos;
          const currentPrice = prices[Math.min(state.currentTick, prices.length - 1)];

          const shouldLiquidate = pos.side === 'long'
            ? currentPrice <= pos.liquidationPrice
            : currentPrice >= pos.liquidationPrice;

          if (shouldLiquidate) {
            // Margin is lost
            return { ...pos, status: 'liquidated' as const };
          }
          return pos;
        });

        const optionsChanged = newOptions !== state.optionPositions;
        const leveragedChanged = newLeveraged !== state.leveragedPositions;
        if (optionsChanged || leveragedChanged) {
          set({
            optionPositions: newOptions,
            leveragedPositions: newLeveraged,
          });
        }
      },

      completeScenario: () => {
        const state = get();
        const scenario = state.activeScenarioId ? getScenarioById(state.activeScenarioId) : null;
        if (!scenario) return { stars: 0, returnPct: 0 };

        const portfolioValue = get().getPortfolioValue();
        const returnPct = ((portfolioValue - scenario.startingBalance) / scenario.startingBalance) * 100;
        const [t1, t2, t3] = scenario.starThresholds;

        let stars = 0;
        if (returnPct >= t1) stars = 1;
        if (returnPct >= t2) stars = 2;
        if (returnPct >= t3) stars = 3;

        // Award AP: 50/100/200 for 1/2/3 stars
        const apReward = stars === 3 ? 200 : stars === 2 ? 100 : stars === 1 ? 50 : 0;

        try {
          if (apReward > 0) {
            useCardEconomyStore.getState().awardAegisPoints(apReward, `Replay: ${scenario.title}`);
          }
          useBattlePassStore.getState().awardBPXP(25);
        } catch {
          // Silent fail
        }

        set((s) => ({
          isPlaying: false,
          completedScenarios: {
            ...s.completedScenarios,
            [scenario.id]: {
              stars: Math.max(stars, s.completedScenarios[scenario.id]?.stars ?? 0),
              returnPct: Math.max(returnPct, s.completedScenarios[scenario.id]?.returnPct ?? -Infinity),
              date: Date.now(),
            },
          },
        }));

        eventBridge.emit(EVENTS.MISSION_COMPLETED, {
          scenarioId: scenario.id,
          stars,
          returnPct,
          apReward,
          context: 'replay',
        });

        return { stars, returnPct };
      },

      resetScenario: () => {
        clearPriceCache();
        set({
          activeScenarioId: null,
          currentTick: 0,
          isPlaying: false,
          playbackSpeed: 1,
          replayBalance: 10000,
          replayHoldings: {},
          tradeHistory: [],
          holdingSince: {},
          limitOrders: [],
          optionPositions: [],
          leveragedPositions: [],
        });
      },

      // ── Derived ──

      getPortfolioValue: () => {
        const state = get();
        const scenario = state.activeScenarioId ? getScenarioById(state.activeScenarioId) : null;
        if (!scenario) return state.replayBalance;

        const allPrices = getCachedReplayPrices(scenario);
        let holdingsValue = 0;
        for (const [instrumentId, holding] of Object.entries(state.replayHoldings)) {
          const prices = allPrices[instrumentId];
          if (!prices) continue;
          const currentPrice = prices[Math.min(state.currentTick, prices.length - 1)];
          holdingsValue += holding.qty * currentPrice;
        }

        // Add open option positions value (intrinsic value only)
        for (const opt of state.optionPositions) {
          if (opt.status !== 'open') continue;
          const prices = allPrices[opt.instrumentId];
          if (!prices) continue;
          const cp = prices[Math.min(state.currentTick, prices.length - 1)];
          if (opt.type === 'call' && cp > opt.strikePrice) {
            holdingsValue += (cp - opt.strikePrice) * opt.qty * 100;
          } else if (opt.type === 'put' && cp < opt.strikePrice) {
            holdingsValue += (opt.strikePrice - cp) * opt.qty * 100;
          }
        }

        // Add open leveraged positions value
        for (const pos of state.leveragedPositions) {
          if (pos.status !== 'open') continue;
          const prices = allPrices[pos.instrumentId];
          if (!prices) continue;
          const cp = prices[Math.min(state.currentTick, prices.length - 1)];
          const priceDelta = pos.side === 'long' ? cp - pos.entryPrice : pos.entryPrice - cp;
          const pnl = priceDelta * pos.qty * pos.leverage;
          holdingsValue += Math.max(0, pos.margin + pnl);
        }

        return state.replayBalance + holdingsValue;
      },

      getReturnPct: () => {
        const state = get();
        const scenario = state.activeScenarioId ? getScenarioById(state.activeScenarioId) : null;
        if (!scenario) return 0;
        const pv = get().getPortfolioValue();
        return ((pv - scenario.startingBalance) / scenario.startingBalance) * 100;
      },

      getCurrentPrices: () => {
        const state = get();
        const scenario = state.activeScenarioId ? getScenarioById(state.activeScenarioId) : null;
        if (!scenario) return {};
        const allPrices = getCachedReplayPrices(scenario);
        const result: Record<string, number> = {};
        for (const [instrumentId, prices] of Object.entries(allPrices)) {
          result[instrumentId] = prices[Math.min(state.currentTick, prices.length - 1)];
        }
        return result;
      },

      getVisibleAnnotations: () => {
        const state = get();
        const scenario = state.activeScenarioId ? getScenarioById(state.activeScenarioId) : null;
        if (!scenario) return [];
        return scenario.annotations.filter((a) => a.tick <= state.currentTick);
      },

      getMaxHoldTicks: () => {
        const state = get();
        let max = 0;
        for (const [, since] of Object.entries(state.holdingSince)) {
          const held = state.currentTick - since;
          if (held > max) max = held;
        }
        const buys: Record<string, number> = {};
        for (const t of state.tradeHistory) {
          if (t.side === 'buy' && !buys[t.instrumentId]) {
            buys[t.instrumentId] = t.tick;
          }
          if (t.side === 'sell' && buys[t.instrumentId] !== undefined) {
            const held = t.tick - buys[t.instrumentId];
            if (held > max) max = held;
            delete buys[t.instrumentId];
          }
        }
        return max;
      },
    }),
    {
      name: 'empire-replay',
      version: 1,
      partialize: (state) => ({
        completedScenarios: state.completedScenarios,
      }) as any,
    },
  ),
);
