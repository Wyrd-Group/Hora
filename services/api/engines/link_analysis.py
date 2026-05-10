"""
Link Analysis Engine — Palantir-style entity relationship graph.

Builds a NetworkX graph of entity relationships derived from:
  1. Proximity   — entities within X nm of each other at same time
  2. Formation   — entities identified as co-located clusters
  3. Co-occurrence — entities from ACLED/GDELT active in same 50nm/6h window
  4. Route sharing — vessels on highly correlated headings in same area
  5. Source correlation — entities reported by same SIGINT/source

NetworkX metrics we expose:
  - Degree centrality    : most connected entities (likely commanders / hubs)
  - Betweenness          : bridge nodes (critical communication links)
  - PageRank             : influence score
  - Communities (Louvain): detected sub-networks / units / cells

This mirrors Palantir's "Object Link Analysis" and Maven's entity graph layer.
"""
from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any

try:
    import networkx as nx
    _HAS_NX = True
except ImportError:
    _HAS_NX = False

from .ontology import EntityLink, LINK_TYPES

# ── Haversine ─────────────────────────────────────────────────────────────────

def _nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3440.065
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(max(0, a)))


# ── Link generation ───────────────────────────────────────────────────────────

PROXIMITY_THRESHOLD_NM = {
    "aircraft": 20,
    "vessel":   10,
    "ground":   5,
    "event":    50,
    "person":   2,
}

def _proximity_links(entities: list[dict]) -> list[EntityLink]:
    """Detect entities in close physical proximity."""
    links: list[EntityLink] = []
    valid = [e for e in entities if e.get("lat") and e.get("lon")]

    for i, a in enumerate(valid):
        for b in valid[i + 1:]:
            dist = _nm(a["lat"], a["lon"], b["lat"], b["lon"])
            threshold = max(
                PROXIMITY_THRESHOLD_NM.get(a.get("entityType", "ground"), 10),
                PROXIMITY_THRESHOLD_NM.get(b.get("entityType", "ground"), 10),
            )
            if dist <= threshold:
                # Higher confidence if both are hostile/unknown
                aff_both = {a.get("affiliation"), b.get("affiliation")}
                conf = 0.9 if "hostile" in aff_both else (0.7 if "unknown" in aff_both else 0.5)
                links.append(EntityLink(
                    source_uid = a["uid"],
                    target_uid = b["uid"],
                    link_type  = "PROXIMITY",
                    confidence = conf,
                    evidence   = f"Entities {dist:.1f}nm apart (threshold {threshold}nm)",
                ))
    return links


def _formation_links(entities: list[dict], clusters: list[dict]) -> list[EntityLink]:
    """Link entities that are part of the same detected cluster/formation."""
    links: list[EntityLink] = []
    for cluster in clusters:
        members = cluster.get("memberUids") or cluster.get("members") or []
        if len(members) < 2:
            continue
        is_hostile = cluster.get("isHostile", False)
        conf = 0.9 if is_hostile else 0.7
        for i, uid_a in enumerate(members):
            for uid_b in members[i + 1:]:
                links.append(EntityLink(
                    source_uid = uid_a,
                    target_uid = uid_b,
                    link_type  = "FORMATION",
                    confidence = conf,
                    evidence   = f"Co-located in cluster {cluster.get('id', '?')} (size {len(members)})",
                ))
    return links


def _route_share_links(entities: list[dict]) -> list[EntityLink]:
    """
    Detect vessel/aircraft pairs with correlated headings in close proximity.
    Heading correlation within ±15° AND proximity within 2× threshold → route sharing.
    """
    links: list[EntityLink] = []
    moving = [e for e in entities
              if e.get("lat") and e.get("lon")
              and (e.get("speed") or 0) > 3
              and e.get("entityType") in ("vessel", "aircraft")]

    for i, a in enumerate(moving):
        for b in moving[i + 1:]:
            dist = _nm(a["lat"], a["lon"], b["lat"], b["lon"])
            if dist > 30:   # Only check close pairs
                continue
            hdg_a = a.get("heading") or 0
            hdg_b = b.get("heading") or 0
            hdg_diff = abs(hdg_a - hdg_b) % 360
            hdg_diff = min(hdg_diff, 360 - hdg_diff)
            if hdg_diff <= 15:
                conf = max(0.5, 1.0 - hdg_diff / 15.0)
                links.append(EntityLink(
                    source_uid = a["uid"],
                    target_uid = b["uid"],
                    link_type  = "ROUTE_SHARE",
                    confidence = round(conf, 2),
                    evidence   = (f"Correlated heading ({hdg_a:.0f}° vs {hdg_b:.0f}°, diff {hdg_diff:.0f}°) "
                                  f"at {dist:.1f}nm separation"),
                ))
    return links


