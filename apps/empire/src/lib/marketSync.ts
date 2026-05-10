import { supabase } from './supabase';
import { createLogger } from './logger';

const log = createLogger('marketsync');

export interface MarketPrice {
  instrument_id: string;
  symbol: string;
  name: string;
  instrument_type: string;
  current_price: number;
  real_price: number;
  change_24h: number;
  volume_24h: number;
  buy_pressure: number;
  history: number[];
  updated_at: string;
}

type PriceUpdateCallback = (prices: Record<string, MarketPrice>) => void;

let priceCache: Record<string, MarketPrice> = {};
let listeners: PriceUpdateCallback[] = [];
let tickInterval: ReturnType<typeof setInterval> | null = null;
let realtimeChannel: any = null;

// ── Load all prices from Supabase ──
export async function loadMarketPrices(): Promise<Record<string, MarketPrice>> {
  const { data, error } = await supabase
    .from('market_prices')
    .select('*');

  if (error) {
    log.error('Failed to load prices', error);
    return priceCache;
  }

  priceCache = {};
  (data || []).forEach((row: any) => {
    priceCache[row.instrument_id] = {
      ...row,
      current_price: parseFloat(row.current_price),
      real_price: parseFloat(row.real_price),
      change_24h: parseFloat(row.change_24h),
      volume_24h: parseFloat(row.volume_24h),
      buy_pressure: parseFloat(row.buy_pressure),
      history: Array.isArray(row.history) ? row.history.map(Number) : [],
    };
  });

  notifyListeners();
  return priceCache;
}

// ── Subscribe to Realtime price updates ──
export function subscribeToMarket(callback: PriceUpdateCallback) {
  listeners.push(callback);

  // Set up Realtime if not already
  if (!realtimeChannel) {
    realtimeChannel = supabase
      .channel('market-prices')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'market_prices' },
        (payload: any) => {
          const row = payload.new;
          if (row && row.instrument_id) {
            priceCache[row.instrument_id] = {
              ...row,
              current_price: parseFloat(row.current_price),
              real_price: parseFloat(row.real_price),
              change_24h: parseFloat(row.change_24h),
              volume_24h: parseFloat(row.volume_24h),
              buy_pressure: parseFloat(row.buy_pressure),
              history: Array.isArray(row.history) ? row.history.map(Number) : [],
            };
            notifyListeners();
          }
        }
      )
      .subscribe();
  }

  // Start heartbeat tick if not running (every 3 seconds)
  if (!tickInterval) {
    tickInterval = setInterval(async () => {
      try {
        await supabase.rpc('tick_market');
      } catch (e) {
        // Silent — another client may be ticking
      }
    }, 3000);
  }

  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(l => l !== callback);
    if (listeners.length === 0) {
      // Cleanup when no listeners
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
      if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
      }
    }
  };
}

// ── Execute a trade via server RPC ──
export async function executeTrade(
  instrumentId: string,
  side: 'buy' | 'sell',
  quantity: number,
  price: number
): Promise<{ success: boolean; new_price?: number; error?: string }> {
  const { data, error } = await supabase.rpc('execute_trade', {
    p_instrument_id: instrumentId,
    p_side: side,
    p_quantity: quantity,
    p_price: price,
  });

  if (error) {
    log.error('Trade failed', error);
    return { success: false, error: error.message };
  }

  return data as any;
}

// ── Get current price for an instrument ──
export function getPrice(instrumentId: string): MarketPrice | null {
  return priceCache[instrumentId] || null;
}

// ── Get all cached prices ──
export function getAllPrices(): Record<string, MarketPrice> {
  return priceCache;
}

function notifyListeners() {
  listeners.forEach(cb => cb({ ...priceCache }));
}
