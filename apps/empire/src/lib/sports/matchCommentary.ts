/**
 * matchCommentary.ts — Template-based text commentary for live match playback.
 */

import type { MatchEvent, RaceEvent } from './seasonGenerator';

// ── Football Commentary ────────────────────────────────

const GOAL_TEMPLATES = [
  "{minute}' ⚽ GOAL! {playerName} scores for {teamName}!",
  "{minute}' ⚽ {playerName} finds the net! {teamName} celebrate!",
  "{minute}' ⚽ What a strike from {playerName}! {teamName} with a brilliant goal!",
  "{minute}' ⚽ {playerName} makes no mistake! Goal for {teamName}!",
  "{minute}' ⚽ Clinical finish from {playerName}! {teamName} take the lead!",
];

const ASSIST_SUFFIX = [
  " Assist by {assistPlayerName}.",
  " Great pass from {assistPlayerName}.",
  " Set up beautifully by {assistPlayerName}.",
];

const PENALTY_TEMPLATES = [
  "{minute}' ⚽ PENALTY! {playerName} steps up... and scores! {teamName}!",
  "{minute}' ⚽ {playerName} sends the keeper the wrong way from the spot!",
];

const OWN_GOAL_TEMPLATES = [
  "{minute}' ⚽ Own goal! {playerName} puts it into their own net!",
  "{minute}' ⚽ Unfortunate own goal by {playerName}!",
];

const YELLOW_TEMPLATES = [
  "{minute}' 🟡 Yellow card shown to {playerName} ({teamName})",
  "{minute}' 🟡 {playerName} goes into the book for {teamName}",
];

const RED_TEMPLATES = [
  "{minute}' 🔴 RED CARD! {playerName} ({teamName}) is sent off!",
  "{minute}' 🔴 Straight red for {playerName}! {teamName} down to {detail} men!",
];

const SUB_TEMPLATES = [
  "{minute}' 🔄 Substitution for {teamName}: {playerName} comes off",
  "{minute}' 🔄 {teamName} make a change — {playerName} is replaced",
];

const TIME_EVENTS = [
  { minute: 0, text: "⏱️ Kick-off! The match is underway!" },
  { minute: 45, text: "⏱️ Half-time! The referee blows the whistle." },
  { minute: 46, text: "⏱️ Second half begins!" },
  { minute: 90, text: "⏱️ Full-time! The final whistle blows!" },
];

function pickTemplate(templates: string[], seed: number): string {
  return templates[Math.abs(seed) % templates.length];
}

function fillTemplate(template: string, data: Record<string, string | number>): string {
  let result = template;
  for (const [key, val] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
  }
  return result;
}

export function footballCommentary(
  event: MatchEvent,
  teamNames: Record<string, string>,
  score: { home: number; away: number; homeTeam: string; awayTeam: string },
): string {
  const teamName = teamNames[event.teamId] || event.teamId;
  const data = { ...event, teamName, ...score };
  const seed = event.minute * 31 + event.playerName.charCodeAt(0);

  switch (event.type) {
    case 'goal': {
      let text = fillTemplate(pickTemplate(GOAL_TEMPLATES, seed), data);
      if (event.assistPlayerName) {
        text += fillTemplate(pickTemplate(ASSIST_SUFFIX, seed), data);
      }
      text += ` [${score.homeTeam} ${score.home} - ${score.away} ${score.awayTeam}]`;
      return text;
    }
    case 'penalty':
      return fillTemplate(pickTemplate(PENALTY_TEMPLATES, seed), data) + ` [${score.homeTeam} ${score.home} - ${score.away} ${score.awayTeam}]`;
    case 'own_goal':
      return fillTemplate(pickTemplate(OWN_GOAL_TEMPLATES, seed), data) + ` [${score.homeTeam} ${score.home} - ${score.away} ${score.awayTeam}]`;
    case 'yellow_card':
      return fillTemplate(pickTemplate(YELLOW_TEMPLATES, seed), data);
    case 'red_card':
      return fillTemplate(pickTemplate(RED_TEMPLATES, seed), { ...data, detail: '10' });
    case 'substitution':
      return fillTemplate(pickTemplate(SUB_TEMPLATES, seed), data);
    default:
      return `${event.minute}' ${event.type} — ${event.playerName} (${teamName})`;
  }
}

