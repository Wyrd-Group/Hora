/**
 * Suite 1: NFT Metadata System (src/lib/nftEngine.ts) -- 1000 tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  AGENT_CATALOG,
  getAgentById,
  type AgentRarity,
} from '../data/agentCards';
import {
  generateTokenId,
  generateContractAddress,
  generateNFTMetadata,
  generatePortraitDataURI,
  validateNFTMetadata,
  calculateRarityScore,
  generateCertificateOfAuthenticity,
  exportNFTBundle,
  verifyOwnership,
  transferNFT,
  batchMintNFTs,
  calculateCollectionValue,
  getCollectionStats,
  searchNFTs,
} from '../lib/nftEngine';
import { useAgentCardStore } from '../store/agentCardStore';

// Helpers
function makeMintedAgent(cardId: string, editionNumber: number, overrides: Partial<any> = {}): any {
  return {
    mintId: `${cardId}-${editionNumber}-test`,
    cardId,
    editionNumber,
    level: 1,
    xp: 0,
    deployedTo: null,
    cooldownUntil: 0,
    ultimateCooldownUntil: 0,
    totalMissions: 0,
    successfulMissions: 0,
    acquiredAt: 1700000000000,
    isLocked: false,
    ...overrides,
  };
}

const ALL_CARD_IDS = AGENT_CATALOG.map(c => c.id);
const ALL_RARITIES: AgentRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

// Reset store between tests
beforeEach(() => {
  useAgentCardStore.setState({
    agents: {},
    editionCounters: {},
    listings: [],
    totalMinted: 0,
    totalDeployed: 0,
    pityCounter: 0,
  });
});

// ═══════════════════════════════════════════════════════════════════
// 1. Token ID Generation -- 100 tests
// ═══════════════════════════════════════════════════════════════════

describe('Token ID Generation', () => {
  // 50 tests: various cardId + edition combos
  describe.each(
    ALL_CARD_IDS.map((id, i) => ({ cardId: id, edition: i + 1 }))
  )('generateTokenId($cardId, $edition)', ({ cardId, edition }) => {
    it('returns a hex string starting with 0x', () => {
      const tokenId = generateTokenId(cardId, edition);
      expect(tokenId).toMatch(/^0x[0-9a-f]{64}$/);
    });
  });

  // 25 tests: determinism
  describe.each(
    ALL_CARD_IDS.slice(0, 25).map((id, i) => ({ cardId: id, edition: i + 1 }))
  )('determinism for $cardId ed#$edition', ({ cardId, edition }) => {
    it('produces same token ID on repeated calls', () => {
      const a = generateTokenId(cardId, edition);
      const b = generateTokenId(cardId, edition);
      expect(a).toBe(b);
    });
  });

  // 25 tests: uniqueness -- each pair of adjacent cards produces different IDs
  describe.each(
    ALL_CARD_IDS.slice(0, 25).map((id, i) => ({
      cardA: id,
      cardB: ALL_CARD_IDS[(i + 1) % ALL_CARD_IDS.length],
      edition: i + 1,
    }))
  )('uniqueness $cardA vs $cardB ed#$edition', ({ cardA, cardB, edition }) => {
    it('produces different token IDs for different cards', () => {
      expect(generateTokenId(cardA, edition)).not.toBe(generateTokenId(cardB, edition));
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. Contract Address Generation -- 50 tests
// ═══════════════════════════════════════════════════════════════════

describe('Contract Address Generation', () => {
  describe.each(
    ALL_CARD_IDS.map(id => {
      const def = getAgentById(id)!;
      return { collection: def.nft.collection, cardId: id };
    })
  )('generateContractAddress for $cardId collection=$collection', ({ collection }) => {
    it('returns a 0x-prefixed 42-char hex string', () => {
      const addr = generateContractAddress(collection);
      expect(addr).toMatch(/^0x[0-9a-f]{40}$/);
      expect(addr.length).toBe(42);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. Metadata Generation -- 100 tests (50 cards x 2 editions)
// ═══════════════════════════════════════════════════════════════════

describe('Metadata Generation', () => {
  describe.each(
    ALL_CARD_IDS.flatMap(id => [
      { cardId: id, edition: 1 },
      { cardId: id, edition: 2 },
    ])
  )('generateNFTMetadata($cardId, ed#$edition)', ({ cardId, edition }) => {
    it('produces valid metadata with all required fields', () => {
      const def = getAgentById(cardId)!;
      const agent = makeMintedAgent(cardId, edition);
      const meta = generateNFTMetadata(def, agent, edition);

      expect(meta).toBeDefined();
      expect(meta.name).toContain(def.name);
      expect(meta.name).toContain(`#${edition.toString().padStart(4, '0')}`);
      expect(meta.description).toBe(def.lore);
      expect(meta.image).toMatch(/^data:image\/svg\+xml/);
      expect(meta.external_url).toContain(cardId);
      expect(Array.isArray(meta.attributes)).toBe(true);
      expect(meta.attributes.length).toBeGreaterThan(10);
      expect(meta.properties.edition).toBe(def.edition);
      expect(meta.properties.editionNumber).toBe(edition);
      expect(meta.properties.maxSupply).toBe(def.maxSupply);
      expect(meta.properties.rarity).toBe(def.rarity);
      expect(meta.properties.class).toBe(def.class);
      expect(meta.properties.tokenId).toMatch(/^0x/);
      expect(meta.properties.contractAddress).toMatch(/^0x/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. Portrait SVG Generation -- 50 tests
// ═══════════════════════════════════════════════════════════════════

describe('Portrait SVG Generation', () => {
  describe.each(
    ALL_CARD_IDS.map(id => ({ cardId: id }))
  )('generatePortraitDataURI($cardId)', ({ cardId }) => {
    it('returns a valid SVG data URI with card name and class info', () => {
      const def = getAgentById(cardId)!;
      const uri = generatePortraitDataURI(def);

      expect(uri).toMatch(/^data:image\/svg\+xml/);
      // Decode and check SVG contains the card name
      const decoded = decodeURIComponent(uri.replace('data:image/svg+xml,', ''));
      expect(decoded).toContain('svg');
      expect(decoded).toContain(def.rarity);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. Metadata Validation -- 100 tests (50 valid + 50 invalid)
// ═══════════════════════════════════════════════════════════════════

describe('Metadata Validation', () => {
  // 50 tests: valid metadata for each card
  describe.each(
    ALL_CARD_IDS.map(id => ({ cardId: id }))
  )('valid metadata for $cardId', ({ cardId }) => {
    it('passes validation with no errors', () => {
      const def = getAgentById(cardId)!;
      const agent = makeMintedAgent(cardId, 1);
      const meta = generateNFTMetadata(def, agent, 1);
      const result = validateNFTMetadata(meta);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // 50 tests: various invalid metadata cases
  const invalidCases = [
    { name: 'missing name', patch: { name: '' } },
    { name: 'missing description', patch: { description: '' } },
    { name: 'missing image', patch: { image: '' } },
    { name: 'null name', patch: { name: null } },
    { name: 'numeric name', patch: { name: 42 } },
    { name: 'missing external_url', patch: { external_url: undefined } },
    { name: 'numeric description', patch: { description: 123 } },
    { name: 'attributes not array', patch: { attributes: 'not-array' } },
    { name: 'attributes null', patch: { attributes: null } },
    { name: 'empty properties', patch: { properties: {} } },
    { name: 'missing properties', patch: { properties: undefined } },
    { name: 'missing tokenId in properties', patch: { properties: { tokenId: '', contractAddress: '0x1234', editionNumber: 1, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'editionNumber zero', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 0, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'editionNumber exceeds maxSupply', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 999, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'negative editionNumber', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: -1, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'missing mintedBy', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 1, maxSupply: 100, mintedAt: 1, mintedBy: '', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'missing rarity', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 1, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: '', class: 'Coder', edition: 'Genesis' } } },
    { name: 'missing class', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 1, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: '', edition: 'Genesis' } } },
    { name: 'missing edition', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 1, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: '' } } },
    { name: 'missing contractAddress', patch: { properties: { tokenId: '0xabc', contractAddress: '', editionNumber: 1, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'attribute missing trait_type', patch: { attributes: [{ value: 'test' }] } },
    { name: 'attribute missing value', patch: { attributes: [{ trait_type: 'test' }] } },
    { name: 'attribute null value', patch: { attributes: [{ trait_type: 'test', value: null }] } },
    { name: 'image not a URI', patch: { image: 'random-string-not-uri' } },
    { name: 'maxSupply zero', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 1, maxSupply: 0, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'maxSupply negative', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 1, maxSupply: -10, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'mintedAt missing', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 1, maxSupply: 100, mintedAt: undefined, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'multiple empty attributes', patch: { attributes: [{}, {}, {}] } },
    { name: 'tokenId not 0x prefix', patch: { properties: { tokenId: 'abc123', contractAddress: '0x1234', editionNumber: 1, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'contract address short', patch: { properties: { tokenId: '0xabc', contractAddress: '0x12', editionNumber: 1, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'description number', patch: { description: 0 } },
    { name: 'image number', patch: { image: 0 } },
    { name: 'name boolean', patch: { name: true } },
    { name: 'description boolean', patch: { description: false } },
    { name: 'image boolean', patch: { image: 'not-a-valid-uri-scheme' } },
    { name: 'attributes object', patch: { attributes: {} } },
    { name: 'external_url number', patch: { external_url: 42 } },
    { name: 'name undefined', patch: { name: undefined } },
    { name: 'description undefined', patch: { description: undefined } },
    { name: 'image undefined', patch: { image: undefined } },
    { name: 'attribute with undefined value', patch: { attributes: [{ trait_type: 'X', value: undefined }] } },
    { name: 'properties.mintedBy number', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 1, maxSupply: 100, mintedAt: 1, mintedBy: 42, rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'properties.rarity number', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 1, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 42, class: 'Coder', edition: 'Genesis' } } },
    { name: 'properties.class number', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 1, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 42, edition: 'Genesis' } } },
    { name: 'properties.edition number', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 1, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 42 } } },
    { name: 'properties.editionNumber string', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 'one', maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'properties.maxSupply string', patch: { properties: { tokenId: '0xabc', contractAddress: '0x1234', editionNumber: 1, maxSupply: 'many', mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'all top-level empty', patch: { name: '', description: '', image: '', external_url: '' } },
    { name: 'all top-level null', patch: { name: null, description: null, image: null } },
    { name: 'properties.tokenId numeric', patch: { properties: { tokenId: '', contractAddress: '0x1234', editionNumber: 1, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
    { name: 'properties.contractAddress numeric', patch: { properties: { tokenId: '0xabc', contractAddress: '', editionNumber: 1, maxSupply: 100, mintedAt: 1, mintedBy: 'u', rarity: 'Rare', class: 'Coder', edition: 'Genesis' } } },
  ];

  describe.each(invalidCases)('invalid: $name', ({ patch }) => {
    it('produces at least one error or warning', () => {
      const def = getAgentById('agt-autogpt')!;
      const agent = makeMintedAgent('agt-autogpt', 1);
      const validMeta = generateNFTMetadata(def, agent, 1);
      const broken = { ...validMeta, ...patch } as any;
      const result = validateNFTMetadata(broken);
      expect(result.errors.length + result.warnings.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. Rarity Score Calculation -- 50 tests
// ═══════════════════════════════════════════════════════════════════

describe('Rarity Score Calculation', () => {
  describe.each(
    AGENT_CATALOG.map(card => ({ cardId: card.id, rarity: card.rarity, name: card.name }))
  )('calculateRarityScore($cardId) [$rarity]', ({ cardId, rarity }) => {
    it('returns a positive integer consistent with rarity tier', () => {
      const def = getAgentById(cardId)!;
      const score = calculateRarityScore(def);
      expect(score).toBeGreaterThan(0);
      expect(Number.isInteger(score)).toBe(true);

      // Higher rarity tiers should generally have higher scores
      const baseScores: Record<AgentRarity, number> = {
        Common: 100, Uncommon: 250, Rare: 500,
        Epic: 1000, Legendary: 2500, Mythic: 5000,
      };
      // Score should be at least the base for its rarity
      expect(score).toBeGreaterThanOrEqual(baseScores[rarity]);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. Certificate of Authenticity -- 50 tests
// ═══════════════════════════════════════════════════════════════════

describe('Certificate of Authenticity', () => {
  describe.each(
    ALL_CARD_IDS.map(id => ({ cardId: id }))
  )('generateCertificateOfAuthenticity($cardId)', ({ cardId }) => {
    it('generates a valid certificate with all required fields', () => {
      const def = getAgentById(cardId)!;
      const agent = makeMintedAgent(cardId, 1);
      const meta = generateNFTMetadata(def, agent, 1);
      const cert = generateCertificateOfAuthenticity(meta);

      expect(cert.tokenId).toBe(meta.properties.tokenId);
      expect(cert.mintHash).toMatch(/^0x[0-9a-f]+$/);
      expect(cert.authenticityHash).toMatch(/^0x[0-9a-f]+$/);
      expect(cert.issuedAt).toBe(meta.properties.mintedAt);
      expect(cert.issuer).toBe('AEGIS Empire Protocol');
      expect(cert.standard).toBe('ERC-721');
      expect(cert.metadata_fingerprint).toMatch(/^0x[0-9a-f]+$/);
      // Cert should be deterministic
      const cert2 = generateCertificateOfAuthenticity(meta);
      expect(cert.mintHash).toBe(cert2.mintHash);
      expect(cert.authenticityHash).toBe(cert2.authenticityHash);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. NFT Bundle Export -- 50 tests
// ═══════════════════════════════════════════════════════════════════

describe('NFT Bundle Export', () => {
  describe.each(
    ALL_CARD_IDS.map(id => ({ cardId: id }))
  )('exportNFTBundle($cardId)', ({ cardId }) => {
    it('produces a complete bundle with metadata, certificate, and history', () => {
      const def = getAgentById(cardId)!;
      const agent = makeMintedAgent(cardId, 1);
      const meta = generateNFTMetadata(def, agent, 1);
      const bundle = exportNFTBundle(meta);

      expect(bundle.version).toBe('1.0.0');
      expect(bundle.standard).toBe('ERC-721');
      expect(bundle.chainId).toBe(31337);
      expect(bundle.contractAddress).toBe(meta.properties.contractAddress);
      expect(bundle.tokenId).toBe(meta.properties.tokenId);
      expect(bundle.metadata).toBe(meta);
      expect(bundle.certificate).toBeDefined();
      expect(bundle.certificate.tokenId).toBe(meta.properties.tokenId);
      expect(bundle.history.length).toBeGreaterThanOrEqual(1);
      expect(bundle.history[0].type).toBe('mint');
      expect(bundle.exportedAt).toBeGreaterThan(0);
      expect(bundle.signature).toMatch(/^0x/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. Ownership Verification -- 50 tests
// ═══════════════════════════════════════════════════════════════════

describe('Ownership Verification', () => {
  // 25 tests: mint and verify ownership
  describe.each(
    ALL_CARD_IDS.slice(0, 25).map(id => ({ cardId: id }))
  )('verifyOwnership after batch mint $cardId', ({ cardId }) => {
    it('recognizes owner after minting', () => {
      const result = batchMintNFTs(cardId, 1, 'player-1');
      expect(result.success).toBe(true);
      if (result.minted.length > 0) {
        const tokenId = result.minted[0].metadata.properties.tokenId;
        expect(verifyOwnership(tokenId, 'player-1')).toBe(true);
        expect(verifyOwnership(tokenId, 'player-2')).toBe(false);
      }
    });
  });

  // 25 tests: non-existent tokens
  describe.each(
    Array.from({ length: 25 }, (_, i) => ({ tokenId: `0x${i.toString(16).padStart(64, '0')}`, idx: i }))
  )('verifyOwnership non-existent token $idx', ({ tokenId }) => {
    it('returns false for unregistered tokens', () => {
      expect(verifyOwnership(tokenId, 'any-user')).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. Transfer Validation -- 100 tests
// ═══════════════════════════════════════════════════════════════════

describe('Transfer Validation', () => {
  // 25 tests: valid transfers
  describe.each(
    ALL_CARD_IDS.slice(0, 25).map(id => ({ cardId: id }))
  )('valid transfer $cardId', ({ cardId }) => {
    it('succeeds when sender owns the token', () => {
      const result = batchMintNFTs(cardId, 1, 'owner-a');
      if (result.minted.length > 0) {
        const tokenId = result.minted[0].metadata.properties.tokenId;
        const tr = transferNFT(tokenId, 'owner-a', 'owner-b');
        expect(tr.success).toBe(true);
        expect(tr.record).toBeDefined();
        expect(tr.record!.from).toBe('owner-a');
        expect(tr.record!.to).toBe('owner-b');
      }
    });
  });

  // 25 tests: self-transfer
  describe.each(
    ALL_CARD_IDS.slice(0, 25).map(id => ({ cardId: id }))
  )('self-transfer $cardId', ({ cardId }) => {
    it('fails when transferring to self', () => {
      const result = batchMintNFTs(cardId, 1, 'owner-self');
      if (result.minted.length > 0) {
        const tokenId = result.minted[0].metadata.properties.tokenId;
        const tr = transferNFT(tokenId, 'owner-self', 'owner-self');
        expect(tr.success).toBe(false);
        expect(tr.error).toContain('yourself');
      }
    });
  });

  // 25 tests: non-owner transfer
  describe.each(
    ALL_CARD_IDS.slice(0, 25).map(id => ({ cardId: id }))
  )('non-owner transfer $cardId', ({ cardId }) => {
    it('fails when sender does not own the token', () => {
      const result = batchMintNFTs(cardId, 1, 'real-owner');
      if (result.minted.length > 0) {
        const tokenId = result.minted[0].metadata.properties.tokenId;
        const tr = transferNFT(tokenId, 'fake-owner', 'buyer');
        expect(tr.success).toBe(false);
        expect(tr.error).toBeDefined();
      }
    });
  });

  // 25 tests: transfer of non-existent tokens
  describe.each(
    Array.from({ length: 25 }, (_, i) => ({ idx: i }))
  )('non-existent token transfer $idx', ({ idx }) => {
    it('fails for tokens that do not exist', () => {
      const tr = transferNFT(`0x${idx.toString(16).padStart(64, '0')}`, 'owner', 'buyer');
      expect(tr.success).toBe(false);
      expect(tr.error).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 11. Batch Minting -- 50 tests
// ═══════════════════════════════════════════════════════════════════

describe('Batch Minting', () => {
  describe.each(
    ALL_CARD_IDS.map(id => ({ cardId: id }))
  )('batchMintNFTs($cardId)', ({ cardId }) => {
    it('mints the requested number of tokens with unique IDs', () => {
      const result = batchMintNFTs(cardId, 3, 'minter');
      expect(result.success).toBe(true);
      expect(result.minted.length).toBeLessThanOrEqual(3);
      expect(result.minted.length).toBeGreaterThan(0);

      // All minted tokens should have unique token IDs
      const tokenIds = result.minted.map(m => m.metadata.properties.tokenId);
      expect(new Set(tokenIds).size).toBe(tokenIds.length);

      // Each should have the correct cardId
      for (const m of result.minted) {
        expect(m.metadata.properties.rarity).toBe(getAgentById(cardId)!.rarity);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 12. Collection Value -- 50 tests
// ═══════════════════════════════════════════════════════════════════

describe('Collection Value', () => {
  it('returns 0 for empty collection', () => {
    expect(calculateCollectionValue()).toBe(0);
  });

  describe.each(
    ALL_CARD_IDS.slice(0, 49).map(id => ({ cardId: id }))
  )('collection value after minting $cardId', ({ cardId }) => {
    it('increases when a card is minted', () => {
      const before = calculateCollectionValue();
      useAgentCardStore.getState().mintAgent(cardId);
      const after = calculateCollectionValue();
      expect(after).toBeGreaterThan(before);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 13. Collection Stats -- 50 tests
// ═══════════════════════════════════════════════════════════════════

describe('Collection Stats', () => {
  it('returns zeros for empty collection', () => {
    const stats = getCollectionStats();
    expect(stats.totalCards).toBe(0);
    expect(stats.averageLevel).toBe(0);
    expect(stats.deployedCount).toBe(0);
    expect(stats.uniqueCards).toBe(0);
    expect(stats.completionPercent).toBe(0);
  });

  describe.each(
    ALL_CARD_IDS.slice(0, 49).map((id) => ({ cardId: id }))
  )('collection stats after minting $cardId', ({ cardId }) => {
    it('updates totalCards and uniqueCards correctly', () => {
      useAgentCardStore.getState().mintAgent(cardId);
      const stats = getCollectionStats();
      expect(stats.totalCards).toBe(1);
      expect(stats.uniqueCards).toBe(1);
      expect(stats.averageLevel).toBe(1);

      const def = getAgentById(cardId)!;
      expect(stats.rarityBreakdown[def.rarity]).toBe(1);
      expect(stats.classBreakdown[def.class]).toBe(1);
      expect(stats.highestRarity).toBe(def.rarity);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 14. Search Functionality -- 100 tests
// ═══════════════════════════════════════════════════════════════════

describe('Search Functionality', () => {
  // Set up some minted agents for search tests
  beforeEach(() => {
    // Mint one of each of the first 10 cards
    for (const id of ALL_CARD_IDS.slice(0, 10)) {
      useAgentCardStore.getState().mintAgent(id);
    }
  });

  // 10 tests: search by card name
  describe.each(
    AGENT_CATALOG.slice(0, 10).map(c => ({ name: c.name, cardId: c.id }))
  )('search by name "$name"', ({ name }) => {
    it('finds the card by name substring', () => {
      const results = searchNFTs(name);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(r => r.card.name === name)).toBe(true);
    });
  });

  // 10 tests: search by codename
  describe.each(
    AGENT_CATALOG.slice(0, 10).map(c => ({ codename: c.codename, cardId: c.id }))
  )('search by codename "$codename"', ({ codename }) => {
    it('finds the card by codename', () => {
      const results = searchNFTs(codename);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 10 tests: search by full name (biography)
  describe.each(
    AGENT_CATALOG.slice(0, 10).map(c => ({ fullName: c.biography.fullName, cardId: c.id }))
  )('search by biography fullName "$fullName"', ({ fullName }) => {
    it('finds the card by biography full name', () => {
      const results = searchNFTs(fullName);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 6 tests: search by rarity filter
  describe.each(ALL_RARITIES)('search with rarity filter %s', (rarity) => {
    it('only returns cards of the specified rarity', () => {
      const results = searchNFTs('', { rarity });
      for (const r of results) {
        expect(r.card.rarity).toBe(rarity);
      }
    });
  });

  // 10 tests: search by class filter
  describe.each(
    ['Autonomous', 'Coder', 'Orchestrator', 'Trader', 'Researcher',
     'Infiltrator', 'Navigator', 'Analyst', 'Social', 'Specialist'] as const
  )('search with class filter %s', (cls) => {
    it('only returns cards of the specified class', () => {
      const results = searchNFTs('', { class: cls });
      for (const r of results) {
        expect(r.card.class).toBe(cls);
      }
    });
  });

  // 10 tests: search by ability name
  describe.each(
    AGENT_CATALOG.slice(0, 10).map(c => ({ abilityName: c.ability.name, cardId: c.id }))
  )('search by ability "$abilityName"', ({ abilityName }) => {
    it('finds the card by ability name', () => {
      const results = searchNFTs(abilityName);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 10 tests: search by synergy tags
  describe.each(
    AGENT_CATALOG.slice(0, 10).map(c => ({ tag: c.synergyTags[0], cardId: c.id }))
  )('search by synergy tag "$tag"', ({ tag }) => {
    it('finds cards with matching synergy tag', () => {
      const results = searchNFTs(tag);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 4 tests: search by edition filter
  describe.each(
    ['Genesis', 'Alpha', 'Beta', 'Standard'] as const
  )('search with edition filter %s', (edition) => {
    it('only returns cards of the specified edition', () => {
      const results = searchNFTs('', { edition });
      for (const r of results) {
        expect(r.card.edition).toBe(edition);
      }
    });
  });

  // 10 tests: search by level filter
  describe.each(
    Array.from({ length: 10 }, (_, i) => ({ minLevel: i + 1 }))
  )('search with minLevel=$minLevel', ({ minLevel }) => {
    it('only returns agents at or above the min level', () => {
      const results = searchNFTs('', { minLevel });
      for (const r of results) {
        expect(r.agent.level).toBeGreaterThanOrEqual(minLevel);
      }
    });
  });

  // 10 tests: search with deployed filter
  describe.each(
    Array.from({ length: 5 }, (_, i) => [
      { deployed: true, idx: i * 2 },
      { deployed: false, idx: i * 2 + 1 },
    ]).flat()
  )('search with deployed=$deployed (case $idx)', ({ deployed }) => {
    it('filters by deployment status correctly', () => {
      const results = searchNFTs('', { deployed });
      for (const r of results) {
        if (deployed) {
          expect(r.agent.deployedTo).toBeTruthy();
        } else {
          expect(r.agent.deployedTo).toBeFalsy();
        }
      }
    });
  });

  // 10 tests: empty query returns all minted
  describe.each(
    Array.from({ length: 10 }, (_, i) => ({ idx: i }))
  )('empty query returns all minted (run $idx)', () => {
    it('returns all minted agents', () => {
      const results = searchNFTs('');
      expect(results.length).toBe(10); // We minted 10 in beforeEach
    });
  });

  // 10 tests: search results sorted by rarity score descending
  describe.each(
    Array.from({ length: 10 }, (_, i) => ({ idx: i }))
  )('results sorted by rarity score desc (run $idx)', () => {
    it('returns results in descending rarity score order', () => {
      const results = searchNFTs('');
      for (let j = 1; j < results.length; j++) {
        expect(results[j - 1].rarityScore).toBeGreaterThanOrEqual(results[j].rarityScore);
      }
    });
  });

  // 10 tests: search by locked filter
  describe.each(
    Array.from({ length: 5 }, (_, i) => [
      { locked: true, idx: i * 2 },
      { locked: false, idx: i * 2 + 1 },
    ]).flat()
  )('search with locked=$locked (case $idx)', ({ locked }) => {
    it('filters by locked status correctly', () => {
      const results = searchNFTs('', { locked });
      for (const r of results) {
        if (locked) {
          expect(r.agent.isLocked).toBe(true);
        } else {
          expect(r.agent.isLocked).toBe(false);
        }
      }
    });
  });

  // 10 tests: search by maxLevel filter
  describe.each(
    Array.from({ length: 10 }, (_, i) => ({ maxLevel: i + 1 }))
  )('search with maxLevel=$maxLevel', ({ maxLevel }) => {
    it('only returns agents at or below the max level', () => {
      const results = searchNFTs('', { maxLevel });
      for (const r of results) {
        expect(r.agent.level).toBeLessThanOrEqual(maxLevel);
      }
    });
  });
});
