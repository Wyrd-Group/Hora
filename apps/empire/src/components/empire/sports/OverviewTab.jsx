import React, { useEffect, useMemo, useState } from 'react';
import { useSportsSeasonStore } from '../../../store/sportsSeasonStore';
import TeamBadge from '../TeamBadge';
import LiveMatchViewer from './LiveMatchViewer';

const fmt = (n) => n >= 1e9 ? `€${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `€${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `€${(n/1e3).toFixed(0)}K` : `€${Math.round(n)}`;

/**
 * OverviewTab — Team dashboard (FM-style home screen).
 * Shows season progress, next fixture, recent results, notifications, and live match viewer.
 */
export default function OverviewTab({ liveTeam, roster, sportsFranchises }) {
  const seasons = useSportsSeasonStore(s => s.seasons);
  const initSeason = useSportsSeasonStore(s => s.initSeason);
  const liveMatch = useSportsSeasonStore(s => s.liveMatch);
  const startLiveMatch = useSportsSeasonStore(s => s.startLiveMatch);
  const simulateFixture = useSportsSeasonStore(s => s.simulateFixture);
  const simulateRaceWeekend = useSportsSeasonStore(s => s.simulateRaceWeekend);

  const [watchingFixture, setWatchingFixture] = useState(null);

  const isF1 = liveTeam.league === 'F1';
  const isNBA = liveTeam.league === 'NBA';

  // Auto-initialize season
  useEffect(() => {
    if (!seasons[liveTeam.id]) {
      const leagueTeams = sportsFranchises
        .filter(t => t.league === liveTeam.league)
        .map(t => ({ id: t.id, name: t.name, league: t.league, overall: undefined }));
      initSeason(liveTeam.id, liveTeam.league, leagueTeams, 0);
    }
  }, [liveTeam.id, liveTeam.league]);

  const season = seasons[liveTeam.id];

  // Fixtures for this team
  const teamFixtures = useMemo(() => {
    if (!season) return [];
    if (isF1) return []; // F1 uses raceWeekends
    return season.fixtures.filter(
      f => f.homeTeamId === liveTeam.id || f.awayTeamId === liveTeam.id
    );
  }, [season, liveTeam.id, isF1]);

  const completedFixtures = teamFixtures.filter(f => f.status === 'completed');
  const upcomingFixtures = teamFixtures.filter(f => f.status === 'upcoming');
  const nextFixture = upcomingFixtures[0];
  const recentResults = completedFixtures.slice(-5).reverse();

  // F1 race weekends
  const raceWeekends = season?.raceWeekends || [];
  const completedRaces = raceWeekends.filter(r => r.status === 'completed');
  const upcomingRaces = raceWeekends.filter(r => r.status === 'upcoming');
  const nextRace = upcomingRaces[0];

  // Form (last 5 results)
  const form = useMemo(() => {
    return recentResults.slice(0, 5).map(f => {
      const r = f.result;
      if (!r) return null;
      const isHome = f.homeTeamId === liveTeam.id;
      const myScore = isHome ? r.homeScore : r.awayScore;
      const theirScore = isHome ? r.awayScore : r.homeScore;
      if (myScore > theirScore) return 'W';
      if (myScore < theirScore) return 'L';
      return 'D';
    }).filter(Boolean);
  }, [recentResults, liveTeam.id]);

  // Total season stats
  const totalFixtures = isF1 ? raceWeekends.length : teamFixtures.length;
  const completedCount = isF1 ? completedRaces.length : completedFixtures.length;

  // Handle "Watch Live" — simulate first, then play back
  const handleWatchLive = (fixtureOrRace) => {
    if (isF1) {
      const teams = sportsFranchises
        .filter(t => t.league === 'F1')
        .map(t => ({ id: t.id, name: t.name, league: 'F1', overall: undefined }));
      simulateRaceWeekend(liveTeam.id, fixtureOrRace.id, teams);
      startLiveMatch(fixtureOrRace.id, liveTeam.id);
      setWatchingFixture(fixtureOrRace);
    } else {
      simulateFixture(liveTeam.id, fixtureOrRace.id);
      startLiveMatch(fixtureOrRace.id, liveTeam.id);
      setWatchingFixture(fixtureOrRace);
    }
  };

  // If watching a match
  if (liveMatch && watchingFixture) {
    const leagueTeams = sportsFranchises
      .filter(t => t.league === liveTeam.league)
      .map(t => ({ id: t.id, name: t.name, league: t.league }));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#00e5ff] uppercase tracking-widest">
            {isF1 ? `${watchingFixture.circuitName}` : `${watchingFixture.homeTeamName} vs ${watchingFixture.awayTeamName}`}
          </h3>
        </div>
        <LiveMatchViewer
          franchise={liveTeam}
          fixture={isF1 ? null : watchingFixture}
          raceWeekend={isF1 ? watchingFixture : null}
          leagueTeams={leagueTeams}
          onClose={() => setWatchingFixture(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Team header */}
      <div className="flex items-center gap-4">
        <TeamBadge name={liveTeam.name} size="lg" />
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-widest">{liveTeam.name}</h2>
          <span className="text-[10px] text-white/40">{liveTeam.league} · {liveTeam.location}</span>
        </div>
      </div>

      {/* Season progress + Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-3 text-center">
          <div className="text-[8px] text-white/30 uppercase">Season Progress</div>
          <div className="text-lg font-bold text-[#00e5ff]">{completedCount}<span className="text-white/20">/{totalFixtures}</span></div>
          <div className="w-full h-1 bg-white/5 rounded mt-1">
            <div className="h-full bg-[#00e5ff] rounded" style={{ width: `${totalFixtures > 0 ? (completedCount / totalFixtures) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-3 text-center">
          <div className="text-[8px] text-white/30 uppercase">Form</div>
          <div className="flex justify-center gap-1 mt-1.5">
            {form.length === 0 && <span className="text-white/20 text-[10px]">No games yet</span>}
            {form.map((r, i) => (
              <span key={i} className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center ${
                r === 'W' ? 'bg-[#10b981]/20 text-[#10b981]' : r === 'L' ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'
              }`}>{r}</span>
            ))}
          </div>
        </div>
        <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-3 text-center">
          <div className="text-[8px] text-white/30 uppercase">Daily Revenue</div>
          <div className="text-lg font-bold text-[#10b981]">+{fmt(Math.round(liveTeam.monthlyRevenue / 30))}</div>
        </div>
        <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-3 text-center">
          <div className="text-[8px] text-white/30 uppercase">Trophies</div>
          <div className="text-lg font-bold text-[#f59e0b]">{liveTeam.championships}</div>
        </div>
      </div>

      {/* Next Fixture / Race card */}
      {(nextFixture || nextRace) && (
        <div className="bg-[#0f172a] border border-[#00e5ff]/30 rounded-lg p-4">
          <div className="text-[9px] text-white/30 uppercase tracking-widest mb-3">
            {isF1 ? 'Next Race' : 'Next Match'}
          </div>
          {isF1 && nextRace ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-bold text-sm">{nextRace.circuitName}</div>
                <div className="text-[10px] text-white/40">{nextRace.circuitCountry} · Round {nextRace.round}</div>
              </div>
              <button
                onClick={() => handleWatchLive(nextRace)}
                className="px-4 py-2 text-[10px] uppercase font-bold tracking-widest rounded bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 hover:bg-[#00e5ff]/30 transition-all"
              >
                Watch Race
              </button>
            </div>
          ) : nextFixture ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TeamBadge name={nextFixture.homeTeamName} size="sm" />
                <span className="text-white font-bold text-sm">{nextFixture.homeTeamName}</span>
                <span className="text-white/20 text-[10px]">vs</span>
                <span className="text-white font-bold text-sm">{nextFixture.awayTeamName}</span>
                <TeamBadge name={nextFixture.awayTeamName} size="sm" />
              </div>
              <button
                onClick={() => handleWatchLive(nextFixture)}
                className="px-4 py-2 text-[10px] uppercase font-bold tracking-widest rounded bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 hover:bg-[#00e5ff]/30 transition-all"
              >
                Watch Live
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Recent Results</div>
          <div className="space-y-1.5">
            {recentResults.map(f => {
              const r = f.result;
              if (!r) return null;
              const isHome = f.homeTeamId === liveTeam.id;
              const opponent = isHome ? f.awayTeamName : f.homeTeamName;
              const myScore = isHome ? r.homeScore : r.awayScore;
              const theirScore = isHome ? r.awayScore : r.homeScore;
              const result = myScore > theirScore ? 'W' : myScore < theirScore ? 'L' : 'D';
              const resultColor = result === 'W' ? '#10b981' : result === 'L' ? '#ef4444' : '#f59e0b';

              return (
                <div key={f.id} className="flex items-center gap-3 bg-[#0f172a] border border-white/[0.05] rounded-lg px-3 py-2">
                  <span className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center" style={{ backgroundColor: `${resultColor}20`, color: resultColor }}>{result}</span>
                  <TeamBadge name={opponent} size="xs" />
                  <span className="text-[10px] text-white/70 flex-1">{isHome ? 'vs' : '@'} {opponent}</span>
                  <span className="text-white font-mono font-bold text-sm">{myScore} - {theirScore}</span>
                  <span className="text-[9px] text-white/20">MD{f.matchday}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* F1 recent race results */}
      {isF1 && completedRaces.length > 0 && (
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Recent Race Results</div>
          <div className="space-y-1.5">
            {completedRaces.slice(-5).reverse().map(rw => {
              if (!rw.result) return null;
              const myDrivers = rw.result.positions.filter(p => p.teamId === liveTeam.id);
              const bestFinish = myDrivers.reduce((best, d) => d.position < best ? d.position : best, 99);
              const pts = myDrivers.reduce((s, d) => s + d.points, 0);

              return (
                <div key={rw.id} className="flex items-center gap-3 bg-[#0f172a] border border-white/[0.05] rounded-lg px-3 py-2">
                  <span className="text-[10px] text-white/70 flex-1">{rw.circuitName}</span>
                  <span className="text-[10px] text-white/40">Best: P{bestFinish}</span>
                  <span className="text-[10px] text-[#FFD700] font-bold">{pts} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No season yet */}
      {!season && (
        <div className="text-center py-8 text-white/20 text-sm">
          Season loading...
        </div>
      )}
    </div>
  );
}
