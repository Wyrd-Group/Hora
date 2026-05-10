import { EmpireNode, EmployeeCard, DeptProject, CrimeOperation, TradeRoute, TickerEvent, TradeCorridor, RDProject } from '../store/empireStore';

import { PROCEDURAL_NODES } from './infrastructureData';
import { EXPANDED_NODES_WAVE0 } from './expandedNodes';

// ── Trade Corridors ──────────────────────────────────────────────────────────
export const TRADE_CORRIDORS: TradeCorridor[] = [
  { id: 'atlantic',   name: 'Atlantic Corridor',       from: 'Western Europe', to: 'East Coast USA',     fromLat: 48.8, fromLon: -3.5,   toLat: 40.7, toLon: -74.0,  distance: 5800, risk: 'low',    availableTypes: ['sea', 'air'] },
  { id: 'pacific',    name: 'Trans-Pacific Route',     from: 'East Asia',      to: 'West Coast USA',     fromLat: 35.7, fromLon: 139.7,  toLat: 34.1, toLon: -118.2, distance: 8800, risk: 'medium', availableTypes: ['sea', 'air'] },
  { id: 'silk-road',  name: 'New Silk Road',           from: 'Western Europe', to: 'East Asia',          fromLat: 48.2, fromLon: 16.4,   toLat: 39.9, toLon: 116.4,  distance: 8100, risk: 'medium', availableTypes: ['rail', 'air', 'truck'] },
  { id: 'suez',       name: 'Suez Canal Express',      from: 'Mediterranean',  to: 'Persian Gulf',       fromLat: 37.9, fromLon: 23.7,   toLat: 25.3, toLon: 55.3,   distance: 4500, risk: 'high',   availableTypes: ['sea'] },
  { id: 'euro-link',  name: 'European Motorway',       from: 'Western Europe', to: 'Eastern Europe',     fromLat: 48.9, fromLon: 2.35,   toLat: 52.2, toLon: 21.0,   distance: 1400, risk: 'low',    availableTypes: ['rail', 'truck'] },
  { id: 'north-sea',  name: 'North Sea Shipping Lane', from: 'Scandinavia',    to: 'United Kingdom',     fromLat: 59.3, fromLon: 18.1,   toLat: 51.5, toLon: -0.12,  distance: 1200, risk: 'low',    availableTypes: ['sea', 'air'] },
  { id: 'cape',       name: 'Cape of Good Hope',       from: 'Western Europe', to: 'Sub-Saharan Africa', fromLat: 38.7, fromLon: -9.14,  toLat: -33.9, toLon: 18.4,  distance: 9600, risk: 'high',   availableTypes: ['sea'] },
  { id: 'pan-am',     name: 'Pan-American Highway',    from: 'North America',  to: 'South America',      fromLat: 29.8, fromLon: -95.4,  toLat: -23.5, toLon: -46.6, distance: 7600, risk: 'medium', availableTypes: ['truck', 'air'] },
  { id: 'india-link', name: 'India Subcontinent Link', from: 'Persian Gulf',   to: 'South Asia',         fromLat: 25.3, fromLon: 55.3,   toLat: 19.1, toLon: 72.9,   distance: 2200, risk: 'medium', availableTypes: ['sea', 'air'] },
  { id: 'arctic',     name: 'Arctic Northern Passage', from: 'Scandinavia',    to: 'East Asia',          fromLat: 71.0, fromLon: 25.0,   toLat: 43.1, toLon: 131.9,  distance: 7500, risk: 'high',   availableTypes: ['sea'] },
  { id: 'malacca',       name: 'Malacca Strait',           from: 'SE Asia',         to: 'East Asia',          fromLat: 1.3,  fromLon: 103.8,  toLat: 35.7,  toLon: 139.7,  distance: 4700, risk: 'high',   availableTypes: ['sea'] },
  { id: 'trans-siberian', name: 'Trans-Siberian Rail',     from: 'Eastern Europe',  to: 'East Asia',          fromLat: 55.8, fromLon: 37.6,   toLat: 43.1,  toLon: 131.9,  distance: 9300, risk: 'medium', availableTypes: ['rail'] },
  { id: 'mediterranean', name: 'Mediterranean Circuit',    from: 'Western Europe',  to: 'North Africa',       fromLat: 41.4, fromLon: 2.2,    toLat: 36.8,  toLon: 10.2,   distance: 1800, risk: 'medium', availableTypes: ['sea', 'air'] },
  { id: 'east-africa',   name: 'East Africa Corridor',     from: 'Sub-Saharan Africa', to: 'Persian Gulf',    fromLat: -1.3, fromLon: 36.8,   toLat: 25.3,  toLon: 55.3,   distance: 4200, risk: 'high',   availableTypes: ['sea', 'air'] },
  { id: 'caribbean',     name: 'Caribbean Basin',          from: 'North America',   to: 'South America',      fromLat: 25.8, fromLon: -80.2,  toLat: 10.5,  toLon: -66.9,  distance: 2400, risk: 'medium', availableTypes: ['sea', 'air'] },
  { id: 'bering',        name: 'Bering Strait Passage',    from: 'East Asia',       to: 'West Coast USA',     fromLat: 43.1, fromLon: 131.9,  toLat: 47.6,  toLon: -122.3, distance: 7200, risk: 'high',   availableTypes: ['sea'] },
  { id: 'saharan',       name: 'Trans-Saharan Route',      from: 'North Africa',    to: 'Sub-Saharan Africa', fromLat: 36.8, fromLon: 3.1,    toLat: 6.5,   toLon: 3.4,    distance: 2800, risk: 'high',   availableTypes: ['truck'] },
  { id: 'black-sea',     name: 'Black Sea Transit',        from: 'Eastern Europe',  to: 'Mediterranean',      fromLat: 41.0, fromLon: 29.0,   toLat: 37.9,  toLon: 23.7,   distance: 800,  risk: 'medium', availableTypes: ['sea'] },
];

