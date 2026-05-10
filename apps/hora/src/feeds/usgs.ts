import { z } from 'zod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Earthquake {
  id: string;
  lat: number;
  lon: number;
  depth: number;
  magnitude: number;
  place: string;
  time: number;
  tsunami: boolean;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const PropertiesSchema = z.object({
  mag: z.number().nullable().default(null),
  place: z.string().nullable().default(null),
  time: z.number().nullable().default(null),
  tsunami: z.number().default(0),
});

const GeometrySchema = z.object({
  coordinates: z.tuple([z.number(), z.number(), z.number()]),
});

const FeatureSchema = z.object({
  id: z.string(),
  properties: PropertiesSchema,
  geometry: GeometrySchema,
});

const GeoJsonSchema = z.object({
  features: z.array(FeatureSchema).default([]),
});

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

export async function fetchEarthquakes(): Promise<Earthquake[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];

    const json = await res.json();
    const parsed = GeoJsonSchema.safeParse(json);
    if (!parsed.success) return [];

    return parsed.data.features.map((f) => ({
      id: f.id,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      depth: f.geometry.coordinates[2],
      magnitude: f.properties.mag ?? 0,
      place: f.properties.place ?? '',
      time: f.properties.time ?? 0,
      tsunami: f.properties.tsunami === 1,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
