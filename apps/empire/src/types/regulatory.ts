// ============================================================================
// Regulatory system types (client-side)
// ============================================================================
// Mirrors Supabase schema for jurisdictional_facts, review_queue, and
// regulatory_sources. Also exports the JurisdictionGroup block type used by
// the curriculum content system.
// ============================================================================

export type CountryCode = string; // ISO 3166-1 alpha-2 — keep open for expansion
export type SupranationalCode =
  | 'EU' | 'EUROZONE' | 'SEPA' | 'OECD'
  | 'USMCA' | 'MERCOSUR' | 'AU' | 'EAC' | 'ECOWAS'
  | 'SAARC' | 'ASEAN' | 'APEC' | 'GCC'
  | 'GLOBAL';

export type JurisdictionLayer = CountryCode | SupranationalCode | 'DEFAULT';

export interface FactValue {
  amount?: number;
  currency?: string;
  unit?: string;           // 'annual' | 'monthly' | 'per_person'
  rate?: number;           // percentage as decimal: 0.25 = 25%
  threshold_low?: number;
  threshold_high?: number;
  effective_from?: string; // ISO date
  effective_until?: string;
  notes?: string;
}

export type FactStatus = 'pending_review' | 'approved' | 'rejected' | 'superseded';

export interface JurisdictionalFact {
  id: string;
  country_code: CountryCode;
  topic: string;
  fact_key: string;
  value: FactValue;
  display_value: string | null;
  source_id: string | null;
  source_url: string | null;
  source_excerpt: string | null;
  confidence: number;
  fetched_at: string;
  status: FactStatus;
  approved_at: string | null;
  effective_from: string | null;
}

export interface RegulatorySource {
  id: string;
  country_code: CountryCode;
  topic: string;
  source_url: string;
  source_type: 'government' | 'regulator' | 'official_news';
  source_authority: string | null;
  notes: string | null;
  active: boolean;
  last_fetched_at: string | null;
  last_success_at: string | null;
  fetch_failures_in_row: number;
}

export type ChangeType = 'new_fact' | 'value_change' | 'structural_change' | 'deprecation';
export type RiskScore = 'low' | 'medium' | 'high';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'needs_investigation';

export interface ReviewQueueEntry {
  id: string;
  new_fact_id: string;
  previous_fact_id: string | null;
  country_code: CountryCode;
  fact_key: string;
  change_type: ChangeType;
  old_value: FactValue | null;
  new_value: FactValue;
  risk_score: RiskScore;
  risk_reasoning: string;
  delta_percent: number | null;
  status: ReviewStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
}

// ----------------------------------------------------------------------------
// Country → supranational memberships
// ----------------------------------------------------------------------------
// When resolving jurisdictional content, the renderer concatenates content
// blocks from ALL layers the user belongs to. A French user sees FR + EU +
// EUROZONE + SEPA + OECD + GLOBAL blocks stacked. Order matters: more-specific
// layers render first.
// ----------------------------------------------------------------------------

