// ============================================================================
// Jurisdiction resolver — picks the right content layers for a user
// ============================================================================
// Given a user's country and a JurisdictionGroupBlock, return the content
// blocks that should render, in order. Each block carries its layer label so
// the renderer can badge it ("🇫🇷 France", "🇪🇺 EU", "🌍 Global").
// ============================================================================

import {
  resolveMemberships,
  COUNTRY_META,
  type CountryCode,
  type JurisdictionLayer,
  type JurisdictionGroupBlock,
} from '../../types/regulatory';

export interface ResolvedJurisdictionSection<TBlock> {
  layer: JurisdictionLayer;
  layerLabel: string;     // "France", "European Union", "Global principles"
  layerBadge: string;     // "🇫🇷", "🇪🇺", "🌍"
  blocks: TBlock[];
  isFallback: boolean;    // true when we had to fall through to DEFAULT/GLOBAL
}

const LAYER_LABELS: Record<JurisdictionLayer, { label: string; badge: string }> = {
  EU: { label: 'European Union', badge: '🇪🇺' },
  EUROZONE: { label: 'Eurozone', badge: '💶' },
  SEPA: { label: 'SEPA area', badge: '🏦' },
  OECD: { label: 'OECD', badge: '🌐' },
  USMCA: { label: 'USMCA', badge: '🌎' },
  MERCOSUR: { label: 'Mercosur', badge: '🌎' },
  AU: { label: 'African Union', badge: '🌍' },
  EAC: { label: 'East African Community', badge: '🌍' },
  ECOWAS: { label: 'ECOWAS', badge: '🌍' },
  SAARC: { label: 'SAARC', badge: '🌏' },
  ASEAN: { label: 'ASEAN', badge: '🌏' },
  APEC: { label: 'APEC', badge: '🌏' },
  GCC: { label: 'GCC', badge: '🕌' },
  GLOBAL: { label: 'Global principles', badge: '🌍' },
  DEFAULT: { label: 'Global principles', badge: '🌍' },
};

function layerMeta(layer: JurisdictionLayer): { label: string; badge: string } {
  // Check if it's a country code first
  const country = COUNTRY_META[layer as CountryCode];
  if (country) return { label: country.name, badge: country.flag };
  // Otherwise it's a supranational code
  return LAYER_LABELS[layer] ?? { label: layer, badge: '📌' };
}

/**
 * Resolve which content layers to show for a user's country.
 * Returns an ordered list (most-specific first) of sections with content.
 * If nothing matches the user's memberships, falls back to DEFAULT or GLOBAL.
 */
export function resolveJurisdictionBlock<TBlock>(
  block: JurisdictionGroupBlock<TBlock>,
  userCountry: CountryCode | null | undefined,
): ResolvedJurisdictionSection<TBlock>[] {
  const memberships = resolveMemberships(userCountry ?? undefined);
  const sections: ResolvedJurisdictionSection<TBlock>[] = [];

  for (const layer of memberships) {
    const layerBlocks = block.regions[layer];
    if (layerBlocks && layerBlocks.length > 0) {
      const meta = layerMeta(layer);
      sections.push({
        layer,
        layerLabel: meta.label,
        layerBadge: meta.badge,
        blocks: layerBlocks,
        isFallback: false,
      });
    }
  }

  // If nothing matched, surface DEFAULT (or GLOBAL as a synonym) with a flag.
  if (sections.length === 0) {
    const fallback = block.regions.DEFAULT ?? block.regions.GLOBAL;
    if (fallback && fallback.length > 0) {
      sections.push({
        layer: 'DEFAULT',
        layerLabel: 'Global principles',
        layerBadge: '🌍',
        blocks: fallback,
        isFallback: true,
      });
    }
  }

  return sections;
}

/**
 * Does this block have any content for the user's country specifically?
 * Used to decide whether to show a "content not yet localized" banner.
 */
export function hasLocalizedContent<TBlock>(
  block: JurisdictionGroupBlock<TBlock>,
  userCountry: CountryCode | null | undefined,
): boolean {
  if (!userCountry) return false;
  const regions = block.regions;
  return !!(regions[userCountry] && regions[userCountry]!.length > 0);
}
