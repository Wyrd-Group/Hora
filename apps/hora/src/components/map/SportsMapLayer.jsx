import React, { useMemo, useState, useCallback } from 'react';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { VENUE_COORDS, F1_CIRCUIT_COORDS, LEAGUE_COLORS } from '../../data/sportsVenueData';
import { useWorldSportsStore } from '../../store/worldSportsStore';
import { useEmpireStore } from '../../store/empireStore';

/**
 * useSportsMapLayers() — Returns Deck.GL layers for sports venues + live matches.
 * Called from MapViewer and spread into the layers array.
 *
 * Fixes vs v1:
 *  - Labels only appear at zoom >= 8 (was 5 — too cluttered)
 *  - Label font size scales with zoom and uses sizeMinPixels/sizeMaxPixels
 *  - Score overlay on map disabled (moved to sidebar-only)
 *  - Venue dots much smaller / more subtle
 *  - Stadium click returns venue info for popup
 */
export function useSportsMapLayers(sportsEnabled, zoom, onVenueClick) {
  const liveMatches = useWorldSportsStore(s => s.liveMatchesOnMap);
  const sportsFranchises = useEmpireStore(s => s.sportsFranchises);

  return useMemo(() => {
    if (!sportsEnabled) return [];
    const layers = [];

    // Build a set of venues with live matches for highlighting
    const liveHomeTeams = new Set((liveMatches || []).map(m => m.homeTeamName));
    const liveCircuits = new Set((liveMatches || []).filter(m => m.isF1).map(m => m.circuitName));

    // ── 1. Stadium / Arena Base Markers ──────────────────────────
    const venueData = (sportsFranchises || []).map(f => {
      const coords = VENUE_COORDS[f.name];
      if (!coords) return null;
      const leagueColor = LEAGUE_COLORS[f.league] || [128, 128, 128];
      const isLive = liveHomeTeams.has(f.name);
      return {
        position: [coords.lon, coords.lat],
        name: f.name,
        venue: coords.venue,
        city: coords.city,
        capacity: coords.capacity,
        league: f.league,
        owned: f.owned,
        isLive,
        color: isLive ? [255, 60, 60] : f.owned ? [16, 185, 129] : leagueColor,
        radius: isLive ? 3500 : f.owned ? 3000 : 2000,
      };
    }).filter(Boolean);

    if (zoom >= 3) {
      layers.push(
        new ScatterplotLayer({
          id: 'sports-venues',
          data: venueData,
          getPosition: d => d.position,
          getFillColor: d => [...d.color, d.isLive ? 220 : 160],
          getRadius: d => d.radius,
          radiusMinPixels: 2,
          radiusMaxPixels: 8,
          stroked: true,
          lineWidthMinPixels: 0.5,
          getLineColor: d => d.owned ? [16, 185, 129, 150] : d.isLive ? [255, 60, 60, 180] : [255, 255, 255, 40],
          pickable: true,
          onClick: ({ object }) => {
            if (object && onVenueClick) onVenueClick(object);
          },
          updateTriggers: {
            getFillColor: [sportsFranchises, liveMatches],
            getRadius: [sportsFranchises, liveMatches],
            getLineColor: [sportsFranchises, liveMatches],
          },
        })
      );
    }

    // ── 2. F1 Circuit Markers ────────────────────────────────────
    const f1Data = Object.entries(F1_CIRCUIT_COORDS || {}).map(([name, coords]) => ({
      position: [coords.lon, coords.lat],
      name,
      venue: coords.venue || name,
      city: coords.city,
      capacity: coords.capacity,
      isLive: liveCircuits.has(name),
    }));

    if (zoom >= 2 && f1Data.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: 'f1-circuits',
          data: f1Data,
          getPosition: d => d.position,
          getFillColor: d => d.isLive ? [255, 60, 60, 230] : [220, 38, 38, 160],
          getRadius: d => d.isLive ? 4000 : 2500,
          radiusMinPixels: 2,
          radiusMaxPixels: 8,
          stroked: true,
          lineWidthMinPixels: 0.5,
          getLineColor: [255, 255, 255, 60],
          pickable: true,
          onClick: ({ object }) => {
            if (object && onVenueClick) onVenueClick({ ...object, league: 'F1' });
          },
          updateTriggers: {
            getFillColor: [liveMatches],
            getRadius: [liveMatches],
          },
        })
      );
    }

    // ── 3. Venue Labels (only at high zoom) ─────────────────────
    if (zoom >= 8) {
      const labelData = [
        ...venueData.map(d => ({ position: d.position, label: d.venue || d.name })),
        ...f1Data.map(d => ({ position: d.position, label: d.venue || d.name })),
      ];

      layers.push(
        new TextLayer({
          id: 'sports-venue-labels',
          data: labelData,
          getPosition: d => d.position,
          getText: d => d.label,
          getSize: 11,
          sizeMinPixels: 8,
          sizeMaxPixels: 14,
          getColor: [255, 255, 255, 140],
          fontFamily: 'ui-monospace, monospace',
          fontWeight: '500',
          getTextAnchor: 'start',
          getAlignmentBaseline: 'center',
          getPixelOffset: [10, 0],
          pickable: false,
          billboard: true,
          characterSet: 'auto',
        })
      );
    }

    // ── 4. Live Match Pulsing Glow (subtle) ─────────────────────
    const liveMatchVenues = (liveMatches || []).map(m => {
      const isF1 = !!m.isF1;
      const coords = isF1
        ? F1_CIRCUIT_COORDS[m.circuitName]
        : VENUE_COORDS[m.homeTeamName];
      if (!coords) return null;
      return { ...m, position: [coords.lon, coords.lat], isF1 };
    }).filter(Boolean);

    if (liveMatchVenues.length > 0) {
      // Outer glow ring — subtle
      layers.push(
        new ScatterplotLayer({
          id: 'live-match-glow',
          data: liveMatchVenues,
          getPosition: d => d.position,
          getFillColor: [255, 60, 60, 40],
          getRadius: 12000,
          radiusMinPixels: 6,
          radiusMaxPixels: 18,
          stroked: true,
          getLineColor: [255, 60, 60, 60],
          lineWidthMinPixels: 0.5,
        })
      );

      // NO score text on map — it's too cluttered. Scores shown in the sidebar panel only.
    }

    // ── 5. Owned Team Highlight Ring ─────────────────────────────
    const ownedVenues = venueData.filter(d => d.owned);
    if (ownedVenues.length > 0 && zoom >= 4) {
      layers.push(
        new ScatterplotLayer({
          id: 'owned-venues-highlight',
          data: ownedVenues,
          getPosition: d => d.position,
          getFillColor: [16, 185, 129, 30],
          getRadius: 8000,
          radiusMinPixels: 5,
          radiusMaxPixels: 14,
          stroked: true,
          getLineColor: [16, 185, 129, 80],
          lineWidthMinPixels: 1,
          updateTriggers: { data: [sportsFranchises] },
        })
      );
    }

    return layers;
  }, [sportsEnabled, zoom, liveMatches, sportsFranchises, onVenueClick]);
}

