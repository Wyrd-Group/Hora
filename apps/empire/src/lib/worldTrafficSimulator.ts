/**
 * worldTrafficSimulator.ts — Living World Vehicle Simulation
 *
 * Generates hundreds of moving vehicles across the globe:
 * - Ships on sea corridors
 * - Planes on air routes
 * - Trucks on land highways
 * - Trains on rail corridors
 * - Cars in city clusters
 *
 * Each vehicle has live telemetry: speed, heading, cargo, owner,
 * destination, fuel, status, and can be inspected on click.
 *
 * Animation runs via requestAnimationFrame for smooth 60fps movement.
 */

// ── Types ──────────────────────────────────────────────────────

export type VehicleType = 'ship' | 'plane' | 'truck' | 'train' | 'car';
export type VehicleStatus = 'moving' | 'docked' | 'loading' | 'refueling' | 'delayed' | 'emergency';

export interface Vehicle {
  id: string;
  type: VehicleType;
  callsign: string;
  owner: string;
  cargo: string;
  cargoWeight: string;
  origin: string;
  destination: string;
  status: VehicleStatus;
  speed: number;       // km/h
  maxSpeed: number;
  heading: number;     // degrees
  altitude: number;    // meters (planes only)
  fuel: number;        // 0-100%
  flag: string;        // country flag emoji
  // Position (interpolated)
  lng: number;
  lat: number;
  // Path — multi-waypoint route
  waypoints: [number, number][];  // full route as [lng, lat][]
  currentSegment: number;         // index into waypoints (0 to len-2)
  segmentProgress: number;        // 0-1 within current segment
  // Legacy accessors (kept for backward compat)
  fromLng: number;
  fromLat: number;
  toLng: number;
  toLat: number;
  progress: number;    // 0-1 along TOTAL path
  progressSpeed: number; // how fast progress moves per tick
  // Live data
  temperature: number; // cargo temp (reefer)
  crewSize: number;
  estimatedArrival: string;
  value: string;       // cargo value
  insured: boolean;
  hazmat: boolean;
  flagged: boolean;    // suspicious
}

