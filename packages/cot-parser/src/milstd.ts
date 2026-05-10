import type { CoTAffiliation, CoTDomain } from '@mss/shared-types';

/**
 * MIL-STD-2525 CoT type string parser.
 * Type string format: a-[affiliation]-[domain]-[...subtypes]
 * Example: "a-f-A-C-F" → friendly air (commercial fixed-wing fighter)
 */

const AFFILIATION_MAP: Record<string, CoTAffiliation> = {
    'f': 'friendly',  // friend
    'a': 'friendly',  // assumed friend
    'h': 'hostile',   // hostile
    'j': 'hostile',   // joker (hostile not yet confirmed)
    'n': 'neutral',
    'u': 'unknown',
    'p': 'unknown',   // pending
    's': 'unknown',   // suspect
    'g': 'neutral',   // exercise neutral
    'w': 'neutral',   // exercise unknown
};

const DOMAIN_MAP: Record<string, CoTDomain> = {
    'G': 'ground',
    'A': 'air',
    'S': 'sea',
    'U': 'ground',    // subsurface → ground for display purposes
    'F': 'sea',       // fixed (sea surface)
    'P': 'space',
};

export function parseTypeString(typeStr: string): {
    affiliation: CoTAffiliation;
    domain:      CoTDomain;
} {
    const parts = typeStr.split('-');
    return {
        affiliation: AFFILIATION_MAP[parts[1]] ?? 'unknown',
        domain:      DOMAIN_MAP[parts[2]]      ?? 'unknown',
    };
}
