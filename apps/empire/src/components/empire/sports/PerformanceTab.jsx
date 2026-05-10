import React, { useMemo } from 'react';
import { useSportsSeasonStore } from '../../../store/sportsSeasonStore';
import { computeLeagueTable, computeDriverStandings, computeConstructorStandings, computeNBAStandings } from '../../../lib/sports/standingsComputer';
import TeamBadge from '../TeamBadge';

const fmt = (n) => n >= 1e6 ? `€${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `€${(n/1e3).toFixed(0)}K` : `€${Math.round(n)}`;

/**
 * PerformanceTab — Sports performance analytics.
 * Shows league standings, form, top performers, season stats.
 */
export default function PerformanceTab({ liveTeam, roster }) {
  const season = useSportsSeasonStore(s => s.seasons[liveTeam.id]);
  const isF1 = liveTeam.league === 'F1';
  const isNBA = liveTeam.league === 'NBA';

  // Football / NBA standings
  const leagueTable = useMemo(() => {
    if (!season || isF1) return [];
    if (isNBA) return computeNBAStandings(season.fixtures);
    return computeLeagueTable(season.fixtures);
  }, [season?.fixtures]);

  // F1 standings
  const driverStandings = useMemo(() => {
    if (!season || !isF1) return [];
    return computeDriverStandings(season.raceWeekends);
  }, [season?.raceWeekends]);

  const constructorStandings = useMemo(() => {
    if (!season || !isF1) return [];
    return computeConstructorStandings(season.raceWeekends);
  }, [season?.raceWeekends]);

  // Team fixtures for stats
  const teamFixtures = useMemo(() => {
    if (!season || isF1) return [];
    return season.fixtures.filter(f => (f.homeTeamId === liveTeam.id || f.awayTeamId === liveTeam.id) && f.status === 'completed');
  }, [season, liveTeam.id]);

  // Season stats
  const seasonStats = useMemo(() => {
    if (isF1) {
      let totalPoints = 0, wins = 0, podiums = 0, dnfs = 0;
      for (const rw of (season?.raceWeekends || [])) {
        if (!rw.result) continue;
        for (const p of rw.result.positions) {
          if (p.teamId !== liveTeam.id) continue;
          totalPoints += p.points;
          if (p.position === 1 && !p.dnf) wins++;
          if (p.position <= 3 && !p.dnf) podiums++;
          if (p.dnf) dnfs++;
        }
      }
      return { totalPoints, wins, podiums, dnfs };
    }

    let goalsFor = 0, goalsAgainst = 0, cleanSheets = 0, wins = 0;
    for (const f of teamFixtures) {
      const r = f.result;
      if (!r) continue;
      const isHome = f.homeTeamId === liveTeam.id;
      const myG = isHome ? r.homeScore : r.awayScore;
      const theirG = isHome ? r.awayScore : r.homeScore;
      goalsFor += myG;
      goalsAgainst += theirG;
      if (theirG === 0) cleanSheets++;
      if (myG > theirG) wins++;
    }
    return { goalsFor, goalsAgainst, cleanSheets, wins, played: teamFixtures.length };
  }, [teamFixtures, season, liveTeam.id, isF1]);

  if (!season) return <div className="text-white/20 text-center py-8">Season not initialized yet</div>;

  return (
    <div className="space-y-5">
      {/* Season Stats KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {isF1 ? (
          <>
            <StatCard label="Total Points" value={seasonStats.totalPoints} color="#FFD700" />
            <StatCard label="Race Wins" value={seasonStats.wins} color="#10b981" />
            <StatCard label="Podiums" value={seasonStats.podiums} color="#00e5ff" />
            <StatCard label="DNFs" value={seasonStats.dnfs} color="#ef4444" />
          </>
        ) : isNBA ? (
          <>
            <StatCard label="Points Scored" value={seasonStats.goalsFor} color="#10b981" />
            <StatCard label="Points Against" value={seasonStats.goalsAgainst} color="#ef4444" />
            <StatCard label="Wins" value={seasonStats.wins} color="#FFD700" />
            <StatCard label="Games Played" value={seasonStats.played} color="#00e5ff" />
          </>
        ) : (
          <>
            <StatCard label="Goals For" value={seasonStats.goalsFor} color="#10b981" />
            <StatCard label="Goals Against" value={seasonStats.goalsAgainst} color="#ef4444" />
            <StatCard label="Clean Sheets" value={seasonStats.cleanSheets} color="#00e5ff" />
            <StatCard label="Wins" value={seasonStats.wins} color="#FFD700" />
          </>
        )}
      </div>

      {/* League Table / Standings */}
      {isF1 ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Driver Championship */}
          <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg overflow-hidden">
            <div className="bg-[#060A13] px-4 py-2 border-b border-[#00e5ff]/10">
              <span className="text-[9px] text-[#00e5ff] uppercase tracking-widest font-bold">Driver Championship</span>
            </div>
            <div className="max-h-[40vh] overflow-y-auto custom-scrollbar">
              {driverStandings.map((row, i) => {
                const isMyTeam = row.teamId === liveTeam.id;
                return (
                  <div key={row.driverId} className={`flex items-center gap-2 px-3 py-2 border-b border-white/[0.03] text-[10px] ${isMyTeam ? 'bg-[#00e5ff]/5' : ''}`}>
                    <span className="w-5 text-right font-bold" style={{ color: i < 3 ? '#FFD700' : 'white' }}>{i + 1}</span>
                    <TeamBadge name={row.teamName} size="xs" />
                    <span className={`flex-1 truncate ${isMyTeam ? 'text-[#00e5ff] font-bold' : 'text-white/70'}`}>{row.driverName}</span>
                    <span className="text-white/30 text-[9px]">{row.wins}W {row.podiums}P</span>
                    <span className="text-[#FFD700] font-bold w-10 text-right">{row.points}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Constructor Championship */}
          <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg overflow-hidden">
            <div className="bg-[#060A13] px-4 py-2 border-b border-[#00e5ff]/10">
              <span className="text-[9px] text-[#00e5ff] uppercase tracking-widest font-bold">Constructor Championship</span>
            </div>
            <div className="max-h-[40vh] overflow-y-auto custom-scrollbar">
              {constructorStandings.map((row, i) => {
                const isMyTeam = row.teamId === liveTeam.id;
                return (
                  <div key={row.teamId} className={`flex items-center gap-2 px-3 py-2 border-b border-white/[0.03] text-[10px] ${isMyTeam ? 'bg-[#00e5ff]/5' : ''}`}>
                    <span className="w-5 text-right font-bold" style={{ color: i < 3 ? '#FFD700' : 'white' }}>{i + 1}</span>
                    <TeamBadge name={row.teamName} size="xs" />
                    <span className={`flex-1 truncate ${isMyTeam ? 'text-[#00e5ff] font-bold' : 'text-white/70'}`}>{row.teamName}</span>
                    <span className="text-[#FFD700] font-bold w-10 text-right">{row.points}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Football / NBA League Table */
        <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg overflow-hidden">
          <div className="bg-[#060A13] px-4 py-2 border-b border-[#00e5ff]/10">
            <span className="text-[9px] text-[#00e5ff] uppercase tracking-widest font-bold">
              {isNBA ? 'Conference Standings' : 'League Table'}
            </span>
          </div>

          {/* Header */}
          <div className={`grid ${isNBA ? 'grid-cols-[30px_1fr_50px_50px_60px]' : 'grid-cols-[30px_1fr_30px_30px_30px_30px_40px_40px_40px_50px]'} gap-1 px-3 py-1.5 text-[7px] text-white/30 uppercase tracking-widest border-b border-white/[0.05]`}>
            <span>#</span><span>Team</span>
            {isNBA ? (
              <><span>W</span><span>L</span><span>Win%</span></>
            ) : (
              <><span>P</span><span>W</span><span>D</span><span>L</span><span>GF</span><span>GA</span><span>GD</span><span>Pts</span></>
            )}
          </div>

          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
            {leagueTable.map((row, i) => {
              const isMyTeam = row.teamId === liveTeam.id;
              return (
                <div key={row.teamId} className={`grid ${isNBA ? 'grid-cols-[30px_1fr_50px_50px_60px]' : 'grid-cols-[30px_1fr_30px_30px_30px_30px_40px_40px_40px_50px]'} gap-1 px-3 py-1.5 text-[10px] border-b border-white/[0.03] ${isMyTeam ? 'bg-[#00e5ff]/10 font-bold' : ''}`}>
                  <span className="font-bold" style={{ color: i < 4 ? '#10b981' : i >= leagueTable.length - 3 ? '#ef4444' : 'white' }}>{i + 1}</span>
                  <span className="flex items-center gap-1.5 truncate">
                    <TeamBadge name={row.teamName} size="xs" />
                    <span className={isMyTeam ? 'text-[#00e5ff]' : 'text-white/80'}>{row.teamName}</span>
                  </span>
                  {isNBA ? (
                    <>
                      <span className="text-white/60">{row.wins}</span>
                      <span className="text-white/60">{row.losses}</span>
                      <span className="text-white/80 font-mono">{row.winPct.toFixed(3)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-white/40">{row.played}</span>
                      <span className="text-[#10b981]">{row.won}</span>
                      <span className="text-[#f59e0b]">{row.drawn}</span>
                      <span className="text-[#ef4444]">{row.lost}</span>
                      <span className="text-white/50">{row.goalsFor}</span>
                      <span className="text-white/50">{row.goalsAgainst}</span>
                      <span className={row.goalDifference > 0 ? 'text-[#10b981]' : row.goalDifference < 0 ? 'text-[#ef4444]' : 'text-white/40'}>
                        {row.goalDifference > 0 ? '+' : ''}{row.goalDifference}
                      </span>
                      <span className="text-white font-bold">{row.points}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Performers */}
      {roster.length > 0 && (
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Top Performers</div>
          <div className="grid grid-cols-3 gap-3">
            {roster.slice(0, 3).sort((a, b) => b.overall - a.overall).map(player => (
              <div key={player.id} className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-3 text-center">
                <div className="text-lg font-bold" style={{ color: player.overall > 80 ? '#10b981' : player.overall > 65 ? '#f59e0b' : '#ef4444' }}>
                  {player.overall}
                </div>
                <div className="text-[10px] text-white font-bold truncate">{player.name}</div>
                <div className="text-[8px] text-[#00e5ff]">{player.position}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-3 text-center">
      <div className="text-[8px] text-white/30 uppercase">{label}</div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
