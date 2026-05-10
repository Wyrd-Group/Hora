// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vessel {
  mmsi: number;
  name: string;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
  shipType: number;
  flag?: string;
  destination?: string;
}

// ---------------------------------------------------------------------------
// Primary: AISStream WebSocket (requires API key)
// ---------------------------------------------------------------------------

/**
 * Opens a WebSocket to AISStream and calls `onMessage` for each decoded vessel.
 * Returns a teardown function that closes the socket.
 */
export function connectAISStream(
  apiKey: string,
  bbox: [number, number, number, number],
  onMessage: (v: Vessel) => void,
): () => void {
  const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: [
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ],
        ],
        FiltersShipMMSI: [],
        FilterMessageTypes: ['PositionReport'],
      }),
    );
  };

  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      const meta = msg.MetaData ?? {};
      const pos = msg.Message?.PositionReport ?? {};

      onMessage({
        mmsi: meta.MMSI ?? 0,
        name: (meta.ShipName ?? '').trim(),
        lat: pos.Latitude ?? 0,
        lon: pos.Longitude ?? 0,
        heading: pos.TrueHeading ?? 0,
        speed: pos.Sog ?? 0,
        shipType: meta.ShipType ?? 0,
      });
    } catch {
      // skip malformed messages
    }
  };

  return () => {
    ws.close();
  };
}

// ---------------------------------------------------------------------------
// Fallback: Finnish Digitraffic AIS (free, no key)
// ---------------------------------------------------------------------------

export async function fetchShips(): Promise<Vessel[]> {
  const apiKey = (import.meta as any).env?.VITE_AIS_KEY as string | undefined;

  // If an API key is available, do a one-shot gather from AISStream for 3 s
  if (apiKey) {
    return gatherFromStream(apiKey, 3000);
  }

  // Otherwise fall back to Digitraffic
  return fetchDigitraffic();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchDigitraffic(): Promise<Vessel[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url = 'https://meri.digitraffic.fi/api/ais/v1/locations';
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];

    const json = await res.json();
    const features: any[] = json?.features ?? [];
    const vessels: Vessel[] = [];

    for (const f of features) {
      const props = f.properties ?? {};
      const coords = f.geometry?.coordinates ?? [0, 0];

      vessels.push({
        mmsi: props.mmsi ?? 0,
        name: '', // Digitraffic location endpoint does not include name
        lat: coords[1] ?? 0,
        lon: coords[0] ?? 0,
        heading: props.heading ?? 0,
        speed: props.sog ?? 0,
        shipType: props.shipType ?? 0,
      });

      if (vessels.length >= 300) break;
    }

    return vessels;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function gatherFromStream(apiKey: string, durationMs: number): Promise<Vessel[]> {
  return new Promise((resolve) => {
    const vessels: Vessel[] = [];
    const bbox: [number, number, number, number] = [-90, -180, 90, 180]; // world

    const close = connectAISStream(apiKey, bbox, (v) => {
      vessels.push(v);
      if (vessels.length >= 300) {
        clearTimeout(timer);
        close();
        resolve(vessels);
      }
    });

    const timer = setTimeout(() => {
      close();
      resolve(vessels);
    }, durationMs);
  });
}