// ── R&D Projects ─────────────────────────────────────────────────────────────
// R&D durations are in game-ticks (1 tick = 1 game minute, 1 real second = 1 tick).
// Realistic IRL timelines: 1 game month ≈ 43,200 ticks (≈12h real).
// Small projects: 2-4 months. Medium: 6-12 months. Large: 1-3 years. Mega: 3-5+ years.
export const INITIAL_RD_PROJECTS: RDProject[] = [
  // Production
  { id: 'rd-prod-1',  name: 'Automated Assembly Lines',     category: 'production', cost: 120_000, duration: 518_400,   progress: 0, status: 'available', effect: '+25% manufacturing income',      description: 'Robotics-driven assembly reducing labor costs and increasing output per facility.' },             // 12 months
  { id: 'rd-prod-2',  name: 'Lean Operations Framework',    category: 'production', cost: 60_000,  duration: 129_600,   progress: 0, status: 'available', effect: '-15% OPEX across all nodes',     description: 'Six Sigma methodology applied to all owned infrastructure reducing waste.' },                     // 3 months
  { id: 'rd-prod-3',  name: 'Supply Chain AI',              category: 'production', cost: 200_000, duration: 788_400,   progress: 0, status: 'available', effect: '+30% route capacity',            description: 'Machine learning optimization of inventory, demand forecasting, and logistics.' },                // 18 months
  // Transport
  { id: 'rd-trans-1', name: 'Fleet Modernization',          category: 'transport',  cost: 150_000, duration: 345_600,   progress: 0, status: 'available', effect: '+2 Speed on all routes',         description: 'Upgrade transport fleet with newer, faster vehicles and vessels.' },                               // 8 months
  { id: 'rd-trans-2', name: 'Autonomous Freight System',    category: 'transport',  cost: 350_000, duration: 1_576_800, progress: 0, status: 'available', effect: '-30% route OPEX',                description: 'Self-driving trucks and autonomous cargo ships for unmanned delivery.' },                         // 3 years
  { id: 'rd-trans-3', name: 'Containerization 2.0',         category: 'transport',  cost: 80_000,  duration: 86_400,    progress: 0, status: 'available', effect: '+40% sea route capacity',        description: 'Next-gen modular containers that stack more efficiently.' },                                      // 2 months
  // Market
  { id: 'rd-mkt-1',   name: 'Predictive Analytics Engine',  category: 'market',     cost: 100_000, duration: 259_200,   progress: 0, status: 'available', effect: '+15% trading income',            description: 'Big data analysis of market trends for better trading decisions.' },                              // 6 months
  { id: 'rd-mkt-2',   name: 'Customer Intelligence Suite',  category: 'market',     cost: 75_000,  duration: 172_800,   progress: 0, status: 'available', effect: '+10 Growth axis',                description: 'Deep customer analytics for targeted market expansion.' },                                        // 4 months
  // Security
  { id: 'rd-sec-1',   name: 'Cyber Defense Grid',           category: 'security',   cost: 90_000,  duration: 302_400,   progress: 0, status: 'available', effect: '+3 Security on all routes',      description: 'Advanced intrusion detection and encrypted communications network.' },                            // 7 months
  { id: 'rd-sec-2',   name: 'Anti-Piracy Protocol',         category: 'security',   cost: 130_000, duration: 432_000,   progress: 0, status: 'available', effect: '-20% route risk',                description: 'Armed escort and satellite tracking for high-risk trade corridors.' },                            // 10 months
  // Green
  { id: 'rd-green-1', name: 'Carbon Neutral Fleet',         category: 'green',      cost: 180_000, duration: 1_051_200, progress: 0, status: 'available', effect: '+15 Impact axis',                description: 'Electric and hydrogen-powered transport fleet conversion.' },                                     // 2 years
  { id: 'rd-green-2', name: 'Circular Economy Model',       category: 'green',      cost: 95_000,  duration: 345_600,   progress: 0, status: 'available', effect: '+10 Impact, -10% OPEX',          description: 'Waste reduction and recycling integration across all production facilities.' },                    // 8 months
  { id: 'rd-prod-4',  name: '3D Printing Manufacturing',   category: 'production', cost: 160_000, duration: 648_000,   progress: 0, status: 'available', effect: '+20% custom goods income',       description: 'Additive manufacturing for on-demand production of specialized components.' },                    // 15 months
  { id: 'rd-prod-5',  name: 'Digital Twin Simulation',     category: 'production', cost: 250_000, duration: 1_051_200, progress: 0, status: 'available', effect: '+35% quality control',           description: 'Virtual replicas of physical assets for real-time monitoring and optimization.' },                // 2 years
  { id: 'rd-trans-4', name: 'Drone Delivery Network',      category: 'transport',  cost: 200_000, duration: 788_400,   progress: 0, status: 'available', effect: '+3 Speed on air routes',         description: 'Autonomous aerial delivery drones for last-mile and short-haul logistics.' },                     // 18 months
  { id: 'rd-trans-5', name: 'Hyperloop Freight System',    category: 'transport',  cost: 500_000, duration: 2_628_000, progress: 0, status: 'available', effect: '-50% land route time',           description: 'Vacuum-tube high-speed freight transport for continental corridors.' },                           // 5 years
  { id: 'rd-mkt-3',   name: 'Sentiment Analysis AI',      category: 'market',     cost: 130_000, duration: 388_800,   progress: 0, status: 'available', effect: '+20% trading accuracy',          description: 'NLP-driven social media and news sentiment scoring for market prediction.' },                     // 9 months
  { id: 'rd-mkt-4',   name: 'Dynamic Pricing Engine',     category: 'market',     cost: 90_000,  duration: 216_000,   progress: 0, status: 'available', effect: '+25% retail margins',            description: 'Real-time price adjustment algorithms maximizing revenue per transaction.' },                     // 5 months
  { id: 'rd-sec-3',   name: 'Quantum Encryption Shield',  category: 'security',   cost: 300_000, duration: 1_576_800, progress: 0, status: 'available', effect: '-40% cyber attack risk',         description: 'Post-quantum cryptographic protocols securing all data transmissions.' },                         // 3 years
  { id: 'rd-sec-4',   name: 'Biometric Access Control',   category: 'security',   cost: 70_000,  duration: 86_400,    progress: 0, status: 'available', effect: '+5 Security on all facilities',  description: 'Multi-factor biometric authentication for physical and digital access points.' },                // 2 months
  { id: 'rd-green-3', name: 'Solar Array Integration',    category: 'green',      cost: 140_000, duration: 518_400,   progress: 0, status: 'available', effect: '-20% energy costs +8 Impact',    description: 'Distributed solar panel networks powering operational infrastructure.' },                         // 12 months
  { id: 'rd-green-4', name: 'Water Recycling System',     category: 'green',      cost: 110_000, duration: 345_600,   progress: 0, status: 'available', effect: '+12 Impact -8% OPEX',           description: 'Closed-loop water treatment and recycling for industrial facilities.' },                          // 8 months
  { id: 'rd-green-5', name: 'Carbon Credit Trading',      category: 'green',      cost: 85_000,  duration: 172_800,   progress: 0, status: 'available', effect: '+€5k/tick passive income +6 Impact', description: 'Verified carbon offset marketplace generating passive revenue streams.' },                    // 4 months
  { id: 'rd-mkt-5',   name: 'Blockchain Supply Audit',    category: 'market',     cost: 175_000, duration: 648_000,   progress: 0, status: 'available', effect: '+10 Governance +15% transparency', description: 'Immutable supply chain ledger for end-to-end provenance verification.' },                      // 15 months
  // ESG Infrastructure Projects
  { id: 'rd-green-6', name: 'Solar Farm Network',           category: 'green',      cost: 200_000, duration: 518_400,   progress: 0, status: 'available', effect: '+15% energy node income +10 Impact', description: 'Distributed solar generation plants powering owned infrastructure and selling surplus to grid.' },  // 12 months
  { id: 'rd-green-7', name: 'Carbon Capture Hub',           category: 'green',      cost: 350_000, duration: 1_576_800, progress: 0, status: 'available', effect: '-20% regulatory heat +15 Impact',    description: 'Industrial-scale direct air capture facility sequestering CO2 and generating carbon credits.' },   // 3 years
  { id: 'rd-green-8', name: 'EV Charging Grid',             category: 'green',      cost: 150_000, duration: 302_400,   progress: 0, status: 'available', effect: '+10% transport income +8 Impact',    description: 'Network of fast-charging stations along major land corridors reducing fleet fuel costs.' },        // 7 months
  { id: 'rd-green-9', name: 'Ocean Cleanup Fleet',          category: 'green',      cost: 500_000, duration: 2_102_400, progress: 0, status: 'available', effect: 'Unlock green shipping contracts +20 Impact', description: 'Autonomous ocean cleanup vessels clearing plastic waste from major shipping lanes.' },       // 4 years
  { id: 'rd-green-10', name: 'Sustainable Data Centers',    category: 'green',      cost: 400_000, duration: 1_051_200, progress: 0, status: 'available', effect: '+20% tech node income -15% energy costs', description: 'Liquid-cooled, renewable-powered data centers with zero carbon footprint.' },                 // 2 years
];

