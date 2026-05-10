import * as satellite from 'satellite.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TLERecord {
  name: string;
  line1: string;
  line2: string;
  noradId: string;
}

export interface SatPosition {
  lat: number;
  lon: number;
  alt: number;
}

// ---------------------------------------------------------------------------
// Fetch TLE catalogue
// ---------------------------------------------------------------------------

export async function fetchTLEs(): Promise<TLERecord[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];

    const text = await res.text();
    const lines = text.split('\n').map((l) => l.trimEnd());
    const records: TLERecord[] = [];

    // TLE format: every 3 non-empty lines → name / line1 / line2
    let i = 0;
    while (i + 2 < lines.length) {
      const name = lines[i].trim();
      const line1 = lines[i + 1];
      const line2 = lines[i + 2];

      if (!line1 || !line2) {
        i += 1;
        continue;
      }

      // Extract NORAD catalogue number from line1 columns 3-7
      const noradId = line1.substring(2, 7).trim();

      records.push({ name, line1, line2, noradId });
      i += 3;
    }

    return records;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Propagate TLE to a lat/lon/alt at a given date
// ---------------------------------------------------------------------------

export function propagatePosition(tle: TLERecord, date: Date): SatPosition {
  const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
  const posVel = satellite.propagate(satrec, date);

  if (!posVel.position || typeof posVel.position === 'boolean') {
    return { lat: 0, lon: 0, alt: 0 };
  }

  const gmst = satellite.gstime(date);
  const geo = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);

  return {
    lat: satellite.degreesLat(geo.latitude),
    lon: satellite.degreesLong(geo.longitude),
    alt: geo.height, // km above ellipsoid
  };
}
