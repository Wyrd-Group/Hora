/**
 * GovernmentLayer — Deck.GL H3 hexagon overlay showing country territories.
 * Colors countries by status: sovereign (blue), puppet (purple), contested (yellow), failed_state (red).
 * Player-controlled countries glow green.
 */

import { useMemo } from 'react';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { useWorldPoliticsStore } from '../../store/worldPoliticsStore';

const STATUS_COLOR = {
  sovereign:    [59, 130, 246, 60],   // blue
  puppet:       [168, 85, 247, 60],   // purple
  contested:    [245, 158, 11, 80],   // amber
  failed_state: [239, 68, 68, 80],    // red
};

const PLAYER_GOV_COLOR = [16, 185, 129, 90]; // green for player-controlled

export function useGovernmentLayers(zoom) {
  const countries = useWorldPoliticsStore(s => s.countries);
  const governments = useWorldPoliticsStore(s => s.governments);

  return useMemo(() => {
    if (zoom > 6) return [];

    const countryList = Object.values(countries);
    if (countryList.length === 0) return [];

    // Build set of country IDs with active player governments
    const playerGovCountries = new Set(
      Object.values(governments)
        .filter(g => g.status === 'active')
        .map(g => g.country_id)
    );

    // Flatten all country H3 cells into layer data
    const hexData = [];
    for (const country of countryList) {
      if (!country.territory_h3 || country.territory_h3.length === 0) continue;
      const isPlayerControlled = playerGovCountries.has(country.id);
      const color = isPlayerControlled
        ? PLAYER_GOV_COLOR
        : (STATUS_COLOR[country.status] || STATUS_COLOR.sovereign);

      for (const h3 of country.territory_h3) {
        hexData.push({
          hex: h3,
          color,
          countryId: country.id,
          countryName: country.name,
          status: country.status,
          isPlayerControlled,
        });
      }
    }

    if (hexData.length === 0) return [];

    return [
      new H3HexagonLayer({
        id: 'government-territories',
        data: hexData,
        getHexagon: d => d.hex,
        getFillColor: d => d.color,
        getElevation: d => d.isPlayerControlled ? 5000 : 0,
        elevationScale: 1,
        extruded: true,
        pickable: true,
        stroked: true,
        getLineColor: d => d.isPlayerControlled ? [16, 185, 129, 120] : [255, 255, 255, 20],
        getLineWidth: 1,
        lineWidthMinPixels: 1,
      }),
    ];
  }, [countries, governments, zoom]);
}
