// Shared types across regulatory Edge Functions.

export interface RegulatorySource {
  id: string;
  country_code: string;
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

export interface FactValue {
  amount?: number;
  currency?: string;
  unit?: string;          // 'annual' | 'monthly' | 'per_person'
  rate?: number;          // for percentages: 0.25 = 25%
  threshold_low?: number;
  threshold_high?: number;
  effective_from?: string; // ISO date
  effective_until?: string;
  notes?: string;
}

export interface ExtractedFact {
  fact_key: string;
  value: FactValue;
  display_value: string;
  confidence: number;       // 0..1
  source_excerpt: string;   // verbatim quote ≤ 500 chars
  effective_from?: string;
}

export interface ExtractionResult {
  country_code: string;
  topic: string;
  source_url: string;
  source_id: string;
  extracted_at: string;
  facts: ExtractedFact[];
  extraction_error?: string;
}

export interface JurisdictionalFact {
  id: string;
  country_code: string;
  topic: string;
  fact_key: string;
  value: FactValue;
  display_value: string | null;
  source_id: string | null;
  source_url: string | null;
  source_excerpt: string | null;
  confidence: number;
  fetched_at: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'superseded';
  effective_from: string | null;
  approved_at: string | null;
}

export interface ReviewQueueEntry {
  new_fact_id: string;
  previous_fact_id: string | null;
  country_code: string;
  fact_key: string;
  change_type: 'new_fact' | 'value_change' | 'structural_change' | 'deprecation';
  old_value: FactValue | null;
  new_value: FactValue;
  risk_score: 'low' | 'medium' | 'high';
  risk_reasoning: string;
  delta_percent: number | null;
}
