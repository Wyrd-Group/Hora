import { ShadowOp } from '../store/empireStore';

const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 9)}`;

export const SHADOW_OPS: ShadowOp[] = [
  // ── CYBER WARFARE ──────────────────────────────────────────
  {
    id: generateId('op'),
    name: 'Zero-Day Datacenter Breach',
    type: 'Cyber',
    targetEntity: 'Rival Q-Engine Supercomputer',
    successRate: 65, // %
    heatGain: +15,
    reward: 12_000_000,
    description: 'Deploy an unpatched buffer overflow exploit against an offshore server farm processing rival quant data. Extremely high chance of trace-back.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'DeFi Protocol Drain',
    type: 'Cyber',
    targetEntity: 'AAVE V4 Liquidity Pool',
    successRate: 35,
    heatGain: +40,
    reward: 85_000_000,
    description: 'Exploit a flash-loan smart contract vulnerability to drain a decentralized exchange before governance pause. Interpol will immediately open a file on you.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'AWS Employee Spear-Phishing',
    type: 'Cyber',
    targetEntity: 'AWS Database Admin',
    successRate: 85,
    heatGain: +5,
    reward: 2_500_000,
    description: 'Low-level social engineering to gain AWS backend credentials. Used to scrub our transaction ledgers from the cloud.',
    value: 0,
    owned: false
  },

  // ── FINANCIAL ESPIONAGE ─────────────────────────────────────
  {
    id: generateId('op'),
    name: 'Pre-Earnings Supply Chain Hack',
    type: 'Financial',
    targetEntity: 'TSMC Logistics Database',
    successRate: 50,
    heatGain: +25,
    reward: 45_000_000,
    description: 'Infiltrate global shipping databases to know Apple’s quarterly iPhone shipments 48 hours before their earnings call. Actively committing securities fraud.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Short-and-Distort Campaign',
    type: 'Financial',
    targetEntity: 'Mid-Cap Pharma Company',
    successRate: 75,
    heatGain: +10,
    reward: 18_000_000,
    description: 'Launch a coordinated botnet smear campaign targeting a biotech stock immediately after taking a massive short position.',
    value: 0,
    owned: false
  },

  // ── PHYSICAL & GEOPOLITICAL ─────────────────────────────────
  {
    id: generateId('op'),
    name: 'Bribe Port Authority Inspector',
    type: 'Physical',
    targetEntity: 'Rotterdam Customs',
    successRate: 90,
    heatGain: -15, // Actually reduces heat by bypassing inspection
    reward: 0, // Costs money but reduces heat
    description: 'Ensure our unmarked shipping containers bypassing normal X-Ray scans in the Port of Rotterdam. Drastically clears heat, but costs €8M to execute.',
    value: 8_000_000,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Sabotage Subsea Fiber Cable',
    type: 'Physical',
    targetEntity: 'Trans-Atlantic FASTER Cable',
    successRate: 20,
    heatGain: +80,
    reward: 350_000_000,
    description: 'Utilize an untraceable deep-sea submersible to sever fiber optic connections between NY and London by 7 milliseconds, allowing your algorithms to arb the spread. Act of War.',
    value: 0,
    owned: false
  },

  // ── CYBER WARFARE (EXPANDED) ──────────────────────────────────
  {
    id: generateId('op'),
    name: 'Ransomware-as-a-Service Deploy',
    type: 'Cyber',
    targetEntity: 'Fortune 500 Corporate Network',
    successRate: 70,
    heatGain: +20,
    reward: 8_000_000,
    description: 'Deploy a white-labeled ransomware payload across a corporate intranet via compromised VPN credentials. The affiliate model means you never touch the malware directly, but the Bitcoin trail still glows.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Satellite Uplink Intercept',
    type: 'Cyber',
    targetEntity: 'NATO Military Comms Relay',
    successRate: 25,
    heatGain: +55,
    reward: 120_000_000,
    description: 'Hijack a ground-station uplink to intercept classified military communications in real-time. The intelligence is priceless, but five-eyes signals agencies will triangulate your position within hours.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Crypto Mixer Exploitation',
    type: 'Cyber',
    targetEntity: 'Tornado Cash Fork Protocol',
    successRate: 55,
    heatGain: +12,
    reward: 15_000_000,
    description: 'Exploit a reentrancy vulnerability in an OFAC-sanctioned mixing protocol to siphon pooled funds mid-tumble. Ironic — stealing from the people trying to hide their own money.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Social Media Bot Farm',
    type: 'Cyber',
    targetEntity: 'Public Market Sentiment',
    successRate: 80,
    heatGain: +8,
    reward: 5_000_000,
    description: 'Spin up 50,000 AI-generated personas across Twitter and Reddit to manipulate retail sentiment on target tickers. Low risk per account, but pattern analysis by platform trust-and-safety teams is improving fast.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Quantum Key Extraction',
    type: 'Cyber',
    targetEntity: 'NSA Encryption Vault',
    successRate: 10,
    heatGain: +90,
    reward: 500_000_000,
    description: 'Leverage a stolen quantum computing cluster to brute-force RSA-4096 keys protecting the NSA\'s financial surveillance archive. Success means access to every flagged transaction on Earth — and becoming the most wanted person alive.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'DNS Poisoning Attack',
    type: 'Cyber',
    targetEntity: 'Major Cryptocurrency Exchange',
    successRate: 45,
    heatGain: +30,
    reward: 35_000_000,
    description: 'Corrupt DNS resolver caches to redirect exchange login traffic through your proxy, harvesting API keys and session tokens from thousands of high-net-worth traders simultaneously.',
    value: 0,
    owned: false
  },

  // ── FINANCIAL ESPIONAGE (EXPANDED) ─────────────────────────────
  {
    id: generateId('op'),
    name: 'Offshore Shell Network',
    type: 'Financial',
    targetEntity: 'Global Tax Authorities',
    successRate: 85,
    heatGain: -10,
    reward: 0,
    description: 'Construct a labyrinthine network of shell companies across the BVI, Caymans, and Liechtenstein, routing funds through nominee directors and bearer shares. Reduces your heat signature by obscuring the beneficial ownership trail.',
    value: 12_000_000,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Pump and Dump Syndicate',
    type: 'Financial',
    targetEntity: 'OTC Penny Stock (XYZP)',
    successRate: 70,
    heatGain: +22,
    reward: 25_000_000,
    description: 'Coordinate a syndicate of promoters to inflate a worthless penny stock through fabricated press releases and paid newsletters, then dump your pre-loaded position on retail bagholders. A securities fraud classic.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Credit Default Swap Manipulation',
    type: 'Financial',
    targetEntity: 'Sovereign Bond Market',
    successRate: 30,
    heatGain: +45,
    reward: 200_000_000,
    description: 'Accumulate massive CDS positions on a nation\'s debt, then trigger a technical default through coordinated bond dumping. The same play that nearly broke the eurozone in 2012 — regulators will notice.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Wash Trading Ring',
    type: 'Financial',
    targetEntity: 'Unregulated Crypto Exchange',
    successRate: 75,
    heatGain: +15,
    reward: 10_000_000,
    description: 'Run coordinated buy-sell loops between your own accounts to fake volume on a low-liquidity exchange, attracting real traders whose slippage becomes your profit. The oldest trick in unregulated markets.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'LIBOR-Style Rate Fixing',
    type: 'Financial',
    targetEntity: 'Interbank Lending Rates',
    successRate: 20,
    heatGain: +65,
    reward: 300_000_000,
    description: 'Bribe a cartel of bank submitters to skew the benchmark interest rate by a few basis points in your favor. Moves trillions in derivative valuations — the same scheme that cost banks $9 billion in fines in 2012.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Naked Short Selling Conspiracy',
    type: 'Financial',
    targetEntity: 'Heavily-Shorted Meme Stock',
    successRate: 60,
    heatGain: +28,
    reward: 40_000_000,
    description: 'Sell shares you never borrowed and don\'t intend to deliver, creating phantom supply to crush a stock\'s price. If retail traders organize a counter-squeeze, your losses become theoretically infinite.',
    value: 0,
    owned: false
  },

  // ── PHYSICAL & GEOPOLITICAL (EXPANDED) ─────────────────────────
  {
    id: generateId('op'),
    name: 'Diplomatic Pouch Smuggling',
    type: 'Physical',
    targetEntity: 'International Customs Authorities',
    successRate: 90,
    heatGain: -20,
    reward: 0,
    description: 'Exploit the Vienna Convention\'s immunity provisions to move bearer bonds and hard drives through diplomatic channels that cannot be searched or seized. Nearly undetectable, but requires a complicit embassy.',
    value: 5_000_000,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Warehouse "Accident"',
    type: 'Physical',
    targetEntity: 'Rival Supply Chain Hub',
    successRate: 75,
    heatGain: +18,
    reward: 20_000_000,
    description: 'Stage an electrical fire at a competitor\'s critical distribution warehouse, then collect on the insurance policy you quietly took out on their inventory through a front company. Arson meets arbitrage.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Port Blockade Catalyst',
    type: 'Physical',
    targetEntity: 'Strait of Hormuz Shipping Lane',
    successRate: 15,
    heatGain: +85,
    reward: 400_000_000,
    description: 'Fund a provocateur incident in the world\'s most critical oil chokepoint to spike crude futures where you hold massive call options. One spark in the Strait moves $80 billion in daily trade — and could start a war.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Executive Extraction',
    type: 'Physical',
    targetEntity: 'Rival Corporation CEO',
    successRate: 40,
    heatGain: +35,
    reward: 50_000_000,
    description: 'Hire a private military contractor to abduct a rival CEO during a foreign business trip, extracting trade secrets under duress before releasing them in a jurisdiction with no extradition treaty.',
    value: 0,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Underground Vault Construction',
    type: 'Physical',
    targetEntity: 'Defensive — No External Target',
    successRate: 95,
    heatGain: -25,
    reward: 0,
    description: 'Commission a Swiss-engineered underground vault beneath a legitimate business front, complete with Faraday cage shielding and biometric access. Drastically reduces your exposure by physically isolating assets from seizure.',
    value: 15_000_000,
    owned: false
  },
  {
    id: generateId('op'),
    name: 'Art Heist Liquidation',
    type: 'Physical',
    targetEntity: 'Private Museum Vault',
    successRate: 50,
    heatGain: +30,
    reward: 75_000_000,
    description: 'Orchestrate the theft of blue-chip artworks from a private collection, then launder them through freeport storage in Geneva and Singapore before selling to anonymous collectors. Art crime is the third-largest criminal enterprise globally.',
    value: 0,
    owned: false
  }
];
