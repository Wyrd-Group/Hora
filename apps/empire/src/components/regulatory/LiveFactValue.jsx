// ============================================================================
// LiveFactValue — renders a single live regulatory fact with source badge
// ============================================================================
// Usage:
//   <LiveFactValue country="UK" factKey="isa_annual_allowance" />
//   <LiveFactValue country="FR" factKey="pea_cap" fallback="€150,000" />
// ============================================================================

import React from 'react';
import { getFact } from '../../lib/regulatory/factStore';
import { RegulatoryDisclaimerCompact } from './RegulatoryDisclaimer';

export function LiveFactValue({
  country,
  factKey,
  fallback = null,
  showSource = true,
  inline = true,
}) {
  const fact = getFact(country, factKey);

  if (!fact) {
    return (
      <span className="text-stone-400 italic" title="Live value not available">
        {fallback ?? `${country}.${factKey}`}
      </span>
    );
  }

  const display = fact.display_value ?? fallback ?? `${fact.value.currency ?? ''} ${fact.value.amount ?? ''}`.trim();

  if (inline && !showSource) {
    return <span className="font-semibold text-amber-200">{display}</span>;
  }

  const Wrapper = inline ? 'span' : 'div';

  return (
    <Wrapper className={inline ? 'inline-flex flex-col items-start' : 'flex flex-col'}>
      <span className="font-semibold text-amber-200">{display}</span>
      {showSource && (
        <RegulatoryDisclaimerCompact
          country={fact.country_code}
          authority={extractAuthority(fact.source_url)}
          sourceUrl={fact.source_url}
          lastVerifiedAt={fact.fetched_at}
        />
      )}
    </Wrapper>
  );
}

function extractAuthority(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host;
  } catch {
    return null;
  }
}

export default LiveFactValue;