// ── Nodes ─────────────────────────────────────────────────────────────────────
export const INITIAL_NODES: EmpireNode[] = [...PROCEDURAL_NODES, ...EXPANDED_NODES_WAVE0];

// ── Routes ────────────────────────────────────────────────────────────────────
export const INITIAL_ROUTES: TradeRoute[] = [
  { id:"r1", fromNodeId:"4",  toNodeId:"12", type:"sea",   active:true, corridorId:"atlantic",  level:2, acquisition:"bought",        monthlyRevenue:30_000,  capacity:600,  speed:4,  security:6, upgrades:[] },
  { id:"r2", fromNodeId:"1",  toNodeId:"2",  type:"rail",  active:true, corridorId:"euro-link", level:1, acquisition:"built",         monthlyRevenue:20_000,  capacity:300,  speed:6,  security:5, upgrades:[] },
  { id:"r3", fromNodeId:"5",  toNodeId:"12", type:"air",   active:true, corridorId:"atlantic",  level:1, acquisition:"built",         monthlyRevenue:35_000,  capacity:100,  speed:9,  security:7, upgrades:[] },
  { id:"r4", fromNodeId:"3",  toNodeId:"1",  type:"truck", active:true, corridorId:"euro-link", level:1, acquisition:"subcontracted", monthlyRevenue:8_000,   capacity:150,  speed:7,  security:4, upgrades:[] },
  { id:"r5", fromNodeId:"36", toNodeId:"4",  type:"sea",   active:true, corridorId:"north-sea", level:3, acquisition:"bought",        monthlyRevenue:40_000,  capacity:800,  speed:5,  security:6, upgrades:[{id:'u1',name:'Reinforced Hull',applied:true}] },
  { id:"r6", fromNodeId:"38", toNodeId:"2",  type:"air",   active:true, corridorId:"silk-road", level:1, acquisition:"built",         monthlyRevenue:35_000,  capacity:120,  speed:9,  security:5, upgrades:[] },
];

