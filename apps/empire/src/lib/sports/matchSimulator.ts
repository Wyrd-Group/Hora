/**
 * matchSimulator.ts — Deterministic match/race result computation.
 * All results are reproducible from seed alone.
 */

import type {
  MatchResult, MatchEvent, MatchStats,
  RaceResult, RacePosition, RaceEvent,
  TeamRef,
} from './seasonGenerator';

// ── Seeded PRNG ────────────────────────────────────────

function createRng(seed: number) {
  let s = Math.abs(seed) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

function poissonSample(lambda: number, rng: () => number): number {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

// ── Staff data helper (re-use the seeded roster generator) ─

interface StaffMember {
  id: string;
  name: string;
  position: string;
  overall: number;
}

const FIRST_NAMES = ['Marcus', 'Kai', 'Lucas', 'Ahmed', 'Leo', 'Javier', 'Yuki', 'Andre', 'Stefan', 'Daniel', 'Omar', 'Tomas', 'Victor', 'Noah', 'Ethan', 'Rafael', 'Bruno', 'Carlos', 'Max', 'Alex'];
const LAST_NAMES = ['Silva', 'Mueller', 'Tanaka', 'Rossi', 'Santos', 'Park', 'Williams', 'Fernandez', 'Bakayoko', 'Andersen', 'Johansson', 'Petrov', 'Chen', 'Dubois', 'Gomez', 'Okafor', 'Eriksen', 'Torres', 'Nakamura', 'Volkov'];
const POSITIONS_FOOTBALL = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'RW', 'ST'];
const POSITIONS_NBA = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'SF', 'PF', 'C', 'SG', 'PF'];
const POSITIONS_F1 = ['1st Driver', '2nd Driver'];

function quickRoster(teamId: string, league: string): StaffMember[] {
  const seed = teamId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (i: number) => ((seed * 31 + i * 17) % 1000) / 1000;
  const isNBA = league === 'NBA';
  const isF1 = league === 'F1';
  const positions = isNBA ? POSITIONS_NBA : isF1 ? POSITIONS_F1 : POSITIONS_FOOTBALL;

  return positions.map((pos, i) => {
    const r = rng(i);
    const overall = Math.round(55 + r * 40);
    return {
      id: `${teamId}-p${i}`,
      name: `${FIRST_NAMES[(seed + i * 3) % FIRST_NAMES.length]} ${LAST_NAMES[(seed + i * 7) % LAST_NAMES.length]}`,
      position: pos,
      overall,
    };
  });
}

function teamAvgOvr(teamId: string, league: string, providedOvr?: number): number {
  if (providedOvr) return providedOvr;
  const roster = quickRoster(teamId, league);
  return Math.round(roster.reduce((s, p) => s + p.overall, 0) / roster.length);
}

// ── Football Match Simulation ──────────────────────────