// ── Data Pools ─────────────────────────────────────────────────

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const rng = (min: number, max: number) => min + Math.random() * (max - min);
const uid = () => `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const SHIP_NAMES = [
  'MSC Oscar', 'Ever Given', 'CSCL Globe', 'MOL Triumph', 'Barzan', 'Madrid Maersk',
  'CMA CGM Antoine', 'OOCL Hong Kong', 'Cosco Galaxy', 'NYK Vega', 'MSC Gulsun',
  'HMM Algeciras', 'Ever Ace', 'MSC Tessa', 'Jacques Saade', 'MSC Irina', 'Seawise Giant',
  'Knock Nevis', 'Emma Maersk', 'Eugen Maersk', 'Eleonora Maersk', 'Estelle Maersk',
  'Evelyn Maersk', 'Sine Maersk', 'Sovereign Maersk', 'Safmarine Meru', 'NYK Arcadia',
];

const PLANE_CALLSIGNS = [
  'UAE-412', 'QTR-801', 'SIA-321', 'BAW-117', 'DLH-490', 'AFR-275', 'AAL-100',
  'UAL-872', 'CPA-840', 'KAL-023', 'THY-033', 'ETH-501', 'SAA-203', 'LAN-800',
  'QFA-009', 'ANZ-001', 'JAL-061', 'ANA-176', 'VIR-003', 'EZY-832', 'FDX-5190',
  'UPS-2841', 'CLX-798', 'ABW-127', 'GTI-4512', 'MAS-370', 'SWR-117', 'KLM-605',
];

const TRUCK_IDS = [
  'EU-TRK-4481', 'US-FRT-2290', 'CN-LOG-8812', 'IN-HWY-3351', 'BR-ROD-6624',
  'RU-MAG-1137', 'JP-EXP-9903', 'AU-RTE-5571', 'MX-CAR-7784', 'ZA-TRK-2201',
  'DE-SPD-3340', 'FR-AUT-1188', 'UK-M25-4490', 'IT-A1-6672', 'ES-AP7-8831',
  'TR-E80-2203', 'PL-A2-5510', 'NL-A4-1123', 'SE-E4-7789', 'NO-E6-3345',
];

const TRAIN_IDS = [
  'CN-RAIL-001', 'DB-ICE-482', 'SNCF-TGV-310', 'JR-SHINK-700', 'RZD-TRANS-1',
  'AMTK-ACELA-2', 'NS-INT-180', 'SBB-EC-32', 'RENFE-AVE-90', 'CP-ALFA-440',
  'KTX-101', 'THSR-600', 'XRL-G12', 'TGV-LYRIA-99', 'EUROSTAR-9014',
];

const CAR_PLATES = [
  'AB-1234', 'CD-5678', 'EF-9012', 'GH-3456', 'IJ-7890', 'KL-2345', 'MN-6789',
  'OP-0123', 'QR-4567', 'ST-8901', 'UV-3210', 'WX-7654', 'YZ-1098', 'AA-5432',
  'BB-9876', 'CC-2109', 'DD-6543', 'EE-0987', 'FF-4321', 'GG-8765',
];

const OWNERS = [
  'Maersk Logistics', 'DHL Global', 'FedEx Corp', 'UPS Supply Chain', 'DB Schenker',
  'Kuehne+Nagel', 'XPO Logistics', 'CMA CGM Log', 'Hapag-Lloyd', 'Nippon Express',
  'Bolloré Logistics', 'DSV Panalpina', 'GEODIS', 'Agility', 'Kerry Logistics',
  'Sinotrans', 'CEVA Logistics', 'Hellmann', 'Toll Group', 'Yusen Logistics',
  'Player Fleet', 'Player Fleet', 'Player Fleet', // weighted for player
];

const CARGO_TYPES = [
  'Crude Oil', 'LNG', 'Container (Mixed)', 'Iron Ore', 'Coal', 'Grain (Wheat)',
  'Automobiles', 'Electronics', 'Pharmaceuticals', 'Chemicals (Hazmat)',
  'Frozen Seafood', 'Textiles', 'Machinery', 'Steel Coils', 'Lumber',
  'Lithium Batteries', 'Semiconductor Chips', 'Medical Supplies', 'Luxury Goods',
  'Fresh Produce', 'Livestock Feed', 'Fertilizer', 'Cement', 'Plastics',
  'Arms & Defense', 'Rare Earth Metals', 'Copper Wire', 'Coffee Beans',
];

const FLAGS = ['🇳🇱', '🇩🇪', '🇬🇧', '🇺🇸', '🇨🇳', '🇯🇵', '🇰🇷', '🇸🇬', '🇦🇪', '🇳🇴', '🇩🇰', '🇬🇷', '🇵🇦', '🇱🇷', '🇲🇭', '🇲🇹', '🇭🇰', '🇮🇹', '🇫🇷', '🇧🇷'];

const CITY_CLUSTERS: [number, number, string][] = [
  // [lng, lat, name]
  [-74.0, 40.7, 'New York'], [-87.6, 41.9, 'Chicago'], [-118.2, 34.1, 'Los Angeles'],
  [-0.12, 51.5, 'London'], [2.35, 48.9, 'Paris'], [13.4, 52.5, 'Berlin'],
  [139.7, 35.7, 'Tokyo'], [121.5, 31.2, 'Shanghai'], [116.4, 39.9, 'Beijing'],
  [103.8, 1.3, 'Singapore'], [55.3, 25.3, 'Dubai'], [37.6, 55.8, 'Moscow'],
  [-46.6, -23.5, 'São Paulo'], [28.0, -26.2, 'Johannesburg'], [151.2, -33.9, 'Sydney'],
  [72.9, 19.1, 'Mumbai'], [100.5, 13.8, 'Bangkok'], [126.9, 37.6, 'Seoul'],
  [-99.1, 19.4, 'Mexico City'], [31.2, 30.0, 'Cairo'], [36.8, -1.3, 'Nairobi'],
  [3.4, 6.5, 'Lagos'], [-43.2, -22.9, 'Rio de Janeiro'], [114.2, 22.3, 'Hong Kong'],
  [10.2, 36.8, 'Tunis'], [23.7, 37.9, 'Athens'], [29.0, 41.0, 'Istanbul'],
  [-3.7, 40.4, 'Madrid'], [12.5, 41.9, 'Rome'], [18.1, 59.3, 'Stockholm'],
];

// Multi-waypoint corridor type: array of [lng, lat] waypoints
type Corridor = [number, number][];

// Sea corridors — major shipping lanes with realistic offshore waypoints
const SEA_CORRIDORS: Corridor[] = [
  // Europe → US East (English Channel, across North Atlantic — stay well offshore)
  [[-5.5, 48.4], [-8.0, 47.5], [-15.0, 47.0], [-30.0, 44.0], [-50.0, 42.0], [-70.0, 40.5], [-74.0, 40.7]],
  // Japan → US West (great circle across North Pacific — deep ocean)
  [[140.5, 34.8], [145.0, 36.0], [155.0, 40.0], [175.0, 44.0], [-170.0, 46.0], [-150.0, 43.0], [-130.0, 38.0], [-118.5, 33.9]],
  // Singapore → Dubai (Malacca Strait → Indian Ocean → Gulf of Oman)
  [[103.8, 1.3], [99.5, 4.5], [93.0, 8.0], [82.0, 8.5], [72.0, 12.0], [62.0, 20.0], [57.0, 24.5], [56.0, 25.5]],
  // Dubai → Mediterranean (Red Sea → Suez Canal → Eastern Med)
  [[56.0, 25.5], [54.0, 24.0], [45.0, 13.0], [43.0, 12.8], [41.5, 14.5], [38.5, 20.0], [34.5, 27.0], [32.6, 31.5], [30.0, 33.0], [26.0, 35.5], [23.7, 37.9]],
  // Portugal → Cape Town (down Africa's west coast — well offshore)
  [[-9.5, 38.5], [-12.0, 34.0], [-18.0, 24.0], [-20.0, 16.0], [-18.0, 10.0], [-10.0, 3.0], [2.0, -5.0], [10.0, -15.0], [15.0, -28.0], [18.4, -33.9]],
  // Shanghai → Singapore (South China Sea — offshore eastern coast)
  [[122.5, 30.5], [120.0, 25.0], [117.0, 20.0], [113.0, 14.0], [110.0, 8.0], [106.0, 3.0], [103.8, 1.3]],
  // Marseille → Istanbul (western Med, past Sardinia/Sicily/Crete)
  [[5.4, 43.0], [7.5, 41.5], [11.0, 38.5], [16.0, 37.0], [21.0, 35.5], [25.0, 36.0], [27.0, 38.0], [29.0, 41.0]],
  // Miami → Caribbean (open sea route)
  [[-80.2, 25.8], [-79.0, 23.0], [-76.0, 20.0], [-72.0, 16.0], [-67.0, 11.0]],
  // Vladivostok → Tokyo (Sea of Japan → Pacific)
  [[131.9, 43.1], [133.0, 40.0], [135.5, 37.0], [140.0, 35.5]],
  // Stockholm → London (Baltic → North Sea — through Kattegat)
  [[18.5, 59.3], [13.0, 57.5], [10.5, 57.5], [7.0, 56.5], [4.0, 54.0], [1.5, 52.5], [0.5, 51.5]],
  // Lagos → São Paulo (transatlantic southern — open ocean)
  [[3.5, 6.0], [1.0, 4.0], [-8.0, 1.0], [-18.0, -3.0], [-28.0, -10.0], [-38.0, -18.0], [-46.3, -23.9]],
  // Mumbai → Sydney (across Indian Ocean — well south of land)
  [[72.5, 18.5], [76.0, 12.0], [82.0, 5.0], [88.0, -2.0], [97.0, -8.0], [108.0, -12.0], [120.0, -20.0], [135.0, -28.0], [151.2, -33.9]],
  // Tunis → Port Said (North African coast — stay offshore in Med)
  [[10.5, 37.0], [14.0, 35.5], [19.0, 34.0], [24.0, 33.5], [29.0, 32.5], [32.3, 31.5]],
  // Tianjin → Busan (Yellow Sea → Korea Strait — open water)
  [[117.7, 38.9], [121.0, 36.0], [124.0, 35.0], [127.0, 35.0], [129.0, 35.1]],
];

// Air corridors — major flight paths with great-circle waypoints
const AIR_CORRIDORS: Corridor[] = [
  // NYC → London (North Atlantic Track)
  [[-74.0, 40.7], [-50.0, 50.0], [-25.0, 54.0], [-0.12, 51.5]],
  // Dubai → London (over Turkey, Europe)
  [[55.3, 25.3], [40.0, 35.0], [25.0, 42.0], [10.0, 48.0], [-0.12, 51.5]],
  // Singapore → London (over India, Middle East, Europe)
  [[103.8, 1.3], [80.0, 15.0], [55.0, 30.0], [30.0, 40.0], [10.0, 48.0], [-0.12, 51.5]],
  // Tokyo → LA (North Pacific great circle)
  [[139.7, 35.7], [160.0, 42.0], [180.0, 48.0], [-160.0, 48.0], [-140.0, 42.0], [-118.2, 34.1]],
  // NYC → Paris
  [[-74.0, 40.7], [-45.0, 48.0], [-20.0, 50.0], [2.35, 48.9]],
  // Shanghai → Dubai
  [[121.5, 31.2], [105.0, 28.0], [80.0, 25.0], [55.3, 25.3]],
  // Mumbai → London
  [[72.9, 19.1], [55.0, 30.0], [35.0, 40.0], [15.0, 47.0], [-0.12, 51.5]],
  // São Paulo → NYC
  [[-46.6, -23.5], [-50.0, -10.0], [-55.0, 5.0], [-65.0, 20.0], [-74.0, 40.7]],
  // Sydney → Singapore
  [[151.2, -33.9], [135.0, -20.0], [120.0, -10.0], [110.0, -5.0], [103.8, 1.3]],
  // LA → Tokyo
  [[-118.2, 34.1], [-140.0, 42.0], [-160.0, 48.0], [180.0, 48.0], [160.0, 42.0], [139.7, 35.7]],
  // Berlin → Moscow
  [[13.4, 52.5], [20.0, 53.5], [28.0, 55.0], [37.6, 55.8]],
  // Nairobi → Dubai
  [[36.8, -1.3], [42.0, 10.0], [48.0, 18.0], [55.3, 25.3]],
  // Hong Kong → Tokyo
  [[114.2, 22.3], [120.0, 25.0], [128.0, 30.0], [135.0, 33.0], [139.7, 35.7]],
  // Mexico City → NYC
  [[-99.1, 19.4], [-90.0, 25.0], [-82.0, 30.0], [-74.0, 40.7]],
  // Johannesburg → Dubai
  [[28.0, -26.2], [35.0, -10.0], [42.0, 5.0], [50.0, 18.0], [55.3, 25.3]],
];

// Land corridors — highways and rail with intermediate cities/junctions
const LAND_CORRIDORS: Corridor[] = [
  // Paris → Berlin (via Strasbourg, Stuttgart)
  [[2.35, 48.9], [4.0, 49.0], [7.75, 48.58], [9.18, 48.78], [11.58, 48.14], [13.4, 52.5]],
  // Berlin → Warsaw
  [[13.4, 52.5], [14.55, 52.39], [17.03, 51.77], [19.94, 51.75], [21.0, 52.2]],
  // Chicago → NYC (via Cleveland, Pittsburgh, Philadelphia)
  [[-87.6, 41.9], [-84.5, 41.5], [-81.7, 41.5], [-80.0, 40.4], [-75.2, 40.0], [-74.0, 40.7]],
  // LA → Chicago (via Phoenix, Albuquerque, Kansas City)
  [[-118.2, 34.1], [-112.1, 33.4], [-106.7, 35.1], [-97.3, 37.7], [-94.6, 39.1], [-87.6, 41.9]],
  // Beijing → Shanghai (via Jinan, Nanjing)
  [[116.4, 39.9], [117.0, 36.7], [117.0, 34.0], [118.8, 32.1], [121.5, 31.2]],
  // Moscow → Berlin (via Minsk, Warsaw)
  [[37.6, 55.8], [30.3, 53.9], [27.6, 53.9], [21.0, 52.2], [14.55, 52.39], [13.4, 52.5]],
  // Mumbai → Delhi (via Ahmedabad, Jaipur)
  [[72.9, 19.1], [72.6, 23.0], [75.8, 26.9], [77.2, 28.6]],
  // Istanbul → Athens (via Thessaloniki)
  [[29.0, 41.0], [26.5, 41.1], [22.95, 40.64], [23.7, 37.9]],
  // Madrid → Paris (via Bordeaux)
  [[-3.7, 40.4], [-1.0, 42.8], [-0.58, 44.84], [0.0, 46.0], [2.35, 48.9]],
  // Rome → Berlin (via Florence, Munich)
  [[12.5, 41.9], [11.25, 43.77], [11.4, 47.3], [11.58, 48.14], [13.4, 52.5]],
  // São Paulo → Rio
  [[-46.6, -23.5], [-44.5, -23.0], [-43.2, -22.9]],
  // Bangkok → Singapore (via Kuala Lumpur)
  [[100.5, 13.8], [100.5, 7.0], [101.7, 3.15], [103.8, 1.3]],
  // Seoul → Tokyo (Busan ferry + sea)
  [[126.9, 37.6], [129.0, 35.1], [132.0, 34.0], [135.5, 34.7], [139.7, 35.7]],
  // Stockholm → Helsinki
  [[18.1, 59.3], [20.0, 59.8], [22.5, 60.0], [24.9, 60.2]],
];

// ── Vehicle Emoji ──────────────────────────────────────────────

// DeckGL TextLayer default font only supports basic ASCII/Latin
export const VEHICLE_EMOJI: Record<VehicleType, string> = {
  ship:  'S',
  plane: 'A',
  truck: 'T',
  train: 'R',
  car:   'C',
};

export const VEHICLE_COLORS: Record<VehicleType, [number, number, number, number]> = {
  ship:  [14, 165, 233, 255],   // sky blue
  plane: [244, 114, 182, 255],  // pink
  truck: [251, 191, 36, 255],   // amber
  train: [167, 139, 250, 255],  // purple
  car:   [16, 185, 129, 255],   // emerald
};

// ── Great Circle Interpolation ─────────────────────────────────

function interpolateGreatCircle(
  fromLng: number, fromLat: number,
  toLng: number, toLat: number,
  t: number,
): [number, number] {
  // Convert to radians
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const lat1 = toRad(fromLat), lng1 = toRad(fromLng);
  const lat2 = toRad(toLat), lng2 = toRad(toLng);

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng1 - lng2) / 2), 2),
    ),
  );

  if (d < 0.00001) return [fromLng, fromLat];

  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);

  const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
  const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);

  return [toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))];
}

function bearing(fromLng: number, fromLat: number, toLng: number, toLat: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(toLng - fromLng);
  const lat1 = toRad(fromLat), lat2 = toRad(toLat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// ── Vehicle Generator ──────────────────────────────────────────

/** Get the full route path for a vehicle as [lng, lat][] — used by MapViewer for route rendering */
export function getFullRoutePath(v: Vehicle): [number, number][] {
  if (v.waypoints && v.waypoints.length >= 2) return v.waypoints;
  // Fallback: generate great-circle points from legacy from/to
  const pts: [number, number][] = [];
  const steps = 50;
  for (let i = 0; i <= steps; i++) {
    pts.push(interpolateGreatCircle(v.fromLng, v.fromLat, v.toLng, v.toLat, i / steps));
  }
  return pts;
}

/** Get route split at vehicle's current position: [completedPath, remainingPath, currentPos] */
export function getRouteSplit(v: Vehicle): { completed: [number, number][]; remaining: [number, number][]; current: [number, number] } {
  const wp = v.waypoints && v.waypoints.length >= 2 ? v.waypoints : [[v.fromLng, v.fromLat] as [number, number], [v.toLng, v.toLat] as [number, number]];
  const seg = v.currentSegment || 0;
  void (v.segmentProgress || v.progress || 0);
  const currentPos: [number, number] = [v.lng, v.lat];

  const completed = wp.slice(0, seg + 1).concat([currentPos]);
  const remaining = [currentPos].concat(wp.slice(seg + 1));

  return { completed, remaining, current: currentPos };
}

/** Export corridor data for background route network rendering */
export const ALL_CORRIDORS = { sea: SEA_CORRIDORS, air: AIR_CORRIDORS, land: LAND_CORRIDORS };

function generateVehicle(type: VehicleType, corridor?: Corridor, cityCluster?: [number, number, string]): Vehicle {
  const isPlayer = Math.random() < 0.15;
  const hazmat = Math.random() < 0.08;
  const flagged = Math.random() < 0.05;

  let waypoints: [number, number][];
  let originName: string, destName: string;
  let callsign: string;
  let speed: number, maxSpeed: number, altitude = 0;

  if (type === 'car' && cityCluster) {
    const [cx, cy, city] = cityCluster;
    const r = 0.6;
    const from: [number, number] = [cx + (Math.random() - 0.5) * r * 2, cy + (Math.random() - 0.5) * r * 2];
    const to: [number, number] = [cx + (Math.random() - 0.5) * r * 2, cy + (Math.random() - 0.5) * r * 2];
    waypoints = [from, to];
    originName = city;
    destName = city;
    callsign = pick(CAR_PLATES);
    speed = rng(30, 120);
    maxSpeed = 180;
  } else if (corridor) {
    const reversed = Math.random() > 0.5;
    waypoints = reversed ? [...corridor].reverse() as [number, number][] : [...corridor] as [number, number][];

    // Find nearest city names for origin and destination
    const [fLng, fLat] = waypoints[0];
    const [tLng, tLat] = waypoints[waypoints.length - 1];
    const nearestFrom = CITY_CLUSTERS.reduce((best, c) => {
      const d = Math.abs(c[0] - fLng) + Math.abs(c[1] - fLat);
      return d < best.d ? { d, name: c[2] } : best;
    }, { d: Infinity, name: 'Unknown' });
    const nearestTo = CITY_CLUSTERS.reduce((best, c) => {
      const d = Math.abs(c[0] - tLng) + Math.abs(c[1] - tLat);
      return d < best.d ? { d, name: c[2] } : best;
    }, { d: Infinity, name: 'Unknown' });
    originName = nearestFrom.name;
    destName = nearestTo.name;

    if (type === 'ship') {
      callsign = pick(SHIP_NAMES);
      speed = rng(15, 30);
      maxSpeed = 35;
    } else if (type === 'plane') {
      callsign = pick(PLANE_CALLSIGNS);
      speed = rng(750, 950);
      maxSpeed = 1050;
      altitude = rng(9000, 12500);
    } else if (type === 'train') {
      callsign = pick(TRAIN_IDS);
      speed = rng(80, 320);
      maxSpeed = 350;
    } else {
      callsign = pick(TRUCK_IDS);
      speed = rng(60, 110);
      maxSpeed = 130;
    }
  } else {
    waypoints = [[0, 0], [10, 10]];
    originName = 'Unknown'; destName = 'Unknown';
    callsign = 'UNK-000'; speed = 50; maxSpeed = 100;
  }

  // Compute random starting position along the multi-segment route
  const numSegments = waypoints.length - 1;
  const totalProgress = Math.random();
  const exactSegment = totalProgress * numSegments;
  const currentSegment = Math.min(Math.floor(exactSegment), numSegments - 1);
  const segmentProgress = exactSegment - currentSegment;

  const [sLng, sLat] = waypoints[currentSegment];
  const [eLng, eLat] = waypoints[currentSegment + 1];
  const [lng, lat] = interpolateGreatCircle(sLng, sLat, eLng, eLat, segmentProgress);
  const hdg = bearing(sLng, sLat, eLng, eLat);

  // Legacy from/to for backward compat
  const fromLng = waypoints[0][0], fromLat = waypoints[0][1];
  const toLng = waypoints[waypoints.length - 1][0], toLat = waypoints[waypoints.length - 1][1];

  const progressSpeeds: Record<VehicleType, number> = {
    ship: 0.00003 + Math.random() * 0.00002,
    plane: 0.0003 + Math.random() * 0.0002,
    truck: 0.00008 + Math.random() * 0.00005,
    train: 0.00015 + Math.random() * 0.0001,
    car: 0.001 + Math.random() * 0.002,
  };

  const cargo = pick(CARGO_TYPES);
  const cargoValue = type === 'ship' ? `€${Math.floor(rng(5, 500))}M` :
    type === 'plane' ? `€${Math.floor(rng(1, 80))}M` :
    `€${Math.floor(rng(0.05, 5) * 100) / 100}M`;

  const etaHours = type === 'ship' ? rng(48, 720) : type === 'plane' ? rng(2, 18) : rng(4, 48);
  const eta = new Date(Date.now() + etaHours * 3_600_000);

  const statuses: VehicleStatus[] = ['moving', 'moving', 'moving', 'moving', 'loading', 'refueling', 'delayed'];

  return {
    id: uid(),
    type,
    callsign,
    owner: isPlayer ? 'Player Fleet' : pick(OWNERS),
    cargo,
    cargoWeight: type === 'ship' ? `${Math.floor(rng(5000, 200000))} DWT` :
      type === 'plane' ? `${Math.floor(rng(20, 140))} tonnes` :
      type === 'car' ? 'N/A' :
      `${Math.floor(rng(5, 40))} tonnes`,
    origin: originName,
    destination: destName,
    status: pick(statuses),
    speed,
    maxSpeed,
    heading: hdg,
    altitude,
    fuel: rng(20, 100),
    flag: pick(FLAGS),
    lng,
    lat,
    waypoints,
    currentSegment,
    segmentProgress,
    fromLng,
    fromLat,
    toLng,
    toLat,
    progress: totalProgress,
    progressSpeed: progressSpeeds[type],
    temperature: cargo.includes('Frozen') || cargo.includes('Fresh') ? rng(-25, 4) : rng(15, 30),
    crewSize: type === 'ship' ? Math.floor(rng(18, 35)) : type === 'plane' ? Math.floor(rng(2, 12)) : type === 'car' ? Math.floor(rng(1, 4)) : Math.floor(rng(1, 3)),
    estimatedArrival: eta.toISOString().slice(0, 16).replace('T', ' '),
    value: cargoValue,
    insured: Math.random() > 0.15,
    hazmat,
    flagged,
  };
}

// ── Simulator Class ────────────────────────────────────────────

export class WorldTrafficSimulator {
  vehicles: Vehicle[] = [];
  private animFrameId: number | null = null;
  private lastTick = 0;
  private lastBroadcast = 0;
  private onUpdate: ((vehicles: Vehicle[]) => void) | null = null;

  constructor() {
    this.spawn();
  }

  private spawn() {
    this.vehicles = [];

    // Ships: 3-5 per sea corridor
    for (const corridor of SEA_CORRIDORS) {
      const count = Math.floor(rng(3, 6));
      for (let i = 0; i < count; i++) {
        this.vehicles.push(generateVehicle('ship', corridor));
      }
    }

    // Planes: 2-4 per air corridor
    for (const corridor of AIR_CORRIDORS) {
      const count = Math.floor(rng(2, 5));
      for (let i = 0; i < count; i++) {
        this.vehicles.push(generateVehicle('plane', corridor));
      }
    }

    // Trucks: 2-4 per land corridor
    for (const corridor of LAND_CORRIDORS) {
      const count = Math.floor(rng(2, 5));
      for (let i = 0; i < count; i++) {
        this.vehicles.push(generateVehicle('truck', corridor));
      }
    }

    // Trains: 1-2 per land corridor
    for (const corridor of LAND_CORRIDORS) {
      const count = Math.floor(rng(1, 3));
      for (let i = 0; i < count; i++) {
        this.vehicles.push(generateVehicle('train', corridor));
      }
    }

    // Cars: 8-15 per city cluster
    for (const city of CITY_CLUSTERS) {
      const count = Math.floor(rng(8, 16));
      for (let i = 0; i < count; i++) {
        this.vehicles.push(generateVehicle('car', undefined, city));
      }
    }
  }

  start(onUpdate: (vehicles: Vehicle[]) => void) {
    this.onUpdate = onUpdate;
    this.lastTick = performance.now();
    this.tick();
  }

  stop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.onUpdate = null;
  }

  private tick = () => {
    const now = performance.now();
    const dt = (now - this.lastTick) / 1000; // seconds
    this.lastTick = now;

    // Update all vehicle positions using multi-waypoint system
    for (const v of this.vehicles) {
      if (v.status !== 'moving') {
        if (Math.random() < 0.001) v.status = 'moving';
        continue;
      }

      const numSegments = v.waypoints.length - 1;
      // Advance segment progress (scaled per segment so total route speed stays consistent)
      const segSpeedScale = numSegments > 0 ? numSegments : 1;
      v.segmentProgress += v.progressSpeed * dt * 60 * segSpeedScale;
      v.fuel = Math.max(0, v.fuel - dt * 0.002);

      // Advance to next segment if current one is done
      while (v.segmentProgress >= 1 && v.currentSegment < numSegments - 1) {
        v.segmentProgress -= 1;
        v.currentSegment++;
      }

      // Reached end of route — reverse
      if (v.segmentProgress >= 1 && v.currentSegment >= numSegments - 1) {
        v.segmentProgress = 0;
        v.currentSegment = 0;
        v.waypoints.reverse();
        // Update legacy from/to
        v.fromLng = v.waypoints[0][0]; v.fromLat = v.waypoints[0][1];
        v.toLng = v.waypoints[v.waypoints.length - 1][0]; v.toLat = v.waypoints[v.waypoints.length - 1][1];
        const tmpName = v.origin;
        v.origin = v.destination;
        v.destination = tmpName;
        v.fuel = rng(60, 100);
        if (Math.random() < 0.2) v.status = pick(['loading', 'refueling', 'docked']);
      }

      // Clamp segment progress
      v.segmentProgress = Math.min(v.segmentProgress, 1);

      // Interpolate position within current segment
      const seg = v.currentSegment;
      const [sLng, sLat] = v.waypoints[seg];
      const [eLng, eLat] = v.waypoints[Math.min(seg + 1, v.waypoints.length - 1)];
      const [newLng, newLat] = interpolateGreatCircle(sLng, sLat, eLng, eLat, v.segmentProgress);
      v.lng = newLng;
      v.lat = newLat;

      // Update total progress for backward compat
      v.progress = (v.currentSegment + v.segmentProgress) / numSegments;

      // Update heading
      if (v.segmentProgress > 0.01) {
        const aheadT = Math.min(1, v.segmentProgress + 0.05);
        const [aLng, aLat] = interpolateGreatCircle(sLng, sLat, eLng, eLat, aheadT);
        v.heading = bearing(newLng, newLat, aLng, aLat);
      } else {
        v.heading = bearing(sLng, sLat, eLng, eLat);
      }

      // Random events
      if (Math.random() < 0.0001) {
        v.status = pick(['delayed', 'emergency']);
      }
    }

    // Broadcast at ~10fps (every 100ms) with a new array ref so React re-renders
    if (now - this.lastBroadcast >= 100) {
      this.lastBroadcast = now;
      this.onUpdate?.([...this.vehicles]);
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  getVehiclesByType(type: VehicleType): Vehicle[] {
    return this.vehicles.filter(v => v.type === type);
  }

  getVehicleById(id: string): Vehicle | undefined {
    return this.vehicles.find(v => v.id === id);
  }

  getTotalCount(): Record<VehicleType, number> {
    const counts: Record<string, number> = { ship: 0, plane: 0, truck: 0, train: 0, car: 0 };
    for (const v of this.vehicles) counts[v.type]++;
    return counts as Record<VehicleType, number>;
  }
}