/**
 * SportsMapOverlay — Toggle button + collapsible live match sidebar + venue popup.
 */
export function SportsMapOverlay({ enabled, onToggle, liveMatches, selectedVenue, onCloseVenue, onWatchMatch }) {
  const [panelOpen, setPanelOpen] = useState(true);

  // Limit display to most recent 8 matches to avoid overwhelming the panel
  const displayMatches = useMemo(() => {
    const matches = liveMatches || [];
    // Prioritize 'live' over 'finished', then most recent
    const live = matches.filter(m => m.status === 'live');
    const finished = matches.filter(m => m.status === 'finished');
    return [...live, ...finished].slice(0, 8);
  }, [liveMatches]);

  const hasLive = displayMatches.some(m => m.status === 'live');

  return (
    <>
      {/* ── Collapsible Live Matches Panel ── */}
      {enabled && displayMatches.length > 0 && (
        <div
          className="absolute top-16 right-4 z-50 rounded-lg overflow-hidden transition-all duration-300"
          style={{
            width: panelOpen ? '240px' : '36px',
            background: 'rgba(12,11,10,0.92)',
            border: `1px solid ${hasLive ? 'rgba(255,60,60,0.2)' : 'rgba(255,255,255,0.08)'}`,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          {/* Header with collapse toggle */}
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setPanelOpen(p => !p)}
            style={{
              padding: panelOpen ? '6px 10px' : '6px 8px',
              borderBottom: panelOpen ? '1px solid rgba(255,255,255,0.05)' : 'none',
              background: hasLive
                ? 'linear-gradient(90deg, rgba(255,60,60,0.12) 0%, transparent 100%)'
                : 'transparent',
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {hasLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
              {panelOpen && (
                <span className="text-[8px] text-white/50 font-mono font-bold uppercase tracking-widest truncate">
                  {hasLive ? 'Live' : 'Results'} ({displayMatches.length})
                </span>
              )}
            </div>
            <span className="text-[10px] text-white/30 shrink-0">{panelOpen ? '▸' : '◂'}</span>
          </div>

          {/* Match rows */}
          {panelOpen && (
            <div className="overflow-y-auto" style={{ maxHeight: '280px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
              {displayMatches.map(m => {
                const leagueColor = LEAGUE_COLORS[m.league] || [128, 128, 128];
                const isLive = m.status === 'live';
                return (
                  <div
                    key={m.fixtureId}
                    className="px-2.5 py-1.5 border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors"
                    onClick={() => onWatchMatch?.(m)}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: `rgb(${leagueColor.join(',')})` }} />
                      <span className="text-[7px] text-white/25 font-mono uppercase tracking-wider truncate">{m.league}</span>
                      {isLive && <span className="text-[6px] text-red-400 font-mono font-bold ml-auto">LIVE</span>}
                    </div>
                    {m.isF1 ? (
                      <div className="text-[9px] text-white/70 font-mono">
                        🏎 {m.circuitName?.replace(' Grand Prix', '')} — L{m.currentMinute}/{m.totalMinutes}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-white/70 font-mono truncate flex-1 text-right">{m.homeTeamName}</span>
                        <span className="text-[10px] text-white font-black tabular-nums px-1" style={{ minWidth: '28px', textAlign: 'center' }}>
                          {m.homeScore}–{m.awayScore}
                        </span>
                        <span className="text-[9px] text-white/70 font-mono truncate flex-1">{m.awayTeamName}</span>
                      </div>
                    )}
                    <div className="text-[7px] text-white/20 font-mono mt-0.5">
                      {m.isF1 ? '' : `${m.currentMinute}'`} {m.status === 'finished' ? 'FT' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Venue Popup (when a stadium is clicked) ── */}
      {selectedVenue && (
        <VenuePopup
          venue={selectedVenue}
          liveMatch={(liveMatches || []).find(m =>
            m.homeTeamName === selectedVenue.name ||
            (m.isF1 && m.circuitName === selectedVenue.name)
          )}
          onClose={onCloseVenue}
          onWatch={onWatchMatch}
        />
      )}
    </>
  );
}

/**
 * VenuePopup — Glassmorphism popup when a stadium/circuit is clicked on the map.
 * Shows venue info, live match score, and a "Watch" button to open the simulation.
 */
function VenuePopup({ venue, liveMatch, onClose, onWatch }) {
  const leagueColor = LEAGUE_COLORS[venue.league] || [128, 128, 128];
  const colorStr = `rgb(${leagueColor.join(',')})`;

  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[320px] rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(10,12,20,0.97) 0%, rgba(14,16,28,0.95) 100%)',
        border: `1px solid ${liveMatch ? 'rgba(255,60,60,0.25)' : 'rgba(255,255,255,0.1)'}`,
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorStr }} />
            <span className="text-[8px] font-mono uppercase tracking-widest text-white/40">{venue.league || 'F1'}</span>
            {liveMatch && <span className="text-[7px] font-mono font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded">LIVE</span>}
          </div>
          <div className="text-[13px] font-bold text-white/90 leading-tight truncate">{venue.name}</div>
          <div className="text-[9px] text-white/35 font-mono mt-0.5">{venue.venue || venue.city}</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close venue details"
          className="text-white/30 hover:text-white/70 text-xs ml-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-all shrink-0"
        >✕</button>
      </div>

      {/* Venue stats */}
      <div className="grid grid-cols-2 gap-px bg-white/[0.02]">
        <div className="px-3 py-2 bg-[rgba(10,12,20,0.6)]">
          <div className="text-[7px] text-white/25 font-mono uppercase">City</div>
          <div className="text-[10px] text-white/70 font-mono">{venue.city || '—'}</div>
        </div>
        <div className="px-3 py-2 bg-[rgba(10,12,20,0.6)]">
          <div className="text-[7px] text-white/25 font-mono uppercase">Capacity</div>
          <div className="text-[10px] text-white/70 font-mono">{venue.capacity ? venue.capacity.toLocaleString() : '—'}</div>
        </div>
      </div>

      {/* Live match score */}
      {liveMatch && (
        <div className="px-4 py-3" style={{ background: 'rgba(255,60,60,0.04)', borderTop: '1px solid rgba(255,60,60,0.1)' }}>
          {liveMatch.isF1 ? (
            <div className="text-center">
              <div className="text-[8px] text-red-400/60 font-mono uppercase tracking-widest mb-1">Race in Progress</div>
              <div className="text-[16px] text-white font-black font-mono">LAP {liveMatch.currentMinute} / {liveMatch.totalMinutes}</div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/80 font-mono font-bold truncate flex-1 text-right">{liveMatch.homeTeamName}</span>
                <div className="mx-3 text-center">
                  <span className="text-[20px] text-white font-black font-mono tabular-nums">
                    {liveMatch.homeScore} – {liveMatch.awayScore}
                  </span>
                </div>
                <span className="text-[10px] text-white/80 font-mono font-bold truncate flex-1">{liveMatch.awayTeamName}</span>
              </div>
              <div className="text-center text-[8px] font-mono" style={{ color: liveMatch.status === 'live' ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
                {liveMatch.status === 'live' ? `${liveMatch.currentMinute}' · LIVE` : 'FT'}
              </div>
            </>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {liveMatch && (
          <button
            onClick={() => onWatch?.(liveMatch)}
            className="flex-1 py-2 rounded-lg font-mono text-[9px] uppercase tracking-widest font-bold transition-all hover:brightness-125"
            style={{
              background: 'rgba(255,60,60,0.15)',
              border: '1px solid rgba(255,60,60,0.3)',
              color: '#ef4444',
            }}
          >
            ▶ Watch Match
          </button>
        )}
        <button
          onClick={onClose}
          className="flex-1 py-2 rounded-lg font-mono text-[9px] uppercase tracking-widest text-white/40 hover:text-white/60 transition-all"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
