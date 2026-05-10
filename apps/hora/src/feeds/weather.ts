// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeatherAlert {
  id: string;
  event: string;
  severity: string;
  headline: string;
  lat: number;
  lon: number;
  area: string;
  areaDesc?: string;
  onset: string;
  expires: string;
}

// ---------------------------------------------------------------------------
// Fetch – NWS alerts (US) + MeteoAlarm (EU fallback)
// ---------------------------------------------------------------------------

export async function fetchWeatherAlerts(): Promise<WeatherAlert[]> {
  const [us, eu] = await Promise.all([fetchNWS(), fetchMeteoAlarm()]);
  return [...us, ...eu];
}

// ---------------------------------------------------------------------------
// NWS (api.weather.gov)
// ---------------------------------------------------------------------------

async function fetchNWS(): Promise<WeatherAlert[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url =
      'https://api.weather.gov/alerts/active?status=actual&severity=Severe,Extreme';
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/geo+json', 'User-Agent': 'aegis-empire/1.0' },
    });
    if (!res.ok) return [];

    const json = await res.json();
    const features: any[] = json?.features ?? [];
    const alerts: WeatherAlert[] = [];

    for (const f of features) {
      const p = f.properties ?? {};

      // NWS provides an affected-zone polygon or a geocode; derive a rough centroid
      const coords = f.geometry?.coordinates;
      const { lat, lon } = centroidFromGeoJSON(coords);

      alerts.push({
        id: p.id ?? f.id ?? '',
        event: p.event ?? '',
        severity: p.severity ?? '',
        headline: p.headline ?? '',
        lat,
        lon,
        area: p.areaDesc ?? '',
        onset: p.onset ?? '',
        expires: p.expires ?? '',
      });
    }

    return alerts;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// MeteoAlarm (EU) – best-effort; endpoint may be unavailable
// ---------------------------------------------------------------------------

async function fetchMeteoAlarm(): Promise<WeatherAlert[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url = 'https://feeds.meteoalarm.org/api/v1/warnings/feeds-europe';
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];

    const json = await res.json();
    const items: any[] = Array.isArray(json) ? json : json?.warnings ?? [];
    const alerts: WeatherAlert[] = [];

    for (const item of items) {
      alerts.push({
        id: item.id ?? '',
        event: item.event ?? item.awareness_type ?? '',
        severity: item.severity ?? item.awareness_level ?? '',
        headline: item.headline ?? item.description ?? '',
        lat: parseFloat(item.lat) || 0,
        lon: parseFloat(item.lon) || 0,
        area: item.area ?? item.region ?? '',
        onset: item.onset ?? '',
        expires: item.expires ?? '',
      });
    }

    return alerts;
  } catch {
    // EU feed is flaky — degrade gracefully
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function centroidFromGeoJSON(coords: any): { lat: number; lon: number } {
  if (!coords) return { lat: 0, lon: 0 };

  try {
    // Flatten nested coordinate arrays down to [lon, lat] pairs
    const flat: [number, number][] = [];
    const walk = (arr: any) => {
      if (Array.isArray(arr) && typeof arr[0] === 'number') {
        flat.push(arr as [number, number]);
      } else if (Array.isArray(arr)) {
        arr.forEach(walk);
      }
    };
    walk(coords);

    if (flat.length === 0) return { lat: 0, lon: 0 };

    const sumLon = flat.reduce((s, c) => s + c[0], 0);
    const sumLat = flat.reduce((s, c) => s + c[1], 0);
    return { lat: sumLat / flat.length, lon: sumLon / flat.length };
  } catch {
    return { lat: 0, lon: 0 };
  }
}
