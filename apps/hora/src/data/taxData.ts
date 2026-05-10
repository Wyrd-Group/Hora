export type SectorKey = 'finance' | 'tech' | 'oil_gas' | 'manufacturing' | 'energy' | 'pharma' | 'venue';

export interface CompanyJurisdiction {
  code: string;
  name: string;
  flag: string;
  corporateTax: number;   // fraction: 0.125 = 12.5%
  wht: number;            // dividend withholding tax fraction
  description: string;
  pros: string[];
  cons: string[];
  sectorBonus?: Partial<Record<SectorKey, string>>;
  sectorPenalty?: Partial<Record<SectorKey, string>>;
}

export interface ResidencyJurisdiction {
  code: string;
  name: string;
  flag: string;
  dividendTax: number;    // personal tax on dividends received
  description: string;
  pros: string[];
  cons: string[];
  sectorNote?: string;
}

// ── Company Registration Jurisdictions ──────────────────────────────

export const COMPANY_JURISDICTIONS: CompanyJurisdiction[] = [
  {
    code: 'KY',
    name: 'Cayman Islands',
    flag: '🇰🇾',
    corporateTax: 0.00,
    wht: 0.00,
    description: 'The gold standard offshore holding structure. Zero tax, zero WHT — but limited operational credibility.',
    pros: ['0% corporate tax', '0% withholding tax', 'Complete financial privacy', 'No accounting requirements'],
    cons: ['FATF grey-list scrutiny', 'Restricted banking access in EU/US', 'Reputational risk with institutional partners', 'No sector-specific incentives'],
    sectorBonus: { finance: 'Ideal for holding structures & SPVs' },
    sectorPenalty: { manufacturing: 'No supply chain treaty benefits', energy: 'Excluded from energy subsidies' },
  },
  {
    code: 'IE',
    name: 'Ireland',
    flag: '🇮🇪',
    corporateTax: 0.125,
    wht: 0.25,
    description: 'Europe\'s tech hub. Lowest EU corporate tax, but dividends attract a punishing 25% WHT.',
    pros: ['12.5% EU-lowest corporate tax', 'EU single market access', 'IP Box: 6.25% on qualifying IP income', 'Strong English-speaking talent pool'],
    cons: ['25% dividend withholding tax', 'Increasing OECD Pillar Two pressure', 'High cost of living for staff'],
    sectorBonus: { tech: '+15% effective yield via IP Box', finance: 'IDA grants for financial services' },
    sectorPenalty: { oil_gas: 'Carbon levy erodes operating margins' },
  },
  {
    code: 'AE',
    name: 'UAE (Dubai)',
    flag: '🇦🇪',
    corporateTax: 0.09,
    wht: 0.00,
    description: 'The Middle East\'s premier free zone. 9% corporate tax, zero WHT, and unrivalled oil & gas access.',
    pros: ['9% corporate tax (free zones: 0%)', '0% withholding tax', 'No personal income tax for staff', 'Strategic access to GCC + Asia markets'],
    cons: ['Requires physical presence / local sponsor', 'Limited EU regulatory recognition', 'Geopolitical proximity risk'],
    sectorBonus: { oil_gas: 'ADNOC partnership incentives', finance: 'DIFC financial free zone benefits', energy: 'Renewable energy fund access' },
  },
  {
    code: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    corporateTax: 0.17,
    wht: 0.00,
    description: 'Asia\'s financial nerve centre. 17% tax, zero WHT, and the world\'s best trade infrastructure.',
    pros: ['0% withholding tax on dividends', 'Extensive DTA network (90+ treaties)', 'AAA sovereign rating', 'Financial Sector Incentive scheme (10% on qualifying income)'],
    cons: ['17% headline corporate rate', 'Strict regulatory compliance', 'High operational costs'],
    sectorBonus: { finance: 'FSI scheme: 10% on qualifying income', tech: 'Pioneer Status: 5% for 5 years', manufacturing: 'Global Trader Programme' },
  },
  {
    code: 'MT',
    name: 'Malta',
    flag: '🇲🇹',
    corporateTax: 0.05,
    wht: 0.00,
    description: 'EU member with a unique 6/7ths shareholder refund scheme that reduces effective rate to ~5%.',
    pros: ['~5% effective corporate tax via refund', '0% WHT on dividends to non-residents', 'EU passporting rights', 'iGaming and finance specialist regime'],
    cons: ['Refund mechanism adds 6-month cash flow lag', 'FATF grey-listed 2021–2022 (reputational residue)', 'Small talent pool'],
    sectorBonus: { finance: 'Banking licence passport across EU', venue: 'iGaming and entertainment hub' },
  },
  {
    code: 'EE',
    name: 'Estonia',
    flag: '🇪🇪',
    corporateTax: 0.20,
    wht: 0.00,
    description: 'Unique deferred-tax model: 0% while profits stay in the company, 20% only on distribution.',
    pros: ['0% tax on retained earnings', '0% WHT (20% only when distributed)', 'e-Residency programme', 'EU jurisdiction with digital-first infrastructure'],
    cons: ['20% tax triggered on distribution', 'Small domestic market', 'Limited treaty network vs. Luxembourg'],
    sectorBonus: { tech: 'e-Residency ecosystem + startup grants' },
    sectorPenalty: { oil_gas: 'No energy sector incentives' },
  },
  {
    code: 'LU',
    name: 'Luxembourg',
    flag: '🇱🇺',
    corporateTax: 0.17,
    wht: 0.15,
    description: 'The EU\'s premier fund domicile. Unmatched for holding structures — especially investment funds.',
    pros: ['Participation exemption on dividends', 'IP regime: 80% exemption', 'AAA-rated stable jurisdiction', 'SICAV/SICAF fund structures'],
    cons: ['15% WHT on dividends', 'High compliance costs', 'OECD substance requirements'],
    sectorBonus: { finance: 'UCITS/AIFMD fund passporting', pharma: 'IP regime: 80% income exemption' },
  },
  {
    code: 'NL',
    name: 'Netherlands',
    flag: '🇳🇱',
    corporateTax: 0.258,
    wht: 0.15,
    description: 'Europe\'s logistics gateway with a robust participation exemption. Strong for trade and manufacturing.',
    pros: ['Participation exemption on qualifying dividends', 'Extensive DTA network', 'Port of Rotterdam supply chain hub', 'Innovation Box: 9% on R&D profits'],
    cons: ['25.8% headline rate', '15% WHT', 'Increasing OECD anti-avoidance pressure'],
    sectorBonus: { manufacturing: 'Port of Rotterdam + logistics incentives', energy: 'Offshore energy cluster access' },
    sectorPenalty: { finance: 'Bank surcharge adds 3% additional levy' },
  },
  {
    code: 'CH',
    name: 'Switzerland',
    flag: '🇨🇭',
    corporateTax: 0.149,
    wht: 0.35,
    description: 'Elite banking secrecy and pharma dominance. But 35% WHT is the highest on this list.',
    pros: ['Cantonal tax competition (14.9% avg)', 'World-class banking infrastructure', 'Political neutrality', 'Strong pharma & biotech ecosystem'],
    cons: ['35% withholding tax — highest on list', 'High cost base', 'Non-EU market access complexities post-2021'],
    sectorBonus: { pharma: '+20% income multiplier via Swiss IP Box', finance: 'Private banking domicile advantages' },
    sectorPenalty: { manufacturing: 'CHF strength erodes export competitiveness' },
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    corporateTax: 0.25,
    wht: 0.00,
    description: 'Post-Brexit still a global financial powerhouse. 25% tax, but zero WHT on dividends.',
    pros: ['0% WHT on dividends', 'Patent Box: 10% on IP income', 'Deep capital markets access', 'English common law jurisdiction'],
    cons: ['25% corporate rate (up from 19% in 2023)', 'Post-Brexit EU market access friction', 'Regulatory overhead for financial services'],
    sectorBonus: { finance: 'FCA-regulated passporting', tech: 'Patent Box: 10% on IP income' },
  },
  {
    code: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    corporateTax: 0.30,
    wht: 0.25,
    description: 'Europe\'s industrial backbone. High taxes, but unmatched manufacturing credibility and stability.',
    pros: ['Political & economic stability', 'World-leading manufacturing ecosystem', 'Mittelstand supply chain access', 'Strong IP protection'],
    cons: ['~30% combined corporate tax', '25% + solidarity surcharge WHT', 'Heavy labour regulation'],
    sectorBonus: { manufacturing: '+25% operational efficiency multiplier', energy: 'Energiewende transition subsidies' },
    sectorPenalty: { tech: 'Bureaucratic incorporation process', finance: 'BaFin compliance costs' },
  },
  {
    code: 'HK',
    name: 'Hong Kong',
    flag: '🇭🇰',
    corporateTax: 0.165,
    wht: 0.00,
    description: 'Asia\'s financial gateway with territorial taxation. Only Hong Kong-sourced income is taxed.',
    pros: ['0% WHT on dividends', 'Territorial tax system', '16.5% headline rate (8.25% on first HK$2M)', 'Gateway to China market'],
    cons: ['Geopolitical risk (China\'s influence)', 'Eroding international arbitration standing', 'Complex AML compliance for banking'],
    sectorBonus: { finance: 'SFC licensed access to Greater Bay Area', tech: 'Innovation & Technology Fund grants' },
  },
  {
    code: 'PA',
    name: 'Panama',
    flag: '🇵🇦',
    corporateTax: 0.00,
    wht: 0.10,
    description: 'Territorial system: foreign-sourced income is tax-free. Canal-adjacent logistics hub.',
    pros: ['0% tax on foreign-sourced income', 'USD economy — no FX risk', 'Panama Canal logistics access', 'Fast incorporation (24-48h)'],
    cons: ['10% WHT on dividends', 'OECD BEPS non-cooperative list risk', 'Limited treaty network', 'Reputational sensitivity post-Panama Papers'],
    sectorBonus: { manufacturing: 'Canal Zone logistics hub', finance: 'Offshore banking infrastructure' },
  },
  {
    code: 'BH',
    name: 'Bahrain',
    flag: '🇧🇭',
    corporateTax: 0.00,
    wht: 0.00,
    description: 'GCC\'s most open economy. Zero corporate and WHT for non-oil businesses, full foreign ownership.',
    pros: ['0% corporate tax (non-oil)', '0% WHT', '100% foreign ownership', 'EDB fast-track business setup'],
    cons: ['Small domestic market', 'Oil price dependency macroeconomics', 'Limited DTA network'],
    sectorBonus: { finance: 'CBB-regulated Islamic finance hub', energy: 'GCC energy market access' },
    sectorPenalty: { pharma: 'Limited biotech infrastructure' },
  },
  {
    code: 'CY',
    name: 'Cyprus',
    flag: '🇨🇾',
    corporateTax: 0.125,
    wht: 0.00,
    description: 'EU jurisdiction with Ireland-matching 12.5% rate and zero WHT. Underrated by most operators.',
    pros: ['12.5% EU corporate rate', '0% WHT on dividends', 'IP Box: 2.5% on qualifying IP', 'Extensive treaty network (65+ countries)'],
    cons: ['Post-2013 banking crisis reputational tail risk', 'Limited talent pool', 'EU regulatory scrutiny for financial structures'],
    sectorBonus: { finance: 'Forex broker licensing hub', tech: 'IP Box: 2.5% effective rate on IP' },
  },
];