// ── Projects ──────────────────────────────────────────────────────────────────
export const INITIAL_PROJECTS: DeptProject[] = [
  // HR
  { id:"hr1", dept:"HR", name:"Recruitment Drive",        cost:15000,  focusSessions:2, successRate:85, effect:"+3 Growth",                          active:false },
  { id:"hr2", dept:"HR", name:"Employee Training",        cost:8000,   focusSessions:1, successRate:92, effect:"+10% dept efficiency",               active:false },
  { id:"hr3", dept:"HR", name:"Executive Search",         cost:45000,  focusSessions:3, successRate:72, effect:"+8 Growth, +3 Governance",            active:false },
  { id:"hr4", dept:"HR", name:"Diversity Programme",      cost:22000,  focusSessions:2, successRate:80, effect:"+6 Impact, +4 Governance",            active:false },
  // Trading
  { id:"tf1", dept:"Trading", name:"Algorithm Backtest",  cost:25000,  focusSessions:3, successRate:70, effect:"+15% trading income",                active:false },
  { id:"tf2", dept:"Trading", name:"Market Analysis",     cost:12000,  focusSessions:1, successRate:88, effect:"+5 Growth",                          active:false },
  { id:"tf3", dept:"Trading", name:"HFT Infrastructure",  cost:80000,  focusSessions:5, successRate:55, effect:"+40% trading income",                active:false },
  { id:"tf4", dept:"Trading", name:"Dark Pool Access",    cost:35000,  focusSessions:2, successRate:65, effect:"+20% trading income",                active:false },
  // Marketing
  { id:"mk1", dept:"Marketing", name:"Brand Campaign",    cost:35000,  focusSessions:2, successRate:78, effect:"+20% regional sentiment",            active:false },
  { id:"mk2", dept:"Marketing", name:"Influencer Deal",   cost:18000,  focusSessions:1, successRate:82, effect:"+500 followers",                     active:false },
  { id:"mk3", dept:"Marketing", name:"ESG Rebranding",    cost:55000,  focusSessions:3, successRate:68, effect:"+12 Impact, +6 Governance",          active:false },
  { id:"mk4", dept:"Marketing", name:"IPO Roadshow Prep", cost:70000,  focusSessions:4, successRate:60, effect:"+8 Power axis, +1000 followers",     active:false },
  // R&D
  { id:"rd1", dept:"R&D", name:"Product Innovation",      cost:50000,  focusSessions:4, successRate:55, effect:"+25% throughput, +5 Growth",         active:false },
  { id:"rd2", dept:"R&D", name:"Patent Filing",           cost:20000,  focusSessions:2, successRate:65, effect:"+4 Growth",                          active:false },
  { id:"rd3", dept:"R&D", name:"Biotech License",         cost:120000, focusSessions:6, successRate:42, effect:"+50% pharma income, +6 Growth",      active:false },
  { id:"rd4", dept:"R&D", name:"Quantum Computing Pilot", cost:200000, focusSessions:8, successRate:35, effect:"+80% tech income, +10 Growth",       active:false },
  // Finance
  { id:"fn1", dept:"Finance", name:"Tax Optimisation",    cost:30000,  focusSessions:2, successRate:75, effect:"-3% effective tax rate",             active:false },
  { id:"fn2", dept:"Finance", name:"IPO Readiness",       cost:100000, focusSessions:5, successRate:45, effect:"+5 Governance",                      active:false },
  { id:"fn3", dept:"Finance", name:"Quarterly Audit",     cost:10000,  focusSessions:1, successRate:95, effect:"+5 Governance",                      active:false },
  { id:"fn4", dept:"Finance", name:"Transfer Pricing",    cost:65000,  focusSessions:3, successRate:70, effect:"-5% effective tax rate",             active:false },
  { id:"fn5", dept:"Finance", name:"Bond Issuance",       cost:200000, focusSessions:5, successRate:50, effect:"+10 Governance",                     active:false },
  // Legal
  { id:"lg1", dept:"Legal", name:"Compliance Review",     cost:15000,  focusSessions:1, successRate:90, effect:"-15% crime detection",              active:false },
  { id:"lg2", dept:"Legal", name:"Government Relations",  cost:40000,  focusSessions:3, successRate:60, effect:"+8 Power axis",                     active:false },
  { id:"lg3", dept:"Legal", name:"Lobbying Campaign",     cost:75000,  focusSessions:4, successRate:58, effect:"+12 Power axis",                    active:false },
  { id:"lg4", dept:"Legal", name:"Regulatory Sandbox",    cost:30000,  focusSessions:2, successRate:78, effect:"-20% crime detection",              active:false },
  // HR (continued)
  { id:"hr5", dept:"HR", name:"Talent Retention Program",   cost:28000,  focusSessions:2, successRate:82, effect:"+4 Growth -10% turnover",            active:false },
  { id:"hr6", dept:"HR", name:"Leadership Academy",         cost:55000,  focusSessions:4, successRate:65, effect:"+10 Growth +5 Governance",           active:false },
  { id:"hr7", dept:"HR", name:"Remote Workforce Initiative", cost:18000, focusSessions:1, successRate:90, effect:"-8% OPEX",                           active:false },
  // Trading (continued)
  { id:"tf5", dept:"Trading", name:"Sentiment Trading Bot",    cost:45000,  focusSessions:3, successRate:62, effect:"+25% crypto income",              active:false },
  { id:"tf6", dept:"Trading", name:"Options Wheel Strategy",   cost:20000,  focusSessions:2, successRate:78, effect:"+12% options premium income",     active:false },
  { id:"tf7", dept:"Trading", name:"Cross-Exchange Arbitrage", cost:65000,  focusSessions:4, successRate:58, effect:"+30% arbitrage income",           active:false },
  // Marketing (continued)
  { id:"mk5", dept:"Marketing", name:"Podcast Launch",           cost:12000,  focusSessions:1, successRate:88, effect:"+300 followers +3 Growth",      active:false },
  { id:"mk6", dept:"Marketing", name:"Conference Sponsorship",   cost:40000,  focusSessions:3, successRate:72, effect:"+6 Power +500 followers",       active:false },
  { id:"mk7", dept:"Marketing", name:"Viral Content Campaign",   cost:25000,  focusSessions:2, successRate:70, effect:"+1000 followers +5 Growth",     active:false },
  // R&D (continued)
  { id:"rd5", dept:"R&D", name:"AI Model Training",          cost:150000, focusSessions:6, successRate:48, effect:"+60% tech income +8 Growth",       active:false },
  { id:"rd6", dept:"R&D", name:"Materials Science Lab",      cost:80000,  focusSessions:4, successRate:55, effect:"+20% manufacturing quality",       active:false },
  // Finance (continued)
  { id:"fn6", dept:"Finance", name:"Crypto Treasury Strategy",    cost:50000,  focusSessions:3, successRate:60, effect:"+8% portfolio yield",          active:false },
  { id:"fn7", dept:"Finance", name:"Revenue Diversification",     cost:35000,  focusSessions:2, successRate:75, effect:"+15% passive income streams",  active:false },
  { id:"fn8", dept:"Finance", name:"Forensic Accounting Unit",    cost:25000,  focusSessions:2, successRate:85, effect:"-30% fraud exposure",          active:false },
  // Legal (continued)
  { id:"lg5", dept:"Legal", name:"International IP Filing",     cost:55000,  focusSessions:3, successRate:65, effect:"+6 Governance +IP protection",   active:false },
  { id:"lg6", dept:"Legal", name:"Whistleblower Defense",       cost:35000,  focusSessions:2, successRate:70, effect:"-25% crime detection +4 Power",  active:false },
];