def _source_co_occurrence(entities: list[dict]) -> list[EntityLink]:
    """
    Link entities from the same OSINT/intelligence source that are in the same area.
    E.g., two ACLED events from same conflict zone, or two FIRMS fires near each other.
    """
    links: list[EntityLink] = []
    by_source: dict[str, list] = defaultdict(list)
    for e in entities:
        if e.get("source") in ("OSINT", "FIRMS") and e.get("lat") and e.get("lon"):
            by_source[e["source"]].append(e)

    for source, group in by_source.items():
        for i, a in enumerate(group):
            for b in group[i + 1:]:
                dist = _nm(a["lat"], a["lon"], b["lat"], b["lon"])
                if dist <= 100:   # Within 100nm = same conflict zone
                    links.append(EntityLink(
                        source_uid = a["uid"],
                        target_uid = b["uid"],
                        link_type  = "CO_OCCURS",
                        confidence = 0.4,
                        evidence   = f"Co-occurring {source} events within {dist:.0f}nm",
                    ))
    return links


# ── Graph construction and analytics ─────────────────────────────────────────

@dataclass
class GraphAnalysis:
    """Results of NetworkX graph analysis on entity relationships."""
    node_count:     int
    edge_count:     int
    top_nodes:      list[dict]   = field(default_factory=list)   # by centrality
    communities:    list[list[str]] = field(default_factory=list)
    isolates:       list[str]    = field(default_factory=list)
    links:          list[dict]   = field(default_factory=list)
    metrics:        dict         = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {
            "nodeCount":   self.node_count,
            "edgeCount":   self.edge_count,
            "topNodes":    self.top_nodes,
            "communities": self.communities,
            "isolates":    self.isolates[:20],
            "links":       self.links,
            "metrics":     self.metrics,
        }


