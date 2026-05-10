import React, { useState, useMemo } from 'react';
import { useSportsSeasonStore } from '../../../store/sportsSeasonStore';
import { useWorldSportsStore } from '../../../store/worldSportsStore';
import { getMatchDayLabel, getNBAGameTime } from '../../../lib/sports/seasonGenerator';
import TeamBadge from '../TeamBadge';
import CIRCUIT_PATHS from '../../../data/f1CircuitPaths';

// ── Helpers ──────────────────────────────────────────────

/** Country flag from circuit data, fallback to country name */
function circuitFlag(circuitName) {
  const data = typeof CIRCUIT_PATHS === 'object' && CIRCUIT_PATHS !== null
    ? (CIRCUIT_PATHS[circuitName] ?? CIRCUIT_PATHS.default?.[circuitName])
    : null;
  return data?.countryFlag ?? '';
}

/** Map F1SessionType to a short day label */
function sessionDayLabel(session, isSprint) {
  switch (session.type) {
    case 'FP1': return 'FRI';
    case 'FP2': return 'FRI';
    case 'FP3': return 'SAT';
    case 'Sprint Qualifying': return 'FRI';
    case 'Sprint': return 'SAT';
    case 'Qualifying': return isSprint ? 'SAT' : 'SAT';
    case 'Race': return 'SUN';
    default: return '';
  }
}

/** Human-readable session duration */
function sessionDurationLabel(session) {
  if (session.laps) return `${session.laps} laps`;
  return `${session.duration} min`;
}

/** Display name for a session type */
function sessionDisplayName(type) {
  switch (type) {
    case 'FP1': return 'FP1';
    case 'FP2': return 'FP2';
    case 'FP3': return 'FP3';
    case 'Sprint Qualifying': return 'Sprint Quali';
    case 'Sprint': return 'Sprint Race';
    case 'Qualifying': return 'Qualifying';
    case 'Race': return 'RACE';
    default: return type;
  }
}

// ── F1 Calendar ──────────────────────────────────────────

