export interface VCDeal {
  id: string;
  name: string;
  sector: string;
  stage: 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Series C';
  valuation: number;
  askAmount: number;
  equityOffered: number; // percentage
  description: string;
  founderName: string;
  traction: string;
  risk: 'Low' | 'Medium' | 'High' | 'Very High';
  potentialMultiple: number; // e.g. 10x, 50x
  timeToExit: number; // months
  owned: boolean;
}

export interface PETarget {
  id: string;
  name: string;
  sector: string;
  revenue: number;
  ebitda: number;
  askingPrice: number;
  description: string;
  employees: number;
  improvementPotential: string;
  risk: 'Low' | 'Medium' | 'High';
  targetExitMultiple: number;
  holdPeriod: number; // months
  owned: boolean;
}

export interface HedgeFundStrategy {
  id: string;
  name: string;
  strategy: 'Long/Short' | 'Global Macro' | 'Event-Driven' | 'Arbitrage' | 'Quant' | 'Distressed';
  description: string;
  minCapital: number;
  expectedReturn: string;
  volatility: 'Low' | 'Medium' | 'High' | 'Very High';
  sharpeRatio: number;
  managementFee: number; // percentage
  performanceFee: number; // percentage
  capitalAllocated: number;
  active: boolean;
}

export interface IBDeal {
  id: string;
  name: string;
  type: 'M&A Advisory' | 'IPO Underwriting' | 'Debt Issuance' | 'Restructuring' | 'SPAC';
  client: string;
  dealSize: number;
  advisoryFee: number; // percentage
  description: string;
  complexity: 'Standard' | 'Complex' | 'Mega-Deal';
  duration: number; // months
  status: 'available' | 'in-progress' | 'completed';
  reputation: number; // reputation points gained
}

export interface MediaOutlet {
  id: string;
  name: string;
  type: 'News Network' | 'Social Platform' | 'Streaming Service' | 'Print Media' | 'Podcast Network' | 'Ad Agency';
  reach: number; // millions of viewers/readers
  monthlyRevenue: number;
  acquisitionCost: number;
  influence: number; // 1-100
  description: string;
  owned: boolean;
}

export interface AuctionItem {
  id: string;
  name: string;
  category: 'Fine Art' | 'Real Estate' | 'Vintage Cars' | 'Wine Collection' | 'Rare Watches' | 'Memorabilia' | 'Diamonds';
  description: string;
  estimatedValue: number;
  currentBid: number;
  minimumBid: number;
  bidIncrement: number;
  timeRemaining: number; // seconds
  image: string;
  provenance: string;
  rarity: 'Common' | 'Rare' | 'Very Rare' | 'Legendary';
  owned: boolean;
}