export function footballTimeEvents(): typeof TIME_EVENTS {
  return TIME_EVENTS;
}

// ── NBA Commentary ─────────────────────────────────────

const NBA_TEMPLATES = [
  "Q{quarter} {time} — {playerName} ({teamName}) with a {detail}!",
  "Q{quarter} {time} — What a play from {playerName}! {detail} for {teamName}!",
  "Q{quarter} {time} — {playerName} converts the {detail}! {teamName} scoring!",
];

const NBA_TIME_EVENTS = [
  { minute: 0, text: "🏀 Tip-off! Game is underway!" },
  { minute: 12, text: "🏀 End of Q1" },
  { minute: 24, text: "🏀 Halftime!" },
  { minute: 36, text: "🏀 End of Q3" },
  { minute: 48, text: "🏀 Final buzzer! Game over!" },
];

export function nbaCommentary(
  event: MatchEvent,
  teamNames: Record<string, string>,
  score: { home: number; away: number },
): string {
  const quarter = Math.min(4, Math.ceil(event.minute / 12));
  const timeInQ = 12 - (event.minute % 12);
  const teamName = teamNames[event.teamId] || event.teamId;
  const template = pickTemplate(NBA_TEMPLATES, event.minute * 17);
  return fillTemplate(template, {
    quarter,
    time: `${timeInQ}:${String(Math.round(Math.random() * 59)).padStart(2, '0')}`,
    playerName: event.playerName,
    teamName,
    detail: event.detail || 'basket',
  }) + ` [${score.home}-${score.away}]`;
}

export function nbaTimeEvents() { return NBA_TIME_EVENTS; }

// ── F1 Commentary ──────────────────────────────────────

const F1_OVERTAKE_TEMPLATES = [
  "Lap {lap} — {driverName} overtakes for position! {detail}",
  "Lap {lap} — Bold move from {driverName}! {detail}",
  "Lap {lap} — {driverName} makes it stick! {detail}",
];

const F1_PIT_TEMPLATES = [
  "Lap {lap} — {driverName} pits! {detail}",
  "Lap {lap} — Pit stop for {driverName}. {detail}",
];

const F1_DNF_TEMPLATES = [
  "Lap {lap} — ❌ {driverName} is OUT! {detail}",
  "Lap {lap} — ❌ Heartbreak for {driverName}! {detail}. Race over.",
];

const F1_SC_TEMPLATES = [
  "Lap {lap} — 🟡 SAFETY CAR! {detail}",
];

const F1_FL_TEMPLATES = [
  "Lap {lap} — ⏱️ FASTEST LAP! {driverName} — {detail}",
];

export function f1Commentary(event: RaceEvent): string {
  const data = { ...event };
  const seed = event.lap * 31;

  switch (event.type) {
    case 'overtake':
    case 'drs_overtake':
      return fillTemplate(pickTemplate(F1_OVERTAKE_TEMPLATES, seed), data);
    case 'pit_stop':
      return fillTemplate(pickTemplate(F1_PIT_TEMPLATES, seed), data);
    case 'dnf':
      return fillTemplate(pickTemplate(F1_DNF_TEMPLATES, seed), data);
    case 'safety_car':
      return fillTemplate(pickTemplate(F1_SC_TEMPLATES, seed), data);
    case 'fastest_lap':
      return fillTemplate(pickTemplate(F1_FL_TEMPLATES, seed), data);
    default:
      return `Lap ${event.lap} — ${event.driverName}: ${event.detail}`;
  }
}