function F1Calendar({ liveTeam, season, onWatchLive }) {
  const [expandedId, setExpandedId] = useState(null);

  const raceWeekends = useMemo(() => {
    if (!season?.raceWeekends) return [];
    return [...season.raceWeekends].sort((a, b) => a.round - b.round);
  }, [season]);

  return (
    <div className="space-y-2">
      {raceWeekends.map(rw => {
        const isExpanded = expandedId === rw.id;
        const isCompleted = rw.status === 'completed';
        const isLive = rw.status === 'live';
        const flag = circuitFlag(rw.circuitName);

        // Best result for player's team
        let bestPos = null;
        let teamPts = 0;
        if (isCompleted && rw.result) {
          const myDrivers = rw.result.positions.filter(p => p.teamId === liveTeam.id);
          bestPos = myDrivers.reduce((b, d) => d.position < b ? d.position : b, 99);
          teamPts = myDrivers.reduce((s, d) => s + d.points, 0);
        }

        return (
          <div key={rw.id} className="bg-[#0f172a] border border-white/[0.05] rounded-lg overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : rw.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.02] transition-colors text-left"
            >
              {/* Round badge */}
              <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#00e5ff]/10 text-[#00e5ff] text-[10px] font-bold flex-shrink-0">
                R{rw.round}
              </span>

              {/* Flag + Circuit */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {flag && <span className="text-sm">{flag}</span>}
                  <span className="text-[11px] text-white font-bold truncate">{rw.circuitName}</span>
                </div>
                <div className="text-[9px] text-white/30">{rw.circuitCountry}</div>
              </div>

              {/* Sprint badge */}
              {rw.isSprint && (
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/20 flex-shrink-0">
                  Sprint
                </span>
              )}

              {/* Result or status */}
              {isCompleted && bestPos != null ? (
                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] text-white/50">P{bestPos}</span>
                  <span className="text-[10px] text-[#FFD700] font-bold ml-1.5">+{teamPts}</span>
                </div>
              ) : isLive ? (
                <span className="text-[9px] text-red-400 uppercase font-bold animate-pulse flex-shrink-0">Live</span>
              ) : (
                <span className="text-[9px] text-white/20 uppercase flex-shrink-0">Upcoming</span>
              )}

              <span className="text-white/20 text-[10px] flex-shrink-0">{isExpanded ? '\u25BC' : '\u25B6'}</span>
            </button>

            {/* Expanded — Weekend Timeline */}
            {isExpanded && (
              <div className="border-t border-white/[0.05] px-4 py-3 space-y-3">
                <div className="text-[8px] text-white/30 uppercase tracking-widest">Weekend Timeline</div>

                {/* Session timeline */}
                <div className="space-y-0">
                  {(rw.sessions || []).map((sess, idx) => {
                    const isRace = sess.type === 'Race';
                    const isSprint = sess.type === 'Sprint';
                    const isSessionCompleted = isCompleted; // all sessions done if weekend completed
                    const isSessionLive = isLive && rw.currentSession === sess.type;
                    const isUpcoming = !isCompleted && !isSessionLive;

                    // For completed race, show best position
                    let sessionResult = null;
                    if (isCompleted && isRace && rw.result) {
                      const myDrivers = rw.result.positions.filter(p => p.teamId === liveTeam.id);
                      const best = myDrivers.reduce((b, d) => d.position < b ? d.position : b, 99);
                      const pts = myDrivers.reduce((s, d) => s + d.points, 0);
                      sessionResult = `P${best} +${pts}`;
                    }

                    return (
                      <div key={sess.type} className="flex items-center gap-2 py-1.5 relative">
                        {/* Timeline connector line */}
                        {idx < (rw.sessions?.length ?? 0) - 1 && (
                          <div className="absolute left-[47px] top-[22px] w-px h-[calc(100%-6px)] bg-white/[0.06]" />
                        )}

                        {/* Day label */}
                        <span className="w-7 text-[9px] text-white/25 font-mono text-right flex-shrink-0">
                          {sessionDayLabel(sess, rw.isSprint)}
                        </span>

                        {/* Status dot */}
                        <span className={`w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isSessionLive ? 'bg-red-500 animate-pulse' :
                          isSessionCompleted ? 'bg-emerald-500/30' :
                          'bg-white/[0.06]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isSessionLive ? 'bg-red-400' :
                            isSessionCompleted ? 'bg-emerald-400' :
                            'bg-white/15'
                          }`} />
                        </span>

                        {/* Session name */}
                        <span className={`text-[10px] flex-1 ${
                          isRace ? 'font-bold text-white' :
                          isSessionCompleted ? 'text-white/50' :
                          isSessionLive ? 'text-red-400 font-bold' :
                          'text-white/30'
                        }`}>
                          {sessionDisplayName(sess.type)}
                          {isSessionLive && <span className="text-red-400 text-[8px] ml-1.5 uppercase">LIVE</span>}
                        </span>

                        {/* Duration */}
                        <span className={`text-[9px] font-mono w-14 text-right ${
                          isSessionCompleted ? 'text-white/25' : 'text-white/15'
                        }`}>
                          {sessionDurationLabel(sess)}
                        </span>

                        {/* Status indicator */}
                        <span className="w-12 text-right text-[9px] flex-shrink-0">
                          {isSessionCompleted && !isRace && (
                            <span className="text-emerald-400">{'\u2713'}</span>
                          )}
                          {isSessionCompleted && isRace && sessionResult && (
                            <span className="text-[#FFD700] font-bold">{sessionResult}</span>
                          )}
                          {isSessionCompleted && isSprint && (
                            <span className="text-emerald-400">{'\u2713'}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Race results grid (when completed) */}
                {isCompleted && rw.result && (
                  <div className="mt-2 space-y-1">
                    <div className="text-[8px] text-white/30 uppercase tracking-widest mt-2">Race Results</div>
                    {rw.result.positions.slice(0, 10).map((pos, i) => {
                      const isMyTeam = pos.teamId === liveTeam.id;
                      return (
                        <div key={pos.driverId} className={`flex items-center gap-2 text-[10px] py-1 ${isMyTeam ? 'text-[#00e5ff]' : 'text-white/60'}`}>
                          <span className="w-5 text-right font-bold" style={{ color: i < 3 ? '#FFD700' : undefined }}>P{pos.position}</span>
                          <TeamBadge name={pos.teamName} size="xs" />
                          <span className={`flex-1 ${isMyTeam ? 'font-bold' : ''}`}>{pos.driverName}</span>
                          <span className="text-white/30">{pos.gap}</span>
                          <span className="text-[#FFD700] w-8 text-right">{pos.points > 0 ? `+${pos.points}` : ''}</span>
                        </div>
                      );
                    })}
                    {rw.result.fastestLap && (
                      <div className="text-[9px] text-[#7c3aed] mt-1">
                        {'\u23F1'} Fastest Lap: {rw.result.fastestLap.driverName} — {rw.result.fastestLap.time}
                      </div>
                    )}
                  </div>
                )}

                {/* Watch button (for any upcoming weekend) */}
                {!isCompleted && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => onWatchLive?.(rw)}
                      className="px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest rounded bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 hover:bg-[#00e5ff]/30 transition-all flex items-center gap-1.5"
                    >
                      <span>{'\u25B6'}</span> Watch Race
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Football Calendar ────────────────────────────────────

function FootballCalendar({ liveTeam, season, leagueSeason, onWatchLive }) {
  const [expandedMD, setExpandedMD] = useState(null);

  // Group ALL league fixtures by matchday
  const matchdays = useMemo(() => {
    const allFixtures = leagueSeason?.fixtures ?? [];
    const grouped = {};

    for (const f of allFixtures) {
      if (!grouped[f.matchday]) grouped[f.matchday] = [];
      grouped[f.matchday].push(f);
    }

    return Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b)
      .map(md => ({
        matchday: md,
        fixtures: grouped[md],
      }));
  }, [leagueSeason]);

  // Determine the "current" matchday — first one with upcoming fixtures, or the latest completed
  const currentMatchday = useMemo(() => {
    for (const md of matchdays) {
      if (md.fixtures.some(f => f.status === 'upcoming')) return md.matchday;
    }
    return matchdays[matchdays.length - 1]?.matchday ?? 1;
  }, [matchdays]);

  return (
    <div className="space-y-2">
      {matchdays.map(({ matchday, fixtures }) => {
        const isExpanded = expandedMD === matchday;
        const allCompleted = fixtures.every(f => f.status === 'completed');
        const hasUpcoming = fixtures.some(f => f.status === 'upcoming');
        const isCurrent = matchday === currentMatchday;

        // Check if player's team plays this matchday
        const playerFixture = fixtures.find(
          f => f.homeTeamId === liveTeam.id || f.awayTeamId === liveTeam.id
        );

        // Group fixtures by time slot
        const timeSlots = {};
        for (const f of fixtures) {
          const label = getMatchDayLabel(f, liveTeam.league);
          if (!timeSlots[label]) timeSlots[label] = [];
          timeSlots[label].push(f);
        }
        const sortedSlots = Object.entries(timeSlots).sort(([a], [b]) => {
          // Sort by day then time
          const dayOrder = { Saturday: 0, Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4, Thursday: 5, Friday: 6 };
          const dayA = a.split(' ')[0];
          const dayB = b.split(' ')[0];
          if (dayOrder[dayA] !== dayOrder[dayB]) return (dayOrder[dayA] ?? 9) - (dayOrder[dayB] ?? 9);
          return a.localeCompare(b);
        });

        // Player's result for header
        let playerResult = null;
        if (playerFixture?.result) {
          const isHome = playerFixture.homeTeamId === liveTeam.id;
          const myScore = isHome ? playerFixture.result.homeScore : playerFixture.result.awayScore;
          const theirScore = isHome ? playerFixture.result.awayScore : playerFixture.result.homeScore;
          if (myScore > theirScore) playerResult = { label: 'W', color: '#10b981' };
          else if (myScore < theirScore) playerResult = { label: 'L', color: '#ef4444' };
          else playerResult = { label: 'D', color: '#f59e0b' };
        }

        return (
          <div key={matchday} className={`bg-[#0f172a] border rounded-lg overflow-hidden ${
            isCurrent ? 'border-white/[0.12]' : 'border-white/[0.05]'
          }`}>
            {/* Matchday header */}
            <button
              onClick={() => setExpandedMD(isExpanded ? null : matchday)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] transition-colors text-left"
            >
              <span className="text-[10px] text-white/30 font-mono uppercase tracking-wider flex-shrink-0">
                Matchday {matchday}
              </span>

              <div className="flex-1" />

              {playerResult && (
                <span
                  className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${playerResult.color}20`, color: playerResult.color }}
                >
                  {playerResult.label}
                </span>
              )}

              {playerFixture?.result && (
                <span className="text-white font-mono font-bold text-[11px] flex-shrink-0">
                  {playerFixture.homeTeamId === liveTeam.id
                    ? `${playerFixture.result.homeScore}-${playerFixture.result.awayScore}`
                    : `${playerFixture.result.awayScore}-${playerFixture.result.homeScore}`
                  }
                </span>
              )}

              {!allCompleted && !playerFixture?.result && (
                <span className="text-[9px] text-white/15 uppercase flex-shrink-0">
                  {hasUpcoming ? 'Upcoming' : 'In Progress'}
                </span>
              )}

              <span className="text-white/20 text-[10px] flex-shrink-0">{isExpanded ? '\u25BC' : '\u25B6'}</span>
            </button>

            {/* Expanded — all fixtures grouped by time */}
            {isExpanded && (
              <div className="border-t border-white/[0.05] px-3 py-2.5 space-y-3">
                {sortedSlots.map(([timeLabel, slotFixtures]) => (
                  <div key={timeLabel} className="space-y-1">
                    {/* Time slot header */}
                    <div className="text-[9px] text-white/25 font-mono uppercase tracking-wider pb-0.5">
                      {timeLabel}
                    </div>

                    {/* Fixtures in this time slot */}
                    {slotFixtures.map(f => {
                      const isPlayerMatch = f.homeTeamId === liveTeam.id || f.awayTeamId === liveTeam.id;
                      const r = f.result;
                      const isHome = f.homeTeamId === liveTeam.id;

                      let wdl = null;
                      if (r && isPlayerMatch) {
                        const myScore = isHome ? r.homeScore : r.awayScore;
                        const theirScore = isHome ? r.awayScore : r.homeScore;
                        if (myScore > theirScore) wdl = { label: 'W', color: '#10b981' };
                        else if (myScore < theirScore) wdl = { label: 'L', color: '#ef4444' };
                        else wdl = { label: 'D', color: '#f59e0b' };
                      }

                      return (
                        <div
                          key={f.id}
                          className={`flex items-center gap-2 py-1.5 px-2 rounded ${
                            isPlayerMatch
                              ? 'bg-[#00e5ff]/[0.04] border border-[#00e5ff]/[0.08]'
                              : ''
                          }`}
                        >
                          {/* Home team */}
                          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                            <span className={`text-[10px] truncate ${
                              isPlayerMatch && isHome ? 'text-[#00e5ff] font-bold' :
                              isPlayerMatch ? 'text-white/70' :
                              'text-white/40'
                            }`}>
                              {f.homeTeamName}
                            </span>
                            <TeamBadge name={f.homeTeamName} size="xs" />
                          </div>

                          {/* Score or "vs" */}
                          <div className="w-16 text-center flex-shrink-0">
                            {r ? (
                              <span className={`font-mono font-bold ${
                                isPlayerMatch ? 'text-white text-[12px]' : 'text-white/40 text-[10px]'
                              }`}>
                                {r.homeScore} - {r.awayScore}
                              </span>
                            ) : (
                              <span className="text-[9px] text-white/15">vs</span>
                            )}
                          </div>

                          {/* Away team */}
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <TeamBadge name={f.awayTeamName} size="xs" />
                            <span className={`text-[10px] truncate ${
                              isPlayerMatch && !isHome ? 'text-[#00e5ff] font-bold' :
                              isPlayerMatch ? 'text-white/70' :
                              'text-white/40'
                            }`}>
                              {f.awayTeamName}
                            </span>
                          </div>

                          {/* W/D/L badge for player's match */}
                          <div className="w-6 flex-shrink-0 text-center">
                            {wdl ? (
                              <span
                                className="text-[8px] font-bold"
                                style={{ color: wdl.color }}
                              >
                                {wdl.label}
                              </span>
                            ) : isPlayerMatch && !r ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); onWatchLive?.(f); }}
                                className="text-[8px] text-[#00e5ff] hover:text-[#00e5ff]/80"
                                title="Watch Live"
                              >
                                {'\u25B6'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Expanded match detail for player's fixture */}
                {playerFixture?.result && (
                  <MatchDetail fixture={playerFixture} liveTeam={liveTeam} />
                )}

                {/* Watch button for player's upcoming match */}
                {playerFixture && !playerFixture.result && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => onWatchLive?.(playerFixture)}
                      className="px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest rounded bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 hover:bg-[#00e5ff]/30 transition-all flex items-center gap-1.5"
                    >
                      <span>{'\u25B6'}</span> Watch Live
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Detailed match stats panel for a completed player fixture */
function MatchDetail({ fixture, liveTeam }) {
  const f = fixture;
  const r = f.result;
  if (!r) return null;

  return (
    <div className="border-t border-white/[0.05] pt-3 space-y-3">
      {/* Score header */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <TeamBadge name={f.homeTeamName} size="sm" />
          <span className="text-[11px] text-white font-bold">{f.homeTeamName}</span>
        </div>
        <span className="text-white font-mono text-xl font-black">{r.homeScore} - {r.awayScore}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white font-bold">{f.awayTeamName}</span>
          <TeamBadge name={f.awayTeamName} size="sm" />
        </div>
      </div>

      {/* Events timeline */}
      <div className="space-y-1">
        {r.events.filter(e => ['goal', 'penalty', 'own_goal', 'red_card'].includes(e.type)).map((evt, i) => (
          <div key={i} className="flex items-center gap-2 text-[9px]">
            <span className="w-8 text-right text-white/30 font-mono">{evt.minute}'</span>
            <span>{evt.type === 'goal' ? '\u26BD' : evt.type === 'penalty' ? '\u26BD(P)' : evt.type === 'own_goal' ? '\u26BD(OG)' : '\uD83D\uDD34'}</span>
            <span className="text-white/80">{evt.playerName}</span>
            {evt.assistPlayerName && <span className="text-white/30">(assist: {evt.assistPlayerName})</span>}
          </div>
        ))}
      </div>

      {/* Match stats */}
      <div className="grid grid-cols-3 gap-1 text-[9px]">
        {[
          ['Possession', `${r.stats.possession[0]}%`, `${r.stats.possession[1]}%`],
          ['Shots', r.stats.shots[0], r.stats.shots[1]],
          ['On Target', r.stats.shotsOnTarget[0], r.stats.shotsOnTarget[1]],
          ['Corners', r.stats.corners[0], r.stats.corners[1]],
          ['Fouls', r.stats.fouls[0], r.stats.fouls[1]],
        ].map(([label, home, away]) => (
          <React.Fragment key={label}>
            <span className="text-white/50 text-right">{home}</span>
            <span className="text-white/30 text-center">{label}</span>
            <span className="text-white/50 text-left">{away}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── NBA Calendar ─────────────────────────────────────────

function NBACalendar({ liveTeam, season, leagueSeason, onWatchLive }) {
  const [expandedGN, setExpandedGN] = useState(null);

  // Group ALL NBA fixtures by matchday (game night)
  const gameNights = useMemo(() => {
    const allFixtures = leagueSeason?.fixtures ?? [];
    const grouped = {};

    for (const f of allFixtures) {
      if (!grouped[f.matchday]) grouped[f.matchday] = [];
      grouped[f.matchday].push(f);
    }

    return Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b)
      .map(gn => ({
        gameNight: gn,
        fixtures: grouped[gn],
      }));
  }, [leagueSeason]);

  const currentGameNight = useMemo(() => {
    for (const gn of gameNights) {
      if (gn.fixtures.some(f => f.status === 'upcoming')) return gn.gameNight;
    }
    return gameNights[gameNights.length - 1]?.gameNight ?? 1;
  }, [gameNights]);

  return (
    <div className="space-y-2">
      {gameNights.map(({ gameNight, fixtures }) => {
        const isExpanded = expandedGN === gameNight;
        const allCompleted = fixtures.every(f => f.status === 'completed');
        const isCurrent = gameNight === currentGameNight;

        const playerFixture = fixtures.find(
          f => f.homeTeamId === liveTeam.id || f.awayTeamId === liveTeam.id
        );

        // Player result for header
        let playerResult = null;
        if (playerFixture?.result) {
          const isHome = playerFixture.homeTeamId === liveTeam.id;
          const myScore = isHome ? playerFixture.result.homeScore : playerFixture.result.awayScore;
          const theirScore = isHome ? playerFixture.result.awayScore : playerFixture.result.homeScore;
          playerResult = myScore > theirScore ? { label: 'W', color: '#10b981' } : { label: 'L', color: '#ef4444' };
        }

        return (
          <div key={gameNight} className={`bg-[#0f172a] border rounded-lg overflow-hidden ${
            isCurrent ? 'border-white/[0.12]' : 'border-white/[0.05]'
          }`}>
            {/* Game Night header */}
            <button
              onClick={() => setExpandedGN(isExpanded ? null : gameNight)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] transition-colors text-left"
            >
              <span className="text-[10px] text-white/30 font-mono uppercase tracking-wider flex-shrink-0">
                Game Night {gameNight}
              </span>

              <div className="flex-1" />

              {playerResult && (
                <span
                  className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${playerResult.color}20`, color: playerResult.color }}
                >
                  {playerResult.label}
                </span>
              )}

              {playerFixture?.result && (
                <span className="text-white font-mono font-bold text-[11px] flex-shrink-0">
                  {playerFixture.homeTeamId === liveTeam.id
                    ? `${playerFixture.result.homeScore}-${playerFixture.result.awayScore}`
                    : `${playerFixture.result.awayScore}-${playerFixture.result.homeScore}`
                  }
                </span>
              )}

              {!playerFixture?.result && (
                <span className="text-[9px] text-white/15 uppercase flex-shrink-0">
                  {allCompleted ? '' : 'Upcoming'}
                </span>
              )}

              <span className="text-white/20 text-[10px] flex-shrink-0">{isExpanded ? '\u25BC' : '\u25B6'}</span>
            </button>

            {/* Expanded — game night fixtures */}
            {isExpanded && (
              <div className="border-t border-white/[0.05] px-3 py-2.5 space-y-1.5">
                {fixtures.map(f => {
                  const isPlayerMatch = f.homeTeamId === liveTeam.id || f.awayTeamId === liveTeam.id;
                  const r = f.result;
                  const gameTime = getNBAGameTime(f);
                  const isHome = f.homeTeamId === liveTeam.id;

                  let wdl = null;
                  if (r && isPlayerMatch) {
                    const myScore = isHome ? r.homeScore : r.awayScore;
                    const theirScore = isHome ? r.awayScore : r.homeScore;
                    wdl = myScore > theirScore ? { label: 'W', color: '#10b981' } : { label: 'L', color: '#ef4444' };
                  }

                  return (
                    <div
                      key={f.id}
                      className={`rounded px-2 py-2 ${
                        isPlayerMatch
                          ? 'bg-orange-500/[0.04] border border-orange-500/[0.08]'
                          : ''
                      }`}
                    >
                      {/* Game time */}
                      <div className="text-[8px] text-white/20 font-mono mb-1">{gameTime}</div>

                      <div className="flex items-center gap-2">
                        {/* Basketball icon */}
                        <span className={`text-[10px] flex-shrink-0 ${isPlayerMatch ? 'opacity-100' : 'opacity-30'}`}>
                          {'\uD83C\uDFC0'}
                        </span>

                        {/* Home team */}
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <TeamBadge name={f.homeTeamName} size="xs" />
                          <span className={`text-[10px] truncate ${
                            isPlayerMatch && isHome ? 'text-orange-400 font-bold' :
                            isPlayerMatch ? 'text-white/70' :
                            'text-white/40'
                          }`}>
                            {f.homeTeamName}
                          </span>
                        </div>

                        {/* Score */}
                        <div className="flex-shrink-0">
                          {r ? (
                            <span className={`font-mono font-bold ${
                              isPlayerMatch ? 'text-white text-[12px]' : 'text-white/40 text-[10px]'
                            }`}>
                              {r.homeScore}-{r.awayScore}
                            </span>
                          ) : (
                            <span className="text-[9px] text-white/15">vs</span>
                          )}
                        </div>

                        {/* Away team */}
                        <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
                          <span className={`text-[10px] truncate ${
                            isPlayerMatch && !isHome ? 'text-orange-400 font-bold' :
                            isPlayerMatch ? 'text-white/70' :
                            'text-white/40'
                          }`}>
                            {f.awayTeamName}
                          </span>
                          <TeamBadge name={f.awayTeamName} size="xs" />
                        </div>

                        {/* W/L or action */}
                        <div className="w-10 text-right flex-shrink-0">
                          {wdl ? (
                            <span className="text-[9px] font-bold" style={{ color: wdl.color }}>
                              {wdl.label}
                            </span>
                          ) : isPlayerMatch && !r ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); onWatchLive?.(f); }}
                              className="text-[8px] text-orange-400 hover:text-orange-300"
                              title="Watch Live"
                            >
                              {'\u25B6'}
                            </button>
                          ) : !r ? (
                            <span className="text-[8px] text-white/10">Upcoming</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Watch button for player's upcoming match */}
                {playerFixture && !playerFixture.result && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => onWatchLive?.(playerFixture)}
                      className="px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 hover:bg-orange-500/30 transition-all flex items-center gap-1.5"
                    >
                      <span>{'\u25B6'}</span> Watch Live
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────

export default function CalendarTab({ liveTeam, sportsFranchises, onWatchLive }) {
  const season = useSportsSeasonStore(s => s.seasons[liveTeam.id]);
  const leagueSeasons = useWorldSportsStore(s => s.leagueSeasons);
  const leagueSeason = leagueSeasons[liveTeam.league];

  const isF1 = liveTeam.league === 'F1';
  const isNBA = liveTeam.league === 'NBA';

  if (!season) {
    return <div className="text-white/20 text-center py-8">Season not initialized yet</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-widest" style={{
        color: isF1 ? '#00e5ff' : isNBA ? '#f97316' : '#00e5ff'
      }}>
        {isF1 ? 'Race Calendar' : isNBA ? 'Game Schedule' : 'Season Calendar'}
      </h3>

      {isF1 && (
        <F1Calendar
          liveTeam={liveTeam}
          season={season}
          onWatchLive={onWatchLive}
        />
      )}

      {!isF1 && !isNBA && (
        <FootballCalendar
          liveTeam={liveTeam}
          season={season}
          leagueSeason={leagueSeason}
          onWatchLive={onWatchLive}
        />
      )}

      {isNBA && (
        <NBACalendar
          liveTeam={liveTeam}
          season={season}
          leagueSeason={leagueSeason}
          onWatchLive={onWatchLive}
        />
      )}
    </div>
  );
}
