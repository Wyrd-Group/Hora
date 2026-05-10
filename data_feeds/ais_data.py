"""
AIS (Vessel Tracking) Data Feed Module
Provides entity data for anomaly.py, kalman.py, clustering.py, threat.py, link_analysis.py

Supports:
- Loading real AIS data from CSV (Global Fishing Watch, DMA, AISHub exports)
- High-quality synthetic data generation with realistic vessel behaviors
- Scenario injection: anomalies, formations, dark ships, loitering

Usage:
    from data_feeds.ais_data import AISDataFeed
    feed = AISDataFeed()

    # Get entities for anomaly detection
    entities = feed.get_entities(n=500, include_anomalies=True)

    # Get time-series tracks for Kalman filtering
    tracks = feed.get_tracks(n_vessels=20, n_points=100)

    # Get scenario with formations for clustering
    entities = feed.get_scenario('formation_detection')
"""

import os, json, time, math, random, logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
import numpy as np

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)

# ─── Vessel type definitions ─────────────────────────────────

VESSEL_TYPES = ['cargo', 'tanker', 'fishing', 'passenger', 'tugboat', 'military', 'sailing', 'unknown']
AFFILIATIONS = ['friendly', 'neutral', 'unknown', 'hostile']
AFFILIATION_WEIGHTS = [0.40, 0.35, 0.20, 0.05]

# Realistic speed ranges by vessel type (knots)
SPEED_PROFILES = {
    'cargo':     {'mean': 12.0, 'std': 3.0, 'max': 25},
    'tanker':    {'mean': 10.0, 'std': 2.5, 'max': 20},
    'fishing':   {'mean': 5.0,  'std': 3.0, 'max': 15},
    'passenger': {'mean': 18.0, 'std': 4.0, 'max': 30},
    'tugboat':   {'mean': 8.0,  'std': 2.0, 'max': 14},
    'military':  {'mean': 15.0, 'std': 5.0, 'max': 35},
    'sailing':   {'mean': 6.0,  'std': 2.0, 'max': 12},
    'unknown':   {'mean': 10.0, 'std': 5.0, 'max': 30},
}

# Maritime regions (lat_center, lon_center, lat_spread, lon_spread, name)
REGIONS = [
    (38.0, -2.0, 5.0, 8.0, 'Mediterranean West'),
    (35.0, 18.0, 4.0, 8.0, 'Mediterranean East'),
    (51.0, 2.0, 3.0, 5.0, 'North Sea'),
    (55.5, 12.0, 2.0, 4.0, 'Baltic Approaches'),
    (25.0, 55.0, 3.0, 5.0, 'Persian Gulf'),
    (1.3, 104.0, 2.0, 4.0, 'Strait of Malacca'),
    (40.7, -73.5, 2.0, 3.0, 'US East Coast'),
]


def _mmsi() -> str:
    """Generate a realistic MMSI number."""
    return f"{random.randint(200, 799)}{random.randint(100000, 999999)}"


def _iso_timestamp(base_time: float, offset_sec: float = 0) -> str:
    """Generate ISO 8601 timestamp."""
    t = datetime.utcfromtimestamp(base_time + offset_sec)
    return t.strftime('%Y-%m-%dT%H:%M:%SZ')