// ── VC Deals ──
export const INITIAL_VC_DEALS: VCDeal[] = [
  { id: 'vc-1', name: 'NeuraPay', sector: 'Fintech', stage: 'Seed', valuation: 5_000_000, askAmount: 500_000, equityOffered: 10, description: 'AI-powered payment fraud detection for emerging markets.', founderName: 'Maya Chen', traction: '12K MAU, $40K MRR', risk: 'High', potentialMultiple: 25, timeToExit: 48, owned: false },
  { id: 'vc-2', name: 'GreenGrid', sector: 'CleanTech', stage: 'Series A', valuation: 20_000_000, askAmount: 3_000_000, equityOffered: 15, description: 'Smart grid optimization using distributed AI for renewable energy.', founderName: 'Erik Larsson', traction: '3 utility contracts, $200K ARR', risk: 'Medium', potentialMultiple: 12, timeToExit: 60, owned: false },
  { id: 'vc-3', name: 'MediVault', sector: 'HealthTech', stage: 'Pre-Seed', valuation: 1_500_000, askAmount: 200_000, equityOffered: 13, description: 'Blockchain-secured medical records with patient-controlled access.', founderName: 'Dr. Aisha Patel', traction: 'Prototype, 2 hospital LOIs', risk: 'Very High', potentialMultiple: 50, timeToExit: 72, owned: false },
  { id: 'vc-4', name: 'Orbital Logistics', sector: 'SpaceTech', stage: 'Series B', valuation: 120_000_000, askAmount: 15_000_000, equityOffered: 12.5, description: 'Last-mile satellite delivery and orbital cargo management.', founderName: 'James Whitfield', traction: '$4M ARR, NASA partnership', risk: 'High', potentialMultiple: 8, timeToExit: 36, owned: false },
  { id: 'vc-5', name: 'SynthBio Labs', sector: 'BioTech', stage: 'Series A', valuation: 35_000_000, askAmount: 5_000_000, equityOffered: 14, description: 'Synthetic biology platform for custom protein engineering.', founderName: 'Dr. Kenji Tanaka', traction: '2 pharma contracts, FDA pre-submission', risk: 'High', potentialMultiple: 15, timeToExit: 60, owned: false },
  { id: 'vc-6', name: 'LearnFlow', sector: 'EdTech', stage: 'Seed', valuation: 8_000_000, askAmount: 1_000_000, equityOffered: 12.5, description: 'Adaptive learning platform using GPT-powered tutoring.', founderName: 'Sofia Morales', traction: '50K students, $80K MRR', risk: 'Medium', potentialMultiple: 18, timeToExit: 48, owned: false },
  { id: 'vc-7', name: 'CyberFort', sector: 'Cybersecurity', stage: 'Series A', valuation: 25_000_000, askAmount: 4_000_000, equityOffered: 16, description: 'Zero-trust endpoint security for enterprise IoT devices.', founderName: 'Victor Novak', traction: '$1.2M ARR, 15 enterprise clients', risk: 'Medium', potentialMultiple: 10, timeToExit: 42, owned: false },
  { id: 'vc-8', name: 'QuantumLeap', sector: 'DeepTech', stage: 'Series C', valuation: 500_000_000, askAmount: 50_000_000, equityOffered: 10, description: 'Quantum computing-as-a-service for financial modeling.', founderName: 'Prof. Li Wei', traction: '$20M ARR, 3 bulge bracket clients', risk: 'Medium', potentialMultiple: 5, timeToExit: 24, owned: false },
  { id: 'vc-9', name: 'AgroSense', sector: 'AgTech', stage: 'Pre-Seed', valuation: 2_000_000, askAmount: 300_000, equityOffered: 15, description: 'Drone-based crop monitoring with AI yield prediction.', founderName: 'Ana Pereira', traction: 'Pilot with 3 farms, prototype ready', risk: 'Very High', potentialMultiple: 40, timeToExit: 60, owned: false },
  { id: 'vc-10', name: 'MetaWear', sector: 'Consumer', stage: 'Seed', valuation: 6_000_000, askAmount: 750_000, equityOffered: 12.5, description: 'AR-enabled smart clothing for fitness and health monitoring.', founderName: 'Zara Kim', traction: 'Kickstarter funded, 5K pre-orders', risk: 'High', potentialMultiple: 20, timeToExit: 48, owned: false },
];

