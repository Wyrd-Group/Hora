// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Conflict {
  id: string;
  lat: number;
  lon: number;
  goldstein: number;
  numArticles: number;
  title: string;
  url: string;
  sourceCountry: string;
  eventType?: string;
  country?: string;
  region?: string;
  fatalities?: number;
  date?: string;
  source?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Fetch – GDELT GEO 2.0 API (GeoJSON)
// ---------------------------------------------------------------------------

export async function fetchConflicts(): Promise<Conflict[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url =
      'https://api.gdeltproject.org/api/v2/geo/geo?query=conflict&format=geojson&timespan=24h';
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];

    const json = await res.json();
    const features: any[] = json?.features ?? [];
    const conflicts: Conflict[] = [];

    for (const f of features) {
      const p = f.properties ?? {};
      const coords = f.geometry?.coordinates ?? [0, 0];
      const goldstein = parseFloat(p.goldstein ?? p.goldsteinscale ?? '0') || 0;

      // Only keep negative Goldstein scores (conflict / instability)
      if (goldstein >= 0) continue;

      conflicts.push({
        id: p.url ?? p.urlmobile ?? `${coords[0]}_${coords[1]}`,
        lon: coords[0],
        lat: coords[1],
        goldstein,
        numArticles: parseInt(p.numarticles ?? p.numarts ?? '1', 10) || 1,
        title: p.name ?? p.html ?? '',
        url: p.url ?? p.urlmobile ?? '',
        sourceCountry: p.sourcecountry ?? p.countrycode ?? '',
      });
    }

    return conflicts;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
