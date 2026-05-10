/**
 * worldIntelStore.ts — Map Intelligence Feed System
 *
 * Procedurally generates fake but realistic intelligence feeds:
 * - Shipment Tracking: monitor your cargo and competitors' logistics
 * - Competition Surveillance: track rival expansions and market moves
 * - Government Intel: regulatory changes, investigations, sanctions
 * - Target Acquisition: M&A opportunities, hostile takeovers, partnerships
 * - Black Market Intel: shadow economy signals, smuggling routes
 * - Cyber Threat Feed: hacking attempts, data breaches, espionage
 */

import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────────────

export type ShipmentStatus = 'in_transit' | 'delivered' | 'delayed' | 'seized' | 'rerouted' | 'at_port';
export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';
export type IntelCategory = 'shipments' | 'competition' | 'government' | 'targets' | 'cyber' | 'shadow';

export interface ShipmentEvent {
  id: string;
  corridorName: string;
  commodity: string;
  quantity: string;
  origin: string;
  destination: string;
  status: ShipmentStatus;
  eta: string;
  progress: number; // 0-100
  carrier: string;
  owner: 'player' | 'rival' | 'market';
  flagged: boolean;
  timestamp: number;
}

export interface CompetitionEvent {
  id: string;
  rivalName: string;
  action: 'expansion' | 'price_cut' | 'hiring_spree' | 'acquisition' | 'ipo_filing' | 'partnership' | 'product_launch' | 'market_exit';
  sector: string;
  region: string;
  severity: ThreatLevel;
  impactEstimate: string;
  description: string;
  timestamp: number;
}

export interface GovernmentEvent {
  id: string;
  agency: string;
  eventType: 'regulation' | 'tax_audit' | 'investigation' | 'sanction' | 'trade_policy' | 'subsidy' | 'antitrust' | 'environmental';
  classification: 'NOTICE' | 'WARNING' | 'CRITICAL' | 'CLASSIFIED';
  affectedSectors: string[];
  region: string;
  description: string;
  effectiveDate: string;
  playerImpact: ThreatLevel;
  timestamp: number;
}

export interface TargetOpportunity {
  id: string;
  targetName: string;
  sector: string;
  region: string;
  opportunityType: 'acquisition' | 'merger' | 'hostile_takeover' | 'partnership' | 'franchise' | 'distressed_sale';
  valuation: string;
  strategicValue: number; // 0-100
  sellerWillingness: number; // 0-100
  expiresIn: string;
  description: string;
  timestamp: number;
}

export interface CyberThreatEvent {
  id: string;
  threatType: 'ddos' | 'phishing' | 'ransomware' | 'data_breach' | 'espionage' | 'insider_threat' | 'supply_chain_attack';
  source: string;
  target: string;
  severity: ThreatLevel;
  status: 'detected' | 'mitigated' | 'active' | 'investigating';
  description: string;
  timestamp: number;
}

export interface ShadowEvent {
  id: string;
  operationType: 'smuggling' | 'black_market' | 'money_laundering' | 'insider_trading' | 'cartel_activity' | 'arms_deal' | 'crypto_wash';
  region: string;
  actors: string;
  confidence: number; // 0-100
  profitPotential: string;
  riskLevel: ThreatLevel;
  description: string;
  timestamp: number;
}

interface WorldIntelState {
  // Feeds
  shipments: ShipmentEvent[];
  competition: CompetitionEvent[];
  government: GovernmentEvent[];
  targets: TargetOpportunity[];
  cyber: CyberThreatEvent[];
  shadow: ShadowEvent[];

  // UI
  activeCategory: IntelCategory;
  feedOpen: boolean;
  unreadCounts: Record<IntelCategory, number>;

  // Actions
  setCategory: (cat: IntelCategory) => void;
  toggleFeed: () => void;
  refreshAll: () => void;
  markRead: (category: IntelCategory) => void;
}

// ── Fake Data Pools ────────────────────────────────────────────