// ── PE Targets ──
export const INITIAL_PE_TARGETS: PETarget[] = [
  { id: 'pe-1', name: 'Meridian Manufacturing', sector: 'Industrial', revenue: 45_000_000, ebitda: 8_000_000, askingPrice: 40_000_000, description: 'Mid-market precision parts manufacturer with aging management. Ripe for operational overhaul.', employees: 320, improvementPotential: 'Cost reduction via automation, expand to aerospace clients', risk: 'Low', targetExitMultiple: 2.5, holdPeriod: 48, owned: false },
  { id: 'pe-2', name: 'Pacific Hospitality Group', sector: 'Hospitality', revenue: 80_000_000, ebitda: 12_000_000, askingPrice: 72_000_000, description: 'Chain of 12 boutique hotels in SE Asia. Underperforming due to poor digital strategy.', employees: 850, improvementPotential: 'Digital booking platform, loyalty program, luxury repositioning', risk: 'Medium', targetExitMultiple: 2.0, holdPeriod: 60, owned: false },
  { id: 'pe-3', name: 'DataStream Analytics', sector: 'Tech', revenue: 25_000_000, ebitda: 6_000_000, askingPrice: 48_000_000, description: 'Enterprise data analytics platform with sticky government contracts.', employees: 180, improvementPotential: 'AI integration, expand to private sector, reduce churn', risk: 'Low', targetExitMultiple: 3.0, holdPeriod: 36, owned: false },
  { id: 'pe-4', name: 'Heritage Pharma', sector: 'Healthcare', revenue: 150_000_000, ebitda: 25_000_000, askingPrice: 200_000_000, description: 'Generic drug manufacturer with 40 approved products. Pipeline needs investment.', employees: 1200, improvementPotential: 'New product launches, geographic expansion, operational efficiency', risk: 'Medium', targetExitMultiple: 2.2, holdPeriod: 60, owned: false },
  { id: 'pe-5', name: 'QuickServe Logistics', sector: 'Logistics', revenue: 60_000_000, ebitda: 5_000_000, askingPrice: 35_000_000, description: 'Regional last-mile delivery network. Technology stack outdated.', employees: 500, improvementPotential: 'Route optimization AI, fleet electrification, platform integration', risk: 'Medium', targetExitMultiple: 2.8, holdPeriod: 42, owned: false },
  { id: 'pe-6', name: 'Atlas Education Group', sector: 'Education', revenue: 35_000_000, ebitda: 7_000_000, askingPrice: 56_000_000, description: 'Network of 8 private schools across Europe. Strong brand, inefficient operations.', employees: 600, improvementPotential: 'Centralize admin, online learning expansion, new campus acquisitions', risk: 'Low', targetExitMultiple: 2.0, holdPeriod: 60, owned: false },
  { id: 'pe-7', name: 'Forge Steel Works', sector: 'Industrial', revenue: 90_000_000, ebitda: 10_000_000, askingPrice: 55_000_000, description: 'Specialty steel producer supplying defense and automotive sectors.', employees: 700, improvementPotential: 'Green steel transition, premium pricing, capacity expansion', risk: 'High', targetExitMultiple: 2.5, holdPeriod: 48, owned: false },
  { id: 'pe-8', name: 'ClearView Insurance', sector: 'Finance', revenue: 200_000_000, ebitda: 30_000_000, askingPrice: 240_000_000, description: 'Mid-size P&C insurer with strong book but outdated claims processing.', employees: 1500, improvementPotential: 'Digital claims platform, cross-sell life insurance, reduce loss ratio', risk: 'Medium', targetExitMultiple: 1.8, holdPeriod: 48, owned: false },
];