export const SUPRANATIONAL_MEMBERSHIPS: Record<CountryCode, JurisdictionLayer[]> = {
  // European Union (Eurozone + SEPA + OECD)
  FR: ['FR', 'EU', 'EUROZONE', 'SEPA', 'OECD', 'GLOBAL'],
  DE: ['DE', 'EU', 'EUROZONE', 'SEPA', 'OECD', 'GLOBAL'],
  ES: ['ES', 'EU', 'EUROZONE', 'SEPA', 'OECD', 'GLOBAL'],
  IT: ['IT', 'EU', 'EUROZONE', 'SEPA', 'OECD', 'GLOBAL'],
  NL: ['NL', 'EU', 'EUROZONE', 'SEPA', 'OECD', 'GLOBAL'],
  BE: ['BE', 'EU', 'EUROZONE', 'SEPA', 'OECD', 'GLOBAL'],
  PT: ['PT', 'EU', 'EUROZONE', 'SEPA', 'OECD', 'GLOBAL'],
  IE: ['IE', 'EU', 'EUROZONE', 'SEPA', 'OECD', 'GLOBAL'],
  AT: ['AT', 'EU', 'EUROZONE', 'SEPA', 'OECD', 'GLOBAL'],
  FI: ['FI', 'EU', 'EUROZONE', 'SEPA', 'OECD', 'GLOBAL'],
  GR: ['GR', 'EU', 'EUROZONE', 'SEPA', 'OECD', 'GLOBAL'],
  // EU non-Eurozone
  PL: ['PL', 'EU', 'SEPA', 'OECD', 'GLOBAL'],
  CZ: ['CZ', 'EU', 'SEPA', 'OECD', 'GLOBAL'],
  SE: ['SE', 'EU', 'SEPA', 'OECD', 'GLOBAL'],
  DK: ['DK', 'EU', 'SEPA', 'OECD', 'GLOBAL'],
  HU: ['HU', 'EU', 'SEPA', 'OECD', 'GLOBAL'],
  RO: ['RO', 'EU', 'SEPA', 'OECD', 'GLOBAL'],
  // Europe non-EU (SEPA)
  UK: ['UK', 'SEPA', 'OECD', 'GLOBAL'],
  CH: ['CH', 'SEPA', 'OECD', 'GLOBAL'],
  NO: ['NO', 'SEPA', 'OECD', 'GLOBAL'],
  // Americas
  US: ['US', 'USMCA', 'OECD', 'GLOBAL'],
  CA: ['CA', 'USMCA', 'OECD', 'GLOBAL'],
  MX: ['MX', 'USMCA', 'OECD', 'GLOBAL'],
  BR: ['BR', 'MERCOSUR', 'GLOBAL'],
  AR: ['AR', 'MERCOSUR', 'GLOBAL'],
  CL: ['CL', 'OECD', 'GLOBAL'],
  CO: ['CO', 'OECD', 'GLOBAL'],
  // Africa
  KE: ['KE', 'EAC', 'AU', 'GLOBAL'],
  NG: ['NG', 'ECOWAS', 'AU', 'GLOBAL'],
  ZA: ['ZA', 'AU', 'GLOBAL'],
  EG: ['EG', 'AU', 'GLOBAL'],
  MA: ['MA', 'AU', 'GLOBAL'],
  GH: ['GH', 'ECOWAS', 'AU', 'GLOBAL'],
  // Middle East
  AE: ['AE', 'GCC', 'GLOBAL'],
  SA: ['SA', 'GCC', 'GLOBAL'],
  // Asia
  IN: ['IN', 'SAARC', 'GLOBAL'],
  JP: ['JP', 'OECD', 'APEC', 'GLOBAL'],
  SG: ['SG', 'ASEAN', 'APEC', 'GLOBAL'],
  ID: ['ID', 'ASEAN', 'APEC', 'GLOBAL'],
  PH: ['PH', 'ASEAN', 'APEC', 'GLOBAL'],
  MY: ['MY', 'ASEAN', 'APEC', 'GLOBAL'],
  TH: ['TH', 'ASEAN', 'APEC', 'GLOBAL'],
  VN: ['VN', 'ASEAN', 'APEC', 'GLOBAL'],
  // Oceania
  AU: ['AU', 'OECD', 'APEC', 'GLOBAL'],
  NZ: ['NZ', 'OECD', 'APEC', 'GLOBAL'],
};

export function resolveMemberships(country: CountryCode | null | undefined): JurisdictionLayer[] {
  if (!country) return ['GLOBAL'];
  return SUPRANATIONAL_MEMBERSHIPS[country] ?? [country, 'GLOBAL'];
}

// ----------------------------------------------------------------------------
// Country metadata (names, flags)
// ----------------------------------------------------------------------------

export interface CountryMeta {
  code: CountryCode;
  name: string;
  flag: string;       // emoji
  currency: string;   // ISO 4217
  region: 'europe' | 'americas' | 'africa' | 'asia' | 'oceania' | 'middle_east';
  localized_coverage: 'full' | 'partial' | 'none';
}