// ── Employee cards ────────────────────────────────────────────────────────────
export const INITIAL_CARDS: EmployeeCard[] = [
  { id:"c1",  name:"Elena Voss",          role:"Supply Chain Manager",      tier:"Gold",    multiplier:1.28, stat:"+35% logistics throughput" },
  { id:"c2",  name:"James Chen",          role:"Quantitative Analyst",      tier:"Diamond", multiplier:1.52, stat:"+55% trading algorithm yield" },
  { id:"c3",  name:"Amara Osei",          role:"Security Specialist",       tier:"Silver",  multiplier:1.10, stat:"-20% crime detection rate" },
  { id:"c4",  name:"Sofia Reyes",         role:"Energy Trader",             tier:"Gold",    multiplier:1.25, stat:"+25% oil_gas income" },
  { id:"c5",  name:"Dmitri Petrov",       role:"Risk Analyst",              tier:"Silver",  multiplier:1.12, stat:"-15% audit detection" },
  { id:"c6",  name:"Ingrid Larsson",      role:"Venture Partner",           tier:"Bronze",  multiplier:1.03, stat:"+20% tech income" },
  { id:"c7",  name:"Omar Hassan",         role:"Government Liaison",        tier:"Gold",    multiplier:1.30, stat:"+8 Power axis" },
  { id:"c8",  name:"Priya Sharma",        role:"Biotech Director",          tier:"Silver",  multiplier:1.15, stat:"+30% pharma income" },
  { id:"c9",  name:"Lucas Ferreira",      role:"Head of Growth",            tier:"Bronze",  multiplier:1.04, stat:"+5 Growth per tick" },
  { id:"c10", name:"Yuki Tanaka",         role:"Grid Engineer",             tier:"Silver",  multiplier:1.13, stat:"+25% energy throughput" },
  { id:"c11", name:"Fatima Al-Rashid",    role:"Chief Compliance Officer",  tier:"Gold",    multiplier:1.22, stat:"-25% tax rate exposure" },
  { id:"c12", name:"Marcus Webb",         role:"ESG Director",              tier:"Bronze",  multiplier:1.02, stat:"+6 Impact per completed project" },
  { id:"c13", name:"Anika Johansson",    role:"Blockchain Architect",      tier:"Diamond", multiplier:1.45, stat:"+45% crypto infrastructure yield" },
  { id:"c14", name:"Rafael Mendez",      role:"Commodities Trader",        tier:"Gold",    multiplier:1.25, stat:"+30% oil_gas income" },
  { id:"c15", name:"Wei Zhang",          role:"AI Research Lead",          tier:"Diamond", multiplier:1.55, stat:"+50% tech R&D efficiency" },
  { id:"c16", name:"Isla McKenzie",      role:"Corporate Lawyer",          tier:"Silver",  multiplier:1.12, stat:"-18% legal penalties" },
  { id:"c17", name:"Kofi Asante",        role:"Logistics Director",        tier:"Gold",    multiplier:1.28, stat:"+30% route capacity" },
  { id:"c18", name:"Natalia Volkov",     role:"Cyber Ops Specialist",      tier:"Silver",  multiplier:1.14, stat:"-22% cyber attack risk" },
  { id:"c19", name:"Henrik Andersen",    role:"Portfolio Manager",         tier:"Gold",    multiplier:1.32, stat:"+35% fund returns" },
  { id:"c20", name:"Mei Lin",            role:"Tax Strategist",            tier:"Bronze",  multiplier:1.05, stat:"-8% effective tax rate" },
  { id:"c21", name:"Carlos Gutierrez",   role:"Construction Manager",      tier:"Silver",  multiplier:1.10, stat:"-20% building costs" },
  { id:"c22", name:"Zara Al-Farsi",      role:"Diplomat",                  tier:"Gold",    multiplier:1.30, stat:"+10 Power axis +5 Governance" },
  { id:"c23", name:"Viktor Kozlov",      role:"Intelligence Officer",      tier:"Diamond", multiplier:1.48, stat:"-35% all detection rates" },
  { id:"c24", name:"Amelia Thornton",    role:"ESG Compliance Director",   tier:"Bronze",  multiplier:1.04, stat:"+8 Impact +4 Governance" },
  { id:"c25", name:"Kenji Yamamoto",     role:"High-Frequency Trader",     tier:"Icon",    multiplier:1.75, stat:"+70% HFT algorithm yield" },
  { id:"c26", name:"Isabelle Moreau",    role:"Venture Scout",             tier:"Icon",    multiplier:1.80, stat:"+80% VC fund returns" },
];