const RIVAL_NAMES = [
  'Vostok Capital', 'Meridian Corp', 'BlackStone Industries', 'Zenith Holdings',
  'OmniTrade AG', 'PacificRim Ventures', 'Silk Road Logistics', 'Titan Financial',
  'NovaCrest Group', 'Apex Dynamics', 'Iron Gate Capital', 'Coral Bay Trading',
  'Evergreen Consortium', 'Shadow Peak Ltd', 'Arctic Wolf Industries',
  'Red Phoenix Holdings', 'Cerberus Freight', 'Atlas Global', 'Obsidian Partners',
];

const COMMODITIES = [
  'Crude Oil (Brent)', 'LNG Cargo', 'Lithium Carbonate', 'Copper Cathodes',
  'Semiconductor Wafers', 'Wheat (Grade A)', 'Cobalt Ore', 'Rare Earth Oxides',
  'Pharmaceutical APIs', 'Steel Billets', 'Coffee Arabica', 'Palm Oil',
  'Natural Rubber', 'Gold Bullion', 'Polyethylene Resin', 'Nickel Matte',
  'Uranium Yellowcake', 'Frozen Seafood', 'Auto Parts (OEM)', 'Cotton Bales',
];

const CARRIERS = [
  'Maersk Line', 'MSC Shipping', 'CMA CGM', 'COSCO Shipping', 'Hapag-Lloyd',
  'Evergreen Marine', 'Yang Ming', 'HMM', 'ZIM Lines', 'PIL Shipping',
  'DB Cargo', 'Union Pacific', 'DHL Express', 'FedEx Freight', 'Emirates SkyCargo',
  'Air Bridge Cargo', 'Kuehne+Nagel', 'XPO Logistics', 'J.B. Hunt', 'UPS Freight',
];

const REGIONS = [
  'Western Europe', 'Eastern Europe', 'East Asia', 'Southeast Asia', 'South Asia',
  'Middle East', 'North Africa', 'Sub-Saharan Africa', 'North America',
  'South America', 'Oceania', 'Central Asia', 'Caribbean', 'Scandinavia',
];

const SECTORS = [
  'finance', 'tech', 'manufacturing', 'energy', 'oil_gas', 'defense',
  'pharma', 'healthcare', 'education', 'hospitality', 'retail',
];

const GOV_AGENCIES = [
  'SEC', 'EU Commission', 'PBOC', 'FCA (UK)', 'BaFin', 'FINMA',
  'FSA (Japan)', 'ASIC (Australia)', 'MAS (Singapore)', 'FATF',
  'Interpol Financial Crimes', 'WTO', 'IMF Oversight', 'UN Security Council',
  'EPA', 'Dept. of Commerce', 'Ministry of Trade', 'Central Bank',
];

const CYBER_SOURCES = [
  'APT-28 (Fancy Bear)', 'Lazarus Group', 'DarkSide RaaS', 'APT-41',
  'Anonymous Collective', 'Equation Group', 'Sandworm', 'Cozy Bear',
  'Unknown State Actor', 'Insider (Dept. Finance)', 'Supply Chain Vector',
  'Criminal Syndicate', 'Hacktivist Cell', 'Zero-Day Broker',
];

const SHADOW_ACTORS = [
  'Unknown Syndicate', 'Triads (SE Asia)', 'Camorra Network', 'Lagos Ring',
  'Cartel del Pacifico', 'Eastern Bloc Network', 'Silk Road Revival',
  'Dark Web Collective', 'Offshore Shell Network', 'Crypto Mixer Ring',
];

