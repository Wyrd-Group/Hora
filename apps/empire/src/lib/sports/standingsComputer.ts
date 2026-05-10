/**
 * standingsComputer.ts — Compute league tables, driver/constructor standings.
 */

import type { Fixture, RaceWeekend } from './seasonGenerator';

// ── Football / NBA League Table ────────────────────────

export interface LeagueRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];  // last 5
}

export function computeLeagueTable(fixtures: Fixture[], _teamId?: string): LeagueRow[] {
  const table: Record<string, LeagueRow> = {};

  const completed = fixtures.filter(f => f.status === 'completed' && f.result);

  for (const f of completed) {
    const r = f.result!;
    // Ensure rows exist
    if (!table[f.homeTeamId]) {
      table[f.homeTeamId] = { teamId: f.homeTeamId, teamName: f.homeTeamName, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] };
    }
    if (!table[f.awayTeamId]) {
      table[f.awayTeamId] = { teamId: f.awayTeamId, teamName: f.awayTeamName, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] };
    }

    const home = table[f.homeTeamId];
    const away = table[f.awayTeamId];

    home.played++;
    away.played++;
    home.goalsFor += r.homeScore;
    home.goalsAgainst += r.awayScore;
    away.goalsFor += r.awayScore;
    away.goalsAgainst += r.homeScore;

    if (r.homeScore > r.awayScore) {
      home.won++; home.points += 3; home.form.push('W');
      away.lost++; away.form.push('L');
    } else if (r.homeScore < r.awayScore) {
      away.won++; away.points += 3; away.form.push('W');
      home.lost++; home.form.push('L');
    } else {
      home.drawn++; home.points += 1; home.form.push('D');
      away.drawn++; away.points += 1; away.form.push('D');
    }
  }

  // Compute GD and trim form to last 5
  const rows = Object.values(table).map(row => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
    form: row.form.slice(-5),
  }));

  // Sort: points desc → GD desc → GF desc
  rows.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);

  return rows;
}

// ── F1 Driver Championship Standings ───────────────────

export interface DriverStandingRow {
  driverId: string;
  driverName: string;
  teamId: string;
  teamName: string;
  points: number;
  wins: number;
  podiums: number;
  dnfs: number;
  bestFinish: number;
}

export function computeDriverStandings(raceWeekends: RaceWeekend[]): DriverStandingRow[] {
  const standings: Record<string, DriverStandingRow> = {};

  for (const rw of raceWeekends) {
    if (rw.status !== 'completed' || !rw.result) continue;

    for (const pos of rw.result.positions) {
      if (!standings[pos.driverId]) {
        standings[pos.driverId] = {
          driverId: pos.driverId,
          driverName: pos.driverName,
          teamId: pos.teamId,
          teamName: pos.teamName,
          points: 0,
          wins: 0,
          podiums: 0,
          dnfs: 0,
          bestFinish: 99,
        };
      }
      const row = standings[pos.driverId];
      row.points += pos.points;
      if (pos.position === 1 && !pos.dnf) row.wins++;
      if (pos.position <= 3 && !pos.dnf) row.podiums++;
      if (pos.dnf) row.dnfs++;
      if (!pos.dnf && pos.position < row.bestFinish) row.bestFinish = pos.position;
    }
  }

  return Object.values(standings).sort((a, b) => b.points - a.points || b.wins - a.wins);
}

// ── F1 Constructor Championship Standings ──────────────

export interface ConstructorStandingRow {
  teamId: string;
  teamName: string;
  points: number;
  wins: number;
  podiums: number;
  bestFinish: number;
}

export function computeConstructorStandings(raceWeekends: RaceWeekend[]): ConstructorStandingRow[] {
  const standings: Record<string, ConstructorStandingRow> = {};

  for (const rw of raceWeekends) {
    if (rw.status !== 'completed' || !rw.result) continue;

    for (const pos of rw.result.positions) {
      if (!standings[pos.teamId]) {
        standings[pos.teamId] = {
          teamId: pos.teamId,
          teamName: pos.teamName,
          points: 0,
          wins: 0,
          podiums: 0,
          bestFinish: 99,
        };
      }
      const row = standings[pos.teamId];
      row.points += pos.points;
      if (pos.position === 1 && !pos.dnf) row.wins++;
      if (pos.position <= 3 && !pos.dnf) row.podiums++;
      if (!pos.dnf && pos.position < row.bestFinish) row.bestFinish = pos.position;
    }
  }

  return Object.values(standings).sort((a, b) => b.points - a.points || b.wins - a.wins);
}

// ── NBA Standings (by win-loss record) ─────────────────

export interface NBAStandingRow {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  winPct: number;
  streak: string;
  last10: string;
}

export function computeNBAStandings(fixtures: Fixture[]): NBAStandingRow[] {
  const table: Record<string, NBAStandingRow> = {};

  const completed = fixtures.filter(f => f.status === 'completed' && f.result);

  for (const f of completed) {
    const r = f.result!;
    for (const tid of [f.homeTeamId, f.awayTeamId]) {
      if (!table[tid]) {
        const name = tid === f.homeTeamId ? f.homeTeamName : f.awayTeamName;
        table[tid] = { teamId: tid, teamName: name, wins: 0, losses: 0, winPct: 0, streak: '', last10: '' };
      }
    }
    if (r.homeScore > r.awayScore) {
      table[f.homeTeamId].wins++;
      table[f.awayTeamId].losses++;
    } else {
      table[f.awayTeamId].wins++;
      table[f.homeTeamId].losses++;
    }
  }

  return Object.values(table).map(row => ({
    ...row,
    winPct: row.wins + row.losses > 0 ? Math.round((row.wins / (row.wins + row.losses)) * 1000) / 1000 : 0,
    streak: '', // could compute later
    last10: '',
  })).sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);
}