export function simulateFootballMatch(
  homeTeam: TeamRef,
  awayTeam: TeamRef,
  seed: number,
  homeRoster?: StaffMember[],
  awayRoster?: StaffMember[],
): MatchResult {
  const rng = createRng(seed);

  const homeOvr = teamAvgOvr(homeTeam.id, homeTeam.league, homeTeam.overall);
  const awayOvr = teamAvgOvr(awayTeam.id, awayTeam.league, awayTeam.overall);

  // Expected goals (Poisson lambda)
  const homeAdvantage = 0.3;
  const ovrDelta = (homeOvr - awayOvr) / 50;
  const lambdaHome = Math.max(0.3, 1.2 + ovrDelta + homeAdvantage);
  const lambdaAway = Math.max(0.2, 1.0 - ovrDelta);

  const homeGoals = poissonSample(lambdaHome, rng);
  const awayGoals = poissonSample(lambdaAway, rng);

  const hRoster = homeRoster || quickRoster(homeTeam.id, homeTeam.league);
  const aRoster = awayRoster || quickRoster(awayTeam.id, awayTeam.league);

  const events: MatchEvent[] = [];

  // Generate goal events
  const attackers = (roster: StaffMember[]) => roster.filter(p => ['ST', 'LW', 'RW', 'CM', 'CDM'].includes(p.position));
  const midfielders = (roster: StaffMember[]) => roster.filter(p => ['CM', 'CDM', 'LW', 'RW'].includes(p.position));

  for (let g = 0; g < homeGoals; g++) {
    const minute = Math.round(1 + rng() * 89);
    const scorers = attackers(hRoster);
    const scorer = scorers[Math.floor(rng() * scorers.length)] || hRoster[Math.floor(rng() * hRoster.length)];
    const assisters = midfielders(hRoster).filter(p => p.id !== scorer.id);
    const assister = rng() > 0.3 && assisters.length > 0 ? assisters[Math.floor(rng() * assisters.length)] : undefined;

    events.push({
      minute,
      type: rng() > 0.95 ? 'penalty' : rng() > 0.97 ? 'own_goal' : 'goal',
      teamId: homeTeam.id,
      playerId: scorer.id,
      playerName: scorer.name,
      assistPlayerId: assister?.id,
      assistPlayerName: assister?.name,
    });
  }

  for (let g = 0; g < awayGoals; g++) {
    const minute = Math.round(1 + rng() * 89);
    const scorers = attackers(aRoster);
    const scorer = scorers[Math.floor(rng() * scorers.length)] || aRoster[Math.floor(rng() * aRoster.length)];
    const assisters = midfielders(aRoster).filter(p => p.id !== scorer.id);
    const assister = rng() > 0.3 && assisters.length > 0 ? assisters[Math.floor(rng() * assisters.length)] : undefined;

    events.push({
      minute,
      type: rng() > 0.95 ? 'penalty' : 'goal',
      teamId: awayTeam.id,
      playerId: scorer.id,
      playerName: scorer.name,
      assistPlayerId: assister?.id,
      assistPlayerName: assister?.name,
    });
  }

  // Yellow cards (2-6 per match)
  const yellowCount = Math.round(2 + rng() * 4);
  for (let i = 0; i < yellowCount; i++) {
    const isHome = rng() > 0.5;
    const roster = isHome ? hRoster : aRoster;
    const player = roster[Math.floor(rng() * roster.length)];
    events.push({
      minute: Math.round(1 + rng() * 89),
      type: 'yellow_card',
      teamId: isHome ? homeTeam.id : awayTeam.id,
      playerId: player.id,
      playerName: player.name,
    });
  }

  // Red card (rare ~10%)
  if (rng() < 0.1) {
    const isHome = rng() > 0.5;
    const roster = isHome ? hRoster : aRoster;
    const player = roster[Math.floor(rng() * roster.length)];
    events.push({
      minute: Math.round(30 + rng() * 60),
      type: 'red_card',
      teamId: isHome ? homeTeam.id : awayTeam.id,
      playerId: player.id,
      playerName: player.name,
    });
  }

  // Substitutions (3 per team at standard times)
  [60, 70, 80].forEach(baseMin => {
    for (const [team, roster] of [[homeTeam, hRoster], [awayTeam, aRoster]] as const) {
      if (rng() > 0.3) {
        const player = roster[Math.floor(rng() * roster.length)];
        events.push({
          minute: baseMin + Math.round(rng() * 5),
          type: 'substitution',
          teamId: team.id,
          playerId: player.id,
          playerName: player.name,
          detail: 'Substituted off',
        });
      }
    }
  });

  // Sort events by minute
  events.sort((a, b) => a.minute - b.minute);

  // Match stats
  const homePoss = Math.round(45 + (homeOvr - awayOvr) * 0.3 + (rng() - 0.5) * 10);
  const stats: MatchStats = {
    possession: [Math.min(70, Math.max(30, homePoss)), 100 - Math.min(70, Math.max(30, homePoss))],
    shots: [Math.round(8 + homeGoals * 3 + rng() * 6), Math.round(6 + awayGoals * 3 + rng() * 6)],
    shotsOnTarget: [Math.round(3 + homeGoals * 1.5 + rng() * 3), Math.round(2 + awayGoals * 1.5 + rng() * 3)],
    corners: [Math.round(3 + rng() * 7), Math.round(2 + rng() * 7)],
    fouls: [Math.round(8 + rng() * 8), Math.round(8 + rng() * 8)],
    yellowCards: [events.filter(e => e.type === 'yellow_card' && e.teamId === homeTeam.id).length,
                  events.filter(e => e.type === 'yellow_card' && e.teamId === awayTeam.id).length],
    redCards: [events.filter(e => e.type === 'red_card' && e.teamId === homeTeam.id).length,
               events.filter(e => e.type === 'red_card' && e.teamId === awayTeam.id).length],
  };

  // Player ratings
  const playerRatings: Record<string, number> = {};
  [...hRoster, ...aRoster].forEach(p => {
    const base = 5.5 + (p.overall - 65) * 0.04;
    const goalBonus = events.filter(e => (e.type === 'goal' || e.type === 'penalty') && e.playerId === p.id).length * 0.8;
    const assistBonus = events.filter(e => e.assistPlayerId === p.id).length * 0.4;
    const cardPenalty = events.filter(e => e.type === 'red_card' && e.playerId === p.id).length * -1.5;
    playerRatings[p.id] = Math.round(Math.min(10, Math.max(3, base + goalBonus + assistBonus + cardPenalty + (rng() - 0.5))) * 10) / 10;
  });

  return {
    homeScore: homeGoals,
    awayScore: awayGoals,
    events,
    stats,
    playerRatings,
  };
}