// ── Random Helpers ─────────────────────────────────────────────

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const uid = () => `intel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const pct = (n: number) => Math.floor(Math.random() * n);
const rng = (min: number, max: number) => min + Math.floor(Math.random() * (max - min));
const ago = (mins: number) => Date.now() - mins * 60_000;
const future = (hours: number) => {
  const d = new Date(Date.now() + hours * 3_600_000);
  return d.toISOString().slice(0, 16).replace('T', ' ');
};

// ── Generators ─────────────────────────────────────────────────

function generateShipments(count: number): ShipmentEvent[] {
  const statuses: ShipmentStatus[] = ['in_transit', 'in_transit', 'in_transit', 'delivered', 'delayed', 'seized', 'rerouted', 'at_port'];
  const owners: ('player' | 'rival' | 'market')[] = ['player', 'player', 'rival', 'rival', 'rival', 'market'];

  return Array.from({ length: count }, () => {
    const status = pick(statuses);
    const owner = pick(owners);
    return {
      id: uid(),
      corridorName: `${pick(REGIONS)} → ${pick(REGIONS)}`,
      commodity: pick(COMMODITIES),
      quantity: `${rng(50, 9999)} ${pick(['MT', 'TEU', 'units', 'bbl', 'kg'])}`,
      origin: pick(REGIONS),
      destination: pick(REGIONS),
      status,
      eta: status === 'delivered' ? 'Arrived' : future(rng(2, 240)),
      progress: status === 'delivered' ? 100 : status === 'seized' ? pct(60) : rng(5, 95),
      carrier: pick(CARRIERS),
      owner,
      flagged: status === 'seized' || (owner === 'rival' && Math.random() < 0.3),
      timestamp: ago(rng(1, 480)),
    };
  });
}

function generateCompetition(count: number): CompetitionEvent[] {
  const actions: CompetitionEvent['action'][] = [
    'expansion', 'price_cut', 'hiring_spree', 'acquisition', 'ipo_filing',
    'partnership', 'product_launch', 'market_exit',
  ];
  const severities: ThreatLevel[] = ['low', 'low', 'medium', 'medium', 'high', 'critical'];

  const templates: Record<string, string[]> = {
    expansion: [
      'Opening 3 new facilities in {region}',
      'Doubling {sector} capacity with €{val}M investment',
      'Entering {region} market for the first time',
    ],
    price_cut: [
      'Slashing {sector} prices by {pct}% in {region}',
      'Aggressive pricing strategy targeting your {sector} market share',
      'Loss-leader campaign to undercut competitors in {region}',
    ],
    hiring_spree: [
      'Poaching senior {sector} talent across {region}',
      'Hiring {val}+ engineers from your territory',
      'Recruiting your former department heads in {region}',
    ],
    acquisition: [
      'Acquired mid-tier {sector} company in {region} for €{val}M',
      'Hostile takeover bid for {region} {sector} leader',
      'Completed merger with {region} competitor',
    ],
    ipo_filing: [
      'Filed for €{val}M IPO on {region} exchange',
      'Pre-IPO roadshow gaining traction — valuation {val}x',
      'SPAC merger announced, targeting {sector} dominance',
    ],
    partnership: [
      'Strategic alliance with state-backed {sector} fund in {region}',
      'Joint venture with {region} government for {sector} infrastructure',
      'Technology sharing deal with {region} defense contractor',
    ],
    product_launch: [
      'Launching disruptive {sector} product in {region}',
      'New platform threatens your {sector} revenue stream',
      'AI-powered {sector} solution gaining rapid adoption in {region}',
    ],
    market_exit: [
      'Withdrawing from {region} {sector} market — fire sale',
      'Closing all {sector} operations in {region}',
      'Liquidating {region} assets — opportunity window open',
    ],
  };

  return Array.from({ length: count }, () => {
    const action = pick(actions);
    const sector = pick(SECTORS);
    const region = pick(REGIONS);
    const severity = pick(severities);
    const val = rng(5, 500);
    const template = pick(templates[action]);
    const description = template
      .replace('{region}', region)
      .replace('{sector}', sector)
      .replace('{val}', String(val))
      .replace('{pct}', String(rng(10, 45)));

    const impactMap: Record<string, string> = {
      low: `-${rng(1, 5)}% revenue`,
      medium: `-${rng(5, 15)}% market share`,
      high: `-${rng(15, 30)}% sector dominance`,
      critical: `Existential threat to ${sector} operations`,
    };

    return {
      id: uid(),
      rivalName: pick(RIVAL_NAMES),
      action,
      sector,
      region,
      severity,
      impactEstimate: impactMap[severity],
      description,
      timestamp: ago(rng(5, 720)),
    };
  });
}

function generateGovernment(count: number): GovernmentEvent[] {
  const types: GovernmentEvent['eventType'][] = [
    'regulation', 'tax_audit', 'investigation', 'sanction',
    'trade_policy', 'subsidy', 'antitrust', 'environmental',
  ];
  const classifications: GovernmentEvent['classification'][] = ['NOTICE', 'NOTICE', 'WARNING', 'WARNING', 'CRITICAL', 'CLASSIFIED'];

  const templates: Record<string, string[]> = {
    regulation: [
      'New compliance framework for {sector} operations — 90-day deadline',
      'Data privacy regulation expansion affecting all {sector} entities in {region}',
      'Mandatory ESG reporting requirements for {sector} firms > €10M revenue',
    ],
    tax_audit: [
      'Transfer pricing audit targeting {sector} multinationals in {region}',
      'Retroactive tax assessment on {region} operations — €{val}M liability risk',
      'Digital services tax implementation — {pct}% on {sector} revenue in {region}',
    ],
    investigation: [
      'Anti-corruption probe into {sector} licensing in {region}',
      'Securities fraud investigation — {region} {sector} trading patterns flagged',
      'FCPA investigation opened on {region} government contracts',
    ],
    sanction: [
      'Trade embargo on {region} — all {sector} shipments blocked',
      'Sanctions list update: 12 entities in {region} {sector} added',
      'Secondary sanctions risk — {region} counterparties under review',
    ],
    trade_policy: [
      '{pct}% tariff on {sector} imports from {region} effective immediately',
      'Free trade zone established in {region} — {sector} duty exemptions',
      'Export controls tightened on {sector} technology to {region}',
    ],
    subsidy: [
      'Government stimulus: €{val}M for {sector} development in {region}',
      'Green energy subsidy: {pct}% tax credit for {sector} in {region}',
      'R&D tax incentive expansion for {sector} companies in {region}',
    ],
    antitrust: [
      'Monopoly investigation: {sector} market concentration in {region}',
      'Merger blocked: {sector} consolidation deemed anti-competitive',
      'Price-fixing probe in {region} {sector} — multiple entities named',
    ],
    environmental: [
      'Carbon tax increase: +{pct}% on {sector} emissions in {region}',
      'Environmental impact assessment required for new {sector} facilities',
      'Pollution penalty: €{val}M fine for {sector} operations in {region}',
    ],
  };

  return Array.from({ length: count }, () => {
    const eventType = pick(types);
    const classification = pick(classifications);
    const sector = pick(SECTORS);
    const region = pick(REGIONS);
    const template = pick(templates[eventType]);
    const description = template
      .replace(/{region}/g, region)
      .replace(/{sector}/g, sector)
      .replace(/{val}/g, String(rng(5, 200)))
      .replace(/{pct}/g, String(rng(5, 35)));

    const impactMap: Record<string, ThreatLevel> = {
      NOTICE: 'low',
      WARNING: 'medium',
      CRITICAL: 'high',
      CLASSIFIED: 'critical',
    };

    return {
      id: uid(),
      agency: pick(GOV_AGENCIES),
      eventType,
      classification,
      affectedSectors: [sector, ...(Math.random() > 0.6 ? [pick(SECTORS)] : [])],
      region,
      description,
      effectiveDate: future(rng(24, 2160)),
      playerImpact: impactMap[classification],
      timestamp: ago(rng(10, 1440)),
    };
  });
}

function generateTargets(count: number): TargetOpportunity[] {
  const types: TargetOpportunity['opportunityType'][] = [
    'acquisition', 'merger', 'hostile_takeover', 'partnership', 'franchise', 'distressed_sale',
  ];

  const namePatterns = [
    '{region} {sector} Holdings', '{region}Corp {sector}', 'New {region} {sector} Ltd',
    '{sector} Solutions {region}', 'Global {sector} Partners', '{region} Prime {sector}',
    'First {sector} Group', '{region} {sector} Network', 'United {sector} Corp',
  ];

  return Array.from({ length: count }, () => {
    const sector = pick(SECTORS);
    const region = pick(REGIONS);
    const type = pick(types);
    const name = pick(namePatterns).replace('{region}', region.split(' ')[0]).replace('{sector}', sector.charAt(0).toUpperCase() + sector.slice(1));
    const val = rng(2, 800);

    const descriptions: Record<string, string[]> = {
      acquisition: [
        `Strong ${sector} footprint in ${region}. Clean books, minimal debt.`,
        `Undervalued by ${rng(15, 40)}%. Board receptive to offers above €${val}M.`,
      ],
      merger: [
        `Complementary ${sector} operations. Synergy savings est. €${rng(5, 50)}M/yr.`,
        `Equal-terms merger proposal — combined entity dominates ${region} ${sector}.`,
      ],
      hostile_takeover: [
        `Weak board, dispersed shareholders. ${rng(20, 45)}% stake acquirable on open market.`,
        `Management in disarray after CEO departure. Shareholder rebellion imminent.`,
      ],
      partnership: [
        `Strategic partnership: access to ${region} distribution for ${sector} products.`,
        `Technology licensing deal — their IP, your scale. Revenue share model.`,
      ],
      franchise: [
        `Franchise rights available in ${region}. Proven ${sector} model, low capex.`,
        `Master franchise for ${region} — exclusive territory, guaranteed margins.`,
      ],
      distressed_sale: [
        `Bankruptcy filing imminent. Assets valued at ${rng(20, 60)}% below market.`,
        `Creditor-forced liquidation. ${sector} assets in ${region} at fire-sale prices.`,
      ],
    };

    return {
      id: uid(),
      targetName: name,
      sector,
      region,
      opportunityType: type,
      valuation: `€${val}M`,
      strategicValue: rng(30, 100),
      sellerWillingness: type === 'hostile_takeover' ? rng(5, 30) : rng(40, 95),
      expiresIn: `${rng(2, 72)}h`,
      description: pick(descriptions[type]),
      timestamp: ago(rng(5, 360)),
    };
  });
}

function generateCyber(count: number): CyberThreatEvent[] {
  const types: CyberThreatEvent['threatType'][] = [
    'ddos', 'phishing', 'ransomware', 'data_breach', 'espionage', 'insider_threat', 'supply_chain_attack',
  ];
  const statuses: CyberThreatEvent['status'][] = ['detected', 'mitigated', 'active', 'investigating'];
  const targets = [
    'Trading Floor Systems', 'HR Database', 'Supply Chain Platform', 'Finance Portal',
    'Executive Email Server', 'R&D File Server', 'Customer Database', 'Route Management System',
    'Payment Gateway', 'Employee VPN', 'Cloud Infrastructure', 'Board Communications',
  ];

  const templates: Record<string, string[]> = {
    ddos: ['Volumetric attack on {target} — {val}Gbps sustained', 'Application-layer flood targeting {target}'],
    phishing: ['Spear-phishing campaign targeting C-suite via {target}', 'Credential harvesting attempt on {target} login portal'],
    ransomware: ['{source} deploying ransomware payload against {target}', 'Encryption detected on {target} — ransom demand: {val} BTC'],
    data_breach: ['{val}K records exfiltrated from {target}', 'Unauthorized access to {target} — data integrity compromised'],
    espionage: ['{source} conducting persistent surveillance on {target}', 'State-sponsored intelligence gathering via {target} backdoor'],
    insider_threat: ['Anomalous data access pattern detected on {target}', 'Employee accessing {target} outside normal hours — {val} files copied'],
    supply_chain_attack: ['Compromised dependency in {target} supply chain', 'Malicious update pushed to {target} third-party vendor'],
  };

  return Array.from({ length: count }, () => {
    const type = pick(types);
    const source = pick(CYBER_SOURCES);
    const target = pick(targets);
    const status = pick(statuses);
    const template = pick(templates[type]);
    const description = template
      .replace('{target}', target)
      .replace('{source}', source)
      .replace('{val}', String(rng(10, 500)));

    const severityMap: Record<string, ThreatLevel> = {
      ddos: 'medium', phishing: 'medium', ransomware: 'critical',
      data_breach: 'high', espionage: 'critical', insider_threat: 'high',
      supply_chain_attack: 'high',
    };

    return {
      id: uid(),
      threatType: type,
      source,
      target,
      severity: severityMap[type] || 'medium',
      status,
      description,
      timestamp: ago(rng(1, 240)),
    };
  });
}

function generateShadow(count: number): ShadowEvent[] {
  const types: ShadowEvent['operationType'][] = [
    'smuggling', 'black_market', 'money_laundering', 'insider_trading',
    'cartel_activity', 'arms_deal', 'crypto_wash',
  ];

  const templates: Record<string, string[]> = {
    smuggling: [
      'Unregistered cargo detected on {region} route — {commodity} suspected',
      'Customs evasion network operating across {region} ports',
    ],
    black_market: [
      'Counterfeit {commodity} flooding {region} markets',
      'Unlicensed {commodity} distribution network in {region}',
    ],
    money_laundering: [
      'Shell company network processing €{val}M through {region} banks',
      'Real estate wash cycle detected in {region} — {val} properties flagged',
    ],
    insider_trading: [
      'Suspicious trading patterns before {region} merger announcement',
      'Dark pool activity spike — {commodity} options before earnings',
    ],
    cartel_activity: [
      'Price-fixing agreement detected among {region} {commodity} suppliers',
      'Cartel controlling {commodity} supply chain in {region}',
    ],
    arms_deal: [
      'Unauthorized defense equipment transit through {region}',
      'Dual-use technology export violation detected — {region} destination',
    ],
    crypto_wash: [
      'Mixer service processing €{val}M from {region} sanctioned wallets',
      'NFT-based money laundering scheme in {region} — {val} wallets flagged',
    ],
  };

  return Array.from({ length: count }, () => {
    const type = pick(types);
    const region = pick(REGIONS);
    const commodity = pick(COMMODITIES);
    const val = rng(5, 500);
    const template = pick(templates[type]);
    const description = template
      .replace(/{region}/g, region)
      .replace(/{commodity}/g, commodity)
      .replace(/{val}/g, String(val));

    const riskMap: Record<string, ThreatLevel> = {
      smuggling: 'medium', black_market: 'medium', money_laundering: 'high',
      insider_trading: 'high', cartel_activity: 'critical', arms_deal: 'critical',
      crypto_wash: 'medium',
    };

    return {
      id: uid(),
      operationType: type,
      region,
      actors: pick(SHADOW_ACTORS),
      confidence: rng(25, 98),
      profitPotential: `€${rng(1, 200)}M`,
      riskLevel: riskMap[type] || 'medium',
      description,
      timestamp: ago(rng(5, 600)),
    };
  });
}

// ── Store ──────────────────────────────────────────────────────

export const useWorldIntelStore = create<WorldIntelState>()((set, _get) => ({
  shipments: [],
  competition: [],
  government: [],
  targets: [],
  cyber: [],
  shadow: [],

  activeCategory: 'shipments',
  feedOpen: false,
  unreadCounts: { shipments: 0, competition: 0, government: 0, targets: 0, cyber: 0, shadow: 0 },

  setCategory: (cat) => set({ activeCategory: cat }),

  toggleFeed: () => set(s => ({ feedOpen: !s.feedOpen })),

  markRead: (category) => set(s => ({
    unreadCounts: { ...s.unreadCounts, [category]: 0 },
  })),

  refreshAll: () => {
    const newShipments = generateShipments(rng(8, 18));
    const newCompetition = generateCompetition(rng(6, 14));
    const newGovernment = generateGovernment(rng(5, 10));
    const newTargets = generateTargets(rng(4, 10));
    const newCyber = generateCyber(rng(4, 10));
    const newShadow = generateShadow(rng(4, 8));

    set(_s => ({
      shipments: newShipments,
      competition: newCompetition,
      government: newGovernment,
      targets: newTargets,
      cyber: newCyber,
      shadow: newShadow,
      unreadCounts: {
        shipments: newShipments.length,
        competition: newCompetition.length,
        government: newGovernment.length,
        targets: newTargets.length,
        cyber: newCyber.length,
        shadow: newShadow.length,
      },
    }));
  },
}));
