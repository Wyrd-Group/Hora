/**
 * useOSINTFeeds — Re-exports OSINT feed types and provides a unified hook
 * for consuming all feed data in map layers.
 *
 * This module aggregates types from individual feed adapters (adsb, ais,
 * celestrak, firms, gdelt, rss, usgs, weather) so that OSINTLayers.tsx
 * can import them from a single location.
 */

// Re-export all feed types used by OSINTLayers
export type { Aircraft } from '../feeds/adsb';
export type { Vessel } from '../feeds/ais';
export type { Earthquake } from '../feeds/usgs';
export type { Fire } from '../feeds/firms';
export type { WeatherAlert } from '../feeds/weather';
export type { Conflict } from '../feeds/gdelt';
export type { NewsItem } from '../feeds/rss';
export type { SatPosition, TLERecord } from '../feeds/celestrak';

// Composite type used by SatelliteLayer (position + TLE metadata)
export interface SatPositionWithMeta {
  name: string;
  noradId: string;
  lat: number;
  lon: number;
  alt: number; // km
}
