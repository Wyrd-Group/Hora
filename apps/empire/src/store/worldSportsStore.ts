/**
 * worldSportsStore.ts — World-level sports simulation store.
 *
 * ALL league fixtures run automatically whether the player owns a team or not.
 * Tracks every league's season, standings, and live match state globally.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  generateFootballSeason, generateNBASeason, generateF1Season,
  type Fixture, type RaceWeekend, type TeamRef, type F1SessionType,
  F1_CIRCUITS,
} from '../lib/sports/seasonGenerator';
import { simulateFootballMatch, simulateNBAMatch, simulateRace } from '../lib/sports/matchSimulator';
import { SPORTS_FRANCHISES } from '../data/sportsData';

// ── Constants ─────────────────────────────────────────────

const FOOTBALL_LEAGUES = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'] as const;
const F1_SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

/** Ticks an FP session indicator stays visible */
const FP_VISIBLE_TICKS = 10;
/** Ticks a Qualifying session indicator stays visible */
const QUALI_VISIBLE_TICKS = 15;

/** Ticks a live-match indicator stays visible on the map */
const LIVE_VISIBLE_TICKS = 20;
/** Ticks after "finished" before the entry is removed */
const LIVE_REMOVAL_TICKS = 40;
/** Max fixtures to process per game tick to avoid frame drops */
const MAX_FIXTURES_PER_TICK = 5;

// ── Types ─────────────────────────────────────────────────

interface LeagueSeason {
  league: string;
  fixtures: Fixture[];
  raceWeekends?: RaceWeekend[];
  currentMatchday: number;
  standings: StandingsEntry[];
  generatedAt: number;
  /** Tracks completed F1 sessions per race weekend: raceId -> completed session types */
  processedSessions?: Record<string, F1SessionType[]>;
}

interface StandingsEntry {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

interface LiveMatchOnMap {
  fixtureId: string;
  league: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  currentMinute: number;   // or currentLap for F1
  totalMinutes: number;    // or totalLaps for F1
  isF1: boolean;
  circuitName?: string;    // for F1
  sessionType?: F1SessionType;  // 'FP1' | 'FP2' | 'FP3' | 'Sprint Qualifying' | 'Sprint' | 'Qualifying' | 'Race'
  status: 'live' | 'finished';
  /** The tick when this entry was created (for aging out) */
  createdAtTick: number;
  /** Custom override for how long this indicator stays visible */
  visibleTicks?: number;
}

interface WorldSportsState {
  /** All league seasons keyed by league name */
  leagueSeasons: Record<string, LeagueSeason>;

  /** Currently live matches visible on map (transient, not persisted) */
  liveMatchesOnMap: LiveMatchOnMap[];

  /** Game tick tracking */
  lastProcessedTick: number;

