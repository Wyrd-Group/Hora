/**
 * seasonGenerator.ts — Deterministic fixture generation for football, NBA, and F1.
 * Uses seeded PRNG for reproducible schedules.
 */

// ── Types ──────────────────────────────────────────────

export interface Fixture {
  id: string;
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  scheduledTick: number;
  status: 'upcoming' | 'live' | 'completed';
  result?: MatchResult;
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty' | 'own_goal' | 'injury' | 'save' | 'miss';
  teamId: string;
  playerId: string;
  playerName: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  detail?: string;
}

export interface MatchStats {
  possession: [number, number];      // home%, away%
  shots: [number, number];
  shotsOnTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
  yellowCards: [number, number];
  redCards: [number, number];
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  stats: MatchStats;
  playerRatings: Record<string, number>;  // playerId → rating 1-10
}

export interface RaceEvent {
  lap: number;
  type: 'overtake' | 'pit_stop' | 'dnf' | 'fastest_lap' | 'safety_car' | 'drs_overtake' | 'collision';
  driverId: string;
  driverName: string;
  teamId: string;
  detail: string;
}

export interface RacePosition {
  teamId: string;
  teamName: string;
  driverId: string;
  driverName: string;
  position: number;
  gap: string;
  points: number;
  dnf: boolean;
  pitStops: number;
}

export interface RaceResult {
  positions: RacePosition[];
  events: RaceEvent[];
  fastestLap: { driverId: string; driverName: string; time: string };
  totalLaps: number;
}

// ── F1 Session Types ─────────────────────────────────────

export type F1SessionType = 'FP1' | 'FP2' | 'FP3' | 'Sprint Qualifying' | 'Sprint' | 'Qualifying' | 'Race';

export interface F1Session {
  type: F1SessionType;
  tickOffset: number;  // offset from weekend start tick
  duration: number;    // duration in ticks (for pacing on map)
  laps?: number;       // only for Sprint/Race
}

// ── Race Weekend ─────────────────────────────────────────

export interface RaceWeekend {
  id: string;
  round: number;
  circuitName: string;
  circuitCountry: string;
  scheduledTick: number;      // weekend START tick
  status: 'upcoming' | 'live' | 'completed';
  result?: RaceResult;
  isSprint: boolean;
  sessions: F1Session[];      // ordered list of sessions
  sprintLaps?: number;
  currentSession?: F1SessionType;  // which session is currently active
}

export interface TeamRef {
  id: string;
  name: string;
  overall?: number;
  league: string;
}

// ── Seeded PRNG ────────────────────────────────────────

function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

/** @internal Used for deterministic seeding from season identifiers. */
export function seedFromString(str: string): number {
  return str.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
}

// ── Football Season Generator (Double Round-Robin) ─────

