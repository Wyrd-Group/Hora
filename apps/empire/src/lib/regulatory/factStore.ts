// ============================================================================
// Regulatory fact store + interpolation helper
// ============================================================================
// Runtime cache of approved jurisdictional facts. Populated on app boot via
// loadFacts() → reads from Supabase, falls back to empty map if offline.
// ============================================================================

import { supabase } from '../supabase';
import type {
  CountryCode,
  JurisdictionalFact,
  FactValue,
} from '../../types/regulatory';

// ----------------------------------------------------------------------------
// In-memory cache: country_code → fact_key → fact
// ----------------------------------------------------------------------------

type FactMap = Map<string, JurisdictionalFact>;
const factCache: Map<CountryCode, FactMap> = new Map();
let loaded = false;
let loadPromise: Promise<void> | null = null;

export async function loadFacts(force = false): Promise<void> {
  if (loaded && !force) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('jurisdictional_facts')
        .select('id, country_code, topic, fact_key, value, display_value, source_url, source_excerpt, confidence, fetched_at, status, approved_at, effective_from')
        .eq('status', 'approved');

      if (error) {
        console.warn('[regulatory] loadFacts error:', error.message);
        return;
      }

      factCache.clear();
      for (const row of (data ?? []) as JurisdictionalFact[]) {
        let countryMap = factCache.get(row.country_code);
        if (!countryMap) {
          countryMap = new Map();
          factCache.set(row.country_code, countryMap);
        }
        countryMap.set(row.fact_key, row);
      }
      loaded = true;
    } catch (err) {
      console.warn('[regulatory] loadFacts threw:', err);
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export function getFact(country: CountryCode, factKey: string): JurisdictionalFact | null {
  return factCache.get(country)?.get(factKey) ?? null;
}

export function getAllFactsForCountry(country: CountryCode): JurisdictionalFact[] {
  const m = factCache.get(country);
  return m ? Array.from(m.values()) : [];
}

export function getMostRecentFetch(country: CountryCode): string | null {
  const facts = getAllFactsForCountry(country);
  if (facts.length === 0) return null;
  return facts.reduce((acc, f) => (f.fetched_at > acc ? f.fetched_at : acc), facts[0].fetched_at);
}

// ----------------------------------------------------------------------------
// Interpolation: replace {{FR.isa_annual_allowance}} in strings with live value
// ----------------------------------------------------------------------------
// Syntax variants:
//   {{FR.isa_annual_allowance}}          — display_value, or fallback
//   {{FR.isa_annual_allowance:amount}}   — specific field from value json
//   {{FR.isa_annual_allowance:rate%}}    — rate as percentage with % symbol
//   {{FR.isa_annual_allowance|fallback}} — provide fallback if missing
// ----------------------------------------------------------------------------

const INTERP_RE = /\{\{([A-Z]{2})\.([a-z_0-9]+)(?::([a-z_%]+))?(?:\|([^}]+))?\}\}/g;

export function interpolateText(
  text: string,
  country: CountryCode | null | undefined,
): string {
  if (!text || !text.includes('{{')) return text;
  return text.replace(INTERP_RE, (match, fcountry: string, key: string, field?: string, fallback?: string) => {
    const effectiveCountry = fcountry === 'USER' ? (country ?? null) : fcountry;
    if (!effectiveCountry) return fallback ?? match;

    const fact = getFact(effectiveCountry, key);
    if (!fact) return fallback ?? `[${effectiveCountry}.${key} not localized]`;

    if (!field) return fact.display_value ?? renderFallback(fact.value);

    // Handle field:percent suffix (e.g. "rate%")
    if (field.endsWith('%')) {
      const baseField = field.slice(0, -1) as keyof FactValue;
      const raw = fact.value[baseField];
      if (typeof raw === 'number') {
        return `${(raw * 100).toFixed(2).replace(/\.?0+$/, '')}%`;
      }
      return fallback ?? match;
    }

    const raw = fact.value[field as keyof FactValue];
    if (raw === undefined || raw === null) return fallback ?? match;
    return String(raw);
  });
}

function renderFallback(value: FactValue): string {
  if (typeof value.amount === 'number' && value.currency) {
    return `${value.currency} ${value.amount.toLocaleString()}`;
  }
  if (typeof value.rate === 'number') {
    return `${(value.rate * 100).toFixed(2).replace(/\.?0+$/, '')}%`;
  }
  if (value.notes) return value.notes;
  return JSON.stringify(value);
}

// ----------------------------------------------------------------------------
// Freshness helpers
// ----------------------------------------------------------------------------

export function isFactFresh(fact: JurisdictionalFact, maxAgeDays = 45): boolean {
  const fetched = new Date(fact.fetched_at).getTime();
  const age = (Date.now() - fetched) / (1000 * 60 * 60 * 24);
  return age <= maxAgeDays;
}

export function formatVerifiedDate(iso: string | null): string {
  if (!iso) return 'not verified';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}
