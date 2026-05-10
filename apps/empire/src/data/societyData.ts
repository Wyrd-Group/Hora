// ── Society / Youth Academy Data ────────────────────────────────
// European colleges where players can open "student societies" to
// nurture students into professional AI agents. Inspired by FIFA
// Ultimate Team youth academies.

import type { AgentClass } from './agentCards';

// ── Types ───────────────────────────────────────────────────────

export interface CollegeDef {
  id: string;
  name: string;
  country: string;
  city: string;
  prestige: 1 | 2 | 3 | 4 | 5;
  specializations: AgentClass[];
  potentialRange: [number, number];
  costToOpenSociety: number;
  maxStudents: number;
  graduationTicks: number;
  description: string;
  crest: string;
}

// ── College Catalog ─────────────────────────────────────────────

export const COLLEGE_CATALOG: CollegeDef[] = [
  // ── Prestige 5 (Elite) ─────────────────────────────────────────
  {
    id: 'col-oxford',
    name: 'Oxford',
    country: 'UK',
    city: 'Oxford',
    prestige: 5,
    specializations: ['Researcher', 'Analyst'],
    potentialRange: [75, 95],
    costToOpenSociety: 15000,
    maxStudents: 8,
    graduationTicks: 300,
    description:
      'The oldest English-speaking university. Its research tradition produces world-class analysts and deep-thinking researchers.',
    crest: '🏛️',
  },
  {
    id: 'col-eth-zurich',
    name: 'ETH Zurich',
    country: 'Switzerland',
    city: 'Zurich',
    prestige: 5,
    specializations: ['Coder', 'Researcher'],
    potentialRange: [75, 95],
    costToOpenSociety: 15000,
    maxStudents: 8,
    graduationTicks: 300,
    description:
      'Switzerland\'s premier technical institute. A powerhouse for engineering talent that breeds elite coders and cutting-edge researchers.',
    crest: '⚙️',
  },

  // ── Prestige 4 (Top Tier) ──────────────────────────────────────
  {
    id: 'col-sorbonne',
    name: 'Sorbonne',
    country: 'France',
    city: 'Paris',
    prestige: 4,
    specializations: ['Social', 'Analyst'],
    potentialRange: [70, 90],
    costToOpenSociety: 10000,
    maxStudents: 10,
    graduationTicks: 250,
    description:
      'The intellectual heart of Paris. Produces charismatic social agents and sharp analytical minds steeped in continental philosophy.',
    crest: '🗼',
  },
  {
    id: 'col-bocconi',
    name: 'Bocconi',
    country: 'Italy',
    city: 'Milan',
    prestige: 4,
    specializations: ['Trader', 'Orchestrator'],
    potentialRange: [70, 88],
    costToOpenSociety: 10000,
    maxStudents: 10,
    graduationTicks: 250,
    description:
      'Italy\'s leading business school. Its finance-first culture forges ruthless traders and masterful orchestrators of complex operations.',
    crest: '📐',
  },
  {
    id: 'col-tu-munich',
    name: 'TU Munich',
    country: 'Germany',
    city: 'Munich',
    prestige: 4,
    specializations: ['Coder', 'Specialist'],
    potentialRange: [68, 88],
    costToOpenSociety: 10000,
    maxStudents: 10,
    graduationTicks: 250,
    description:
      'Germany\'s top technical university. Known for precision engineering and producing highly specialised agents with deep domain expertise.',
    crest: '🔧',
  },

  // ── Prestige 3 (Strong) ────────────────────────────────────────
  {
    id: 'col-kth-stockholm',
    name: 'KTH Stockholm',
    country: 'Sweden',
    city: 'Stockholm',
    prestige: 3,
    specializations: ['Coder', 'Navigator'],
    potentialRange: [62, 82],
    costToOpenSociety: 6000,
    maxStudents: 12,
    graduationTicks: 200,
    description:
      'Scandinavia\'s largest technical university. A hotbed for systems thinkers who code clean and navigate complex digital landscapes.',
    crest: '🏔️',
  },
  {
    id: 'col-esade-barcelona',
    name: 'ESADE Barcelona',
    country: 'Spain',
    city: 'Barcelona',
    prestige: 3,
    specializations: ['Trader', 'Social'],
    potentialRange: [60, 80],
    costToOpenSociety: 6000,
    maxStudents: 12,
    graduationTicks: 200,
    description:
      'A premier Mediterranean business school. Blends commercial instinct with social intelligence, producing well-connected traders.',
    crest: '☀️',
  },
  {
    id: 'col-trinity-dublin',
    name: 'Trinity Dublin',
    country: 'Ireland',
    city: 'Dublin',
    prestige: 3,
    specializations: ['Researcher', 'Analyst'],
    potentialRange: [60, 80],
    costToOpenSociety: 6000,
    maxStudents: 12,
    graduationTicks: 200,
    description:
      'Ireland\'s oldest university. A centuries-old tradition of scholarly rigour that turns out meticulous researchers and keen analysts.',
    crest: '☘️',
  },
  {
    id: 'col-tu-delft',
    name: 'TU Delft',
    country: 'Netherlands',
    city: 'Delft',
    prestige: 3,
    specializations: ['Specialist', 'Coder'],
    potentialRange: [60, 82],
    costToOpenSociety: 6000,
    maxStudents: 12,
    graduationTicks: 200,
    description:
      'The Netherlands\' leading tech university. Dutch pragmatism meets engineering excellence, producing niche specialists and solid coders.',
    crest: '🌷',
  },
  {
    id: 'col-politecnico-milan',
    name: 'Politecnico Milan',
    country: 'Italy',
    city: 'Milan',
    prestige: 3,
    specializations: ['Coder', 'Specialist'],
    potentialRange: [62, 80],
    costToOpenSociety: 6000,
    maxStudents: 12,
    graduationTicks: 200,
    description:
      'Milan\'s storied polytechnic. Combines Italian design thinking with technical rigour to produce creative coders and domain specialists.',
    crest: '🏗️',
  },
  {
    id: 'col-aalto-helsinki',
    name: 'Aalto Helsinki',
    country: 'Finland',
    city: 'Helsinki',
    prestige: 3,
    specializations: ['Navigator', 'Coder'],
    potentialRange: [60, 78],
    costToOpenSociety: 6000,
    maxStudents: 12,
    graduationTicks: 200,
    description:
      'Finland\'s innovation university. Merges design, technology, and business to produce versatile navigators and creative coders.',
    crest: '❄️',
  },
  {
    id: 'col-copenhagen-bs',
    name: 'Copenhagen BS',
    country: 'Denmark',
    city: 'Copenhagen',
    prestige: 3,
    specializations: ['Trader', 'Orchestrator'],
    potentialRange: [62, 80],
    costToOpenSociety: 6000,
    maxStudents: 12,
    graduationTicks: 200,
    description:
      'One of Northern Europe\'s top business schools. Its collaborative culture breeds traders who think strategically and orchestrate with precision.',
    crest: '👑',
  },

  // ── Prestige 2 (Developing) ────────────────────────────────────
  {
    id: 'col-warsaw-uni',
    name: 'Warsaw Uni',
    country: 'Poland',
    city: 'Warsaw',
    prestige: 2,
    specializations: ['Infiltrator', 'Coder'],
    potentialRange: [55, 72],
    costToOpenSociety: 3000,
    maxStudents: 15,
    graduationTicks: 150,
    description:
      'Poland\'s largest university. A competitive environment that sharpens resourceful infiltrators and scrappy, determined coders.',
    crest: '🦅',
  },
  {
    id: 'col-carlos-iii-madrid',
    name: 'Carlos III Madrid',
    country: 'Spain',
    city: 'Madrid',
    prestige: 2,
    specializations: ['Analyst', 'Trader'],
    potentialRange: [55, 72],
    costToOpenSociety: 3000,
    maxStudents: 15,
    graduationTicks: 150,
    description:
      'A modern Spanish public university with a strong economics faculty. Produces sharp analysts and hungry traders at an accessible price point.',
    crest: '🌞',
  },
  {
    id: 'col-corvinus-budapest',
    name: 'Corvinus Budapest',
    country: 'Hungary',
    city: 'Budapest',
    prestige: 2,
    specializations: ['Trader', 'Social'],
    potentialRange: [52, 70],
    costToOpenSociety: 3000,
    maxStudents: 15,
    graduationTicks: 150,
    description:
      'Hungary\'s premier business university on the Danube. Known for producing street-smart traders and socially adept networkers.',
    crest: '🏰',
  },
];

// ── Helper Functions ────────────────────────────────────────────

export function getCollegeById(id: string): CollegeDef | undefined {
  return COLLEGE_CATALOG.find((c) => c.id === id);
}

export function getCollegesByPrestige(prestige: number): CollegeDef[] {
  return COLLEGE_CATALOG.filter((c) => c.prestige === prestige);
}

export function getCollegesForClass(cls: AgentClass): CollegeDef[] {
  return COLLEGE_CATALOG.filter((c) => c.specializations.includes(cls));
}