export function generateFootballSeason(
  teams: TeamRef[],
  startTick: number,
  seed: number
): Fixture[] {
  const n = teams.length;
  void createRng(seed);
  const fixtures: Fixture[] = [];

  // Circle method for round-robin scheduling
  const teamIds = teams.map(t => t.id);
  const teamNames: Record<string, string> = {};
  teams.forEach(t => { teamNames[t.id] = t.name; });

  // Create rounds using circle method
  const rounds: Array<Array<[string, string]>> = [];
  const fixed = teamIds[0];
  const rotating = teamIds.slice(1);

  for (let round = 0; round < n - 1; round++) {
    const pairs: Array<[string, string]> = [];
    // Fixed team plays against first in rotating list
    pairs.push(round % 2 === 0 ? [fixed, rotating[0]] : [rotating[0], fixed]);

    // Pair remaining teams
    for (let i = 1; i <= Math.floor(rotating.length / 2); i++) {
      const home = rotating[i];
      const away = rotating[rotating.length - i];
      pairs.push(i % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(pairs);
    // Rotate
    rotating.push(rotating.shift()!);
  }

  // First half of season
  let matchday = 1;
  const TICKS_PER_WEEK = 900;
  for (const round of rounds) {
    for (const [homeId, awayId] of round) {
      fixtures.push({
        id: `fix-${matchday}-${homeId.slice(-4)}-${awayId.slice(-4)}`,
        matchday,
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeTeamName: teamNames[homeId],
        awayTeamName: teamNames[awayId],
        scheduledTick: startTick + matchday * TICKS_PER_WEEK,
        status: 'upcoming',
      });
    }
    matchday++;
  }

  // Second half (reverse fixtures, swap home/away)
  for (const round of rounds) {
    for (const [homeId, awayId] of round) {
      fixtures.push({
        id: `fix-${matchday}-${awayId.slice(-4)}-${homeId.slice(-4)}`,
        matchday,
        homeTeamId: awayId,
        awayTeamId: homeId,
        homeTeamName: teamNames[awayId],
        awayTeamName: teamNames[homeId],
        scheduledTick: startTick + matchday * TICKS_PER_WEEK,
        status: 'upcoming',
      });
    }
    matchday++;
  }

  // Shuffle fixture order within each matchday slightly for variety
  return fixtures;
}

// ── Match Day / Game Time Helpers ──────────────────────

export function getMatchDayLabel(fixture: Fixture, _league: string): string {
  void fixture.matchday;
  // Simulate real-life scheduling: most on Sat, some Sun, occasional midweek
  const hash = fixture.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const daySlot = hash % 10;
  if (daySlot < 5) return `Saturday 15:00`;
  if (daySlot < 7) return `Saturday 17:30`;
  if (daySlot < 9) return `Sunday 14:00`;
  return `Monday 20:00`;
}

export function getNBAGameTime(fixture: Fixture): string {
  const hash = fixture.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const slot = hash % 4;
  if (slot === 0) return 'Tue 19:30 ET';
  if (slot === 1) return 'Wed 20:00 ET';
  if (slot === 2) return 'Fri 19:00 ET';
  return 'Sun 15:30 ET';
}

// ── NBA Season Generator ───────────────────────────────

export function generateNBASeason(
  teams: TeamRef[],
  startTick: number,
  seed: number
): Fixture[] {
  const rng = createRng(seed);
  const fixtures: Fixture[] = [];
  const teamNames: Record<string, string> = {};
  teams.forEach(t => { teamNames[t.id] = t.name; });

  const TICKS_PER_GAME_DAY = 450; // ~half a game week, NBA plays more frequently
  let gameDay = 0;
  let fixtureCount = 0;

  // Each team plays every other team ~3 times (simplified from 82-game)
  for (let round = 0; round < 3; round++) {
    const shuffled = [...teams];
    // Fisher-Yates shuffle with seeded rng
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 >= shuffled.length) continue;
      const home = round % 2 === 0 ? shuffled[i] : shuffled[i + 1];
      const away = round % 2 === 0 ? shuffled[i + 1] : shuffled[i];

      gameDay++;
      fixtureCount++;
      fixtures.push({
        id: `nba-${fixtureCount}-${home.id.slice(-4)}`,
        matchday: Math.ceil(gameDay / Math.floor(teams.length / 2)),
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeTeamName: home.name,
        awayTeamName: away.name,
        scheduledTick: startTick + gameDay * TICKS_PER_GAME_DAY,
        status: 'upcoming',
      });
    }
  }

  return fixtures;
}

// ── F1 Season Generator ────────────────────────────────