// ── Hedge Fund Strategies ──
export const INITIAL_HF_STRATEGIES: HedgeFundStrategy[] = [
  { id: 'hf-1', name: 'Alpha Seeker L/S Equity', strategy: 'Long/Short', description: 'Market-neutral equity strategy targeting alpha through fundamental analysis. Long undervalued stocks, short overvalued ones.', minCapital: 100_000, expectedReturn: '12-18% p.a.', volatility: 'Medium', sharpeRatio: 1.4, managementFee: 2, performanceFee: 20, capitalAllocated: 0, active: false },
  { id: 'hf-2', name: 'Macro Sovereign Fund', strategy: 'Global Macro', description: 'Top-down macro bets on currencies, rates, and commodities. Trades on central bank policy divergences.', minCapital: 250_000, expectedReturn: '15-25% p.a.', volatility: 'High', sharpeRatio: 1.1, managementFee: 2, performanceFee: 25, capitalAllocated: 0, active: false },
  { id: 'hf-3', name: 'Catalyst Fund', strategy: 'Event-Driven', description: 'Profits from corporate events: mergers, spin-offs, bankruptcies, activist campaigns.', minCapital: 150_000, expectedReturn: '10-16% p.a.', volatility: 'Medium', sharpeRatio: 1.3, managementFee: 1.5, performanceFee: 20, capitalAllocated: 0, active: false },
  { id: 'hf-4', name: 'StatEdge Quant', strategy: 'Quant', description: 'Systematic trading using statistical models, machine learning, and high-frequency signals.', minCapital: 500_000, expectedReturn: '18-30% p.a.', volatility: 'High', sharpeRatio: 1.6, managementFee: 2.5, performanceFee: 30, capitalAllocated: 0, active: false },
  { id: 'hf-5', name: 'Spread Harvester', strategy: 'Arbitrage', description: 'Exploits pricing inefficiencies across markets: convertible arb, merger arb, statistical arb.', minCapital: 200_000, expectedReturn: '8-12% p.a.', volatility: 'Low', sharpeRatio: 1.8, managementFee: 1.5, performanceFee: 20, capitalAllocated: 0, active: false },
  { id: 'hf-6', name: 'Phoenix Capital', strategy: 'Distressed', description: 'Buys distressed debt and equity of companies in financial difficulty. High risk, high reward turnaround plays.', minCapital: 300_000, expectedReturn: '20-40% p.a.', volatility: 'Very High', sharpeRatio: 0.9, managementFee: 2, performanceFee: 25, capitalAllocated: 0, active: false },
];

// ── IB Deals ──
export const INITIAL_IB_DEALS: IBDeal[] = [
  { id: 'ib-1', name: 'TechCorp / InnovateSoft Merger', type: 'M&A Advisory', client: 'TechCorp Industries', dealSize: 2_000_000_000, advisoryFee: 1.5, description: 'Advise on $2B acquisition of enterprise software company. Due diligence, valuation, and negotiation.', complexity: 'Mega-Deal', duration: 6, status: 'available', reputation: 50 },
  { id: 'ib-2', name: 'GreenEnergy IPO', type: 'IPO Underwriting', client: 'GreenEnergy Solutions', dealSize: 500_000_000, advisoryFee: 5, description: 'Lead underwriter for renewable energy company IPO. Book building, roadshow, pricing.', complexity: 'Complex', duration: 4, status: 'available', reputation: 35 },
  { id: 'ib-3', name: 'Metro Rail Bond Issue', type: 'Debt Issuance', client: 'Metro Transit Authority', dealSize: 800_000_000, advisoryFee: 0.8, description: 'Structure and place $800M municipal bond issue for new rail infrastructure.', complexity: 'Standard', duration: 3, status: 'available', reputation: 20 },
  { id: 'ib-4', name: 'RetailMax Restructuring', type: 'Restructuring', client: 'RetailMax Holdings', dealSize: 1_200_000_000, advisoryFee: 2.0, description: 'Lead restructuring advisor for distressed retail conglomerate. Debt negotiation and asset sales.', complexity: 'Complex', duration: 8, status: 'available', reputation: 40 },
  { id: 'ib-5', name: 'AeroSpace SPAC Merger', type: 'SPAC', client: 'Stellar Acquisition Corp', dealSize: 350_000_000, advisoryFee: 3.5, description: 'Advise SPAC on de-SPAC transaction with commercial space startup.', complexity: 'Complex', duration: 5, status: 'available', reputation: 30 },
  { id: 'ib-6', name: 'BioPharm Mega-Merger', type: 'M&A Advisory', client: 'Global Pharmaceuticals', dealSize: 8_000_000_000, advisoryFee: 0.8, description: 'Co-advise on $8B cross-border pharmaceutical merger. Antitrust clearance across 12 jurisdictions.', complexity: 'Mega-Deal', duration: 12, status: 'available', reputation: 75 },
  { id: 'ib-7', name: 'FinTech Unicorn IPO', type: 'IPO Underwriting', client: 'PayStream Global', dealSize: 1_500_000_000, advisoryFee: 4, description: 'Joint bookrunner for $1.5B fintech IPO. Direct listing structure with complex share class.', complexity: 'Mega-Deal', duration: 5, status: 'available', reputation: 60 },
  { id: 'ib-8', name: 'Sovereign Wealth Bond', type: 'Debt Issuance', client: 'Kingdom of Meridia', dealSize: 3_000_000_000, advisoryFee: 0.5, description: 'Arrange $3B sovereign bond issue for emerging market nation. Multi-tranche, multi-currency structure.', complexity: 'Complex', duration: 4, status: 'available', reputation: 45 },
];