// ── Personal Residency Jurisdictions ────────────────────────────────

export const RESIDENCY_JURISDICTIONS: ResidencyJurisdiction[] = [
  {
    code: 'MC',
    name: 'Monaco',
    flag: '🇲🇨',
    dividendTax: 0.00,
    description: 'Zero income tax for residents. The benchmark for wealth management. Requires €1M+ property purchase.',
    pros: ['0% personal income tax', 'No capital gains tax', 'No inheritance tax (direct heirs)', 'European lifestyle & stability'],
    cons: ['Extremely high cost of living', '€1M+ property threshold for residency', 'Small jurisdiction — limited professional networks'],
    sectorNote: 'Universally optimal for any sector with high dividend extraction.',
  },
  {
    code: 'AE',
    name: 'UAE (Dubai)',
    flag: '🇦🇪',
    dividendTax: 0.00,
    description: 'Zero personal income tax on all income. Residence visa achievable via property investment from $200k.',
    pros: ['0% personal income tax', '0% capital gains tax', 'Residence visa via property ($200k+)', 'Global connectivity hub'],
    cons: ['Extreme heat climate', 'Cultural and legal differences', 'Requiring 183+ days physical presence'],
    sectorNote: 'Strongest combination with UAE (company). Creates a full zero-tax structure.',
  },
  {
    code: 'KY',
    name: 'Cayman Islands',
    flag: '🇰🇾',
    dividendTax: 0.00,
    description: 'Zero personal tax of any kind. Ideal companion to Cayman company structures.',
    pros: ['0% income, capital gains, and estate tax', 'No residency requirement for holding', 'USD-pegged currency stability'],
    cons: ['Remote location', 'Limited lifestyle amenities vs Monaco/Dubai', 'Hurricane exposure'],
    sectorNote: 'Optimal pairing with Cayman or Panama company registration.',
  },
  {
    code: 'BS',
    name: 'Bahamas',
    flag: '🇧🇸',
    dividendTax: 0.00,
    description: 'Caribbean zero-tax paradise. Residency via $750k real estate investment.',
    pros: ['0% income and capital gains tax', 'USD economy', 'Straightforward permanent residency', 'Close proximity to US markets'],
    cons: ['Hurricane risk', 'FATF monitoring', 'Limited banking options post-OECD pressure'],
  },
  {
    code: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    dividendTax: 0.00,
    description: 'Foreign-sourced dividends are exempt from personal tax. A genuine tax haven with tier-1 infrastructure.',
    pros: ['0% on foreign-sourced dividends', 'World\'s best infrastructure', 'Employment Pass available for founders', 'Capital gains tax exempt'],
    cons: ['High cost of living', '22% tax on Singapore-sourced income', 'Competitive housing market'],
    sectorNote: 'Exceptional for Singapore-registered companies: WHT 0% + personal dividend tax 0%.',
  },
  {
    code: 'PT',
    name: 'Portugal (NHR)',
    flag: '🇵🇹',
    dividendTax: 0.10,
    description: 'Non-Habitual Resident regime: flat 10% on foreign income for 10 years. Best EU quality-of-life deal.',
    pros: ['10% flat on foreign dividends (NHR)', 'Golden Visa pathway from €500k', 'EU residency with Schengen access', 'Low cost of living vs Western Europe'],
    cons: ['NHR regime under OECD review', '10-year time limit — plan exit strategy', 'Property prices rising rapidly in Lisbon/Porto'],
    sectorNote: 'Pairs well with Malta or Cyprus company (EU + low WHT).',
  },
  {
    code: 'CH',
    name: 'Switzerland',
    flag: '🇨🇭',
    dividendTax: 0.135,
    description: 'Lump-sum taxation available in some cantons. Effective rate ~13.5% for HNW individuals.',
    pros: ['Cantonal lump-sum agreements for HNW', 'Political neutrality & stability', 'World-class banking & asset management', 'Strong property rights'],
    cons: ['High cost of living', '35% WHT credit reclaim takes 12+ months', 'Strict immigration requirements'],
    sectorNote: 'Optimal for pharma sector: CH company + CH residency = integrated ecosystem.',
  },
  {
    code: 'MT',
    name: 'Malta',
    flag: '🇲🇹',
    dividendTax: 0.15,
    description: 'Malta Residence and Visa Programme: 15% flat tax on foreign income for qualifying residents.',
    pros: ['15% flat on foreign-sourced income', 'EU residency with Schengen access', 'Warm Mediterranean climate', 'English-speaking'],
    cons: ['€100k minimum tax per year', 'MRVP administration fees', 'Small jurisdiction limitations'],
  },
  {
    code: 'HK',
    name: 'Hong Kong',
    flag: '🇭🇰',
    dividendTax: 0.00,
    description: 'No dividend tax for residents. Combined with HK company: potentially near-zero total burden.',
    pros: ['0% tax on dividends', 'Territorial income tax', 'Global financial hub connectivity', 'No capital gains tax'],
    cons: ['Geopolitical risk with mainland China', 'High cost of living', 'Complex AML banking compliance'],
    sectorNote: 'Best pairing: HK company (0% WHT) + HK residency (0% dividend tax) = 0% total extraction cost.',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    dividendTax: 0.3375,
    description: 'Higher rate taxpayers pay 33.75% on dividends above the £500 allowance. Significant drag on extraction.',
    pros: ['NHS healthcare', 'World-class financial services', 'Common law legal system', '£500 annual dividend allowance'],
    cons: ['33.75% higher-rate dividend tax', 'Income tax up to 45%', 'Post-Brexit restrictions'],
    sectorNote: 'High extraction cost. Favourable for UK-registered companies using 0% WHT.',
  },
  {
    code: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    dividendTax: 0.26375,
    description: '25% flat + 5.5% solidarity surcharge = 26.375% on all capital income. Predictable but heavy.',
    pros: ['Predictable flat rate', 'Strong social infrastructure', 'Manufacturing sector dominance', 'Central EU location'],
    cons: ['26.375% flat capital tax', 'High wealth reporting requirements', 'Complex tax filing'],
  },
  {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    dividendTax: 0.30,
    description: 'Prélèvement Forfaitaire Unique (PFU): 30% flat on all capital income including dividends.',
    pros: ['Simple flat 30% PFU rate', 'EU base with Schengen', 'World-class quality of life'],
    cons: ['30% PFU on dividends', 'Wealth tax on real estate assets > €1.3M', 'High social charges'],
  },
  {
    code: 'NL',
    name: 'Netherlands',
    flag: '🇳🇱',
    dividendTax: 0.269,
    description: 'Box 2 regime: 26.9% on substantial shareholding dividends (≥5% stake).',
    pros: ['EU jurisdiction', 'Highly educated English-speaking workforce', 'Advanced logistics infrastructure'],
    cons: ['26.9% Box 2 rate', 'Net wealth reporting', 'High housing costs'],
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    dividendTax: 0.238,
    description: 'Qualified dividends taxed at 23.8% (20% + 3.8% NIIT) at top bracket. FATCA compliance mandatory.',
    pros: ['Deep capital market access', 'Delaware corporate shield', 'Strong IP legal protection'],
    cons: ['23.8% on qualified dividends', 'FATCA citizenship-based taxation worldwide', 'Complex state-level tax overlay'],
    sectorNote: 'US residents are taxed globally — even foreign dividends are subject to FATCA reporting.',
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    dividendTax: 0.47,
    description: 'Dividends are taxed as ordinary income — up to 47% at the top marginal rate. Franking credits offset some.',
    pros: ['Franking credit system partially offsets double taxation', 'Strong rule of law', 'Asia-Pacific gateway'],
    cons: ['Up to 47% marginal rate on dividends', 'High global tax compliance burden', 'Distance from major financial hubs'],
  },
];

// ── Helper: compute net transfer after all taxes ─────────────────

export function computeTransfer(
  gross: number,
  companyCode: string,
  residencyCode: string,
): {
  gross: number;
  whtAmount: number;
  netAfterWHT: number;
  personalTaxAmount: number;
  netReceived: number;
  totalTax: number;
  effectiveRate: number;
  whtRate: number;
  personalTaxRate: number;
} {
  const co = COMPANY_JURISDICTIONS.find(c => c.code === companyCode);
  const re = RESIDENCY_JURISDICTIONS.find(r => r.code === residencyCode);

  const whtRate = co?.wht ?? 0;
  const personalTaxRate = re?.dividendTax ?? 0;

  const whtAmount = Math.round(gross * whtRate);
  const netAfterWHT = gross - whtAmount;
  const personalTaxAmount = Math.round(netAfterWHT * personalTaxRate);
  const netReceived = netAfterWHT - personalTaxAmount;
  const totalTax = whtAmount + personalTaxAmount;
  const effectiveRate = gross > 0 ? totalTax / gross : 0;

  return { gross, whtAmount, netAfterWHT, personalTaxAmount, netReceived, totalTax, effectiveRate, whtRate, personalTaxRate };
}