  /** Actions */
  initAllLeagues: (startTick: number) => void;
  processGameTick: (currentTick: number) => void;
  getUpcomingFixtures: (league: string, count: number) => Fixture[];
  getLeagueStandings: (league: string) => StandingsEntry[];
  getLiveMatches: () => LiveMatchOnMap[];
  reset: () => void;
}

// ── Helpers ───────────────────────────────────────────────

const seedFromId = (id: string): number => {
  let h = 0;
  for (const c of id) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return Math.abs(h);
};

/** Build TeamRef[] for a given league from SPORTS_FRANCHISES */
function teamsForLeague(league: string): TeamRef[] {
  return SPORTS_FRANCHISES
    .filter(f => f.league === league)
    .map(f => ({ id: f.id, name: f.name, league: f.league }));
}

/** Deterministic seed from a league name */
function leagueSeed(league: string): number {
  return league.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
}

/** Create empty standings for a set of teams */
function emptyStandings(teams: TeamRef[]): StandingsEntry[] {
  return teams.map(t => ({
    teamId: t.id,
    teamName: t.name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));
}

/** Sort football standings: points desc, then goal difference desc, then goals for desc */
function sortFootballStandings(standings: StandingsEntry[]): StandingsEntry[] {
  return [...standings].sort((a, b) => {
    const ptsDiff = b.points - a.points;
    if (ptsDiff !== 0) return ptsDiff;
    const gdDiff = (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
    if (gdDiff !== 0) return gdDiff;
    return b.goalsFor - a.goalsFor;
  });
}

/** Sort NBA standings: won desc */
function sortNBAStandings(standings: StandingsEntry[]): StandingsEntry[] {
  return [...standings].sort((a, b) => b.won - a.won);
}

/** Sort F1 standings: points desc */
function sortF1Standings(standings: StandingsEntry[]): StandingsEntry[] {
  return [...standings].sort((a, b) => b.points - a.points);
}

// ── Store ─────────────────────────────────────────────────

export const useWorldSportsStore = create<WorldSportsState>()(
  persist(
    (set, get) => ({
      leagueSeasons: {},
      liveMatchesOnMap: [],
      lastProcessedTick: 0,

      // ── initAllLeagues ────────────────────────────────────

      initAllLeagues(startTick: number) {
        const leagueSeasons: Record<string, LeagueSeason> = {};

        // Football leagues
        for (const league of FOOTBALL_LEAGUES) {
          const teams = teamsForLeague(league);
          if (teams.length < 2) continue;
          const seed = leagueSeed(league);
          const fixtures = generateFootballSeason(teams, startTick, seed);
          leagueSeasons[league] = {
            league,
            fixtures,
            currentMatchday: 1,
            standings: emptyStandings(teams),
            generatedAt: startTick,
          };
        }

        // NBA
        {
          const teams = teamsForLeague('NBA');
          if (teams.length >= 2) {
            const seed = leagueSeed('NBA');
            const fixtures = generateNBASeason(teams, startTick, seed);
            leagueSeasons['NBA'] = {
              league: 'NBA',
              fixtures,
              currentMatchday: 1,
              standings: emptyStandings(teams),
              generatedAt: startTick,
            };
          }
        }

        // F1
        {
          const teams = teamsForLeague('F1');
          if (teams.length >= 2) {
            const seed = leagueSeed('F1');
            const raceWeekends = generateF1Season(teams, startTick, seed);
            // F1 standings track constructor points (per team)
            leagueSeasons['F1'] = {
              league: 'F1',
              fixtures: [],
              raceWeekends,
              currentMatchday: 1,
              standings: emptyStandings(teams),
              generatedAt: startTick,
            };
          }
        }

        set({ leagueSeasons, lastProcessedTick: startTick, liveMatchesOnMap: [] });
      },

      // ── processGameTick ───────────────────────────────────

      processGameTick(currentTick: number) {
        const state = get();
        if (currentTick <= state.lastProcessedTick) return;

        const seasons = { ...state.leagueSeasons };
        let liveMatches = [...state.liveMatchesOnMap];
        let processedCount = 0;

        // ── Age out old live-match indicators ──
        liveMatches = liveMatches
          .map(m => {
            const visLimit = m.visibleTicks ?? LIVE_VISIBLE_TICKS;
            if (m.status === 'live' && currentTick - m.createdAtTick >= visLimit) {
              return { ...m, status: 'finished' as const };
            }
            return m;
          })
          .filter(m => !(m.status === 'finished' && currentTick - m.createdAtTick >= LIVE_REMOVAL_TICKS));

        // ── Process football & NBA fixtures ──
        const allLeagues = [...FOOTBALL_LEAGUES as readonly string[], 'NBA'];
        for (const league of allLeagues) {
          const season = seasons[league];
          if (!season) continue;

          const updatedFixtures = [...season.fixtures];
          const updatedStandings = [...season.standings];
          const isNBA = league === 'NBA';

          for (let i = 0; i < updatedFixtures.length && processedCount < MAX_FIXTURES_PER_TICK; i++) {
            const fix = updatedFixtures[i];
            if (fix.status !== 'upcoming' || fix.scheduledTick > currentTick) continue;

            processedCount++;

            // Build TeamRefs
            const homeTeam: TeamRef = { id: fix.homeTeamId, name: fix.homeTeamName, league };
            const awayTeam: TeamRef = { id: fix.awayTeamId, name: fix.awayTeamName, league };
            const matchSeed = seedFromId(fix.id);

            let homeScore: number;
            let awayScore: number;

            if (isNBA) {
              const result = simulateNBAMatch(homeTeam, awayTeam, matchSeed);
              homeScore = result.homeScore;
              awayScore = result.awayScore;
              updatedFixtures[i] = { ...fix, status: 'completed', result };
            } else {
              const result = simulateFootballMatch(homeTeam, awayTeam, matchSeed);
              homeScore = result.homeScore;
              awayScore = result.awayScore;
              updatedFixtures[i] = { ...fix, status: 'completed', result };
            }

            // Update standings
            const homeIdx = updatedStandings.findIndex(s => s.teamId === fix.homeTeamId);
            const awayIdx = updatedStandings.findIndex(s => s.teamId === fix.awayTeamId);

            if (homeIdx >= 0) {
              const h = { ...updatedStandings[homeIdx] };
              h.played++;
              h.goalsFor += homeScore;
              h.goalsAgainst += awayScore;
              if (homeScore > awayScore) {
                h.won++;
                h.points += isNBA ? 1 : 3;
              } else if (homeScore === awayScore) {
                h.drawn++;
                h.points += isNBA ? 0 : 1;
              } else {
                h.lost++;
              }
              updatedStandings[homeIdx] = h;
            }

            if (awayIdx >= 0) {
              const a = { ...updatedStandings[awayIdx] };
              a.played++;
              a.goalsFor += awayScore;
              a.goalsAgainst += homeScore;
              if (awayScore > homeScore) {
                a.won++;
                a.points += isNBA ? 1 : 3;
              } else if (awayScore === homeScore) {
                a.drawn++;
                a.points += isNBA ? 0 : 1;
              } else {
                a.lost++;
              }
              updatedStandings[awayIdx] = a;
            }

            // Add live-match indicator on map
            liveMatches.push({
              fixtureId: fix.id,
              league,
              homeTeamName: fix.homeTeamName,
              awayTeamName: fix.awayTeamName,
              homeScore,
              awayScore,
              currentMinute: isNBA ? 48 : 90,
              totalMinutes: isNBA ? 48 : 90,
              isF1: false,
              status: 'live',
              createdAtTick: currentTick,
            });

            // Advance matchday tracker
            if (fix.matchday > season.currentMatchday) {
              season.currentMatchday = fix.matchday;
            }
          }

          // Sort standings
          const sorted = isNBA
            ? sortNBAStandings(updatedStandings)
            : sortFootballStandings(updatedStandings);

          seasons[league] = {
            ...season,
            fixtures: updatedFixtures,
            standings: sorted,
          };
        }

        // ── Process F1 race weekends (session-by-session) ──
        const f1Season = seasons['F1'];
        if (f1Season?.raceWeekends) {
          const updatedRaces = [...f1Season.raceWeekends];
          const updatedStandings = [...f1Season.standings];
          const f1Teams = teamsForLeague('F1');
          const processedSessions = { ...(f1Season.processedSessions ?? {}) };

          for (let i = 0; i < updatedRaces.length && processedCount < MAX_FIXTURES_PER_TICK; i++) {
            const race = updatedRaces[i];
            if (race.status === 'completed') continue;

            // Initialize tracking for this race weekend
            if (!processedSessions[race.id]) {
              processedSessions[race.id] = [];
            }
            const completedForRace = processedSessions[race.id];

            // Process sessions in order — don't skip ahead
            const sessions = race.sessions ?? [];
            let sessionProcessed = false;

            for (const session of sessions) {
              // Already done
              if (completedForRace.includes(session.type)) continue;

              // Not yet due
              const sessionTick = race.scheduledTick + session.tickOffset;
              if (currentTick < sessionTick) break; // sessions are ordered, so stop here

              processedCount++;
              sessionProcessed = true;
              completedForRace.push(session.type);

              const raceSeed = seedFromId(race.id);
              const circuit = F1_CIRCUITS[race.round - 1];
              const circuitShortName = race.circuitName.replace(' Grand Prix', '');

              if (session.type === 'FP1' || session.type === 'FP2' || session.type === 'FP3') {
                // FP sessions: brief map indicator, no points
                liveMatches.push({
                  fixtureId: `${race.id}-${session.type}`,
                  league: 'F1',
                  homeTeamName: `🏎 ${session.type}`,
                  awayTeamName: circuitShortName,
                  homeScore: 0,
                  awayScore: 0,
                  currentMinute: 0,
                  totalMinutes: session.duration,
                  isF1: true,
                  circuitName: race.circuitName,
                  sessionType: session.type,
                  status: 'live',
                  createdAtTick: currentTick,
                  visibleTicks: FP_VISIBLE_TICKS,
                });
              } else if (session.type === 'Sprint Qualifying' || session.type === 'Qualifying') {
                // Qualifying sessions: slightly longer indicator, no points
                const label = session.type === 'Sprint Qualifying' ? 'SPRINT QUALI' : 'QUALIFYING';
                liveMatches.push({
                  fixtureId: `${race.id}-${session.type}`,
                  league: 'F1',
                  homeTeamName: `🏎 ${label}`,
                  awayTeamName: circuitShortName,
                  homeScore: 0,
                  awayScore: 0,
                  currentMinute: 0,
                  totalMinutes: session.duration,
                  isF1: true,
                  circuitName: race.circuitName,
                  sessionType: session.type,
                  status: 'live',
                  createdAtTick: currentTick,
                  visibleTicks: QUALI_VISIBLE_TICKS,
                });
              } else if (session.type === 'Sprint') {
                // Sprint race: simulate and award sprint points (P1-P8)
                const sprintLaps = session.laps ?? race.sprintLaps ?? 24;
                const sprintResult = simulateRace(f1Teams, sprintLaps, raceSeed + 100);

                for (const pos of sprintResult.positions) {
                  if (pos.position <= F1_SPRINT_POINTS.length && !pos.dnf) {
                    const idx = updatedStandings.findIndex(s => s.teamId === pos.teamId);
                    if (idx >= 0) {
                      const entry = { ...updatedStandings[idx] };
                      entry.points += F1_SPRINT_POINTS[pos.position - 1];
                      updatedStandings[idx] = entry;
                    }
                  }
                }

                liveMatches.push({
                  fixtureId: `${race.id}-Sprint`,
                  league: 'F1',
                  homeTeamName: `🏎 SPRINT`,
                  awayTeamName: circuitShortName,
                  homeScore: 0,
                  awayScore: 0,
                  currentMinute: sprintLaps,
                  totalMinutes: sprintLaps,
                  isF1: true,
                  circuitName: race.circuitName,
                  sessionType: 'Sprint',
                  status: 'live',
                  createdAtTick: currentTick,
                });
              } else if (session.type === 'Race') {
                // Main race: full simulation, full points, update standings
                const totalLaps = session.laps ?? circuit?.laps ?? 57;
                const result = simulateRace(f1Teams, totalLaps, raceSeed);

                updatedRaces[i] = { ...race, status: 'completed', result };

                // Update constructor standings from race results
                for (const pos of result.positions) {
                  const idx = updatedStandings.findIndex(s => s.teamId === pos.teamId);
                  if (idx >= 0) {
                    const entry = { ...updatedStandings[idx] };
                    entry.played++;
                    entry.points += pos.points;
                    // Use won/lost to track podiums/DNFs for flavor
                    if (pos.position <= 3 && !pos.dnf) entry.won++;
                    if (pos.dnf) entry.lost++;
                    updatedStandings[idx] = entry;
                  }
                }

                liveMatches.push({
                  fixtureId: race.id,
                  league: 'F1',
                  homeTeamName: race.circuitName,
                  awayTeamName: `Round ${race.round}`,
                  homeScore: 0,
                  awayScore: 0,
                  currentMinute: totalLaps,
                  totalMinutes: totalLaps,
                  isF1: true,
                  circuitName: race.circuitName,
                  sessionType: 'Race',
                  status: 'live',
                  createdAtTick: currentTick,
                });

                if (race.round > f1Season.currentMatchday) {
                  f1Season.currentMatchday = race.round;
                }
              }

              // Only process one session per tick per race to pace the weekend
              break;
            }

            // If no session was processed and the race hasn't started yet, skip
            if (!sessionProcessed) continue;
          }

          seasons['F1'] = {
            ...f1Season,
            raceWeekends: updatedRaces,
            standings: sortF1Standings(updatedStandings),
            processedSessions,
          };
        }

        set({
          leagueSeasons: seasons,
          liveMatchesOnMap: liveMatches,
          lastProcessedTick: currentTick,
        });
      },

      // ── Selectors / Queries ───────────────────────────────

      getUpcomingFixtures(league: string, count: number): Fixture[] {
        const season = get().leagueSeasons[league];
        if (!season) return [];

        // For F1, return race weekends mapped to pseudo-fixtures
        if (league === 'F1' && season.raceWeekends) {
          return season.raceWeekends
            .filter(r => r.status === 'upcoming')
            .slice(0, count)
            .map(r => ({
              id: r.id,
              matchday: r.round,
              homeTeamId: 'f1-grid',
              awayTeamId: 'f1-grid',
              homeTeamName: r.circuitName,
              awayTeamName: `Round ${r.round}`,
              scheduledTick: r.scheduledTick,
              status: 'upcoming' as const,
            }));
        }

        return season.fixtures
          .filter(f => f.status === 'upcoming')
          .slice(0, count);
      },

      getLeagueStandings(league: string): StandingsEntry[] {
        const season = get().leagueSeasons[league];
        if (!season) return [];
        return season.standings;
      },

      getLiveMatches(): LiveMatchOnMap[] {
        return get().liveMatchesOnMap;
      },

      reset() {
        set({
          leagueSeasons: {},
          liveMatchesOnMap: [],
          lastProcessedTick: 0,
        });
      },
    }),
    {
      name: 'empire-world-sports-v1',
      partialize: (state) => ({
        leagueSeasons: state.leagueSeasons,
        lastProcessedTick: state.lastProcessedTick,
        // Exclude liveMatchesOnMap — transient data
      }),
    },
  ),
);

export type { LeagueSeason, StandingsEntry, LiveMatchOnMap, WorldSportsState };
