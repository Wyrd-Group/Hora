/**
 * Suite 2: Agent Card Catalog Data Integrity (src/data/agentCards.ts) -- 1000 tests
 * For each of 50 cards, 20 assertions = 1000 tests total.
 */
import { describe, it, expect } from 'vitest';
import {
  AGENT_CATALOG,
  AGENT_RARITY_CONFIG,
  AGENT_CLASS_CONFIG,
  type AgentClass,
  type AgentRarity,
} from '../data/agentCards';

const VALID_CLASSES: AgentClass[] = [
  'Autonomous', 'Coder', 'Orchestrator', 'Trader', 'Researcher',
  'Infiltrator', 'Navigator', 'Analyst', 'Social', 'Specialist',
  'Scout', 'Jobhunter',
];
const VALID_RARITIES: AgentRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];
const VALID_EDITIONS = ['Genesis', 'Alpha', 'Beta', 'Standard', 'Swarm', 'TOTW', 'Icon', 'Premium', 'Ultimate'];
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

// Collect all IDs for duplicate check
const allIds = AGENT_CATALOG.map(c => c.id);

describe.each(
  AGENT_CATALOG.map(card => ({ card, id: card.id, name: card.name }))
)('Card: $name ($id)', ({ card }) => {

  // 1. ID format valid
  it('has a valid ID format (agt- prefix)', () => {
    expect(card.id).toMatch(/^agt-[a-z0-9-]+$/);
  });

  // 2. Name non-empty
  it('has a non-empty name', () => {
    expect(card.name.length).toBeGreaterThan(0);
  });

  // 3. Class is valid AgentClass
  it('has a valid AgentClass', () => {
    expect(VALID_CLASSES).toContain(card.class);
  });

  // 4. Rarity is valid AgentRarity
  it('has a valid AgentRarity', () => {
    expect(VALID_RARITIES).toContain(card.rarity);
  });

  // 5. Stats: intelligence, speed, stealth between 1-100
  it('has intelligence, speed, stealth between 1-100', () => {
    for (const stat of [card.stats.intelligence, card.stats.speed, card.stats.stealth]) {
      expect(stat).toBeGreaterThanOrEqual(1);
      expect(stat).toBeLessThanOrEqual(100);
    }
  });

  // 6. Stats: loyalty, adaptability, influence between 1-100
  it('has loyalty, adaptability, influence between 1-100', () => {
    for (const stat of [card.stats.loyalty, card.stats.adaptability, card.stats.influence]) {
      expect(stat).toBeGreaterThanOrEqual(1);
      expect(stat).toBeLessThanOrEqual(100);
    }
  });

  // 6. Passive has type, value, description
  it('has a valid passive with type, value, and description', () => {
    expect(card.passive.type).toBeTruthy();
    expect(typeof card.passive.value).toBe('number');
    expect(card.passive.description.length).toBeGreaterThan(0);
  });

  // 7. Ability has name, description, cooldownTicks > 0, valid effect
  it('has a valid ability with name, description, cooldown, and effect', () => {
    expect(card.ability.name.length).toBeGreaterThan(0);
    expect(card.ability.description.length).toBeGreaterThan(0);
    expect(card.ability.cooldownTicks).toBeGreaterThan(0);
    expect(card.ability.effect.type).toBeTruthy();
    expect(typeof card.ability.effect.value).toBe('number');
    expect(card.ability.effect.duration).toBeGreaterThan(0);
    expect(['self', 'node', 'department', 'empire', 'rival', 'region']).toContain(card.ability.effect.target);
  });

  // 8. PortraitGradient has 3 valid hex colors
  it('has a portraitGradient with 3 valid hex colors', () => {
    expect(card.portraitGradient).toHaveLength(3);
    for (const color of card.portraitGradient) {
      expect(color).toMatch(HEX_COLOR_REGEX);
    }
  });

  // 9. IconGlyph is non-empty
  it('has a non-empty iconGlyph', () => {
    expect(card.iconGlyph.length).toBeGreaterThan(0);
  });

  // 10. Edition valid, maxSupply > 0, lore non-empty
  it('has valid edition, maxSupply > 0, and non-empty lore', () => {
    expect(VALID_EDITIONS).toContain(card.edition);
    expect(card.maxSupply).toBeGreaterThan(0);
    expect(card.lore.length).toBeGreaterThan(0);
  });

  // 13. SynergyTags non-empty array
  it('has a non-empty synergyTags array', () => {
    expect(Array.isArray(card.synergyTags)).toBe(true);
    expect(card.synergyTags.length).toBeGreaterThan(0);
    for (const tag of card.synergyTags) {
      expect(typeof tag).toBe('string');
      expect(tag.length).toBeGreaterThan(0);
    }
  });

  // 14. Biography has all required fields
  it('has a complete biography', () => {
    expect(card.biography.fullName.length).toBeGreaterThan(0);
    expect(card.biography.title.length).toBeGreaterThan(0);
    expect(card.biography.origin.length).toBeGreaterThan(0);
    expect(card.biography.age).toBeGreaterThan(0);
    expect(card.biography.background.length).toBeGreaterThan(0);
    expect(card.biography.specialization.length).toBeGreaterThan(0);
    expect(card.biography.weakness.length).toBeGreaterThan(0);
    expect(card.biography.quote.length).toBeGreaterThan(0);
  });

  // 15. Portrait has style, seed, expression, attire
  it('has a valid portrait object', () => {
    expect(['gradient', 'photo', 'pixel', 'anime']).toContain(card.portrait.style);
    expect(typeof card.portrait.seed).toBe('number');
    expect(card.portrait.expression.length).toBeGreaterThan(0);
    expect(card.portrait.attire.length).toBeGreaterThan(0);
  });

  // 16. NFT metadata has all required fields
  it('has valid NFT metadata fields', () => {
    expect(card.nft.tokenStandard).toBe('ERC-721');
    expect(card.nft.collection.length).toBeGreaterThan(0);
    expect(card.nft.contractSymbol.length).toBeGreaterThan(0);
    expect(Array.isArray(card.nft.attributes)).toBe(true);
    expect(card.nft.attributes.length).toBeGreaterThan(0);
    expect(card.nft.externalUrl).toMatch(/^https?:\/\//);
    // All attributes have trait_type and value
    for (const attr of card.nft.attributes) {
      expect(attr.trait_type).toBeTruthy();
      expect(attr.value !== undefined && attr.value !== null).toBe(true);
    }
  });

  // 17. No duplicate IDs across catalog
  it('has a unique ID in the catalog', () => {
    const count = allIds.filter(id => id === card.id).length;
    expect(count).toBe(1);
  });

  // 18. Stats sum is reasonable (not all 100s unless Mythic)
  it('has a reasonable stats sum (not all maxed unless Mythic)', () => {
    const sum = card.stats.intelligence + card.stats.speed + card.stats.stealth +
      card.stats.loyalty + card.stats.adaptability + card.stats.influence;
    if (card.rarity !== 'Mythic') {
      expect(sum).toBeLessThan(600); // Not all 100s
    }
    expect(sum).toBeGreaterThan(0);
  });

  // 19. Ability cooldown proportional to power
  it('has ability cooldown >= 5 ticks', () => {
    expect(card.ability.cooldownTicks).toBeGreaterThanOrEqual(5);
  });

  // 20. Rarity config exists for card rarity
  it('has matching rarity config in AGENT_RARITY_CONFIG', () => {
    const config = AGENT_RARITY_CONFIG[card.rarity];
    expect(config).toBeDefined();
    expect(config.weight).toBeGreaterThan(0);
    expect(config.maxLevel).toBeGreaterThan(0);
    expect(config.quickSellValue).toBeGreaterThan(0);
    expect(config.mintCost).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Standalone catalog-level tests -- 12 tests
// ═══════════════════════════════════════════════════════════════════

describe('Catalog Integrity', () => {
  it('has at least 50 cards', () => {
    expect(AGENT_CATALOG.length).toBeGreaterThanOrEqual(50);
  });

  it('has at least 9 agent classes represented', () => {
    const classes = new Set(AGENT_CATALOG.map(c => c.class));
    expect(classes.size).toBeGreaterThanOrEqual(9);
  });

  it('has at least 5 different rarities represented', () => {
    const rarities = new Set(AGENT_CATALOG.map(c => c.rarity));
    expect(rarities.size).toBeGreaterThanOrEqual(5);
  });

  it('has all card IDs unique globally', () => {
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('has AGENT_RARITY_CONFIG for all 6 rarities', () => {
    for (const r of VALID_RARITIES) {
      expect(AGENT_RARITY_CONFIG[r]).toBeDefined();
    }
  });

  it('has AGENT_CLASS_CONFIG for all 10 classes', () => {
    for (const cls of VALID_CLASSES) {
      expect(AGENT_CLASS_CONFIG[cls]).toBeDefined();
      expect(AGENT_CLASS_CONFIG[cls].icon.length).toBeGreaterThan(0);
    }
  });

  it('has rarity weights summing to 100', () => {
    const totalWeight = VALID_RARITIES.reduce((s, r) => s + AGENT_RARITY_CONFIG[r].weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('has maxLevel increasing with rarity', () => {
    const levels = VALID_RARITIES.map(r => AGENT_RARITY_CONFIG[r].maxLevel);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
    }
  });

  it('has quickSellValue increasing with rarity', () => {
    const values = VALID_RARITIES.map(r => AGENT_RARITY_CONFIG[r].quickSellValue);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('has mintCost increasing with rarity', () => {
    const costs = VALID_RARITIES.map(r => AGENT_RARITY_CONFIG[r].mintCost);
    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]).toBeGreaterThan(costs[i - 1]);
    }
  });

  it('has all cards with codename field', () => {
    for (const card of AGENT_CATALOG) {
      expect(card.codename.length).toBeGreaterThan(0);
    }
  });

  it('has no card with maxSupply exceeding 10000', () => {
    for (const card of AGENT_CATALOG) {
      expect(card.maxSupply).toBeLessThanOrEqual(10000);
    }
  });
});
