import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { simulateFootballMatch, simulateNBAMatch, simulateRace } from '../../lib/sports/matchSimulator';
import { footballCommentary, nbaCommentary, f1Commentary, footballTimeEvents, nbaTimeEvents } from '../../lib/sports/matchCommentary';
import { F1_CIRCUITS } from '../../lib/sports/seasonGenerator';
import { SPORTS_FRANCHISES } from '../../data/sportsData';
import FootballPitch from '../empire/sports/viz/FootballPitch';
import BasketballCourt from '../empire/sports/viz/BasketballCourt';
import RaceTrack from '../empire/sports/viz/RaceTrack';
import MatchControls from '../empire/sports/viz/MatchControls';

/**
 * MapMatchViewer — Standalone match viewer overlay for the world map.
 * Self-contained: owns its own playback state, pre-computes the simulation,
 * and renders sport-specific viz. No dependency on sportsSeasonStore.
 *
 * Props:
 *  - match: LiveMatchOnMap object from worldSportsStore
 *  - onClose: () => void
 */
export default function MapMatchViewer({ match, onClose }) {
  if (!match) return null;

  const isF1 = !!match.isF1;
  const isNBA = match.league === 'NBA';
  const isFootball = !isF1 && !isNBA;

  // ── Resolve real team IDs from SPORTS_FRANCHISES ──
  // The simulator needs IDs that match the franchise data for roster generation
  const homeTeamRef = useMemo(() => {
    const franchise = SPORTS_FRANCHISES.find(f => f.name === match.homeTeamName);
    return {
      id: franchise?.id || match.homeTeamId || `home-${match.homeTeamName}`,
      name: match.homeTeamName,
      league: match.league,
    };
  }, [match.homeTeamName, match.league]);

  const awayTeamRef = useMemo(() => {
    const franchise = SPORTS_FRANCHISES.find(f => f.name === match.awayTeamName);
    return {
      id: franchise?.id || match.awayTeamId || `away-${match.awayTeamName}`,
      name: match.awayTeamName,
      league: match.league,
    };
  }, [match.awayTeamName, match.league]);

  // ── Playback state ──
  const [currentMinute, setCurrentMinute] = useState(0);
  const [currentLap, setCurrentLap] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef(null);

  const totalMinutes = isF1 ? 0 : isNBA ? 48 : 90;
  const totalLaps = isF1 ? (match.totalMinutes || 57) : 0;

  // ── Pre-compute result ──
  const fullResult = useMemo(() => {
    const seed = (match.fixtureId || 'map').split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);

    if (isF1) {
      const circuitName = match.circuitName || 'Bahrain Grand Prix';
      const circuit = F1_CIRCUITS.find(c => c.name === circuitName) || F1_CIRCUITS[0];
      // Build team refs from actual F1 franchises
      const f1Teams = SPORTS_FRANCHISES
        .filter(f => f.league === 'F1')
        .map(f => ({ id: f.id, name: f.name, league: 'F1' }));
      const teams = f1Teams.length > 0 ? f1Teams : Array.from({ length: 10 }, (_, i) => ({
        id: `team-${i}`,
        name: `Team ${i + 1}`,
        league: 'F1',
      }));
      return simulateRace(teams, circuit?.laps || 57, seed);
    }

    if (isNBA) return simulateNBAMatch(homeTeamRef, awayTeamRef, seed);
    return simulateFootballMatch(homeTeamRef, awayTeamRef, seed);
  }, [match.fixtureId]);

  // ── Tick playback ──
  useEffect(() => {
    if (!isPlaying || isFinished) {
      clearInterval(intervalRef.current);
      return;
    }

    const baseInterval = isF1 ? 800 : 1000;
    const interval = baseInterval / playbackSpeed;

    intervalRef.current = setInterval(() => {
      if (isF1) {
        setCurrentLap(prev => {
          const next = prev + 1;
          if (next >= totalLaps) {
            setIsFinished(true);
            setIsPlaying(false);
            return totalLaps;
          }
          return next;
        });
      } else {
        setCurrentMinute(prev => {
          const next = prev + 1;
          if (next >= totalMinutes) {
            setIsFinished(true);
            setIsPlaying(false);
            return totalMinutes;
          }
          return next;
        });
      }
    }, interval);

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, isFinished, playbackSpeed, isF1, totalLaps, totalMinutes]);

  // ── Current score ──
  // NBA: quarter-based scoring from fullResult.quarters (pro-rated within quarter)
  // Football: count goal events
  const currentScore = useMemo(() => {
    if (!fullResult || isF1) return { home: 0, away: 0 };

    if (isNBA && fullResult.quarters) {
      let homeTotal = 0, awayTotal = 0;
      const currentQ = Math.floor(currentMinute / 12); // 0-based quarter index

      for (let q = 0; q < fullResult.quarters.length; q++) {
        const qData = fullResult.quarters[q];
        if (q < currentQ) {
          // Completed quarter — full points
          homeTotal += qData.homePoints;
          awayTotal += qData.awayPoints;
        } else if (q === currentQ) {
          // Current quarter — pro-rate based on minutes elapsed within this quarter
          const minutesIntoQ = currentMinute - q * 12;
          const fraction = Math.min(1, minutesIntoQ / 12);
          homeTotal += Math.round(qData.homePoints * fraction);
          awayTotal += Math.round(qData.awayPoints * fraction);
        }
        // Future quarters: 0 points
      }
      return { home: homeTotal, away: awayTotal };
    }

    // Football: count goal/penalty/own_goal events
    let homeG = 0, awayG = 0;
    for (const evt of fullResult.events) {
      if (evt.minute <= currentMinute && ['goal', 'penalty', 'own_goal'].includes(evt.type)) {
        if (evt.teamId === homeTeamRef.id) homeG++; else awayG++;
      }
    }
    return { home: homeG, away: awayG };
  }, [fullResult, currentMinute, isNBA, isF1, homeTeamRef.id]);

  // ── Commentary ──
  const commentary = useMemo(() => {
    if (!fullResult) return [];
    const lines = [];

    if (isF1) {
      if (currentLap === 0) lines.push("🏎️ Lights out and away we go!");
      for (const evt of fullResult.events) {
        if (evt.lap <= currentLap) lines.push(f1Commentary(evt));
      }
      if (isFinished) lines.push("🏁 CHEQUERED FLAG! Race is over!");
    } else if (isNBA) {
      for (const te of nbaTimeEvents()) {
        if (te.minute <= currentMinute) lines.push(te.text);
      }
      const teamNames = { [homeTeamRef.id]: match.homeTeamName, [awayTeamRef.id]: match.awayTeamName };
      for (const evt of fullResult.events) {
        if (evt.minute <= currentMinute) {
          lines.push(nbaCommentary(evt, teamNames, currentScore));
        }
      }
    } else {
      for (const te of footballTimeEvents()) {
        if (te.minute <= currentMinute) lines.push(te.text);
      }
      const teamNames = { [homeTeamRef.id]: match.homeTeamName, [awayTeamRef.id]: match.awayTeamName };
      let homeG = 0, awayG = 0;
      for (const evt of fullResult.events) {
        if (evt.minute <= currentMinute) {
          if (['goal', 'penalty', 'own_goal'].includes(evt.type)) {
            if (evt.teamId === homeTeamRef.id) homeG++; else awayG++;
          }
          lines.push(footballCommentary(evt, teamNames, {
            home: homeG, away: awayG,
            homeTeam: match.homeTeamName || '', awayTeam: match.awayTeamName || '',
          }));
        }
      }
    }
    return lines;
  }, [fullResult, currentMinute, currentLap, isFinished, currentScore]);

  // ── Controls ──
  const handleTogglePlay = useCallback(() => setIsPlaying(p => !p), []);
  const handleSetSpeed = useCallback((s) => setPlaybackSpeed(s), []);
  const handleSkipToEnd = useCallback(() => {
    if (isF1) setCurrentLap(totalLaps);
    else setCurrentMinute(totalMinutes);
    setIsFinished(true);
    setIsPlaying(false);
  }, [isF1, totalLaps, totalMinutes]);

  // ── Time label ──
  const timeLabel = isF1
    ? `Lap ${currentLap} / ${totalLaps}`
    : isNBA
      ? `Q${Math.min(4, Math.ceil((currentMinute + 1) / 12))} ${12 - (currentMinute % 12)}:00`
      : `${currentMinute}'`;

  // Last event for highlighting
  const lastEvent = fullResult?.events?.filter(e => {
    if (isF1) return e.lap <= currentLap;
    return e.minute <= currentMinute;
  }).pop();

  // ── Sport label ──
  const matchTitle = isF1
    ? `🏎 ${match.circuitName || 'Grand Prix'}`
    : `${match.homeTeamName} vs ${match.awayTeamName}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-[90vw] max-w-[900px] max-h-[90vh] overflow-y-auto rounded-xl"
        style={{
          background: 'linear-gradient(145deg, rgba(10,12,20,0.98) 0%, rgba(14,16,28,0.97) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.02) inset',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 sticky top-0 z-10"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(10,12,20,0.95)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <div className="min-w-0">
              <div className="text-[8px] font-mono text-white/30 uppercase tracking-widest">{match.league} · LIVE</div>
              <div className="text-sm font-bold text-white/90 truncate">{matchTitle}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 text-sm w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-all shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Visualization + controls */}
        <div className="p-4 space-y-3">
          {/* Sport-specific viz — each component has its own scoreboard HUD */}
          {isF1 && fullResult ? (
            <RaceTrack
              circuitName={match.circuitName || 'Bahrain Grand Prix'}
              drivers={(fullResult.positions || []).map((p, i) => ({
                ...p,
                distancePct: (currentLap / totalLaps) - i * 0.02,
              }))}
              currentLap={currentLap}
              totalLaps={totalLaps}
              events={(fullResult.events || []).filter(e => e.lap <= currentLap)}
              highlightedDriverId={lastEvent?.driverId}
              fastestLap={isFinished ? fullResult.fastestLap : null}
            />
          ) : isNBA && fullResult ? (
            <BasketballCourt
              homeTeamName={match.homeTeamName}
              awayTeamName={match.awayTeamName}
              homeTeamId={homeTeamRef.id}
              currentMinute={currentMinute}
              events={(fullResult.events || []).filter(e => e.minute <= currentMinute)}
              score={currentScore}
              quarter={Math.min(4, Math.ceil((currentMinute + 1) / 12))}
              highlightedPlayerId={lastEvent?.playerId}
              playbackSpeed={playbackSpeed}
            />
          ) : isFootball && fullResult ? (
            <FootballPitch
              homeTeamName={match.homeTeamName}
              awayTeamName={match.awayTeamName}
              homeTeamId={homeTeamRef.id}
              awayTeamId={awayTeamRef.id}
              currentMinute={currentMinute}
              events={(fullResult.events || []).filter(e => e.minute <= currentMinute)}
              score={currentScore}
              highlightedPlayerId={lastEvent?.playerId}
              playbackSpeed={playbackSpeed}
              tactic="balanced"
            />
          ) : null}

          {/* Playback controls + commentary */}
          <MatchControls
            isPlaying={isPlaying}
            isFinished={isFinished}
            playbackSpeed={playbackSpeed}
            timeLabel={timeLabel}
            commentary={commentary}
            onTogglePlay={handleTogglePlay}
            onSetSpeed={handleSetSpeed}
            onSkipToEnd={handleSkipToEnd}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
