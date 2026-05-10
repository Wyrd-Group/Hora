// ── NFT Engine ──────────────────────────────────────────────────
// Game-native NFT metadata and management system for AEGIS agent cards.
// Follows ERC-721 metadata standards so tokens can be bridged to chain later.
// No blockchain dependency -- all state lives in the agent card store.

import {
  AGENT_CATALOG,
  AGENT_RARITY_CONFIG,
  AGENT_CLASS_CONFIG,
  getAgentById,
  type AgentCardDef,
  type AgentRarity,
  type AgentClass,
} from '../data/agentCards';
import { useAgentCardStore, type MintedAgent } from '../store/agentCardStore';
export type { MintedAgent } from '../store/agentCardStore';

// ── Types ───────────────────────────────────────────────────────

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: 'number' | 'boost_percentage' | 'boost_number' | 'date';
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;                // Data URI or URL
  external_url: string;
  attributes: NFTAttribute[];
  properties: {
    edition: string;
    editionNumber: number;
    maxSupply: number;
    rarity: string;
    class: string;
    mintedAt: number;           // Unix timestamp
    mintedBy: string;           // User ID
    tokenId: string;            // Unique token ID
    contractAddress: string;    // Simulated contract address
  };
}

export interface NFTTransferRecord {
  tokenId: string;
  from: string;
  to: string;
  timestamp: number;
  type: 'mint' | 'transfer' | 'sale';
  price?: number;               // AP, only for sales
  txHash: string;               // Simulated transaction hash
}

export interface NFTBundle {
  version: string;
  standard: 'ERC-721';
  chainId: number;              // Simulated chain ID
  contractAddress: string;
  tokenId: string;
  metadata: NFTMetadata;
  certificate: NFTCertificate;
  history: NFTTransferRecord[];
  exportedAt: number;
  signature: string;            // Hash-based integrity proof
}

export interface NFTCertificate {
  tokenId: string;
  mintHash: string;
  authenticityHash: string;
  issuedAt: number;
  issuer: string;
  standard: string;
  metadata_fingerprint: string;
}

export interface NFTSearchFilters {
  rarity?: AgentRarity;
  class?: AgentClass;
  edition?: string;
  minLevel?: number;
  maxLevel?: number;
  deployed?: boolean;
  locked?: boolean;
  ownerId?: string;
}

export interface CollectionStats {
  totalCards: number;
  totalValue: number;
  rarityBreakdown: Record<AgentRarity, number>;
  classBreakdown: Record<AgentClass, number>;
  averageLevel: number;
  deployedCount: number;
  uniqueCards: number;
  completionPercent: number;   // Percentage of catalog collected
  highestRarity: AgentRarity;
  oldestMint: number;
  newestMint: number;
}

// ── In-memory ledger (persisted via store in production) ────────

const transferLedger: NFTTransferRecord[] = [];
const ownershipMap: Map<string, string> = new Map(); // tokenId -> userId

// ── Constants ───────────────────────────────────────────────────

const SIMULATED_CHAIN_ID = 31337;   // Hardhat default
const CONTRACT_VERSION = '1.0.0';
const ISSUER = 'AEGIS Empire Protocol';
const BASE_EXTERNAL_URL = 'https://aegis.empire/agents';

const RARITY_BORDER_COLORS: Record<AgentRarity, string> = {
  Common:    '#9CA3AF',
  Uncommon:  '#34D399',
  Rare:      '#60A5FA',
  Epic:      '#A78BFA',
  Legendary: '#FBBF24',
  Mythic:    '#FF6B6B',
};

const RARITY_SCORE_BASE: Record<AgentRarity, number> = {
  Common:    100,
  Uncommon:  250,
  Rare:      500,
  Epic:      1000,
  Legendary: 2500,
  Mythic:    5000,
};

// ── Hashing Utilities ───────────────────────────────────────────

/**
 * Deterministic hash using a simple but effective string hash algorithm.
 * Produces a hex string suitable for token IDs and signatures.
 */
function hashString(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return combined.toString(16).padStart(16, '0');
}

/**
 * Generate a longer hash by concatenating multiple rounds.
 */
function longHash(input: string, rounds: number = 4): string {
  let result = '';
  for (let i = 0; i < rounds; i++) {
    result += hashString(input + ':' + i);
  }
  return result;
}

// ── 1. generateTokenId ──────────────────────────────────────────