// ── NBA Match Simulation ───────────────────────────────

export interface NBAQuarterScore {
  quarter: number;
  homePoints: number;
  awayPoints: number;
}

export interface NBAMatchResult extends MatchResult {
  quarters: NBAQuarterScore[];
}

export function simulateNBAMatch(
  homeTeam: TeamRef,
  awayTeam: TeamRef,
  seed: number,
): NBAMatchResult {
  const rng = createRng(seed);
  const homeOvr = teamAvgOvr(homeTeam.id, homeTeam.league, homeTeam.overall);
  const awayOvr = teamAvgOvr(awayTeam.id, awayTeam.league, awayTeam.overall);

  const homeAdvantage = 2;
  const ovrDelta = (homeOvr - awayOvr) / 10;

  const quarters: NBAQuarterScore[] = [];
  let homeTotal = 0, awayTotal = 0;
  const events: MatchEvent[] = [];
  const hRoster = quickRoster(homeTeam.id, 'NBA');
  const aRoster = quickRoster(awayTeam.id, 'NBA');

  for (let q = 1; q <= 4; q++) {
    const baseHome = 24 + homeAdvantage + ovrDelta + (rng() - 0.5) * 12;
    const baseAway = 24 - ovrDelta + (rng() - 0.5) * 12;
    const hPts = Math.round(Math.max(15, baseHome));
    const aPts = Math.round(Math.max(15, baseAway));
    homeTotal += hPts;
    awayTotal += aPts;
    quarters.push({ quarter: q, homePoints: hPts, awayPoints: aPts });

    // Generate notable plays for each quarter
    const playsPerQ = Math.round(2 + rng() * 3);
    for (let p = 0; p < playsPerQ; p++) {
      const isHome = rng() > 0.5;
      const roster = isHome ? hRoster : aRoster;
      const player = roster[Math.floor(rng() * roster.length)];
      const minute = (q - 1) * 12 + Math.round(rng() * 12);
      events.push({
        minute,
        type: 'goal',
        teamId: isHome ? homeTeam.id : awayTeam.id,
        playerId: player.id,
        playerName: player.name,
        detail: rng() > 0.6 ? 'Three-pointer' : rng() > 0.3 ? 'Layup' : 'Dunk',
      });
    }
  }

  // Overtime if tied
  if (homeTotal === awayTotal) {
    const otHome = Math.round(8 + rng() * 8);
    const otAway = Math.round(6 + rng() * 8);
    homeTotal += otHome;
    awayTotal += otAway === otHome ? otAway + 2 : otAway; // ensure no double-OT for simplicity
    quarters.push({ quarter: 5, homePoints: otHome, awayPoints: otAway });
  }

  events.sort((a, b) => a.minute - b.minute);

  const playerRatings: Record<string, number> = {};
  [...hRoster, ...aRoster].forEach(p => {
    playerRatings[p.id] = Math.round((5 + (p.overall - 65) * 0.05 + (rng() - 0.5) * 2) * 10) / 10;
  });

  return {
    homeScore: homeTotal,
    awayScore: awayTotal,
    events,
    quarters,
    stats: {
      possession: [50, 50], // less meaningful in NBA
      shots: [Math.round(70 + rng() * 20), Math.round(70 + rng() * 20)],
      shotsOnTarget: [homeTotal, awayTotal], // field goals
      corners: [0, 0],
      fouls: [Math.round(15 + rng() * 10), Math.round(15 + rng() * 10)],
      yellowCards: [0, 0],
      redCards: [0, 0],
    },
    playerRatings,
  };
}