class AISDataFeed:
    """Provides AIS vessel tracking data for the anomaly detection pipeline."""

    def __init__(self, region_idx: int = 0, seed: int = 42):
        """
        Args:
            region_idx: Index into REGIONS list (0=Med West, 1=Med East, etc.)
            seed: Random seed for reproducibility
        """
        self.region = REGIONS[region_idx % len(REGIONS)]
        self.rng = np.random.RandomState(seed)
        random.seed(seed)
        self._real_data = None

    # ─── Real data loading ────────────────────────────────────

    def load_csv(self, filepath: str) -> list[dict]:
        """
        Load real AIS data from CSV.
        Expected columns: mmsi/uid, lat, lon, speed, heading, timestamp, vessel_type/entityType
        Compatible with: Global Fishing Watch, DMA, AISHub exports
        """
        try:
            import pandas as pd
            df = pd.read_csv(filepath)

            # Normalize column names
            col_map = {
                'mmsi': 'uid', 'MMSI': 'uid',
                'speed_knots': 'speed', 'sog': 'speed', 'SOG': 'speed',
                'course': 'heading', 'cog': 'heading', 'COG': 'heading',
                'vessel_class_inferred': 'entityType', 'vessel_type': 'entityType', 'ship_type': 'entityType',
                'flag': 'affiliation',
                'timestamp': 'lastSeen', 'time': 'lastSeen',
                'latitude': 'lat', 'longitude': 'lon',
            }
            df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

            # Ensure required fields
            if 'uid' not in df.columns:
                df['uid'] = [f"VESSEL-{i}" for i in range(len(df))]
            df['uid'] = df['uid'].astype(str)

            if 'entityType' not in df.columns:
                df['entityType'] = 'unknown'
            if 'affiliation' not in df.columns:
                df['affiliation'] = 'unknown'
            if 'source' not in df.columns:
                df['source'] = 'AIS'
            if 'altitude' not in df.columns:
                df['altitude'] = 0
            if 'speed' not in df.columns:
                df['speed'] = 0.0
            if 'heading' not in df.columns:
                df['heading'] = 0.0
            if 'lastSeen' not in df.columns:
                df['lastSeen'] = _iso_timestamp(time.time())

            entities = df[['uid', 'lat', 'lon', 'speed', 'heading', 'altitude',
                           'entityType', 'affiliation', 'source', 'lastSeen']].to_dict('records')

            self._real_data = entities
            logger.info(f"Loaded {len(entities)} AIS records from {filepath}")
            return entities

        except Exception as e:
            logger.warning(f"Failed to load AIS CSV: {e}")
            return []

    def try_load_cached(self) -> Optional[list[dict]]:
        """Try to load any AIS CSV files from the cache directory."""
        for f in CACHE_DIR.glob("*.csv"):
            if 'ais' in f.name.lower() or 'vessel' in f.name.lower() or 'fishing' in f.name.lower():
                entities = self.load_csv(str(f))
                if entities:
                    return entities
        return None

    # ─── Synthetic data generation ────────────────────────────

    def _generate_vessel(self, uid: Optional[str] = None,
                          vessel_type: Optional[str] = None,
                          affiliation: Optional[str] = None,
                          lat: Optional[float] = None, lon: Optional[float] = None) -> dict:
        """Generate a single realistic vessel entity."""
        if uid is None:
            uid = _mmsi()
        if vessel_type is None:
            vessel_type = random.choice(VESSEL_TYPES)
        if affiliation is None:
            affiliation = random.choices(AFFILIATIONS, weights=AFFILIATION_WEIGHTS, k=1)[0]

        region = self.region
        if lat is None:
            lat = self.rng.normal(region[0], region[2] * 0.3)
        if lon is None:
            lon = self.rng.normal(region[1], region[3] * 0.3)

        profile = SPEED_PROFILES[vessel_type]
        speed = max(0, self.rng.normal(profile['mean'], profile['std']))
        speed = min(speed, profile['max'])
        heading = self.rng.uniform(0, 360)

        return {
            'uid': str(uid),
            'lat': round(float(lat), 6),
            'lon': round(float(lon), 6),
            'speed': round(float(speed), 1),
            'heading': round(float(heading), 1),
            'altitude': 0,
            'entityType': vessel_type,
            'affiliation': affiliation,
            'source': 'AIS',
            'lastSeen': _iso_timestamp(time.time() - random.randint(0, 3600)),
        }

    def _generate_anomalous_vessel(self) -> dict:
        """Generate a vessel with anomalous behavior."""
        anomaly_type = random.choice(['speed', 'dark_ship', 'impossible_speed', 'loitering'])
        v = self._generate_vessel(affiliation='unknown')

        if anomaly_type == 'speed':
            v['speed'] = round(random.uniform(35, 60), 1)  # Impossibly fast
        elif anomaly_type == 'dark_ship':
            v['lastSeen'] = _iso_timestamp(time.time() - random.randint(7200, 86400))  # Old timestamp
            v['source'] = 'OSINT'
        elif anomaly_type == 'impossible_speed':
            v['speed'] = round(random.uniform(50, 100), 1)
        elif anomaly_type == 'loitering':
            v['speed'] = round(random.uniform(0, 0.5), 1)
            v['entityType'] = 'unknown'

        return v

    def _generate_formation(self, center_lat: float, center_lon: float,
                            n_vessels: int = 5) -> list[dict]:
        """Generate a formation of vessels traveling together."""
        base_heading = self.rng.uniform(0, 360)
        base_speed = self.rng.uniform(10, 18)
        affiliation = random.choice(['friendly', 'hostile', 'unknown'])

        vessels = []
        for i in range(n_vessels):
            lat = center_lat + self.rng.normal(0, 0.02)
            lon = center_lon + self.rng.normal(0, 0.02)
            v = self._generate_vessel(
                vessel_type='military' if affiliation == 'hostile' else 'cargo',
                affiliation=affiliation,
                lat=lat, lon=lon
            )
            v['heading'] = round(base_heading + self.rng.normal(0, 3), 1) % 360
            v['speed'] = round(base_speed + self.rng.normal(0, 0.5), 1)
            vessels.append(v)

        return vessels

    # ─── Public interfaces ────────────────────────────────────

    def get_entities(self, n: int = 200, include_anomalies: bool = True,
                     include_formations: bool = True, anomaly_ratio: float = 0.1) -> list[dict]:
        """
        Get entity list for anomaly.py, clustering.py, threat.py, link_analysis.py.

        Args:
            n: Total number of entities
            include_anomalies: Inject anomalous vessels
            include_formations: Inject vessel formations (for clustering tests)
            anomaly_ratio: Fraction of anomalous vessels

        Returns: list[dict] compatible with all five pipeline engines
        """
        # Try real data first
        real = self.try_load_cached()
        if real and len(real) >= n:
            logger.info(f"Using {n} real AIS records")
            return random.sample(real, n)

        entities = []

        # Normal vessels
        n_anomalies = int(n * anomaly_ratio) if include_anomalies else 0
        n_formation = 15 if include_formations and n >= 50 else 0  # 3 formations of 5
        n_normal = n - n_anomalies - n_formation

        for _ in range(n_normal):
            entities.append(self._generate_vessel())

        # Anomalous vessels
        for _ in range(n_anomalies):
            entities.append(self._generate_anomalous_vessel())

        # Formations (3 groups of 5)
        if n_formation > 0:
            region = self.region
            for _ in range(3):
                center_lat = self.rng.normal(region[0], region[2] * 0.15)
                center_lon = self.rng.normal(region[1], region[3] * 0.15)
                entities.extend(self._generate_formation(center_lat, center_lon, 5))

        random.shuffle(entities)
        logger.info(f"Generated {len(entities)} synthetic AIS entities "
                    f"({n_normal} normal, {n_anomalies} anomalous, {n_formation} in formations)")
        return entities[:n]

    def get_tracks(self, n_vessels: int = 20, n_points: int = 100,
                    interval_sec: float = 60.0) -> dict:
        """
        Get time-series vessel tracks for kalman.py.

        Returns: {uid: [(lat, lon, timestamp), ...]}
        Each track is n_points sequential positions at interval_sec spacing.
        """
        tracks = {}
        base_time = time.time() - (n_points * interval_sec)

        for _ in range(n_vessels):
            uid = _mmsi()
            vessel_type = random.choice(VESSEL_TYPES)
            profile = SPEED_PROFILES[vessel_type]

            region = self.region
            lat = self.rng.normal(region[0], region[2] * 0.2)
            lon = self.rng.normal(region[1], region[3] * 0.2)
            speed_kts = max(1, self.rng.normal(profile['mean'], profile['std']))
            heading_rad = self.rng.uniform(0, 2 * math.pi)

            points = []
            for i in range(n_points):
                t = base_time + i * interval_sec

                # Add measurement noise
                meas_lat = lat + self.rng.normal(0, 0.0001)
                meas_lon = lon + self.rng.normal(0, 0.0001)
                points.append((round(meas_lat, 6), round(meas_lon, 6), t))

                # Move vessel (constant velocity with slight drift)
                speed_ms = speed_kts * 0.514444  # knots to m/s
                dlat = speed_ms * math.cos(heading_rad) * interval_sec / 111320
                dlon = speed_ms * math.sin(heading_rad) * interval_sec / (111320 * math.cos(math.radians(lat)))
                lat += dlat
                lon += dlon
                heading_rad += self.rng.normal(0, 0.01)  # Slight heading drift

            tracks[uid] = points

        logger.info(f"Generated {n_vessels} vessel tracks × {n_points} points each")
        return tracks

    def get_scenario(self, scenario: str = 'mixed') -> list[dict]:
        """
        Get a predefined scenario dataset.

        Scenarios:
            'normal_traffic': 200 vessels, no anomalies
            'anomaly_detection': 200 vessels with 30% anomalies
            'formation_detection': 100 normal + 4 tight formations
            'dark_ships': 150 vessels with dark ship anomalies
            'mixed': All anomaly types combined (default)
            'stress_test': 1000 vessels for performance testing
        """
        scenarios = {
            'normal_traffic': lambda: self.get_entities(200, include_anomalies=False, include_formations=False),
            'anomaly_detection': lambda: self.get_entities(200, anomaly_ratio=0.3),
            'formation_detection': lambda: self._formation_scenario(),
            'dark_ships': lambda: self._dark_ship_scenario(),
            'mixed': lambda: self.get_entities(300, include_anomalies=True, include_formations=True, anomaly_ratio=0.15),
            'stress_test': lambda: self.get_entities(1000, anomaly_ratio=0.1),
        }

        gen = scenarios.get(scenario, scenarios['mixed'])
        entities = gen()
        logger.info(f"Scenario '{scenario}': {len(entities)} entities")
        return entities

    def _formation_scenario(self) -> list[dict]:
        """Generate scenario with multiple vessel formations."""
        entities = [self._generate_vessel() for _ in range(100)]
        region = self.region
        for i in range(4):
            lat = region[0] + self.rng.uniform(-region[2]*0.2, region[2]*0.2)
            lon = region[1] + self.rng.uniform(-region[3]*0.2, region[3]*0.2)
            entities.extend(self._generate_formation(lat, lon, n_vessels=random.randint(3, 7)))
        return entities

    def _dark_ship_scenario(self) -> list[dict]:
        """Generate scenario with multiple dark ship anomalies."""
        entities = [self._generate_vessel() for _ in range(120)]
        for _ in range(30):
            v = self._generate_vessel(affiliation='unknown')
            v['lastSeen'] = _iso_timestamp(time.time() - random.randint(3600, 172800))
            v['source'] = random.choice(['OSINT', 'MANUAL'])
            entities.append(v)
        return entities

    # ─── Convenience ──────────────────────────────────────────

    def bootstrap(self):
        """Generate and cache all scenario datasets."""
        print(f"[AISDataFeed] Bootstrapping AIS data...")
        for scenario in ['normal_traffic', 'anomaly_detection', 'formation_detection', 'mixed', 'stress_test']:
            entities = self.get_scenario(scenario)
            # Save as JSON cache
            cache_file = CACHE_DIR / f"ais_scenario_{scenario}.json"
            with open(cache_file, 'w') as f:
                json.dump(entities, f)
            print(f"  ✓ {scenario}: {len(entities)} entities → {cache_file.name}")

        tracks = self.get_tracks(n_vessels=50, n_points=200)
        track_file = CACHE_DIR / "ais_tracks.json"
        with open(track_file, 'w') as f:
            json.dump({uid: [(lat, lon, t) for lat, lon, t in pts]
                       for uid, pts in tracks.items()}, f)
        print(f"  ✓ tracks: {len(tracks)} vessels × 200 points → {track_file.name}")

        print(f"[AISDataFeed] ✓ Bootstrap complete")