// ── Crimes ────────────────────────────────────────────────────────────────────
export const INITIAL_CRIMES: CrimeOperation[] = [
  { id:"cr1", name:"Tax Evasion",       detectionPct:15, penaltyMultiplier:"2x",   axisHit:"Gov -15",              heatGain:12 },
  { id:"cr2", name:"Insider Trading",   detectionPct:8,  penaltyMultiplier:"3x",   axisHit:"Gov -20",              heatGain:18 },
  { id:"cr3", name:"Money Laundering",  detectionPct:3,  penaltyMultiplier:"5x",   axisHit:"Gov -30",              heatGain:25 },
  { id:"cr4", name:"Bribery",           detectionPct:6,  penaltyMultiplier:"2.5x", axisHit:"Gov -10, Power +5",    heatGain:15 },
  { id:"cr5", name:"Accounting Fraud",  detectionPct:12, penaltyMultiplier:"4x",   axisHit:"Gov -25, Impact -10",  heatGain:20 },
  { id:"cr6", name:"Expense Fraud",     detectionPct:20, penaltyMultiplier:"1.5x", axisHit:"Gov -5",               heatGain:8  },
  { id:"cr7",  name:"Embezzlement",       detectionPct:10, penaltyMultiplier:"3.5x", axisHit:"Gov -20, Impact -5",   heatGain:22 },
  { id:"cr8",  name:"Market Manipulation", detectionPct:5,  penaltyMultiplier:"4.5x", axisHit:"Gov -30, Power -10",   heatGain:30 },
  { id:"cr9",  name:"Sanctions Evasion",  detectionPct:4,  penaltyMultiplier:"5x",   axisHit:"Gov -35, Impact -15",  heatGain:35 },
  { id:"cr10", name:"Counterfeiting",     detectionPct:18, penaltyMultiplier:"2x",   axisHit:"Gov -8",               heatGain:10 },
  { id:"cr11", name:"Wire Fraud",         detectionPct:7,  penaltyMultiplier:"4x",   axisHit:"Gov -25",              heatGain:28 },
  { id:"cr12", name:"Racketeering",       detectionPct:3,  penaltyMultiplier:"6x",   axisHit:"Gov -40, Power +10",   heatGain:40 },
  { id:"cr13", name:"Environmental Crime", detectionPct:14, penaltyMultiplier:"3x",   axisHit:"Gov -15, Impact -20",  heatGain:18 },
  { id:"cr14", name:"Cyber Extortion",    detectionPct:6,  penaltyMultiplier:"4.5x", axisHit:"Gov -28",              heatGain:32 },
];

