"""
Spatial Analytics Engine (DBSCAN + H3 fallback)
Replaced naive O(N^2) loops with scikit-learn BallTree and Uber H3 hexbinning.
Falls back to simple lat/lon grid binning if h3 unavailable.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
import numpy as np
from sklearn.cluster import DBSCAN

try:
    import h3
    _HAS_H3 = True
except ImportError:
    _HAS_H3 = False

@dataclass
class Cluster:
    id:           int
    entity_uids:  list[str]
    centroid_lat: float
    centroid_lon: float
    entity_types: list[str]
    affiliations: list[str]
    is_hostile:   bool     = False
    label:        str      = ""

    def as_dict(self) -> dict:
        return {
            "id":           self.id,
            "entityUids":   self.entity_uids,
            "centroidLat":  round(self.centroid_lat, 5),
            "centroidLon":  round(self.centroid_lon, 5),
            "size":         len(self.entity_uids),
            "types":        list(set(self.entity_types)),
            "affiliations": list(set(self.affiliations)),
            "isHostile":    self.is_hostile,
            "label":        self.label,
        }

def _centroid(lats: list[float], lons: list[float]) -> tuple[float, float]:
    """Mean centroid — valid for small regions."""
    return sum(lats) / len(lats), sum(lons) / len(lons)

def dbscan(
    entities: list[dict],
    eps_nm:   float = 30.0,
    min_pts:  int   = 3,
) -> tuple[dict[str, int], list[Cluster]]:
    """
    DBSCAN spatial clustering mapped via scikit-learn.
    Converts nautical miles to radians for the haversine BallTree metric.
    """
    valid = [e for e in entities if e.get("lat") is not None and e.get("lon") is not None]
    n     = len(valid)
    
    if n == 0:
        return {}, []
    
    # Earth radius in nautical miles ~ 3440.065
    EARTH_RADIUS_NM = 3440.065
    eps_radians = eps_nm / EARTH_RADIUS_NM

    # Build Radian Matrix: [[lat_rad, lon_rad], ...]
    coords = np.array([[math.radians(e["lat"]), math.radians(e["lon"])] for e in valid])

    db = DBSCAN(eps=eps_radians, min_samples=min_pts, algorithm='ball_tree', metric='haversine').fit(coords)
    labels = db.labels_

    assignments = {valid[i]["uid"]: int(labels[i]) for i in range(n)}
    
    unique_labels = set(labels)
    clusters = []

    for cid in unique_labels:
        if cid == -1:
            continue
        
        # Pull members
        indices = np.where(labels == cid)[0]
        members = [valid[i] for i in indices]
        
        lats    = [m["lat"] for m in members]
        lons    = [m["lon"] for m in members]
        clat, clon = _centroid(lats, lons)
        
        types   = [m.get("entityType", "unknown") for m in members]
        affils  = [m.get("affiliation", "unknown") for m in members]
        hostile = any(a == "hostile" for a in affils)

        # Label heuristic
        dominant_type = max(set(types), key=types.count)
        dominant_affil = max(set(affils), key=affils.count)
        label = f"{dominant_affil.title()} {dominant_type} cluster ({len(members)})"

        clusters.append(Cluster(
            id           = int(cid),
            entity_uids  = [m["uid"] for m in members],
            centroid_lat = clat,
            centroid_lon = clon,
            entity_types = types,
            affiliations = affils,
            is_hostile   = hostile,
            label        = label,
        ))

    return assignments, clusters

def detect_formations(
    entities:  list[dict],
    eps_nm:    float = 15.0,
    min_size:  int   = 3,
) -> list[Cluster]:
    """
    Detect tactical formations — tight clusters of same entity type.
    """
    _, clusters = dbscan(entities, eps_nm=eps_nm, min_pts=min_size)
    formations  = []
    for c in clusters:
        unique_types = set(c.entity_types)
        if len(c.entity_uids) >= min_size:
            dominant = max(unique_types, key=lambda t: c.entity_types.count(t))
            ratio    = c.entity_types.count(dominant) / len(c.entity_types)
            if ratio >= 0.7:
                c.label = f"{'Hostile' if c.is_hostile else 'Neutral'} {dominant} formation — {len(c.entity_uids)} units"
                formations.append(c)
    return formations

def hexbin_density(
    entities: list[dict],
    resolution: int = 4,
) -> list[dict]:
    """
    Compute H3 hex density aggregation over the dataset (or lat/lon grid fallback).
    H3 resolution 4 yields ~20km wide hexagons.
    If h3 unavailable, uses simple lat/lon grid binning.
    """
    if _HAS_H3:
        return _hexbin_density_h3(entities, resolution)
    else:
        return _hexbin_density_grid(entities, resolution)


def _hexbin_density_h3(entities: list[dict], resolution: int) -> list[dict]:
    """H3-based hexbin density (when h3 library is available)."""
    bins: dict[str, tuple[float, float]] = {}
    counts: dict[str, int] = {}

    for e in entities:
        lat = e.get("lat")
        lon = e.get("lon")
        if lat is None or lon is None:
            continue

        h3_index = h3.latlng_to_cell(lat, lon, resolution)
        counts[h3_index] = counts.get(h3_index, 0) + 1
        if h3_index not in bins:
            bins[h3_index] = h3.cell_to_latlng(h3_index)

    result = []
    for hex_id, count in counts.items():
        lat, lon = bins[hex_id]
        result.append({
            "hexId": hex_id,
            "lat": lat,
            "lon": lon,
            "count": count
        })

    return result


def _hexbin_density_grid(entities: list[dict], resolution: int) -> list[dict]:
    """
    Fallback: simple lat/lon grid binning when h3 unavailable.
    Grid size scales with resolution: resolution 4 → ~0.5 degree grid (~55km).
    """
    grid_size = 1.0 / (2 ** (resolution - 1))  # Approx: res 4 → 0.5°, res 5 → 0.25°
    bins: dict[tuple[float, float], int] = {}

    for e in entities:
        lat = e.get("lat")
        lon = e.get("lon")
        if lat is None or lon is None:
            continue

        # Snap to grid center
        grid_lat = round(lat / grid_size) * grid_size
        grid_lon = round(lon / grid_size) * grid_size
        key = (grid_lat, grid_lon)
        bins[key] = bins.get(key, 0) + 1

    result = []
    for (lat, lon), count in bins.items():
        result.append({
            "hexId": f"grid_{lat:.4f}_{lon:.4f}",
            "lat": lat,
            "lon": lon,
            "count": count
        })

    return result
