/**
 * sportsSeasonStore.ts — Zustand store for season state, live match playback, financial history.
 * Separate from empireStore to avoid bloating the main game store.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  generateFootballSeason, generateNBASeason, generateF1Season,
  type Fixture, type RaceWeekend, type TeamRef,
  F1_CIRCUITS,
} from '../lib/sports/seasonGenerator';
import {
  simulateFootballMatch, simulateNBAMatch, simulateRace,
} from '../lib/sports/matchSimulator';

// ── Types ──────────────────────────────────────────────

interface SeasonData {
  fixtures: Fixture[];
  raceWeekends: RaceWeekend[];
  currentMatchday: number;
  generatedAt: number;
  league: string;
}

interface LiveMatchState {
  fixtureId: string;
  franchiseId: string;
  league: string;
  playbackSpeed: 1 | 2 | 5;
  currentMinute: number;
  currentLap: number;
  totalMinutes: number;
  totalLaps: number;
  isPlaying: boolean;
  revealedEventCount: number;
  isFinished: boolean;
}

interface MonthlyFinancials {
  revenue: number;
  expenses: number;
  transferSpend: number;
  ticketRevenue: number;
}

interface SportsSeasonState {
  seasons: Record<string, SeasonData>;
  liveMatch: LiveMatchState | null;
  financialHistory: Record<string, {
    months: MonthlyFinancials[];
  }>;

  // Actions
  initSeason: (franchiseId: string, league: string, leagueTeams: TeamRef[], startTick: number) => void;
  advanceMatchday: (franchiseId: string, currentTick: number) => void;
  simulateFixture: (franchiseId: string, fixtureId: string) => void;
  simulateRaceWeekend: (franchiseId: string, raceId: string, teams: TeamRef[]) => void;
  startLiveMatch: (fixtureId: string, franchiseId: string) => void;
  tickLiveMatch: () => void;
  setPlaybackSpeed: (speed: 1 | 2 | 5) => void;
  skipToEnd: () => void;
  stopLiveMatch: () => void;
  recordFinancialMonth: (franchiseId: string, data: MonthlyFinancials) => void;
  getSeasonForTeam: (franchiseId: string) => SeasonData | null;
}

// ── Helper ─────────────────────────────────────────────

function seedFromId(id: string): number {
  return id.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
}

const FOOTBALL_LEAGUES = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'];

// ── Store ──────────────────────────────────────────────

export const useSportsSeasonStore = create<SportsSeasonState>()(
  persist(
    (set, get) => ({
      seasons: {},
      liveMatch: null,
      financialHistory: {},

      initSeason: (franchiseId, league, leagueTeams, startTick) => {
        const existing = get().seasons[franchiseId];
        if (existing) return; // Already initialized

        const seed = seedFromId(franchiseId);
        const teamRefs: TeamRef[] = leagueTeams.map(t => ({
          id: t.id, name: t.name, league: t.league, overall: t.overall,
        }));

        let fixtures: Fixture[] = [];
        let raceWeekends: RaceWeekend[] = [];

        if (FOOTBALL_LEAGUES.includes(league)) {
          fixtures = generateFootballSeason(teamRefs, startTick, seed);
        } else if (league === 'NBA') {
          fixtures = generateNBASeason(teamRefs, startTick, seed);
        } else if (league === 'F1') {
          raceWeekends = generateF1Season(teamRefs, startTick, seed);
        }

        set(state => ({
          seasons: {
            ...state.seasons,
            [franchiseId]: {
              fixtures,
              raceWeekends,
              currentMatchday: 0,
              generatedAt: startTick,
              league,
            },
          },
        }));
      },

      advanceMatchday: (franchiseId, currentTick) => {
        const season = get().seasons[franchiseId];
        if (!season) return;

        // Find all fixtures that should have been played by now
        const pending = season.fixtures.filter(
          f => f.status === 'upcoming' && f.scheduledTick <= currentTick
        );

        if (pending.length === 0 && season.raceWeekends.length === 0) return;

        // Auto-simulate pending football/NBA fixtures
        for (const fixture of pending) {
          get().simulateFixture(franchiseId, fixture.id);
        }

        // Auto-simulate pending F1 race weekends
        // Note: race weekends are handled by the tick integration hook

        set(state => {
          const s = state.seasons[franchiseId];
          if (!s) return {};
          const maxMatchday = Math.max(
            ...s.fixtures.filter(f => f.status === 'completed').map(f => f.matchday),
            s.currentMatchday
          );
          return {
            seasons: {
              ...state.seasons,
              [franchiseId]: { ...s, currentMatchday: maxMatchday },
            },
          };
        });
      },

      simulateFixture: (franchiseId, fixtureId) => {
        set(state => {
          const season = state.seasons[franchiseId];
          if (!season) return {};

          const fixtures = season.fixtures.map(f => {
            if (f.id !== fixtureId || f.status !== 'upcoming') return f;

            const seed = seedFromId(fixtureId);
            const homeTeam: TeamRef = { id: f.homeTeamId, name: f.homeTeamName, league: season.league };
            const awayTeam: TeamRef = { id: f.awayTeamId, name: f.awayTeamName, league: season.league };

            let result;
            if (season.league === 'NBA') {
              result = simulateNBAMatch(homeTeam, awayTeam, seed);
            } else {
              result = simulateFootballMatch(homeTeam, awayTeam, seed);
            }

            return { ...f, status: 'completed' as const, result };
          });

          return {
            seasons: {
              ...state.seasons,
              [franchiseId]: { ...season, fixtures },
            },
          };
        });
      },

      simulateRaceWeekend: (franchiseId, raceId, teams) => {
        set(state => {
          const season = state.seasons[franchiseId];
          if (!season) return {};

          const raceWeekends = season.raceWeekends.map(rw => {
            if (rw.id !== raceId || rw.status !== 'upcoming') return rw;

            const circuit = F1_CIRCUITS[rw.round - 1];
            const totalLaps = circuit?.laps || 57;
            const seed = seedFromId(raceId);
            const result = simulateRace(teams, totalLaps, seed);

            return { ...rw, status: 'completed' as const, result };
          });

          return {
            seasons: {
              ...state.seasons,
              [franchiseId]: { ...season, raceWeekends },
            },
          };
        });
      },

      startLiveMatch: (fixtureId, franchiseId) => {
        const season = get().seasons[franchiseId];
        if (!season) return;

        const isF1 = season.league === 'F1';
        const isNBA = season.league === 'NBA';

        // For F1, fixtureId is actually a race weekend id
        if (isF1) {
          const rw = season.raceWeekends.find(r => r.id === fixtureId);
          if (!rw) return;
          const circuit = F1_CIRCUITS[rw.round - 1];
          set({
            liveMatch: {
              fixtureId,
              franchiseId,
              league: season.league,
              playbackSpeed: 1,
              currentMinute: 0,
              currentLap: 0,
              totalMinutes: 0,
              totalLaps: circuit?.laps || 57,
              isPlaying: true,
              revealedEventCount: 0,
              isFinished: false,
            },
          });
        } else {
          set({
            liveMatch: {
              fixtureId,
              franchiseId,
              league: season.league,
              playbackSpeed: 1,
              currentMinute: 0,
              currentLap: 0,
              totalMinutes: isNBA ? 48 : 90,
              totalLaps: 0,
              isPlaying: true,
              revealedEventCount: 0,
              isFinished: false,
            },
          });
        }
      },

      tickLiveMatch: () => {
        const lm = get().liveMatch;
        if (!lm || !lm.isPlaying || lm.isFinished) return;

        const isF1 = lm.league === 'F1';

        if (isF1) {
          const newLap = lm.currentLap + 1;
          if (newLap >= lm.totalLaps) {
            set({ liveMatch: { ...lm, currentLap: lm.totalLaps, isFinished: true, isPlaying: false } });
          } else {
            set({ liveMatch: { ...lm, currentLap: newLap } });
          }
        } else {
          const newMin = lm.currentMinute + 1;
          if (newMin >= lm.totalMinutes) {
            set({ liveMatch: { ...lm, currentMinute: lm.totalMinutes, isFinished: true, isPlaying: false } });
          } else {
            set({ liveMatch: { ...lm, currentMinute: newMin } });
          }
        }
      },

      setPlaybackSpeed: (speed) => {
        const lm = get().liveMatch;
        if (lm) set({ liveMatch: { ...lm, playbackSpeed: speed } });
      },

      skipToEnd: () => {
        const lm = get().liveMatch;
        if (!lm) return;
        const isF1 = lm.league === 'F1';
        set({
          liveMatch: {
            ...lm,
            currentMinute: isF1 ? lm.currentMinute : lm.totalMinutes,
            currentLap: isF1 ? lm.totalLaps : lm.currentLap,
            isFinished: true,
            isPlaying: false,
          },
        });
      },

      stopLiveMatch: () => set({ liveMatch: null }),

      recordFinancialMonth: (franchiseId, data) => {
        set(state => {
          const existing = state.financialHistory[franchiseId] || { months: [] };
          const months = [...existing.months, data].slice(-12); // keep last 12
          return {
            financialHistory: {
              ...state.financialHistory,
              [franchiseId]: { months },
            },
          };
        });
      },

      getSeasonForTeam: (franchiseId) => get().seasons[franchiseId] || null,
    }),
    {
      name: 'aegis-sports-season-v1',
      partialize: (state) => ({
        seasons: state.seasons,
        financialHistory: state.financialHistory,
        // Don't persist liveMatch — it's transient playback state
      }),
    }
  )
);