/**
 * Generate a deterministic, unique token ID for an agent card edition.
 * Format: 0x + 64 hex chars (mimics ERC-721 uint256 token IDs).
 */
export function generateTokenId(cardId: string, editionNumber: number): string {
  const seed = `aegis:token:${cardId}:${editionNumber}`;
  const hash = longHash(seed, 4);
  return '0x' + hash.slice(0, 64).padStart(64, '0');
}

// ── 2. generateContractAddress ──────────────────────────────────

/**
 * Generate a deterministic simulated contract address for a collection.
 * Format: 0x + 40 hex chars (mimics Ethereum addresses).
 */
export function generateContractAddress(collection: string): string {
  const seed = `aegis:contract:${collection}`;
  const hash = longHash(seed, 3);
  return '0x' + hash.slice(0, 40);
}

// ── 3. generateNFTMetadata ──────────────────────────────────────

/**
 * Generate full ERC-721-compatible metadata for a minted agent card.
 */
export function generateNFTMetadata(
  card: AgentCardDef,
  mintedAgent: MintedAgent,
  editionNumber: number,
  userId: string = 'local-player',
): NFTMetadata {
  const tokenId = generateTokenId(card.id, editionNumber);
  const contractAddress = generateContractAddress(card.nft.collection);
  const image = generatePortraitDataURI(card);

  const attributes: NFTAttribute[] = [
    { trait_type: 'Class', value: card.class },
    { trait_type: 'Rarity', value: card.rarity },
    { trait_type: 'Edition', value: card.edition },
    { trait_type: 'Intelligence', value: card.stats.intelligence, display_type: 'number' },
    { trait_type: 'Speed', value: card.stats.speed, display_type: 'number' },
    { trait_type: 'Stealth', value: card.stats.stealth, display_type: 'number' },
    { trait_type: 'Loyalty', value: card.stats.loyalty, display_type: 'number' },
    { trait_type: 'Adaptability', value: card.stats.adaptability, display_type: 'number' },
    { trait_type: 'Influence', value: card.stats.influence, display_type: 'number' },
    { trait_type: 'Level', value: mintedAgent.level, display_type: 'number' },
    { trait_type: 'XP', value: mintedAgent.xp, display_type: 'number' },
    { trait_type: 'Total Missions', value: mintedAgent.totalMissions, display_type: 'number' },
    { trait_type: 'Success Rate', value: mintedAgent.totalMissions > 0
        ? Math.round((mintedAgent.successfulMissions / mintedAgent.totalMissions) * 100)
        : 0,
      display_type: 'boost_percentage',
    },
    { trait_type: 'Passive Ability', value: card.passive.description },
    { trait_type: 'Active Ability', value: card.ability.name },
    { trait_type: 'Codename', value: card.codename },
    { trait_type: 'Mint Date', value: mintedAgent.acquiredAt, display_type: 'date' },
    { trait_type: 'Rarity Score', value: calculateRarityScore(card) },
  ];

  if (card.ultimate) {
    attributes.push({ trait_type: 'Ultimate Ability', value: card.ultimate.name });
  }

  if (card.biography) {
    attributes.push(
      { trait_type: 'Full Name', value: card.biography.fullName },
      { trait_type: 'Title', value: card.biography.title },
      { trait_type: 'Origin', value: card.biography.origin },
    );
  }

  return {
    name: `${card.name} #${editionNumber.toString().padStart(4, '0')}`,
    description: card.lore,
    image,
    external_url: `${BASE_EXTERNAL_URL}/${card.id}/${editionNumber}`,
    attributes,
    properties: {
      edition: card.edition,
      editionNumber,
      maxSupply: card.maxSupply,
      rarity: card.rarity,
      class: card.class,
      mintedAt: mintedAgent.acquiredAt,
      mintedBy: userId,
      tokenId,
      contractAddress,
    },
  };
}

// ── 4. generatePortraitDataURI ──────────────────────────────────

/**
 * Generate an SVG data URI portrait for an agent card.
 * Uses the card's portraitGradient colors, iconGlyph, and rarity border.
 */