// ── F1 Race Simulation ─────────────────────────────────

const F1_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export function simulateRace(
  teams: TeamRef[],
  totalLaps: number,
  seed: number,
): RaceResult {
  const rng = createRng(seed);

  // Build grid of all drivers (2 per team)
  interface Driver {
    driverId: string;
    driverName: string;
    teamId: string;
    teamName: string;
    teamOvr: number;
    driverOvr: number;
    currentPosition: number;
    gap: number;
    pitStops: number;
    dnf: boolean;
    dnfLap: number;
  }

  const drivers: Driver[] = [];
  for (const team of teams) {
    const roster = quickRoster(team.id, 'F1');
    const teamOvr = teamAvgOvr(team.id, 'F1', team.overall);
    roster.slice(0, 2).forEach((staff, _i) => {
      drivers.push({
        driverId: staff.id,
        driverName: staff.name,
        teamId: team.id,
        teamName: team.name,
        teamOvr,
        driverOvr: staff.overall,
        currentPosition: 0,
        gap: 0,
        pitStops: 0,
        dnf: false,
        dnfLap: 0,
      });
    });
  }

  // Qualifying: sort by combined performance + randomness
  drivers.forEach(d => {
    d.gap = -(d.teamOvr * 0.6 + d.driverOvr * 0.4) - rng() * 5;
  });
  drivers.sort((a, b) => a.gap - b.gap);
  drivers.forEach((d, i) => { d.currentPosition = i + 1; d.gap = 0; });

  const events: RaceEvent[] = [];
  let fastestLapDriver = drivers[0];
  let fastestLapTime = 999;

  // Simulate lap by lap
  for (let lap = 1; lap <= totalLaps; lap++) {
    const activeCars = drivers.filter(d => !d.dnf);

    // DNF check (~0.3% per car per lap)
    for (const d of activeCars) {
      if (rng() < 0.003) {
        d.dnf = true;
        d.dnfLap = lap;
        events.push({
          lap, type: 'dnf', driverId: d.driverId, driverName: d.driverName,
          teamId: d.teamId, detail: rng() > 0.5 ? 'Engine failure' : rng() > 0.3 ? 'Hydraulics failure' : 'Gearbox issue',
        });
      }
    }

    // Pit stops (strategy: stop around lap 15-20 and 35-40 for a 57-lap race)
    const stopWindow1 = Math.round(totalLaps * 0.3);
    const stopWindow2 = Math.round(totalLaps * 0.65);
    for (const d of activeCars) {
      if ((lap === stopWindow1 + Math.round(rng() * 5) && d.pitStops === 0) ||
          (lap === stopWindow2 + Math.round(rng() * 5) && d.pitStops === 1 && rng() > 0.4)) {
        d.pitStops++;
        d.gap += 20 + rng() * 5; // pit stop time cost
        events.push({
          lap, type: 'pit_stop', driverId: d.driverId, driverName: d.driverName,
          teamId: d.teamId, detail: `Pit stop #${d.pitStops} — ${rng() > 0.5 ? 'Hard' : 'Medium'} tires`,
        });
      }
    }

    // Position changes based on pace
    for (const d of activeCars) {
      const pace = d.teamOvr * 0.55 + d.driverOvr * 0.35 + rng() * 10;
      d.gap -= pace * 0.01;
    }

    // Overtakes: occasionally swap adjacent positions
    const sorted = activeCars.sort((a, b) => a.gap - b.gap);
    for (let i = 1; i < sorted.length; i++) {
      const gapDelta = sorted[i].gap - sorted[i - 1].gap;
      if (gapDelta < 0.5 && rng() > 0.7) {
        // Overtake!
        [sorted[i].gap, sorted[i - 1].gap] = [sorted[i - 1].gap - 0.1, sorted[i].gap + 0.1];
        if (lap > 3 && lap % 5 === 0) { // Don't spam events every lap
          events.push({
            lap, type: 'overtake', driverId: sorted[i].driverId, driverName: sorted[i].driverName,
            teamId: sorted[i].teamId, detail: `Overtakes ${sorted[i - 1].driverName} for P${i}`,
          });
        }
      }
    }

    // Fastest lap check
    for (const d of activeCars) {
      const lapTime = 90 - (d.teamOvr * 0.15 + d.driverOvr * 0.1) + rng() * 3;
      if (lapTime < fastestLapTime) {
        fastestLapTime = lapTime;
        fastestLapDriver = d;
      }
    }

    // Safety car (rare ~1% chance per lap)
    if (rng() < 0.01 && lap > 1 && lap < totalLaps - 5) {
      events.push({
        lap, type: 'safety_car', driverId: '', driverName: '',
        teamId: '', detail: 'Safety car deployed — incident on track',
      });
    }
  }

  // Final positions
  const finishers = drivers.filter(d => !d.dnf).sort((a, b) => a.gap - b.gap);
  const dnfs = drivers.filter(d => d.dnf).sort((a, b) => b.dnfLap - a.dnfLap);
  const allPositions = [...finishers, ...dnfs];

  const positions: RacePosition[] = allPositions.map((d, i) => ({
    teamId: d.teamId,
    teamName: d.teamName,
    driverId: d.driverId,
    driverName: d.driverName,
    position: i + 1,
    gap: i === 0 ? 'LEADER' : d.dnf ? `DNF Lap ${d.dnfLap}` : `+${Math.abs(d.gap - finishers[0].gap).toFixed(1)}s`,
    points: i < 10 ? F1_POINTS[i] : 0,
    dnf: d.dnf,
    pitStops: d.pitStops,
  }));

  // Fastest lap bonus point
  const flIdx = positions.findIndex(p => p.driverId === fastestLapDriver.driverId);
  if (flIdx >= 0 && flIdx < 10) positions[flIdx].points += 1;

  events.push({
    lap: totalLaps, type: 'fastest_lap', driverId: fastestLapDriver.driverId,
    driverName: fastestLapDriver.driverName, teamId: fastestLapDriver.teamId,
    detail: `Fastest lap: 1:${Math.floor(fastestLapTime)}:${Math.round((fastestLapTime % 1) * 1000).toString().padStart(3, '0')}`,
  });

  return {
    positions,
    events: events.sort((a, b) => a.lap - b.lap),
    fastestLap: {
      driverId: fastestLapDriver.driverId,
      driverName: fastestLapDriver.driverName,
      time: `1:${Math.floor(fastestLapTime)}.${Math.round((fastestLapTime % 1) * 1000).toString().padStart(3, '0')}`,
    },
    totalLaps,
  };
}