// ── Banks ─────────────────────────────────────────────────────────────────────
export const BANKS = [
  { id:"b1",  name:"Deutsche Finanz",       flag:'🇩🇪', depositRate:0.015, loanRate:0.050, auditMod:1.0, penaltyMod:1.0, minDeposit:0,       maxLoan:500000,   desc:"Standard EU bank. Transparent audit exposure. Reliable but visible.", pros:['SEPA instant transfers','EU deposit guarantee €100K','Lowest penalty multiplier'], cons:['Full audit transparency','No privacy features'], conditions:['No minimum balance','KYC verification required'] },
  { id:"b2",  name:"Banque Suisse",         flag:'🇨🇭', depositRate:0.005, loanRate:0.040, auditMod:0.7, penaltyMod:2.0, minDeposit:50000,   maxLoan:1000000,  desc:"Swiss privacy shield. Lower detection but higher penalty if caught.", pros:['Swiss banking secrecy laws','30% audit reduction','Best loan rate tier'], cons:['2x penalty if caught','€50K minimum deposit'], conditions:['Min deposit €50,000','Swiss residency preferred'] },
  { id:"b3",  name:"Banco Cayman",          flag:'🇰🇾', depositRate:0.000, loanRate:0.060, auditMod:0.4, penaltyMod:3.0, minDeposit:100000,  maxLoan:2000000,  desc:"Offshore minimal disclosure. Near-zero audit exposure, severe penalties.", pros:['60% audit reduction','Zero deposit interest tax','Multi-currency accounts'], cons:['3x penalty multiplier','No deposit returns','€100K minimum'], conditions:['Min deposit €100,000','Offshore entity required'] },
  { id:"b4",  name:"Anglo Commerce",        flag:'🇬🇧', depositRate:0.020, loanRate:0.055, auditMod:1.2, penaltyMod:1.2, minDeposit:0,       maxLoan:750000,   desc:"Aggressive compliance team. Strong deposit rate, slightly elevated audit.", pros:['2.0% deposit rate','High loan ceiling','FCA regulated'], cons:['20% higher audit exposure','Stricter compliance checks'], conditions:['No minimum balance','UK or Commonwealth entity'] },
  { id:"b5",  name:"Nordik Trust",          flag:'🇳🇴', depositRate:0.025, loanRate:0.035, auditMod:0.9, penaltyMod:1.5, minDeposit:25000,   maxLoan:500000,   desc:"ESG-focused Nordic bank. Best deposit rate, slight audit reduction.", pros:['2.5% deposit rate (best)','3.5% loan rate (best)','ESG impact bonus'], cons:['1.5x penalty multiplier','Requires ESG compliance'], conditions:['Min deposit €25,000','ESG score > 30 preferred'] },
  { id:"b6",  name:"Banca Mediterraneo",    flag:'🇮🇹', depositRate:0.010, loanRate:0.048, auditMod:0.8, penaltyMod:1.8, minDeposit:10000,   maxLoan:400000,   desc:"Mediterranean flexibility. Moderate rates, reduced disclosure.", pros:['20% audit reduction','Flexible compliance','Low minimum deposit'], cons:['1.8x penalty multiplier','Limited loan ceiling'], conditions:['Min deposit €10,000','EU entity preferred'] },
  { id:"b7",  name:"Singapore Sovereign",   flag:'🇸🇬', depositRate:0.018, loanRate:0.038, auditMod:0.6, penaltyMod:2.5, minDeposit:75000,   maxLoan:1500000,  desc:"Southeast Asian privacy haven. Excellent loan terms, very low audit exposure.", pros:['40% audit reduction','Low 3.8% loan rate','Access to APAC markets'], cons:['2.5x penalty multiplier','€75K minimum deposit'], conditions:['Min deposit €75,000','APAC operations recommended'] },
  { id:"b8",  name:"Dubai Capital",         flag:'🇦🇪', depositRate:0.008, loanRate:0.042, auditMod:0.5, penaltyMod:2.8, minDeposit:200000,  maxLoan:3000000,  desc:"Emirates zero-tax banking. Near-invisible to Western regulators.", pros:['50% audit reduction','Zero tax jurisdiction','Highest loan ceiling'], cons:['2.8x penalty multiplier','€200K minimum deposit','FATF scrutiny'], conditions:['Min deposit €200,000','Dubai entity required'] },
  { id:"b9",  name:"Hong Kong Interbank",   flag:'🇭🇰', depositRate:0.022, loanRate:0.045, auditMod:0.85, penaltyMod:1.6, minDeposit:30000,  maxLoan:800000,   desc:"Gateway to Chinese capital markets. Balanced audit profile.", pros:['2.2% deposit rate','Access to Chinese markets','Moderate audit reduction'], cons:['1.6x penalty multiplier','Political risk exposure'], conditions:['Min deposit €30,000','HK or mainland entity'] },
  { id:"b10", name:"Nassau Offshore Trust",  flag:'🇧🇸', depositRate:0.002, loanRate:0.065, auditMod:0.3, penaltyMod:3.5, minDeposit:250000, maxLoan:5000000,  desc:"Bahamas shell company paradise. Almost no audit trail.", pros:['70% audit reduction','Maximum loan ceiling €5M','Complete financial privacy'], cons:['3.5x penalty (highest)','6.5% loan rate (highest)','DOJ target'], conditions:['Min deposit €250,000','Shell company required','High heat risk'] },
  { id:"b11", name:"Tokyo Imperial Bank",   flag:'🇯🇵', depositRate:0.030, loanRate:0.032, auditMod:1.1, penaltyMod:1.3, minDeposit:50000,   maxLoan:600000,   desc:"Conservative Japanese banking. Best deposit rate, transparent operations.", pros:['3.0% deposit rate (highest)','3.2% loan rate (lowest)','Yen stability'], cons:['10% higher audit exposure','Conservative lending criteria'], conditions:['Min deposit €50,000','Japanese operations preferred'] },
  { id:"b12", name:"Banco São Paulo",       flag:'🇧🇷', depositRate:0.012, loanRate:0.058, auditMod:0.75, penaltyMod:2.0, minDeposit:15000,  maxLoan:350000,   desc:"Brazilian emerging market bank. Volatile rates, moderate privacy.", pros:['25% audit reduction','Low minimum deposit','BRICS network access'], cons:['2x penalty multiplier','5.8% loan rate','Currency volatility'], conditions:['Min deposit €15,000','LATAM operations recommended'] },
];