export function generatePortraitDataURI(card: AgentCardDef): string {
  const [c1, c2, c3] = card.portraitGradient;
  const borderColor = RARITY_BORDER_COLORS[card.rarity];
  void AGENT_RARITY_CONFIG[card.rarity].glow;
  const classColor = AGENT_CLASS_CONFIG[card.class].color;

  // Escape XML-sensitive characters in text
  const safeName = card.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeGlyph = card.iconGlyph.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeClass = card.class.replace(/&/g, '&amp;');
  const safeRarity = card.rarity.replace(/&/g, '&amp;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" width="400" height="560">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="50%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" />
      <stop offset="70%" stop-color="rgba(0,0,0,0.6)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.85)" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="textShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.8)"/>
    </filter>
    <clipPath id="cardClip">
      <rect x="8" y="8" width="384" height="544" rx="16"/>
    </clipPath>
  </defs>

  <!-- Rarity border frame -->
  <rect x="0" y="0" width="400" height="560" rx="20" fill="${borderColor}" opacity="0.9"/>
  <rect x="3" y="3" width="394" height="554" rx="18" fill="${borderColor}" opacity="0.4"/>

  <!-- Inner card -->
  <g clip-path="url(#cardClip)">
    <!-- Background gradient -->
    <rect x="8" y="8" width="384" height="544" rx="16" fill="url(#bg)"/>

    <!-- Decorative circles -->
    <circle cx="200" cy="220" r="180" fill="none" stroke="${borderColor}" stroke-width="0.5" opacity="0.2"/>
    <circle cx="200" cy="220" r="140" fill="none" stroke="${borderColor}" stroke-width="0.5" opacity="0.15"/>
    <circle cx="200" cy="220" r="100" fill="none" stroke="${borderColor}" stroke-width="0.5" opacity="0.1"/>

    <!-- Grid pattern overlay -->
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${borderColor}" stroke-width="0.3" opacity="0.08"/>
    </pattern>
    <rect x="8" y="8" width="384" height="544" fill="url(#grid)"/>

    <!-- Dark overlay for readability -->
    <rect x="8" y="8" width="384" height="544" fill="url(#overlay)"/>

    <!-- Icon glyph (large centered) -->
    <text x="200" y="240" text-anchor="middle" dominant-baseline="central"
          font-size="120" filter="url(#glow)" opacity="0.95">${safeGlyph}</text>

    <!-- Rarity badge (top-left) -->
    <rect x="24" y="24" width="90" height="28" rx="14" fill="${borderColor}" opacity="0.85"/>
    <text x="69" y="43" text-anchor="middle" font-family="monospace" font-size="12"
          font-weight="bold" fill="#0C0B0A">${safeRarity}</text>

    <!-- Class badge (top-right) -->
    <rect x="286" y="24" width="90" height="28" rx="14" fill="${classColor}" opacity="0.85"/>
    <text x="331" y="43" text-anchor="middle" font-family="monospace" font-size="11"
          font-weight="bold" fill="#0C0B0A">${safeClass}</text>

    <!-- Edition indicator -->
    <rect x="155" y="24" width="90" height="28" rx="14" fill="rgba(0,0,0,0.5)" stroke="${borderColor}" stroke-width="1"/>
    <text x="200" y="43" text-anchor="middle" font-family="monospace" font-size="11"
          fill="#E8E0D0" opacity="0.9">${card.edition}</text>

    <!-- Stats bar area -->
    <rect x="30" y="340" width="340" height="4" rx="2" fill="rgba(255,255,255,0.1)"/>
    <rect x="30" y="340" width="${(card.stats.intelligence / 100) * 340}" height="4" rx="2" fill="${borderColor}" opacity="0.7"/>
    <text x="30" y="335" font-family="monospace" font-size="9" fill="#E8E0D0" opacity="0.6">INT ${card.stats.intelligence}</text>

    <rect x="30" y="358" width="340" height="4" rx="2" fill="rgba(255,255,255,0.1)"/>
    <rect x="30" y="358" width="${(card.stats.speed / 100) * 340}" height="4" rx="2" fill="${borderColor}" opacity="0.6"/>
    <text x="30" y="353" font-family="monospace" font-size="9" fill="#E8E0D0" opacity="0.6">SPD ${card.stats.speed}</text>

    <rect x="30" y="376" width="340" height="4" rx="2" fill="rgba(255,255,255,0.1)"/>
    <rect x="30" y="376" width="${(card.stats.adaptability / 100) * 340}" height="4" rx="2" fill="${borderColor}" opacity="0.5"/>
    <text x="30" y="371" font-family="monospace" font-size="9" fill="#E8E0D0" opacity="0.6">ADP ${card.stats.adaptability}</text>

    <!-- Divider line -->
    <line x1="30" y1="395" x2="370" y2="395" stroke="${borderColor}" stroke-width="1" opacity="0.3"/>

    <!-- Agent name -->
    <text x="200" y="430" text-anchor="middle" font-family="sans-serif" font-size="26"
          font-weight="bold" fill="#E8E0D0" filter="url(#textShadow)">${safeName}</text>

    <!-- Codename -->
    <text x="200" y="458" text-anchor="middle" font-family="monospace" font-size="13"
          fill="${borderColor}" opacity="0.8">${card.codename}</text>

    <!-- Ability name -->
    <text x="200" y="486" text-anchor="middle" font-family="monospace" font-size="11"
          fill="#E8E0D0" opacity="0.5">${card.ability.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>

    <!-- Bottom bar: supply info -->
    <rect x="24" y="508" width="352" height="30" rx="8" fill="rgba(0,0,0,0.4)"/>
    <text x="40" y="528" font-family="monospace" font-size="11" fill="#E8E0D0" opacity="0.6">Supply: ${card.maxSupply}</text>
    <text x="360" y="528" text-anchor="end" font-family="monospace" font-size="11"
          fill="${borderColor}" opacity="0.8">ERC-721</text>
  </g>
</svg>`;

  // Encode as data URI
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');

  return `data:image/svg+xml,${encoded}`;
}

// ── 5. validateNFTMetadata ──────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate metadata against the ERC-721 metadata schema.
 */
export function validateNFTMetadata(metadata: NFTMetadata): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required top-level fields
  if (!metadata.name || typeof metadata.name !== 'string') {
    errors.push('Missing or invalid "name" field');
  }
  if (!metadata.description || typeof metadata.description !== 'string') {
    errors.push('Missing or invalid "description" field');
  }
  if (!metadata.image || typeof metadata.image !== 'string') {
    errors.push('Missing or invalid "image" field');
  }
  if (typeof metadata.external_url !== 'string') {
    errors.push('Missing or invalid "external_url" field');
  }

  // Image validation
  if (metadata.image) {
    const isDataUri = metadata.image.startsWith('data:');
    const isUrl = metadata.image.startsWith('http://') || metadata.image.startsWith('https://');
    const isIpfs = metadata.image.startsWith('ipfs://');
    if (!isDataUri && !isUrl && !isIpfs) {
      warnings.push('Image should be a data URI, HTTP(S) URL, or IPFS URI');
    }
  }

  // Attributes validation
  if (!Array.isArray(metadata.attributes)) {
    errors.push('"attributes" must be an array');
  } else {
    for (let i = 0; i < metadata.attributes.length; i++) {
      const attr = metadata.attributes[i];
      if (!attr.trait_type || typeof attr.trait_type !== 'string') {
        errors.push(`Attribute[${i}]: missing or invalid "trait_type"`);
      }
      if (attr.value === undefined || attr.value === null) {
        errors.push(`Attribute[${i}]: missing "value"`);
      }
      if (attr.display_type !== undefined) {
        const validTypes = ['number', 'boost_percentage', 'boost_number', 'date'];
        if (!validTypes.includes(attr.display_type)) {
          warnings.push(`Attribute[${i}]: unknown display_type "${attr.display_type}"`);
        }
      }
    }
  }

  // Properties validation
  if (!metadata.properties) {
    errors.push('Missing "properties" object');
  } else {
    const p = metadata.properties;
    if (!p.tokenId || typeof p.tokenId !== 'string') errors.push('Missing properties.tokenId');
    if (!p.contractAddress || typeof p.contractAddress !== 'string') errors.push('Missing properties.contractAddress');
    if (typeof p.editionNumber !== 'number' || p.editionNumber < 1) errors.push('Invalid properties.editionNumber');
    if (typeof p.maxSupply !== 'number' || p.maxSupply < 1) errors.push('Invalid properties.maxSupply');
    if (typeof p.mintedAt !== 'number') errors.push('Missing properties.mintedAt');
    if (!p.mintedBy || typeof p.mintedBy !== 'string') errors.push('Missing properties.mintedBy');
    if (!p.rarity || typeof p.rarity !== 'string') errors.push('Missing properties.rarity');
    if (!p.class || typeof p.class !== 'string') errors.push('Missing properties.class');
    if (!p.edition || typeof p.edition !== 'string') errors.push('Missing properties.edition');

    // Cross-validation
    if (p.editionNumber > p.maxSupply) {
      errors.push(`Edition number (${p.editionNumber}) exceeds max supply (${p.maxSupply})`);
    }

    // Token ID format
    if (p.tokenId && !p.tokenId.startsWith('0x')) {
      warnings.push('Token ID should start with 0x for EVM compatibility');
    }

    // Contract address format
    if (p.contractAddress && (!p.contractAddress.startsWith('0x') || p.contractAddress.length !== 42)) {
      warnings.push('Contract address should be 0x + 40 hex characters');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── 6. calculateRarityScore ─────────────────────────────────────

/**
 * Calculate a numeric rarity score based on stats, rarity tier, and supply scarcity.
 * Higher is rarer/more valuable.
 */
export function calculateRarityScore(card: AgentCardDef): number {
  const baseScore = RARITY_SCORE_BASE[card.rarity];

  // Stat contribution: average of all stats, scaled
  const statAvg = (
    card.stats.intelligence +
    card.stats.speed +
    card.stats.stealth +
    card.stats.loyalty +
    card.stats.adaptability +
    card.stats.influence
  ) / 6;
  const statBonus = Math.round(statAvg * 2);

  // Scarcity multiplier: fewer supply = higher score
  const scarcityMultiplier = card.maxSupply <= 50 ? 1.5
    : card.maxSupply <= 100 ? 1.3
    : card.maxSupply <= 250 ? 1.15
    : card.maxSupply <= 500 ? 1.05
    : 1.0;

  // Edition bonus
  const editionBonus = card.edition === 'Genesis' ? 200
    : card.edition === 'Alpha' ? 100
    : card.edition === 'Beta' ? 50
    : 0;

  // Ultimate ability bonus
  const ultimateBonus = card.ultimate ? 150 : 0;

  // Synergy tags bonus (more tags = more combo potential)
  const synergyBonus = card.synergyTags.length * 15;

  const rawScore = baseScore + statBonus + editionBonus + ultimateBonus + synergyBonus;
  return Math.round(rawScore * scarcityMultiplier);
}

// ── 7. generateCertificateOfAuthenticity ────────────────────────

/**
 * Generate a hash-based certificate of authenticity for NFT metadata.
 */
export function generateCertificateOfAuthenticity(metadata: NFTMetadata): NFTCertificate {
  const tokenId = metadata.properties.tokenId;

  // Fingerprint the metadata content deterministically
  const fingerPrintInput = [
    metadata.name,
    metadata.description,
    metadata.properties.edition,
    metadata.properties.editionNumber,
    metadata.properties.maxSupply,
    metadata.properties.rarity,
    metadata.properties.class,
    metadata.properties.mintedAt,
    metadata.properties.mintedBy,
  ].join(':');

  const metadataFingerprint = '0x' + longHash(fingerPrintInput, 4).slice(0, 64);

  // Mint hash: unique to this specific token
  const mintHashInput = `${tokenId}:${metadata.properties.mintedAt}:${metadata.properties.mintedBy}`;
  const mintHash = '0x' + longHash(mintHashInput, 4).slice(0, 64);

  // Authenticity hash: combines everything
  const authInput = `${mintHash}:${metadataFingerprint}:${ISSUER}`;
  const authenticityHash = '0x' + longHash(authInput, 4).slice(0, 64);

  return {
    tokenId,
    mintHash,
    authenticityHash,
    issuedAt: metadata.properties.mintedAt,
    issuer: ISSUER,
    standard: 'ERC-721',
    metadata_fingerprint: metadataFingerprint,
  };
}

// ── 8. exportNFTBundle ──────────────────────────────────────────

/**
 * Export a complete NFT bundle ready for marketplace display or chain bridging.
 */
export function exportNFTBundle(metadata: NFTMetadata): NFTBundle {
  const certificate = generateCertificateOfAuthenticity(metadata);
  const history = getNFTHistory(metadata.properties.tokenId);

  // If no history exists, create the mint record
  const effectiveHistory = history.length > 0 ? history : [{
    tokenId: metadata.properties.tokenId,
    from: '0x0000000000000000000000000000000000000000',
    to: metadata.properties.mintedBy,
    timestamp: metadata.properties.mintedAt,
    type: 'mint' as const,
    txHash: '0x' + longHash(`mint:${metadata.properties.tokenId}:${metadata.properties.mintedAt}`, 4).slice(0, 64),
  }];

  // Integrity signature over the entire bundle
  const sigInput = [
    certificate.authenticityHash,
    certificate.metadata_fingerprint,
    metadata.properties.tokenId,
    effectiveHistory.length,
    Date.now(),
  ].join(':');
  const signature = '0x' + longHash(sigInput, 4).slice(0, 128);

  return {
    version: CONTRACT_VERSION,
    standard: 'ERC-721',
    chainId: SIMULATED_CHAIN_ID,
    contractAddress: metadata.properties.contractAddress,
    tokenId: metadata.properties.tokenId,
    metadata,
    certificate,
    history: effectiveHistory,
    exportedAt: Date.now(),
    signature,
  };
}

// ── 9. verifyOwnership ──────────────────────────────────────────

/**
 * Check if a user owns a specific token.
 * Checks both the in-memory ownership map and the agent card store.
 */
export function verifyOwnership(tokenId: string, userId: string): boolean {
  // Check in-memory ledger first
  const owner = ownershipMap.get(tokenId);
  if (owner !== undefined) {
    return owner === userId;
  }

  // Fall back to store: find the minted agent with a matching token ID
  const store = useAgentCardStore.getState();
  for (const agent of Object.values(store.agents)) {
    const def = getAgentById(agent.cardId);
    if (!def) continue;
    const agentTokenId = generateTokenId(agent.cardId, agent.editionNumber);
    if (agentTokenId === tokenId) {
      // Register ownership in the map for faster future lookups
      ownershipMap.set(tokenId, userId);
      return true;
    }
  }

  return false;
}

// ── 10. transferNFT ─────────────────────────────────────────────

export interface TransferResult {
  success: boolean;
  error?: string;
  record?: NFTTransferRecord;
}

/**
 * Transfer an NFT from one user to another with validation.
 */
export function transferNFT(
  tokenId: string,
  fromUserId: string,
  toUserId: string,
  price?: number,
): TransferResult {
  // Validate sender owns the token
  if (!verifyOwnership(tokenId, fromUserId)) {
    return { success: false, error: 'Sender does not own this token' };
  }

  // Cannot transfer to self
  if (fromUserId === toUserId) {
    return { success: false, error: 'Cannot transfer to yourself' };
  }

  // Find the minted agent to check lock status
  const store = useAgentCardStore.getState();
  let targetMintId: string | null = null;

  for (const [mintId, agent] of Object.entries(store.agents)) {
    const agentTokenId = generateTokenId(agent.cardId, agent.editionNumber);
    if (agentTokenId === tokenId) {
      if (agent.isLocked) {
        return { success: false, error: 'Token is locked and cannot be transferred' };
      }
      if (agent.deployedTo) {
        return { success: false, error: 'Token is currently deployed. Recall before transferring.' };
      }
      targetMintId = mintId;
      break;
    }
  }

  if (!targetMintId) {
    return { success: false, error: 'Token not found in agent inventory' };
  }

  // Record the transfer
  const record: NFTTransferRecord = {
    tokenId,
    from: fromUserId,
    to: toUserId,
    timestamp: Date.now(),
    type: price !== undefined ? 'sale' : 'transfer',
    price,
    txHash: '0x' + longHash(`transfer:${tokenId}:${fromUserId}:${toUserId}:${Date.now()}`, 4).slice(0, 64),
  };

  transferLedger.push(record);
  ownershipMap.set(tokenId, toUserId);

  return { success: true, record };
}

// ── 11. getNFTHistory ───────────────────────────────────────────

/**
 * Get the full mint/transfer/sale history for a token.
 */
export function getNFTHistory(tokenId: string): NFTTransferRecord[] {
  return transferLedger.filter(r => r.tokenId === tokenId).sort((a, b) => a.timestamp - b.timestamp);
}

// ── 12. batchMintNFTs ───────────────────────────────────────────

export interface BatchMintResult {
  success: boolean;
  minted: Array<{ mintedAgent: MintedAgent; metadata: NFTMetadata }>;
  failed: number;
  errors: string[];
}

/**
 * Mint multiple editions of a card for a user.
 */
export function batchMintNFTs(
  cardId: string,
  count: number,
  userId: string = 'local-player',
): BatchMintResult {
  const card = getAgentById(cardId);
  if (!card) {
    return { success: false, minted: [], failed: count, errors: [`Card "${cardId}" not found`] };
  }

  const store = useAgentCardStore.getState();
  const currentEdition = store.editionCounters[cardId] ?? 0;
  const available = card.maxSupply - currentEdition;

  if (available <= 0) {
    return { success: false, minted: [], failed: count, errors: ['Card is sold out'] };
  }

  const actualCount = Math.min(count, available);
  const minted: Array<{ mintedAgent: MintedAgent; metadata: NFTMetadata }> = [];
  const errors: string[] = [];
  let failed = 0;

  for (let i = 0; i < actualCount; i++) {
    const mintedAgent = useAgentCardStore.getState().mintAgent(cardId);
    if (!mintedAgent) {
      failed++;
      errors.push(`Failed to mint edition ${currentEdition + i + 1}`);
      continue;
    }

    const metadata = generateNFTMetadata(card, mintedAgent, mintedAgent.editionNumber, userId);
    const tokenId = metadata.properties.tokenId;

    // Record mint in ledger
    const mintRecord: NFTTransferRecord = {
      tokenId,
      from: '0x0000000000000000000000000000000000000000',
      to: userId,
      timestamp: mintedAgent.acquiredAt,
      type: 'mint',
      txHash: '0x' + longHash(`mint:${tokenId}:${mintedAgent.acquiredAt}`, 4).slice(0, 64),
    };
    transferLedger.push(mintRecord);
    ownershipMap.set(tokenId, userId);

    minted.push({ mintedAgent, metadata });
  }

  const requestedButUnavailable = count - actualCount;
  if (requestedButUnavailable > 0) {
    failed += requestedButUnavailable;
    errors.push(`${requestedButUnavailable} editions could not be minted (supply limit)`);
  }

  return {
    success: minted.length > 0,
    minted,
    failed,
    errors,
  };
}

// ── 13. calculateCollectionValue ────────────────────────────────

/**
 * Calculate the total estimated value of a user's NFT collection in AP.
 */
export function calculateCollectionValue(_userId: string = 'local-player'): number {
  const store = useAgentCardStore.getState();
  let totalValue = 0;

  for (const agent of Object.values(store.agents)) {
    const def = getAgentById(agent.cardId);
    if (!def) continue;

    const rarityConfig = AGENT_RARITY_CONFIG[def.rarity];
    const rarityScore = calculateRarityScore(def);

    // Base value from rarity quick-sell price
    let value = rarityConfig.quickSellValue;

    // Level multiplier: +25% per level above 1
    value *= 1 + (agent.level - 1) * 0.25;

    // Rarity score bonus (normalized)
    value *= 1 + (rarityScore / 5000) * 0.5;

    // Edition scarcity: lower edition numbers are worth more
    const editionScarcity = 1 + Math.max(0, 1 - (agent.editionNumber / def.maxSupply)) * 0.3;
    value *= editionScarcity;

    // Mission experience adds value
    if (agent.totalMissions > 0) {
      const successRate = agent.successfulMissions / agent.totalMissions;
      value *= 1 + (successRate * agent.totalMissions * 0.005);
    }

    // Genesis/Alpha edition premium
    if (def.edition === 'Genesis') value *= 1.5;
    else if (def.edition === 'Alpha') value *= 1.25;

    totalValue += Math.round(value);
  }

  return totalValue;
}

// ── 14. getCollectionStats ──────────────────────────────────────

/**
 * Get comprehensive statistics about a user's collection.
 */
export function getCollectionStats(userId: string = 'local-player'): CollectionStats {
  const store = useAgentCardStore.getState();
  const agents = Object.values(store.agents);

  const rarityBreakdown: Record<AgentRarity, number> = {
    Common: 0, Uncommon: 0, Rare: 0, Epic: 0, Legendary: 0, Mythic: 0,
  };
  const classBreakdown: Record<AgentClass, number> = {
    Autonomous: 0, Coder: 0, Orchestrator: 0, Trader: 0, Researcher: 0,
    Infiltrator: 0, Navigator: 0, Analyst: 0, Social: 0, Specialist: 0,
    Scout: 0, Jobhunter: 0,
  };

  let totalLevel = 0;
  let deployedCount = 0;
  let oldestMint = Infinity;
  let newestMint = 0;
  const uniqueCardIds = new Set<string>();
  let highestRarityIndex = -1;

  const rarityOrder: AgentRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

  for (const agent of agents) {
    const def = getAgentById(agent.cardId);
    if (!def) continue;

    rarityBreakdown[def.rarity]++;
    classBreakdown[def.class]++;
    totalLevel += agent.level;
    uniqueCardIds.add(agent.cardId);

    if (agent.deployedTo) deployedCount++;
    if (agent.acquiredAt < oldestMint) oldestMint = agent.acquiredAt;
    if (agent.acquiredAt > newestMint) newestMint = agent.acquiredAt;

    const ri = rarityOrder.indexOf(def.rarity);
    if (ri > highestRarityIndex) highestRarityIndex = ri;
  }

  const totalCards = agents.length;

  return {
    totalCards,
    totalValue: calculateCollectionValue(userId),
    rarityBreakdown,
    classBreakdown,
    averageLevel: totalCards > 0 ? Math.round((totalLevel / totalCards) * 10) / 10 : 0,
    deployedCount,
    uniqueCards: uniqueCardIds.size,
    completionPercent: Math.round((uniqueCardIds.size / AGENT_CATALOG.length) * 10000) / 100,
    highestRarity: highestRarityIndex >= 0 ? rarityOrder[highestRarityIndex] : 'Common',
    oldestMint: oldestMint === Infinity ? 0 : oldestMint,
    newestMint,
  };
}

// ── 15. searchNFTs ──────────────────────────────────────────────

export interface NFTSearchResult {
  mintId: string;
  tokenId: string;
  card: AgentCardDef;
  agent: MintedAgent;
  metadata: NFTMetadata;
  rarityScore: number;
}

/**
 * Search across all minted NFTs with text query and structured filters.
 */
export function searchNFTs(
  query: string = '',
  filters: NFTSearchFilters = {},
): NFTSearchResult[] {
  const store = useAgentCardStore.getState();
  const results: NFTSearchResult[] = [];
  const lowerQuery = query.toLowerCase().trim();

  for (const [mintId, agent] of Object.entries(store.agents)) {
    const def = getAgentById(agent.cardId);
    if (!def) continue;

    // Apply structured filters
    if (filters.rarity && def.rarity !== filters.rarity) continue;
    if (filters.class && def.class !== filters.class) continue;
    if (filters.edition && def.edition !== filters.edition) continue;
    if (filters.minLevel !== undefined && agent.level < filters.minLevel) continue;
    if (filters.maxLevel !== undefined && agent.level > filters.maxLevel) continue;
    if (filters.deployed === true && !agent.deployedTo) continue;
    if (filters.deployed === false && agent.deployedTo) continue;
    if (filters.locked === true && !agent.isLocked) continue;
    if (filters.locked === false && agent.isLocked) continue;

    // Text search across multiple fields
    if (lowerQuery) {
      const searchableText = [
        def.name,
        def.codename,
        def.class,
        def.rarity,
        def.lore,
        def.ability.name,
        def.ultimate?.name ?? '',
        def.biography.fullName,
        def.biography.title,
        def.biography.origin,
        def.biography.specialization,
        ...def.synergyTags,
      ].join(' ').toLowerCase();

      if (!searchableText.includes(lowerQuery)) continue;
    }

    const tokenId = generateTokenId(agent.cardId, agent.editionNumber);
    const metadata = generateNFTMetadata(def, agent, agent.editionNumber);
    const rarityScore = calculateRarityScore(def);

    results.push({ mintId, tokenId, card: def, agent, metadata, rarityScore });
  }

  // Sort by rarity score descending
  results.sort((a, b) => b.rarityScore - a.rarityScore);

  return results;
}

// ── Utility Exports ─────────────────────────────────────────────

/** Get a human-readable summary of an NFT for display. */
export function getNFTSummary(card: AgentCardDef, agent: MintedAgent): string {
  const tokenId = generateTokenId(card.id, agent.editionNumber);
  const score = calculateRarityScore(card);
  return [
    `${card.name} #${agent.editionNumber.toString().padStart(4, '0')}`,
    `${card.rarity} ${card.class} | Score: ${score}`,
    `Level ${agent.level} | Missions: ${agent.totalMissions}`,
    `Token: ${tokenId.slice(0, 10)}...${tokenId.slice(-6)}`,
  ].join('\n');
}

/** Get all rarity border colors (useful for UI rendering). */
export function getRarityBorderColors(): Record<AgentRarity, string> {
  return { ...RARITY_BORDER_COLORS };
}

/** Check if a card edition is still available for minting. */
export function isEditionAvailable(cardId: string): { available: boolean; remaining: number } {
  const card = getAgentById(cardId);
  if (!card) return { available: false, remaining: 0 };

  const store = useAgentCardStore.getState();
  const minted = store.editionCounters[cardId] ?? 0;
  const remaining = card.maxSupply - minted;

  return { available: remaining > 0, remaining };
}

/** Clear the in-memory ownership registry (used in tests). */
export function clearOwnershipRegistry(): void {
  ownershipMap.clear();
}
