// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Fire {
  id?: string;
  lat: number;
  lon: number;
  brightness: number;
  frp: number;
  confidence: string;
  acq_date: string;
  acqDate?: string;   // alias used by display layers
  satellite?: string;
}

// ---------------------------------------------------------------------------
// Fetch – NASA FIRMS VIIRS active fires (CSV)
// ---------------------------------------------------------------------------

const DEMO_KEY = 'DEMO_KEY'; // NASA provides a demo key with low rate limits

export async function fetchFires(): Promise<Fire[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const mapKey =
      ((import.meta as any).env?.VITE_FIRMS_KEY as string | undefined) || DEMO_KEY;

    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/world/1`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];

    const text = await res.text();
    return parseCSV(text);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

function parseCSV(csv: string): Fire[] {
  const lines = csv.split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const colIdx = (name: string) => header.indexOf(name);

  const iLat = colIdx('latitude');
  const iLon = colIdx('longitude');
  const iBright = colIdx('bright_ti4');
  const iFrp = colIdx('frp');
  const iConf = colIdx('confidence');
  const iDate = colIdx('acq_date');

  if (iLat === -1 || iLon === -1) return [];

  const fires: Fire[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split(',');

    fires.push({
      lat: parseFloat(cols[iLat]) || 0,
      lon: parseFloat(cols[iLon]) || 0,
      brightness: parseFloat(cols[iBright]) || 0,
      frp: parseFloat(cols[iFrp]) || 0,
      confidence: cols[iConf]?.trim() ?? '',
      acq_date: cols[iDate]?.trim() ?? '',
    });

    if (fires.length >= 500) break;
  }

  return fires;
}