const F1_CIRCUITS = [
  { name: 'Bahrain Grand Prix', country: 'Bahrain', laps: 57, sprintLaps: 0 },
  { name: 'Saudi Arabian Grand Prix', country: 'Saudi Arabia', laps: 50, sprintLaps: 0 },
  { name: 'Australian Grand Prix', country: 'Australia', laps: 58, sprintLaps: 0 },
  { name: 'Japanese Grand Prix', country: 'Japan', laps: 53, sprintLaps: 0 },
  { name: 'Chinese Grand Prix', country: 'China', laps: 56, sprintLaps: 24 },
  { name: 'Miami Grand Prix', country: 'USA', laps: 57, sprintLaps: 24 },
  { name: 'Emilia Romagna Grand Prix', country: 'Italy', laps: 63, sprintLaps: 0 },
  { name: 'Monaco Grand Prix', country: 'Monaco', laps: 78, sprintLaps: 0 },
  { name: 'Canadian Grand Prix', country: 'Canada', laps: 70, sprintLaps: 0 },
  { name: 'Spanish Grand Prix', country: 'Spain', laps: 66, sprintLaps: 0 },
  { name: 'Austrian Grand Prix', country: 'Austria', laps: 71, sprintLaps: 24 },
  { name: 'British Grand Prix', country: 'UK', laps: 52, sprintLaps: 0 },
  { name: 'Hungarian Grand Prix', country: 'Hungary', laps: 70, sprintLaps: 0 },
  { name: 'Belgian Grand Prix', country: 'Belgium', laps: 44, sprintLaps: 0 },
  { name: 'Dutch Grand Prix', country: 'Netherlands', laps: 72, sprintLaps: 0 },
  { name: 'Italian Grand Prix', country: 'Italy', laps: 53, sprintLaps: 0 },
  { name: 'Azerbaijan Grand Prix', country: 'Azerbaijan', laps: 51, sprintLaps: 0 },
  { name: 'Singapore Grand Prix', country: 'Singapore', laps: 62, sprintLaps: 0 },
  { name: 'United States Grand Prix', country: 'USA', laps: 56, sprintLaps: 24 },
  { name: 'Mexico City Grand Prix', country: 'Mexico', laps: 71, sprintLaps: 0 },
  { name: 'São Paulo Grand Prix', country: 'Brazil', laps: 71, sprintLaps: 24 },
  { name: 'Las Vegas Grand Prix', country: 'USA', laps: 50, sprintLaps: 0 },
  { name: 'Qatar Grand Prix', country: 'Qatar', laps: 57, sprintLaps: 24 },
  { name: 'Abu Dhabi Grand Prix', country: 'UAE', laps: 58, sprintLaps: 0 },
];

export function generateF1Season(
  teams: TeamRef[],
  startTick: number,
  seed: number
): RaceWeekend[] {
  void teams;
  const TICKS_PER_RACE_INTERVAL = 1800; // ~2 in-game weeks between races

  return F1_CIRCUITS.map((circuit, i) => {
    const isSprint = circuit.sprintLaps > 0;
    const sessions: F1Session[] = isSprint
      ? [
          { type: 'FP1', tickOffset: 0, duration: 60 },
          { type: 'Sprint Qualifying', tickOffset: 90, duration: 30 },
          { type: 'Sprint', tickOffset: 180, duration: 30, laps: circuit.sprintLaps },
          { type: 'Qualifying', tickOffset: 270, duration: 45 },
          { type: 'Race', tickOffset: 360, duration: Math.round(circuit.laps * 1.5), laps: circuit.laps },
        ]
      : [
          { type: 'FP1', tickOffset: 0, duration: 60 },
          { type: 'FP2', tickOffset: 90, duration: 60 },
          { type: 'FP3', tickOffset: 180, duration: 60 },
          { type: 'Qualifying', tickOffset: 270, duration: 45 },
          { type: 'Race', tickOffset: 360, duration: Math.round(circuit.laps * 1.5), laps: circuit.laps },
        ];

    return {
      id: `race-r${i + 1}-${seed}`,
      round: i + 1,
      circuitName: circuit.name,
      circuitCountry: circuit.country,
      scheduledTick: startTick + (i + 1) * TICKS_PER_RACE_INTERVAL,
      status: 'upcoming' as const,
      isSprint,
      sessions,
      sprintLaps: circuit.sprintLaps || undefined,
    };
  });
}

export { F1_CIRCUITS };