# ─── Quick test ───────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    feed = AISDataFeed(region_idx=0)  # Mediterranean West

    print("\n=== Entity List (for anomaly/clustering/threat/link_analysis) ===")
    entities = feed.get_entities(n=100, include_anomalies=True)
    print(f"Count: {len(entities)}")
    print(f"Types: {set(e['entityType'] for e in entities)}")
    print(f"Affiliations: {set(e['affiliation'] for e in entities)}")
    print(f"Sample: {json.dumps(entities[0], indent=2)}")

    print("\n=== Vessel Tracks (for kalman.py) ===")
    tracks = feed.get_tracks(n_vessels=5, n_points=50)
    for uid, points in list(tracks.items())[:2]:
        print(f"  Vessel {uid}: {len(points)} points, "
              f"start=({points[0][0]:.4f}, {points[0][1]:.4f}), "
              f"end=({points[-1][0]:.4f}, {points[-1][1]:.4f})")

    print("\n=== Scenarios ===")
    for s in ['normal_traffic', 'anomaly_detection', 'formation_detection', 'mixed']:
        ents = feed.get_scenario(s)
        anomalous = sum(1 for e in ents if e.get('speed', 0) > 35 or 'OSINT' in e.get('source', ''))
        print(f"  {s}: {len(ents)} entities, ~{anomalous} anomalous")

    print("\n✅ All AIS data feeds working")
