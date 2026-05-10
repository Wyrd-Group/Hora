/**
 * @mss/shared-types
 * Single source of truth for all data shapes — consumed by both frontend (aegis)
 * and backend (services/api, services/ingestor).
 *
 * CLAUDE-OWNED: Gemini should extend, not replace.
 *
 * Field naming note: lat/lon align with the aegis Web Worker convention
 * (dataParser.worker.js reads item.lon + item.lat). deck.gl position arrays
 * [lon, lat] are a frontend-internal concern — not represented here.
 */

// ── Vocabulary types ──────────────────────────────────────────────────────────
export type CoTAffiliation = 'friendly' | 'hostile' | 'neutral' | 'unknown';
export type CoTDomain      = 'ground'   | 'air'     | 'sea'     | 'space' | 'cyber' | 'unknown';
export type EntitySource   = 'ADS-B'   | 'AIS'     | 'CoT'     | 'OSINT' | 'MANUAL';
export type EntityType     = 'vessel'  | 'aircraft' | 'ground'  | 'person' | 'location' | 'event';

// ── Core entity shape ─────────────────────────────────────────────────────────
// lon/lat are separate fields to match the aegis worker: item.lon, item.lat
// The worker converts to position:[lon,lat] for deck.gl — that stays in aegis.
export interface MSSEntity {
    id:           string;           // UUID from DB
    uid:          string;           // original source identifier (CoT uid / ICAO / MMSI)
    entityType:   EntityType | string;
    callsign:     string | null;
    lat:          number | null;
    lon:          number | null;
    altitude:     number | null;    // metres above ellipsoid (HAE)
    heading:      number | null;    // degrees true (0–360)
    speed:        number | null;    // knots
    affiliation:  CoTAffiliation;
    source:       EntitySource;
    staleAt:      string | null;    // ISO8601
    lastSeen:     string;           // ISO8601
    raw?:         unknown;
}

// ── WebSocket wire formats ────────────────────────────────────────────────────
// CONTRACT: do not change without updating both agents + this file.

export type WSEntityOp = 'upsert' | 'stale' | 'delete';

export interface WSEntityMessage {
    op:        WSEntityOp;
    entity:    MSSEntity;
    timestamp: string;              // ISO8601
}

export type WSEventSeverity = 'info' | 'warning' | 'critical';

export interface WSEventMessage {
    severity:  WSEventSeverity;
    message:   string;
    entityId:  string | null;
    timestamp: string;              // ISO8601
}

// ── CoT parsed output ─────────────────────────────────────────────────────────
export interface CoTParsed {
    uid:         string;
    typeString:  string;            // raw e.g. "a-f-A-C-F"
    affiliation: CoTAffiliation;
    domain:      CoTDomain;
    callsign:    string | null;
    lat:         number;
    lon:         number;
    altitude:    number | null;
    speed:       number | null;
    heading:     number | null;
    battery:     number | null;
    staleAt:     Date;
    raw:         string;            // original XML
}

// ── Relationship graph (entity detail) ────────────────────────────────────────
export interface EntityRelationship {
    type:   string;                 // 'OWNS' | 'DOCKED_AT' | 'MEMBER_OF' | 'SIGHTED_WITH'
    target: {
        id:    string;
        type:  string;
        label: string;
    };
}

export interface Sighting {
    lat:        number;
    lon:        number;
    altitude:   number | null;
    heading:    number | null;
    speed:      number | null;
    observedAt: string;             // ISO8601
    source:     string | null;
    confidence: number;
}

export interface EntityDetail extends MSSEntity {
    relationships:   EntityRelationship[];
    recentSightings: Sighting[];
}

// ── OSINT report ──────────────────────────────────────────────────────────────
export interface OsintReport {
    id:          string;
    title:       string | null;
    body:        string | null;
    sourceUrl:   string | null;
    publishedAt: string | null;
    entityIds:   string[];
    similarity?: number;            // only in search results
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface ApiHealth {
    status:  'ok' | 'degraded';
    version: string;
    uptime:  number;                // seconds
}

export interface PaginatedResponse<T> {
    items:   T[];
    total:   number;
    page:    number;
    perPage: number;
}

export interface IngestResult {
    accepted: number;
    failed:   number;
}

export interface DossierResult {
    markdown:    string;
    generatedAt: string;
}

export interface TrackResult {
    uid:      string;
    sightings: Sighting[];
}

export interface SimilarReportsResult {
    reports: OsintReport[];
}
