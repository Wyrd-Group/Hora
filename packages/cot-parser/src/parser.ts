import { DOMParser } from '@xmldom/xmldom';
import { parseTypeString } from './milstd';
import type { CoTParsed } from '@mss/shared-types';

/**
 * Parse a single CoT XML event string into a CoTParsed object.
 */
export function parseCoT(xml: string): CoTParsed {
    const doc    = new DOMParser().parseFromString(xml, 'text/xml');
    const event  = doc.documentElement;
    const point  = event.getElementsByTagName('point')[0];
    const detail = event.getElementsByTagName('detail')[0];
    const contact = detail?.getElementsByTagName('contact')[0];
    const track   = detail?.getElementsByTagName('track')[0];
    const status  = detail?.getElementsByTagName('status')[0];

    const typeStr = event.getAttribute('type') ?? '';
    const { affiliation, domain } = parseTypeString(typeStr);

    const lat = parseFloat(point?.getAttribute('lat') ?? 'NaN');
    const lon = parseFloat(point?.getAttribute('lon') ?? 'NaN');

    if (isNaN(lat) || isNaN(lon)) {
        throw new Error(`CoT parse error: invalid lat/lon in XML — uid=${event.getAttribute('uid')}`);
    }

    return {
        uid:         event.getAttribute('uid') ?? '',
        typeString:  typeStr,
        affiliation,
        domain,
        callsign:    contact?.getAttribute('callsign') ?? null,
        lat,
        lon,
        altitude:    parseFloatOrNull(point?.getAttribute('hae')),
        speed:       parseFloatOrNull(track?.getAttribute('speed')),
        heading:     parseFloatOrNull(track?.getAttribute('course')),
        battery:     parseFloatOrNull(status?.getAttribute('battery')),
        staleAt:     new Date(event.getAttribute('stale') ?? Date.now()),
        raw:         xml,
    };
}

/**
 * Parse one or more CoT XML events.
 * Handles both single <event> and <events><event>...</event></events> wrapper.
 */
export function parseCoTBatch(xml: string): CoTParsed[] {
    const trimmed = xml.trim();
    if (trimmed.startsWith('<events>')) {
        const doc    = new DOMParser().parseFromString(trimmed, 'text/xml');
        const events = Array.from(doc.getElementsByTagName('event'));
        return events.map(e => parseCoT(e.toString()));
    }
    return [parseCoT(trimmed)];
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function parseFloatOrNull(s: string | null | undefined): number | null {
    if (s == null) return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
}