// ── Media Outlets ──
export const INITIAL_MEDIA_OUTLETS: MediaOutlet[] = [
  { id: 'media-1', name: 'Apex News Network', type: 'News Network', reach: 45, monthlyRevenue: 2_500_000, acquisitionCost: 80_000_000, influence: 72, description: 'Global 24/7 business and financial news network. Strong anchors, premium ad slots.', owned: false },
  { id: 'media-2', name: 'Pulse Social', type: 'Social Platform', reach: 120, monthlyRevenue: 8_000_000, acquisitionCost: 350_000_000, influence: 85, description: 'Fast-growing social platform for professionals. LinkedIn meets TikTok for business.', owned: false },
  { id: 'media-3', name: 'StreamVault', type: 'Streaming Service', reach: 30, monthlyRevenue: 4_000_000, acquisitionCost: 150_000_000, influence: 45, description: 'Niche streaming service for documentaries and educational content.', owned: false },
  { id: 'media-4', name: 'The Capital Post', type: 'Print Media', reach: 5, monthlyRevenue: 800_000, acquisitionCost: 15_000_000, influence: 60, description: 'Prestigious financial newspaper. 140-year heritage. The paper of record for Wall Street.', owned: false },
  { id: 'media-5', name: 'MoneyMic Studios', type: 'Podcast Network', reach: 8, monthlyRevenue: 600_000, acquisitionCost: 12_000_000, influence: 35, description: 'Top-ranked business podcast network. 15 shows, 8M monthly downloads.', owned: false },
  { id: 'media-6', name: 'Zenith Creative', type: 'Ad Agency', reach: 0, monthlyRevenue: 3_000_000, acquisitionCost: 45_000_000, influence: 55, description: 'Full-service creative agency. Fortune 500 client list. Brand strategy and campaign execution.', owned: false },
  { id: 'media-7', name: 'Globe Satellite TV', type: 'News Network', reach: 80, monthlyRevenue: 5_000_000, acquisitionCost: 200_000_000, influence: 78, description: 'International satellite news channel broadcasting in 40 languages.', owned: false },
  { id: 'media-8', name: 'PixelForge', type: 'Social Platform', reach: 60, monthlyRevenue: 3_500_000, acquisitionCost: 120_000_000, influence: 50, description: 'Visual-first social platform popular with Gen Z. Growing ad platform.', owned: false },
];

