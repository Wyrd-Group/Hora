import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSportsSeasonStore } from '../../../store/sportsSeasonStore';
import { simulateFootballMatch, simulateNBAMatch, simulateRace } from '../../../lib/sports/matchSimulator';
import { footballCommentary, nbaCommentary, f1Commentary, footballTimeEvents, nbaTimeEvents } from '../../../lib/sports/matchCommentary';
import { F1_CIRCUITS } from '../../../lib/sports/seasonGenerator';
import FootballPitch from './viz/FootballPitch';
import BasketballCourt from './viz/BasketballCourt';
import RaceTrack from './viz/RaceTrack';
import MatchControls from './viz/MatchControls';

/**
 * LiveMatchViewer — Orchestrates pre-computed match playback with sport-specific visualization.
 * Pre-computes the full result, then reveals events progressively based on current minute/lap.
 */

export default function LiveMatchViewer({ franchise, fixture, raceWeekend, leagueTeams = [], onClose }) {
  const liveMatch = useSportsSeasonStore(s => s.liveMatch);
  const tickLiveMatch = useSportsSeasonStore(s => s.tickLiveMatch);
  const setPlaybackSpeed = useSportsSeasonStore(s => s.setPlaybackSpeed);
  const skipToEnd = useSportsSeasonStore(s => s.skipToEnd);
  const stopLiveMatch = useSportsSeasonStore(s => s.stopLiveMatch);

  const isF1 = franchise?.league === 'F1';
  const isNBA = franchise?.league === 'NBA';
  const isFootball = !isF1 && !isNBA;

  // Tactical mode for football (affects formation positioning)
  const [tactic, setTactic] = useState('balanced');

  // Halftime team talk state
  const [showHalftime, setShowHalftime] = useState(false);
  const [halftimeDone, setHalftimeDone] = useState(false);
  const [teamTalkEffect, setTeamTalkEffect] = useState(null); // { type, label }

  // Pre-compute the full result once
  const fullResult = useMemo(() => {
    if (!fixture && !raceWeekend) return null;
    if (isF1 && raceWeekend) {
      const circuit = F1_CIRCUITS[raceWeekend.round - 1];
      const seed = raceWeekend.id.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
      return simulateRace(leagueTeams, circuit?.laps || 57, seed);
    }
    if (fixture) {
      const seed = fixture.id.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
      const home = { id: fixture.homeTeamId, name: fixture.homeTeamName, league: franchise.league };
      const away = { id: fixture.awayTeamId, name: fixture.awayTeamName, league: franchise.league };
      if (isNBA) return simulateNBAMatch(home, away, seed);
      return simulateFootballMatch(home, away, seed);
    }
    return null;
  }, [fixture?.id, raceWeekend?.id]);

  // Tick interval for playback
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!liveMatch || !liveMatch.isPlaying) {
      clearInterval(intervalRef.current);
      return;
    }

    const baseInterval = isF1 ? 800 : 1000; // ms per game minute/lap
    const interval = baseInterval / liveMatch.playbackSpeed;

    intervalRef.current = setInterval(() => {
      tickLiveMatch();
    }, interval);

    return () => clearInterval(intervalRef.current);
  }, [liveMatch?.isPlaying, liveMatch?.playbackSpeed, isF1]);

  // Build commentary from revealed events
  const commentary = useMemo(() => {
    if (!fullResult || !liveMatch) return [];
    const lines = [];

    if (isF1) {
      // Add time events
      if (liveMatch.currentLap === 0) lines.push("🏎️ Lights out and away we go!");
      // Reveal race events up to current lap
      for (const evt of fullResult.events) {
        if (evt.lap <= liveMatch.currentLap) {
          lines.push(f1Commentary(evt));
        }
      }
      if (liveMatch.isFinished) lines.push("🏁 CHEQUERED FLAG! Race is over!");
    } else if (isNBA) {
      for (const te of nbaTimeEvents()) {
        if (te.minute <= liveMatch.currentMinute) lines.push(te.text);
      }
      // Running score by quarter
      const teamNames = {};
      if (fixture) { teamNames[fixture.homeTeamId] = fixture.homeTeamName; teamNames[fixture.awayTeamId] = fixture.awayTeamName; }
      let homeRun = 0, awayRun = 0;
      for (const evt of fullResult.events) {
        if (evt.minute <= liveMatch.currentMinute) {
          const isHome = evt.teamId === fixture?.homeTeamId;
          if (isHome) homeRun += 2; else awayRun += 2; // rough
          lines.push(nbaCommentary(evt, teamNames, { home: homeRun, away: awayRun }));
        }
      }
    } else {
      // Football
      for (const te of footballTimeEvents()) {
        if (te.minute <= liveMatch.currentMinute) lines.push(te.text);
      }
      const teamNames = {};
      if (fixture) { teamNames[fixture.homeTeamId] = fixture.homeTeamName; teamNames[fixture.awayTeamId] = fixture.awayTeamName; }
      let homeG = 0, awayG = 0;
      for (const evt of fullResult.events) {
        if (evt.minute <= liveMatch.currentMinute) {
          if (['goal', 'penalty', 'own_goal'].includes(evt.type)) {
            if (evt.teamId === fixture?.homeTeamId) homeG++; else awayG++;
          }
          lines.push(footballCommentary(evt, teamNames, {
            home: homeG, away: awayG,
            homeTeam: fixture?.homeTeamName || '', awayTeam: fixture?.awayTeamName || '',
          }));
        }
      }
    }

    return lines;
  }, [fullResult, liveMatch?.currentMinute, liveMatch?.currentLap, liveMatch?.isFinished]);

  // Current revealed score
  const currentScore = useMemo(() => {
    if (!fullResult || !liveMatch || !fixture) return { home: 0, away: 0 };
    if (isF1) return { home: 0, away: 0 };

    let homeG = 0, awayG = 0;
    for (const evt of fullResult.events) {
      const cutoff = isF1 ? liveMatch.currentLap : liveMatch.currentMinute;
      const evtTime = isF1 ? 0 : evt.minute;
      if (evtTime <= cutoff && ['goal', 'penalty', 'own_goal'].includes(evt.type)) {
        if (evt.teamId === fixture.homeTeamId) homeG++;
        else awayG++;
      }
    }
    return { home: homeG, away: awayG };
  }, [fullResult, liveMatch?.currentMinute, fixture]);

  const handleTogglePlay = useCallback(() => {
    if (!liveMatch) return;
    // Toggle by modifying store directly through speed change hack
    // Actually we need a togglePlay — for now, use skipToEnd/setSpeed pattern
    useSportsSeasonStore.setState(s => ({
      liveMatch: s.liveMatch ? { ...s.liveMatch, isPlaying: !s.liveMatch.isPlaying } : null,
    }));
  }, [liveMatch]);

  const handleClose = useCallback(() => {
    stopLiveMatch();
    onClose?.();
  }, [stopLiveMatch, onClose]);

  // Halftime pause at minute 45 (football only)
  useEffect(() => {
    if (!isFootball || halftimeDone || !liveMatch) return;
    if (liveMatch.currentMinute >= 45 && !showHalftime) {
      setShowHalftime(true);
      // Pause the match
      useSportsSeasonStore.setState(s => ({
        liveMatch: s.liveMatch ? { ...s.liveMatch, isPlaying: false } : null,
      }));
    }
  }, [liveMatch?.currentMinute, isFootball, halftimeDone, showHalftime]);

  const handleTeamTalk = useCallback((type, label) => {
    setTeamTalkEffect({ type, label });
    setHalftimeDone(true);
    setShowHalftime(false);
    // Resume play
    useSportsSeasonStore.setState(s => ({
      liveMatch: s.liveMatch ? { ...s.liveMatch, isPlaying: true } : null,
    }));
  }, []);

  if (!liveMatch || !fullResult) return null;

  // Time label
  const timeLabel = isF1
    ? `Lap ${liveMatch.currentLap} / ${liveMatch.totalLaps}`
    : isNBA
      ? `Q${Math.min(4, Math.ceil((liveMatch.currentMinute + 1) / 12))} ${12 - (liveMatch.currentMinute % 12)}:00`
      : `${liveMatch.currentMinute}'`;

  // Revealed events for highlighting
  const lastEvent = fullResult.events.filter(e => {
    if (isF1) return e.lap <= liveMatch.currentLap;
    return e.minute <= liveMatch.currentMinute;
  }).pop();

  return (
    <div className="space-y-3">
      {/* Sport-specific visualization */}
      {isF1 ? (
        <RaceTrack
          circuitName={raceWeekend?.circuitName || 'Bahrain Grand Prix'}
          drivers={fullResult.positions.map((p, i) => ({
            ...p,
            distancePct: (liveMatch.currentLap / liveMatch.totalLaps) - i * 0.02,
          }))}
          currentLap={liveMatch.currentLap}
          totalLaps={liveMatch.totalLaps}
          events={fullResult.events.filter(e => e.lap <= liveMatch.currentLap)}
          highlightedDriverId={lastEvent?.driverId}
          fastestLap={liveMatch.isFinished ? fullResult.fastestLap : null}
        />
      ) : isNBA ? (
        <BasketballCourt
          homeTeamName={fixture.homeTeamName}
          awayTeamName={fixture.awayTeamName}
          homeTeamId={fixture.homeTeamId}
          currentMinute={liveMatch.currentMinute}
          events={fullResult.events.filter(e => e.minute <= liveMatch.currentMinute)}
          score={currentScore}
          quarter={Math.min(4, Math.ceil((liveMatch.currentMinute + 1) / 12))}
          highlightedPlayerId={lastEvent?.playerId}
          playbackSpeed={liveMatch.playbackSpeed}
        />
      ) : (
        <FootballPitch
          homeTeamName={fixture.homeTeamName}
          awayTeamName={fixture.awayTeamName}
          homeTeamId={fixture.homeTeamId}
          awayTeamId={fixture.awayTeamId}
          currentMinute={liveMatch.currentMinute}
          events={fullResult.events.filter(e => e.minute <= liveMatch.currentMinute)}
          score={currentScore}
          highlightedPlayerId={lastEvent?.playerId}
          playbackSpeed={liveMatch.playbackSpeed}
          tactic={tactic}
        />
      )}

      {/* ══════════ HALFTIME TEAM TALK ══════════ */}
      {showHalftime && isFootball && (
        <div className="bg-[#0f172a] border border-[#00e5ff]/30 rounded-lg p-5 space-y-4">
          <div className="text-center">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Half Time</div>
            <div className="text-2xl font-black text-white">
              {currentScore.home} - {currentScore.away}
            </div>
            <div className="text-[10px] text-white/40 mt-1">Choose your halftime team talk</div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {[
              { type: 'passionate', icon: '🔥', label: 'Passionate', desc: 'Fire up the squad — demand more intensity and effort!', color: '#EF4444' },
              { type: 'encourage', icon: '💪', label: 'Encourage', desc: 'Praise the effort, boost confidence, keep spirits high.', color: '#10B981' },
              { type: 'calm', icon: '🧘', label: 'Stay Calm', desc: 'Composure is key. Keep the heads cool, stick to the plan.', color: '#3B82F6' },
              { type: 'tactical', icon: '📋', label: 'Tactical', desc: 'Adjust the game plan — focus on structure and discipline.', color: '#F59E0B' },
              { type: 'chastise', icon: '😤', label: 'Chastise', desc: 'Let them know this isn\'t good enough. Demand improvement.', color: '#EF4444' },
              { type: 'no_talk', icon: '🤫', label: 'Say Nothing', desc: 'Let the players figure it out themselves.', color: '#6B7280' },
            ].map(talk => (
              <button
                key={talk.type}
                onClick={() => handleTeamTalk(talk.type, talk.label)}
                className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.06] transition-all text-left group"
              >
                <span className="text-xl">{talk.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white group-hover:text-[#00e5ff] transition-colors">{talk.label}</div>
                  <div className="text-[10px] text-white/40">{talk.desc}</div>
                </div>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: talk.color }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Team talk effect notification */}
      {teamTalkEffect && liveMatch.currentMinute >= 46 && liveMatch.currentMinute <= 50 && (
        <div className="text-center text-[10px] text-white/50 py-1">
          Team talk: <span className="text-[#00e5ff] font-bold">{teamTalkEffect.label}</span> — Players respond to your words
        </div>
      )}

      {/* Tactical mode selector (football only) */}
      {isFootball && (
        <div className="flex items-center justify-center gap-1 py-1">
          {[
            { key: 'ultra-defensive', label: 'Ultra Def', icon: '🛡️🛡️' },
            { key: 'defensive', label: 'Defensive', icon: '🛡️' },
            { key: 'balanced', label: 'Balanced', icon: '⚖️' },
            { key: 'offensive', label: 'Offensive', icon: '⚔️' },
            { key: 'ultra-offensive', label: 'Ultra Att', icon: '⚔️⚔️' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTactic(t.key)}
              className={`px-2.5 py-1 text-[9px] uppercase font-bold tracking-wider rounded border transition-all ${
                tactic === t.key
                  ? 'bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff]/50'
                  : 'bg-[#0f172a] text-white/40 border-white/10 hover:border-white/20 hover:text-white/60'
              }`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Controls + commentary */}
      <MatchControls
        isPlaying={liveMatch.isPlaying}
        isFinished={liveMatch.isFinished}
        playbackSpeed={liveMatch.playbackSpeed}
        timeLabel={timeLabel}
        commentary={commentary}
        onTogglePlay={handleTogglePlay}
        onSetSpeed={setPlaybackSpeed}
        onSkipToEnd={skipToEnd}
        onClose={handleClose}
      />
    </div>
  );
}
