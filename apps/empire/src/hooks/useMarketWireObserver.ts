/**
 * useMarketWireObserver.ts — Behavior observation hook for agent journalism.
 *
 * Listens to game events (trades, node acquisitions, PvP, etc.) and triggers
 * MarketWire article generation when noteworthy actions occur.
 *
 * Mount this hook once at the App level.
 */

import { useEffect } from 'react';
import { useEmpireStore } from '../store/empireStore';
import { useMarketWireStore } from '../store/marketWireStore';
import { eventBridge, EVENTS } from '../lib/eventBridge';

export function useMarketWireObserver() {

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // ── Trade observer ──
    // Listen for trade events from the exchange
    unsubs.push(
      eventBridge.on(EVENTS.TRADE_EXECUTED, (payload: any) => {
        if (!payload) return;
        const { symbol, name, instrumentType, action, quantity, price, pnl, sector } = payload;
        const amount = Math.abs(quantity * price);
        const store = useMarketWireStore.getState();

        // Record trade for streak tracking
        if (action === 'sell' && pnl !== undefined) {
          store.recordTrade(pnl);
        }

        // Large trade articles (> €50k)
        if (amount >= 50_000) {
          const context: Record<string, string> = {
            symbol: symbol || '???',
            name: name || symbol || 'Unknown',
            company: name || symbol || 'Unknown',
            sector: sector || instrumentType || 'markets',
            amount: Math.round(amount).toLocaleString(),
            instrumentType: instrumentType || 'stock',
            changePercent: ((Math.random() * 2 + 0.5) * (action === 'buy' ? 1 : -1)).toFixed(2),
            playerName: useEmpireStore.getState().companyName || 'You',
          };

          if (action === 'buy') {
            store.generateArticle('large_buy', context);
          } else if (action === 'sell') {
            store.generateArticle('large_sell', context);
          }
        }
      })
    );

    // ── Node acquisition observer ──
    unsubs.push(
      eventBridge.on(EVENTS.WORLD_NODE_PURCHASED, (payload: any) => {
        if (!payload) return;
        const empire = useEmpireStore.getState();
        const store = useMarketWireStore.getState();
        const playerNodes = Object.values(empire.nodes).filter((n: any) => n.owner === 'player');

        store.generateArticle('node_acquired', {
          playerName: empire.companyName || 'You',
          nodeName: payload.name || payload.nodeId || 'a new node',
          totalNodes: String(playerNodes.length),
          nodeRegion: payload.region || payload.sector || 'global',
        });

        // Check for sector dominance
        if (payload.sector) {
          const sectorNodes = Object.values(empire.nodes).filter((n: any) => (n as any).sector === payload.sector);
          const ownedInSector = sectorNodes.filter((n: any) => n.owner === 'player');
          if (sectorNodes.length > 0 && ownedInSector.length / sectorNodes.length >= 0.5) {
            store.generateArticle('sector_dominance', {
              playerName: empire.companyName || 'You',
              sector: payload.sector,
              nodeCount: String(ownedInSector.length),
            });
          }
          // Check for monopoly
          if (sectorNodes.length > 1 && ownedInSector.length === sectorNodes.length) {
            store.generateArticle('monopoly_formed', {
              playerName: empire.companyName || 'You',
              sector: payload.sector,
              nodeCount: String(ownedInSector.length),
            });
          }
        }
      })
    );

    // ── Periodic balance / net worth check ──
    const balanceInterval = setInterval(() => {
      const empire = useEmpireStore.getState();
      const store = useMarketWireStore.getState();

      // Check net worth milestones
      store.checkMilestone(empire.netWorth, empire.companyName || 'You');

      // Check heat threshold
      if (empire.heat >= 80) {
        store.generateArticle('high_heat', {
          playerName: empire.companyName || 'You',
          heat: String(Math.round(empire.heat)),
        });
      }

      // Check bankruptcy risk
      if (empire.companyBalance < 5000 && empire.companyBalance > 0) {
        store.generateArticle('bankruptcy_risk', {
          playerName: empire.companyName || 'You',
          balance: Math.round(empire.companyBalance).toLocaleString(),
        });
      }

      // Update market indices
      store.updateIndices();
    }, 60_000); // Check every minute

    return () => {
      unsubs.forEach(fn => fn());
      clearInterval(balanceInterval);
    };
  }, []);
}
