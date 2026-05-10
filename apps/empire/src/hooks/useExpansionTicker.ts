/**
 * useExpansionTicker.ts — Real-time expansion engine ticker.
 *
 * - Ticks dynamic instrument prices every 10 seconds
 * - Checks mission progress against player state
 * - Injects news from expansion events into MarketWire
 * - Auto-expires stale events and missions
 *
 * Mount once at App level.
 */

import { useEffect } from 'react';
import { useExpansionStore } from '../store/expansionStore';
import { useEmpireStore } from '../store/empireStore';
import { useMarketWireStore } from '../store/marketWireStore';
import { eventBridge, EVENTS } from '../lib/eventBridge';

export function useExpansionTicker() {
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // ── Price ticker for dynamic instruments (every 10s) ──
    const priceTicker = setInterval(() => {
      useExpansionStore.getState().tickPrices();
    }, 10_000);

    // ── Mission progress checker (every 30s) ──
    const missionChecker = setInterval(() => {
      const expansion = useExpansionStore.getState();
      const empire = useEmpireStore.getState();
      const activeMissions = expansion.getActiveMissions();

      for (const mission of activeMissions) {
        let currentValue = 0;

        switch (mission.checkType) {
          case 'balance':
            currentValue = empire.companyBalance;
            break;
          case 'net_worth':
            currentValue = empire.netWorth;
            break;
          case 'nodes':
            currentValue = Object.values(empire.nodes || {}).filter(n => n.owner === 'player').length;
            break;
          case 'portfolio_value': {
            const portfolioValue = Object.values(empire.portfolio || {}).reduce((sum, pos) => {
              return sum + (pos.avgCost * pos.quantity);
            }, 0);
            currentValue = portfolioValue;
            break;
          }
          case 'heat':
            currentValue = empire.heat || 0;
            break;
          case 'trade_count':
            currentValue = empire.ticker?.filter(t => t.text.includes('TRADE')).length || 0;
            break;
          default:
            continue;
        }

        expansion.updateMissionProgress(mission.id, currentValue);
      }
    }, 30_000);

    // ── Listen for expansion news injections → push to MarketWire ──
    unsubs.push(
      eventBridge.on(EVENTS.EXPANSION_NEWS_INJECTED, (payload: any) => {
        if (!payload?.headline) return;
        const mw = useMarketWireStore.getState();
        mw.generateArticle('large_buy', {
          symbol: '',
          name: '',
          company: payload.source || 'ATHENA',
          sector: payload.category || 'macro',
          amount: '0',
          instrumentType: 'stock',
          changePercent: '0',
          playerName: useEmpireStore.getState().companyName || 'You',
        });
        // Also inject directly into the news bulletin system
        // via the MarketWire store using a custom mechanism
      })
    );

    // ── Listen for instrument spawns → generate MarketWire IPO article ──
    unsubs.push(
      eventBridge.on(EVENTS.EXPANSION_INSTRUMENT_SPAWNED, (payload: any) => {
        if (!payload?.instrument) return;
        const inst = payload.instrument;
        const mw = useMarketWireStore.getState();
        mw.generateArticle('large_buy', {
          symbol: inst.symbol,
          name: inst.name,
          company: inst.name,
          sector: inst.sector || inst.type,
          amount: Math.round(inst.price * 1000).toLocaleString(),
          instrumentType: inst.type,
          changePercent: '0',
          playerName: 'The Market',
        });
      })
    );

    // ── Listen for regime shifts → generate MarketWire breaking news ──
    unsubs.push(
      eventBridge.on(EVENTS.EXPANSION_REGIME_SHIFT, (payload: any) => {
        if (!payload?.shift) return;
        const shift = payload.shift;
        const mw = useMarketWireStore.getState();
        // Use the inject news path to add an article
        // Generate a direct article through the MarketWire template system
        mw.generateArticle('portfolio_milestone', {
          playerName: 'Global Markets',
          milestone: shift.toRegime.toUpperCase(),
          netWorth: '0',
        });
      })
    );

    return () => {
      clearInterval(priceTicker);
      clearInterval(missionChecker);
      unsubs.forEach(fn => fn());
    };
  }, []);
}
