import { z } from 'zod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Aircraft {
  icao: string;
  callsign: string;
  lat: number;
  lon: number;
  alt_baro: number;
  heading: number;
  speed: number;
  category: string;
  registration: string;
}

// ---------------------------------------------------------------------------
// Zod schema – runtime validation for each aircraft record
// ---------------------------------------------------------------------------

const AircraftSchema = z.object({
  hex: z.string().default(''),
  flight: z.string().optional().default(''),
  lat: z.number().optional().default(0),
  lon: z.number().optional().default(0),
  alt_baro: z.union([z.number(), z.string()]).optional().default(0),
  track: z.number().optional().default(0),
  gs: z.number().optional().default(0),
  category: z.string().optional().default(''),
  r: z.string().optional().default(''),
});

const ResponseSchema = z.object({
  ac: z.array(z.any()).optional().default([]),
});

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

export async function fetchFlights(lat: number, lon: number): Promise<Aircraft[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/250`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];

    const json = await res.json();
    const parsed = ResponseSchema.safeParse(json);
    if (!parsed.success) return [];

    const results: Aircraft[] = [];

    for (const raw of parsed.data.ac) {
      const ac = AircraftSchema.safeParse(raw);
      if (!ac.success) continue;

      results.push({
        icao: ac.data.hex,
        callsign: (ac.data.flight ?? '').trim(),
        lat: ac.data.lat ?? 0,
        lon: ac.data.lon ?? 0,
        alt_baro: typeof ac.data.alt_baro === 'number' ? ac.data.alt_baro : 0,
        heading: ac.data.track ?? 0,
        speed: ac.data.gs ?? 0,
        category: ac.data.category ?? '',
        registration: ac.data.r ?? '',
      });

      if (results.length >= 500) break;
    }

    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