// ── Auction Items ──
export const INITIAL_AUCTION_ITEMS: AuctionItem[] = [
  { id: 'auction-1', name: 'Basquiat "Untitled" (1982)', category: 'Fine Art', description: 'Neo-expressionist masterpiece. Museum-quality provenance. Last sold at Christie\'s.', estimatedValue: 25_000_000, currentBid: 18_000_000, minimumBid: 15_000_000, bidIncrement: 500_000, timeRemaining: 7200, image: '🎨', provenance: 'Christie\'s NY, Private Collection', rarity: 'Legendary', owned: false },
  { id: 'auction-2', name: '1962 Ferrari 250 GTO', category: 'Vintage Cars', description: 'One of 36 ever built. Matching numbers. Complete racing history documentation.', estimatedValue: 52_000_000, currentBid: 45_000_000, minimumBid: 40_000_000, bidIncrement: 1_000_000, timeRemaining: 3600, image: '🏎️', provenance: 'Pebble Beach Concours, Single Owner 30yr', rarity: 'Legendary', owned: false },
  { id: 'auction-3', name: 'Chateau Margaux 1787', category: 'Wine Collection', description: 'Complete case of 12 bottles. Believed owned by Thomas Jefferson. Museum condition.', estimatedValue: 500_000, currentBid: 350_000, minimumBid: 300_000, bidIncrement: 25_000, timeRemaining: 14400, image: '🍷', provenance: 'Sotheby\'s London', rarity: 'Very Rare', owned: false },
  { id: 'auction-4', name: 'Patek Philippe Grandmaster Chime', category: 'Rare Watches', description: 'Ref. 6300A. The most complicated wristwatch ever made. 20 complications.', estimatedValue: 31_000_000, currentBid: 28_000_000, minimumBid: 25_000_000, bidIncrement: 500_000, timeRemaining: 5400, image: '⌚', provenance: 'Only Watch Charity Auction', rarity: 'Legendary', owned: false },
  { id: 'auction-5', name: 'Manhattan Penthouse', category: 'Real Estate', description: 'Full-floor penthouse on Billionaire\'s Row. 12,000 sqft, Central Park views.', estimatedValue: 95_000_000, currentBid: 82_000_000, minimumBid: 75_000_000, bidIncrement: 2_000_000, timeRemaining: 28800, image: '🏙️', provenance: 'Off-market listing', rarity: 'Rare', owned: false },
  { id: 'auction-6', name: 'Pink Star Diamond (59.6ct)', category: 'Diamonds', description: 'Internally flawless fancy vivid pink diamond. World record price at auction.', estimatedValue: 71_000_000, currentBid: 60_000_000, minimumBid: 55_000_000, bidIncrement: 2_000_000, timeRemaining: 10800, image: '💎', provenance: 'Sotheby\'s Hong Kong', rarity: 'Legendary', owned: false },
  { id: 'auction-7', name: 'Babe Ruth Signed Jersey (1932)', category: 'Memorabilia', description: 'Game-worn "Called Shot" World Series jersey. PSA authenticated.', estimatedValue: 8_000_000, currentBid: 6_500_000, minimumBid: 5_000_000, bidIncrement: 250_000, timeRemaining: 18000, image: '⚾', provenance: 'Heritage Auctions', rarity: 'Very Rare', owned: false },
  { id: 'auction-8', name: 'Banksy "Girl with Balloon"', category: 'Fine Art', description: 'Original canvas (pre-shred). Authenticated by Pest Control. Iconic street art piece.', estimatedValue: 12_000_000, currentBid: 9_000_000, minimumBid: 8_000_000, bidIncrement: 250_000, timeRemaining: 21600, image: '🎨', provenance: 'Sotheby\'s London', rarity: 'Very Rare', owned: false },
  { id: 'auction-9', name: '1954 Mercedes 300 SL Gullwing', category: 'Vintage Cars', description: 'Matching numbers, fully restored. Silver with red leather. Concours winner.', estimatedValue: 3_500_000, currentBid: 2_800_000, minimumBid: 2_500_000, bidIncrement: 100_000, timeRemaining: 43200, image: '🏎️', provenance: 'RM Sotheby\'s Monterey', rarity: 'Rare', owned: false },
  { id: 'auction-10', name: 'Private Island — Maldives', category: 'Real Estate', description: '15-acre island with 20-villa resort infrastructure. Pristine coral reef.', estimatedValue: 40_000_000, currentBid: 32_000_000, minimumBid: 28_000_000, bidIncrement: 1_000_000, timeRemaining: 86400, image: '🏝️', provenance: 'Exclusive private sale', rarity: 'Very Rare', owned: false },
];