// ── Ticker seed ───────────────────────────────────────────────────────────────
export const INITIAL_TICKER: TickerEvent[] = [
  { id:"t1",  text:"EUR/USD 1.0842 +0.12%",                                             type:"fx",        timestamp:Date.now() },
  { id:"t2",  text:"BTC/USD $67,421 -1.8%",                                             type:"crypto",    timestamp:Date.now() },
  { id:"t3",  text:"CRUDE OIL $78.42/bbl +2.1%",                                        type:"commodity", timestamp:Date.now() },
  { id:"t4",  text:"INTEL: Nordic R&D Lab construction 68% complete",                   type:"intel",     timestamp:Date.now() },
  { id:"t5",  text:"ALERT: Trade blockade forming in Strait of Hormuz",                 type:"alert",     timestamp:Date.now() },
  { id:"t6",  text:"CRIME: Heat level stable at 23/100",                                type:"crime",     timestamp:Date.now() },
  { id:"t7",  text:"BOARD: Q2 vote in 14 days — CEO approval at 72%",                  type:"board",     timestamp:Date.now() },
  { id:"t8",  text:"ETH/USD $3,248 +0.4%",                                              type:"crypto",    timestamp:Date.now() },
  { id:"t9",  text:"SENTINEL: Investment memo ready for Zurich Pharma",                 type:"intel",     timestamp:Date.now() },
  { id:"t10", text:"MACRO: ECB rate decision tomorrow — volatility expected",           type:"alert",     timestamp:Date.now() },
  { id:"t11", text:"GBP/EUR 0.8621 -0.05%",                                             type:"fx",        timestamp:Date.now() },
  { id:"t12", text:"RIVAL: Beijing State Bank acquired regional infrastructure",        type:"alert",     timestamp:Date.now() },
  { id:"t13", text:"GOLD $2,312/oz +0.45%",                                             type:"commodity", timestamp:Date.now() },
  { id:"t14", text:"INTEL: São Paulo Fintech Hub — construction 40% complete",          type:"intel",     timestamp:Date.now() },
  { id:"t15", text:"USD/JPY 151.42 +0.34%",                                             type:"fx",        timestamp:Date.now() },
  { id:"t16", text:"BOARD: Nairobi Solar Array generating first revenues",              type:"board",     timestamp:Date.now() },
  { id:"t17", text:"SOL/USD $178.40 +2.34%",                                            type:"crypto",    timestamp:Date.now() },
  { id:"t18", text:"ALERT: Rival Moskva Refinery upgraded to Level 5",                 type:"alert",     timestamp:Date.now() },
  { id:"t19", text:"INTEL: Dubai Media City Q2 occupancy at 94%",                      type:"intel",     timestamp:Date.now() },
  { id:"t20", text:"MACRO: Fed holds rates at 3.64% — risk-on regime continues",       type:"alert",     timestamp:Date.now() },
];

// ── Command palette items ─────────────────────────────────────────────────────
export const CMD_ITEMS = [
  { label:"Buy Infrastructure",      desc:"Browse acquirable nodes on the global market",       key:"market"    },
  { label:"Run Department Project",  desc:"Execute a project from HR, Trading, R&D, etc.",      key:"dept"      },
  { label:"Open Card Pack",          desc:"Pull manager and specialist employee cards",          key:"pack"      },
  { label:"View Trade Routes",       desc:"Toggle logistics overlay on map",                    key:"routes"    },
  { label:"Tax Routing Setup",       desc:"Configure capital flow through shell jurisdictions", key:"tax"       },
  { label:"Execute Operation",       desc:"Access covert operations panel",                     key:"crime"     },
  { label:"Deploy Sentinel Agent",   desc:"Generate investment memo (costs AP)",           key:"sentinel"  },
  { label:"Change Corporate Structure", desc:"Upgrade to Partnership, LLC, or Public Co.",     key:"structure" },
  { label:"Activate Athena AI",       desc:"Open strategic intelligence advisor",                key:"athena"     },
  { label:"Scan for Opportunities",  desc:"Intelligence scan for undervalued nodes",            key:"scan"      },
];