export const COUNTRY_META: Record<CountryCode, CountryMeta> = {
  FR: { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', region: 'europe', localized_coverage: 'full' },
  DE: { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', region: 'europe', localized_coverage: 'full' },
  UK: { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', region: 'europe', localized_coverage: 'full' },
  US: { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', region: 'americas', localized_coverage: 'full' },
  ES: { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR', region: 'europe', localized_coverage: 'partial' },
  IT: { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR', region: 'europe', localized_coverage: 'partial' },
  NL: { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', region: 'europe', localized_coverage: 'partial' },
  BE: { code: 'BE', name: 'Belgium', flag: '🇧🇪', currency: 'EUR', region: 'europe', localized_coverage: 'none' },
  PT: { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR', region: 'europe', localized_coverage: 'none' },
  IE: { code: 'IE', name: 'Ireland', flag: '🇮🇪', currency: 'EUR', region: 'europe', localized_coverage: 'none' },
  AT: { code: 'AT', name: 'Austria', flag: '🇦🇹', currency: 'EUR', region: 'europe', localized_coverage: 'none' },
  FI: { code: 'FI', name: 'Finland', flag: '🇫🇮', currency: 'EUR', region: 'europe', localized_coverage: 'none' },
  GR: { code: 'GR', name: 'Greece', flag: '🇬🇷', currency: 'EUR', region: 'europe', localized_coverage: 'none' },
  PL: { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'PLN', region: 'europe', localized_coverage: 'none' },
  CZ: { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', currency: 'CZK', region: 'europe', localized_coverage: 'none' },
  SE: { code: 'SE', name: 'Sweden', flag: '🇸🇪', currency: 'SEK', region: 'europe', localized_coverage: 'none' },
  DK: { code: 'DK', name: 'Denmark', flag: '🇩🇰', currency: 'DKK', region: 'europe', localized_coverage: 'none' },
  HU: { code: 'HU', name: 'Hungary', flag: '🇭🇺', currency: 'HUF', region: 'europe', localized_coverage: 'none' },
  RO: { code: 'RO', name: 'Romania', flag: '🇷🇴', currency: 'RON', region: 'europe', localized_coverage: 'none' },
  CH: { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currency: 'CHF', region: 'europe', localized_coverage: 'none' },
  NO: { code: 'NO', name: 'Norway', flag: '🇳🇴', currency: 'NOK', region: 'europe', localized_coverage: 'none' },
  CA: { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', region: 'americas', localized_coverage: 'none' },
  MX: { code: 'MX', name: 'Mexico', flag: '🇲🇽', currency: 'MXN', region: 'americas', localized_coverage: 'none' },
  BR: { code: 'BR', name: 'Brazil', flag: '🇧🇷', currency: 'BRL', region: 'americas', localized_coverage: 'none' },
  AR: { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS', region: 'americas', localized_coverage: 'none' },
  CL: { code: 'CL', name: 'Chile', flag: '🇨🇱', currency: 'CLP', region: 'americas', localized_coverage: 'none' },
  CO: { code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: 'COP', region: 'americas', localized_coverage: 'none' },
  KE: { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', region: 'africa', localized_coverage: 'none' },
  NG: { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', region: 'africa', localized_coverage: 'none' },
  ZA: { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', region: 'africa', localized_coverage: 'none' },
  EG: { code: 'EG', name: 'Egypt', flag: '🇪🇬', currency: 'EGP', region: 'africa', localized_coverage: 'none' },
  MA: { code: 'MA', name: 'Morocco', flag: '🇲🇦', currency: 'MAD', region: 'africa', localized_coverage: 'none' },
  GH: { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS', region: 'africa', localized_coverage: 'none' },
  AE: { code: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED', region: 'middle_east', localized_coverage: 'none' },
  SA: { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', region: 'middle_east', localized_coverage: 'none' },
  IN: { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', region: 'asia', localized_coverage: 'none' },
  JP: { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY', region: 'asia', localized_coverage: 'none' },
  SG: { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', region: 'asia', localized_coverage: 'none' },
  ID: { code: 'ID', name: 'Indonesia', flag: '🇮🇩', currency: 'IDR', region: 'asia', localized_coverage: 'none' },
  PH: { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'PHP', region: 'asia', localized_coverage: 'none' },
  MY: { code: 'MY', name: 'Malaysia', flag: '🇲🇾', currency: 'MYR', region: 'asia', localized_coverage: 'none' },
  TH: { code: 'TH', name: 'Thailand', flag: '🇹🇭', currency: 'THB', region: 'asia', localized_coverage: 'none' },
  VN: { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'VND', region: 'asia', localized_coverage: 'none' },
  AU: { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD', region: 'oceania', localized_coverage: 'none' },
  NZ: { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', currency: 'NZD', region: 'oceania', localized_coverage: 'none' },
};

// ----------------------------------------------------------------------------
// JurisdictionGroup block (used in curriculum content)
// ----------------------------------------------------------------------------
// Import ContentBlock from curriculum types where this is imported.
// ----------------------------------------------------------------------------

export interface JurisdictionGroupBlock<TBlock = unknown> {
  type: 'jurisdictionGroup';
  topic: string;
  regions: Partial<Record<JurisdictionLayer, TBlock[]>>;
}