def build_link_graph(
    entities:  list[dict],
    clusters:  list[dict] | None = None,
    threats:   list[dict] | None = None,
) -> tuple[list[EntityLink], GraphAnalysis | None]:
    """
    Build entity relationship graph.
    Returns (all_links, graph_analysis).
    graph_analysis is None if networkx is unavailable.
    """
    all_links: list[EntityLink] = []

    # Collect links from all detectors
    all_links.extend(_proximity_links(entities))
    if clusters:
        all_links.extend(_formation_links(entities, clusters))
    all_links.extend(_route_share_links(entities))
    all_links.extend(_source_co_occurrence(entities))

    # Deduplicate by (source, target, type) — keep highest confidence
    seen: dict[tuple, EntityLink] = {}
    for lnk in all_links:
        key = (min(lnk.source_uid, lnk.target_uid),
               max(lnk.source_uid, lnk.target_uid),
               lnk.link_type)
        if key not in seen or lnk.confidence > seen[key].confidence:
            seen[key] = lnk
    deduped = list(seen.values())

    if not _HAS_NX or not deduped:
        return deduped, None

    # ── Build NetworkX graph ──────────────────────────────────────────────────
    G = nx.Graph()

    uid_to_entity = {e["uid"]: e for e in entities if e.get("uid")}

    # Add nodes with attributes
    for e in entities:
        uid = e.get("uid")
        if not uid:
            continue
        G.add_node(uid,
                   callsign    = e.get("callsign") or uid[:8],
                   entityType  = e.get("entityType", "ground"),
                   affiliation = e.get("affiliation", "unknown"),
                   source      = e.get("source", ""),
                   threat_score= next((t.get("score", 0) for t in (threats or []) if t.get("uid") == uid), 0),
                   )

    # Add edges
    for lnk in deduped:
        if G.has_node(lnk.source_uid) and G.has_node(lnk.target_uid):
            G.add_edge(lnk.source_uid, lnk.target_uid,
                       link_type  = lnk.link_type,
                       confidence = lnk.confidence,
                       evidence   = lnk.evidence,
                       weight     = lnk.confidence * LINK_TYPES.get(lnk.link_type, {}).get("weight", 0.5),
                       )

    # ── Graph metrics ─────────────────────────────────────────────────────────
    try:
        degree_cent = nx.degree_centrality(G)
    except Exception:
        degree_cent = {}
    try:
        pagerank = nx.pagerank(G, weight="weight") if G.number_of_edges() > 0 else {}
    except Exception:
        pagerank = {}
    try:
        betweenness = nx.betweenness_centrality(G, weight="weight") if G.number_of_nodes() < 500 else {}
    except Exception:
        betweenness = {}

    # Top nodes by combined score
    scored = []
    for uid in G.nodes():
        node_data = G.nodes[uid]
        score = (degree_cent.get(uid, 0) * 0.4
                 + pagerank.get(uid, 0) * 0.4
                 + betweenness.get(uid, 0) * 0.2)
        scored.append({
            "uid":          uid,
            "callsign":     node_data.get("callsign"),
            "entityType":   node_data.get("entityType"),
            "affiliation":  node_data.get("affiliation"),
            "degreeCentrality": round(degree_cent.get(uid, 0), 3),
            "pageRank":     round(pagerank.get(uid, 0) * 100, 2),
            "betweenness":  round(betweenness.get(uid, 0), 3),
            "linkCount":    G.degree(uid),
            "combinedScore": round(score, 4),
        })
    top_nodes = sorted(scored, key=lambda x: -x["combinedScore"])[:20]

    # Community detection (Louvain requires python-louvain; fallback to connected components)
    communities: list[list[str]] = []
    try:
        import community as community_louvain  # python-louvain
        partition = community_louvain.best_partition(G)
        community_map: dict[int, list[str]] = defaultdict(list)
        for uid, comm_id in partition.items():
            community_map[comm_id].append(uid)
        communities = [v for v in community_map.values() if len(v) > 1]
    except ImportError:
        # Fallback: connected components
        for component in nx.connected_components(G):
            if len(component) > 1:
                communities.append(list(component))

    isolates = list(nx.isolates(G))

    analysis = GraphAnalysis(
        node_count  = G.number_of_nodes(),
        edge_count  = G.number_of_edges(),
        top_nodes   = top_nodes,
        communities = communities[:10],
        isolates    = isolates,
        links       = [lnk.as_dict() for lnk in deduped],
        metrics     = {
            "density":        round(nx.density(G), 4),
            "components":     nx.number_connected_components(G),
            "avgDegree":      round(sum(dict(G.degree()).values()) / max(G.number_of_nodes(), 1), 2),
            "hasNetworkxLouvain": "community" in dir(),
        },
    )
    return deduped, analysis


def get_entity_network(uid: str, entities: list[dict], links: list[dict],
                       depth: int = 2) -> dict:
    """
    Return the ego network for a specific entity — all entities within
    `depth` link-hops from the target. Used for the Target Workbench.
    """
    if not _HAS_NX:
        return {"uid": uid, "links": [], "neighbors": []}

    G = nx.Graph()
    uid_map = {e["uid"]: e for e in entities if e.get("uid")}
    for lnk in links:
        src = lnk.get("sourceUid") or lnk.get("source_uid")
        tgt = lnk.get("targetUid") or lnk.get("target_uid")
        if src and tgt:
            G.add_edge(src, tgt, **lnk)

    if uid not in G:
        return {"uid": uid, "links": [], "neighbors": []}

    ego = nx.ego_graph(G, uid, radius=depth)
    neighbors = []
    for n_uid in ego.nodes():
        if n_uid == uid:
            continue
        e = uid_map.get(n_uid, {"uid": n_uid})
        neighbors.append({
            "uid":         n_uid,
            "callsign":    e.get("callsign") or n_uid[:8],
            "entityType":  e.get("entityType"),
            "affiliation": e.get("affiliation"),
            "distance":    nx.shortest_path_length(G, uid, n_uid),
        })
    ego_links = [{"sourceUid": u, "targetUid": v, **G[u][v]}
                 for u, v in ego.edges()]

    return {
        "uid":       uid,
        "neighbors": sorted(neighbors, key=lambda x: x["distance"]),
        "links":     ego_links,
        "nodeCount": ego.number_of_nodes(),
    }
