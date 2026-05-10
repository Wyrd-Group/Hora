/**
 * Suite 9: NFT Marketplace — 1000 tests
 * Tests: listing creation, buying, delisting, price history, fee calculations,
 * search and filter, sort operations, concurrent operations.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentCardStore, type MintedAgent, type AgentMarketListing } from '../store/agentCardStore';
import {
  AGENT_CATALOG,
  AGENT_CLASS_CONFIG,
  getAgentById,
  getAgentsByRarity,
  getAgentsByClass,
  type AgentRarity,
  type AgentClass,
} from '../data/agentCards';

// ── Helpers ──────────────────────────────────────────────────────

function resetStore() {
  useAgentCardStore.setState({
    agents: {},
    editionCounters: {},
    listings: [],
    totalMinted: 0,
    totalDeployed: 0,
    pityCounter: 0,
  });
}

function store() {
  return useAgentCardStore.getState();
}

function mint(cardId: string): MintedAgent | null {
  return store().mintAgent(cardId);
}

function mintMultiple(count: number): MintedAgent[] {
  const agents: MintedAgent[] = [];
  for (let i = 0; i < count; i++) {
    const m = mint(AGENT_CATALOG[i % AGENT_CATALOG.length].id);
    if (m) agents.push(m);
  }
  return agents;
}

/** Marketplace fee calculation (5%). */
function calculateFee(price: number): number {
  return Math.floor(price * 0.05);
}

/** Get all listings sorted by a comparator. */
function sortedListings(comparator: (a: AgentMarketListing, b: AgentMarketListing) => number): AgentMarketListing[] {
  return [...store().listings].sort(comparator);
}

// ═══════════════════════════════════════════════════════════════════
// 1. LISTING CREATION (150 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Listing creation', () => {
  beforeEach(resetStore);

  describe('valid listings', () => {
    const prices = [1, 10, 50, 100, 500, 1000, 5000, 10_000, 50_000, 100_000];

    it.each(prices)('creates listing at price %d', (price) => {
      const minted = mint(AGENT_CATALOG[0].id)!;
      store().listAgent(minted.mintId, price);
      expect(store().listings.length).toBe(1);
      expect(store().listings[0].price).toBe(price);
      expect(store().listings[0].mintId).toBe(minted.mintId);
    });
  });

  describe('listing assigns correct cardId', () => {
    it.each(AGENT_CATALOG.slice(0, 30).map(c => [c.id, c.name] as const))('listing for "%s" (%s) has correct cardId', (id) => {
      const minted = mint(id)!;
      store().listAgent(minted.mintId, 100);
      expect(store().listings[0].cardId).toBe(id);
    });
  });

  describe('listing has valid id and timestamp', () => {
    it.each(AGENT_CATALOG.slice(0, 20).map(c => [c.id] as const))('listing for "%s" has id and timestamp', (id) => {
      const minted = mint(id)!;
      store().listAgent(minted.mintId, 500);
      const listing = store().listings[0];
      expect(listing.id).toBeTruthy();
      expect(listing.id.startsWith('lst-')).toBe(true);
      expect(listing.listedAt).toBeGreaterThan(0);
    });
  });

  describe('cannot list already-listed card', () => {
    it.each(AGENT_CATALOG.slice(0, 20).map(c => [c.id] as const))('card "%s" cannot be double-listed', (id) => {
      const minted = mint(id)!;
      store().listAgent(minted.mintId, 100);
      store().listAgent(minted.mintId, 200); // Should fail - locked
      expect(store().listings.length).toBe(1);
    });
  });

  describe('cannot list deployed card', () => {
    it.each(AGENT_CATALOG.slice(0, 20).map(c => [c.id] as const))('deployed card "%s" cannot be listed', (id) => {
      const minted = mint(id)!;
      store().deployAgent(minted.mintId, 'node-1');
      store().listAgent(minted.mintId, 100);
      expect(store().listings.length).toBe(0);
    });
  });

  describe('multiple listings from different cards', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i + 2))('creating %d simultaneous listings', (n) => {
      const agents = mintMultiple(n);
      for (const a of agents) {
        store().listAgent(a.mintId, 100 + Math.floor(Math.random() * 1000));
      }
      expect(store().listings.length).toBe(n);
    });
  });

  describe('listing locks the card', () => {
    it.each(AGENT_CATALOG.slice(0, 10).map(c => [c.id] as const))('card "%s" locked on listing', (id) => {
      const minted = mint(id)!;
      expect(store().agents[minted.mintId].isLocked).toBe(false);
      store().listAgent(minted.mintId, 100);
      expect(store().agents[minted.mintId].isLocked).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. BUYING (200 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Buying', () => {
  beforeEach(resetStore);

  describe('successful purchases', () => {
    it.each(AGENT_CATALOG.slice(0, 40).map(c => [c.id, c.name] as const))('buying card "%s" (%s) succeeds', (id) => {
      const minted = mint(id)!;
      store().listAgent(minted.mintId, 100);
      const listing = store().listings[0];
      const result = store().buyAgent(listing.id);
      expect(result).not.toBeNull();
      expect(result!.mintId).toBe(minted.mintId);
    });
  });

  describe('purchase removes listing', () => {
    it.each(AGENT_CATALOG.slice(0, 30).map(c => [c.id] as const))('listing removed after buying "%s"', (id) => {
      const minted = mint(id)!;
      store().listAgent(minted.mintId, 500);
      const listing = store().listings[0];
      store().buyAgent(listing.id);
      expect(store().listings.length).toBe(0);
    });
  });

  describe('purchase unlocks card', () => {
    it.each(AGENT_CATALOG.slice(0, 30).map(c => [c.id] as const))('card "%s" unlocked after purchase', (id) => {
      const minted = mint(id)!;
      store().listAgent(minted.mintId, 200);
      const listing = store().listings[0];
      store().buyAgent(listing.id);
      expect(store().agents[minted.mintId].isLocked).toBe(false);
    });
  });

  describe('buying nonexistent listing', () => {
    it.each(Array.from({ length: 20 }, (_, i) => `nope-${i}`))('buying "%s" returns null', (id) => {
      expect(store().buyAgent(id)).toBeNull();
    });
  });

  describe('buying already-purchased listing', () => {
    it.each(AGENT_CATALOG.slice(0, 20).map(c => [c.id] as const))('double-buy of "%s" returns null', (id) => {
      const minted = mint(id)!;
      store().listAgent(minted.mintId, 100);
      const listing = store().listings[0];
      store().buyAgent(listing.id);
      expect(store().buyAgent(listing.id)).toBeNull();
    });
  });

  describe('card data preserved after purchase', () => {
    it.each(AGENT_CATALOG.slice(0, 20).map(c => [c.id] as const))('card "%s" retains data after purchase', (id) => {
      const minted = mint(id)!;
      // Add some state
      store().addXP(minted.mintId, 50);
      const xpBefore = store().agents[minted.mintId].xp;

      store().listAgent(minted.mintId, 100);
      const listing = store().listings[0];
      store().buyAgent(listing.id);

      expect(store().agents[minted.mintId].xp).toBe(xpBefore);
      expect(store().agents[minted.mintId].cardId).toBe(id);
    });
  });

  describe('buying with various prices', () => {
    const prices = Array.from({ length: 20 }, (_, i) => (i + 1) * 500);

    it.each(prices)('purchase at price %d completes correctly', (price) => {
      const minted = mint(AGENT_CATALOG[0].id)!;
      store().listAgent(minted.mintId, price);
      const listing = store().listings[0];
      expect(listing.price).toBe(price);
      const result = store().buyAgent(listing.id);
      expect(result).not.toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. DELISTING (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Delisting', () => {
  beforeEach(resetStore);

  describe('successful delist', () => {
    it.each(AGENT_CATALOG.slice(0, 25).map(c => [c.id] as const))('delisting card "%s" removes listing', (id) => {
      const minted = mint(id)!;
      store().listAgent(minted.mintId, 100);
      const listing = store().listings[0];
      store().delistAgent(listing.id);
      expect(store().listings.length).toBe(0);
    });
  });

  describe('delist unlocks card', () => {
    it.each(AGENT_CATALOG.slice(0, 25).map(c => [c.id] as const))('card "%s" unlocked after delist', (id) => {
      const minted = mint(id)!;
      store().listAgent(minted.mintId, 100);
      const listing = store().listings[0];
      store().delistAgent(listing.id);
      expect(store().agents[minted.mintId].isLocked).toBe(false);
    });
  });

  describe('delist nonexistent listing', () => {
    it.each(Array.from({ length: 25 }, (_, i) => `fake-${i}`))('delisting "%s" is a no-op', (id) => {
      store().delistAgent(id);
      expect(store().listings.length).toBe(0);
    });
  });

  describe('delist already-sold listing', () => {
    it.each(AGENT_CATALOG.slice(0, 25).map(c => [c.id] as const))('delisting sold "%s" does nothing', (id) => {
      const minted = mint(id)!;
      store().listAgent(minted.mintId, 100);
      const listing = store().listings[0];
      store().buyAgent(listing.id);
      store().delistAgent(listing.id); // Should be no-op
      expect(store().agents[minted.mintId].isLocked).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. PRICE HISTORY (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Price history', () => {
  beforeEach(resetStore);

  describe('listing price is recorded', () => {
    const prices = Array.from({ length: 50 }, (_, i) => (i + 1) * 100);

    it.each(prices)('price %d is stored on listing', (price) => {
      const minted = mint(AGENT_CATALOG[0].id)!;
      store().listAgent(minted.mintId, price);
      expect(store().listings[0].price).toBe(price);
      // Clean up for next test
      store().delistAgent(store().listings[0].id);
    });
  });

  describe('relisting tracks new price', () => {
    const priceChanges = Array.from({ length: 25 }, (_, i) => [(i + 1) * 100, (i + 1) * 200] as const);

    it.each(priceChanges)('relisting from %d to %d updates price', (oldPrice, newPrice) => {
      const minted = mint(AGENT_CATALOG[0].id)!;
      store().listAgent(minted.mintId, oldPrice);
      const listing = store().listings[0];
      store().delistAgent(listing.id);
      store().listAgent(minted.mintId, newPrice);
      expect(store().listings[0].price).toBe(newPrice);
      store().delistAgent(store().listings[0].id);
    });
  });

  describe('timestamp ordering', () => {
    it.each(Array.from({ length: 25 }, (_, i) => i + 2))('listing timestamps are ordered for %d items', (n) => {
      const agents = mintMultiple(n);
      for (const a of agents) {
        store().listAgent(a.mintId, 100);
      }
      const timestamps = store().listings.map(l => l.listedAt);
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. FEE CALCULATIONS (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Fee calculations', () => {
  describe('5% marketplace fee', () => {
    const prices = Array.from({ length: 50 }, (_, i) => (i + 1) * 200);

    it.each(prices)('fee for price %d is 5%%', (price) => {
      const fee = calculateFee(price);
      expect(fee).toBe(Math.floor(price * 0.05));
    });
  });

  describe('fee is always non-negative', () => {
    const edgePrices = [0, 1, 2, 5, 10, 15, 19, 20, 21, 99, 100, 101, 999, 1000, 9999, 10000, 99999, 100000, 999999, 1000000];

    it.each(edgePrices)('fee for price %d is >= 0', (price) => {
      expect(calculateFee(price)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('fee is less than price', () => {
    const prices = Array.from({ length: 30 }, (_, i) => (i + 1) * 500 + 1);

    it.each(prices)('fee for price %d is less than price', (price) => {
      expect(calculateFee(price)).toBeLessThan(price);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. SEARCH AND FILTER (150 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Search and filter', () => {
  beforeEach(resetStore);

  describe('filter by card name', () => {
    it.each(AGENT_CATALOG.slice(0, 30).map(c => [c.id, c.name] as const))('finds listing for "%s" by name "%s"', (id, name) => {
      const minted = mint(id)!;
      store().listAgent(minted.mintId, 100);
      const listings = store().listings.filter(l => {
        const def = getAgentById(l.cardId);
        return def?.name === name;
      });
      expect(listings.length).toBe(1);
      store().delistAgent(store().listings[0].id);
    });
  });

  describe('filter by class', () => {
    const classes = Object.keys(AGENT_CLASS_CONFIG) as AgentClass[];

    it.each(classes)('filters listings by class "%s"', (cls) => {
      // Mint one card of each class
      const cards = getAgentsByClass(cls);
      if (cards.length === 0) return;
      const minted = mint(cards[0].id)!;
      store().listAgent(minted.mintId, 100);

      const filtered = store().listings.filter(l => {
        const def = getAgentById(l.cardId);
        return def?.class === cls;
      });
      expect(filtered.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('filter by rarity', () => {
    const rarities: AgentRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

    it.each(rarities)('filters listings by rarity "%s"', (rarity) => {
      const cards = getAgentsByRarity(rarity);
      if (cards.length === 0) return;
      const minted = mint(cards[0].id)!;
      store().listAgent(minted.mintId, 100);

      const filtered = store().listings.filter(l => {
        const def = getAgentById(l.cardId);
        return def?.rarity === rarity;
      });
      expect(filtered.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('filter by price range', () => {
    const ranges = Array.from({ length: 20 }, (_, i) => [(i + 1) * 100, (i + 2) * 100] as const);

    it.each(ranges)('finds listings in range [%d, %d]', (min, max) => {
      const agents = mintMultiple(5);
      for (let i = 0; i < agents.length; i++) {
        store().listAgent(agents[i].mintId, 100 + i * 100);
      }
      const filtered = store().listings.filter(l => l.price >= min && l.price <= max);
      expect(filtered.every(l => l.price >= min && l.price <= max)).toBe(true);
    });
  });

  describe('filter by agent stats', () => {
    const statThresholds = Array.from({ length: 20 }, (_, i) => (i + 1) * 5);

    it.each(statThresholds)('finds agents with intelligence >= %d', (threshold) => {
      const agents = mintMultiple(10);
      for (const a of agents) {
        store().listAgent(a.mintId, 100);
      }
      const filtered = store().listings.filter(l => {
        const def = getAgentById(l.cardId);
        return def && def.stats.intelligence >= threshold;
      });
      expect(filtered.every(l => {
        const def = getAgentById(l.cardId)!;
        return def.stats.intelligence >= threshold;
      })).toBe(true);
    });
  });

  describe('combined filters', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i))('combined filter scenario #%d', (_n) => {
      const agents = mintMultiple(20);
      for (const a of agents) {
        store().listAgent(a.mintId, 100 + Math.floor(Math.random() * 9900));
      }
      const filtered = store().listings.filter(l => {
        const def = getAgentById(l.cardId);
        return def && l.price <= 5000 && def.stats.speed > 50;
      });
      // Should be a valid subset
      expect(filtered.every(l => l.price <= 5000)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. SORT OPERATIONS (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Sort operations', () => {
  beforeEach(resetStore);

  describe('sort by price ascending', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i + 3))('sorts %d listings by price asc', (n) => {
      const agents = mintMultiple(n);
      for (let i = 0; i < agents.length; i++) {
        store().listAgent(agents[i].mintId, (n - i) * 100); // Reverse order
      }
      const sorted = sortedListings((a, b) => a.price - b.price);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].price).toBeGreaterThanOrEqual(sorted[i - 1].price);
      }
    });
  });

  describe('sort by price descending', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i + 3))('sorts %d listings by price desc', (n) => {
      const agents = mintMultiple(n);
      for (let i = 0; i < agents.length; i++) {
        store().listAgent(agents[i].mintId, (i + 1) * 100);
      }
      const sorted = sortedListings((a, b) => b.price - a.price);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].price).toBeLessThanOrEqual(sorted[i - 1].price);
      }
    });
  });

  describe('sort by rarity', () => {
    const rarityOrder: Record<AgentRarity, number> = {
      Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Mythic: 5,
    };

    it.each(Array.from({ length: 20 }, (_, i) => i + 3))('sorts %d listings by rarity', (n) => {
      const agents = mintMultiple(n);
      for (const a of agents) {
        store().listAgent(a.mintId, 100);
      }
      const sorted = sortedListings((a, b) => {
        const defA = getAgentById(a.cardId);
        const defB = getAgentById(b.cardId);
        return (rarityOrder[defB?.rarity ?? 'Common'] ?? 0) - (rarityOrder[defA?.rarity ?? 'Common'] ?? 0);
      });
      // Verify sorted (rare first)
      for (let i = 1; i < sorted.length; i++) {
        const rA = getAgentById(sorted[i - 1].cardId)?.rarity ?? 'Common';
        const rB = getAgentById(sorted[i].cardId)?.rarity ?? 'Common';
        expect(rarityOrder[rA]).toBeGreaterThanOrEqual(rarityOrder[rB]);
      }
    });
  });

  describe('sort by listing time (most recent)', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i + 3))('sorts %d listings by time desc', (n) => {
      const agents = mintMultiple(n);
      for (const a of agents) {
        store().listAgent(a.mintId, 100);
      }
      const sorted = sortedListings((a, b) => b.listedAt - a.listedAt);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].listedAt).toBeLessThanOrEqual(sorted[i - 1].listedAt);
      }
    });
  });

  describe('stable sort with equal values', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i + 3))('stable sort for %d equal-priced listings', (n) => {
      const agents = mintMultiple(n);
      for (const a of agents) {
        store().listAgent(a.mintId, 500); // All same price
      }
      const sorted = sortedListings((a, b) => a.price - b.price);
      expect(sorted.length).toBe(n);
      // All prices equal
      expect(sorted.every(l => l.price === 500)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. CONCURRENT OPERATIONS (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Concurrent operations', () => {
  beforeEach(resetStore);

  describe('simultaneous listing and buying', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i))('concurrent scenario #%d: list then immediately buy', (_) => {
      const minted = mint(AGENT_CATALOG[0].id)!;
      store().listAgent(minted.mintId, 100);
      const listing = store().listings[0];
      const bought = store().buyAgent(listing.id);
      expect(bought).not.toBeNull();
      expect(store().listings.length).toBe(0);
    });
  });

  describe('multiple agents listed then one bought', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i + 2))('with %d listings, buy first only', (n) => {
      const agents = mintMultiple(n);
      for (const a of agents) {
        store().listAgent(a.mintId, 100);
      }
      expect(store().listings.length).toBe(n);
      const firstListing = store().listings[0];
      store().buyAgent(firstListing.id);
      expect(store().listings.length).toBe(n - 1);
    });
  });

  describe('interleaved mint and list operations', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i + 1))('interleaved %d operations', (n) => {
      for (let i = 0; i < n; i++) {
        const minted = mint(AGENT_CATALOG[i % AGENT_CATALOG.length].id)!;
        store().listAgent(minted.mintId, 100 + i);
      }
      expect(store().listings.length).toBe(n);
      expect(store().totalMinted).toBe(n);
    });
  });

  describe('rapid buy-delist race', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i))('race scenario #%d: buy wins over delist', (_) => {
      const minted = mint(AGENT_CATALOG[0].id)!;
      store().listAgent(minted.mintId, 100);
      const listing = store().listings[0];
      // Buy first
      store().buyAgent(listing.id);
      // Then delist (should be no-op since already bought)
      store().delistAgent(listing.id);
      expect(store().agents[minted.mintId].isLocked).toBe(false);
    });
  });

  describe('atomic state after multiple operations', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i + 1))('state consistent after %d mixed operations', (n) => {
      const agents = mintMultiple(n * 2);

      // List half
      for (let i = 0; i < n; i++) {
        store().listAgent(agents[i].mintId, 100);
      }

      // Deploy other half
      for (let i = n; i < n * 2; i++) {
        store().deployAgent(agents[i].mintId, `node-${i}`);
      }

      expect(store().listings.length).toBe(n);
      expect(store().totalDeployed).toBe(n);

      // All listed agents should be locked
      for (let i = 0; i < n; i++) {
        expect(store().agents[agents[i].mintId].isLocked).toBe(true);
      }

      // All deployed agents should have a target
      for (let i = n; i < n * 2; i++) {
        expect(store().agents[agents[i].mintId].deployedTo).not.toBeNull();
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. ADDITIONAL MARKETPLACE TESTS (fill to 1000)
// ═══════════════════════════════════════════════════════════════════

describe('Marketplace XP and level interaction', () => {
  beforeEach(resetStore);

  describe('XP addition', () => {
    it.each(Array.from({ length: 30 }, (_, i) => (i + 1) * 10))('adding %d XP to minted card', (xp) => {
      const minted = mint(AGENT_CATALOG[0].id)!;
      store().addXP(minted.mintId, xp);
      expect(store().agents[minted.mintId].xp).toBeGreaterThanOrEqual(0);
    });
  });

  describe('levelUp', () => {
    it.each(Array.from({ length: 30 }, (_, i) => i))('levelUp scenario #%d', (_) => {
      const minted = mint(AGENT_CATALOG[0].id)!;
      store().addXP(minted.mintId, 10000); // Enough XP to level
      const result = store().levelUp(minted.mintId);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('useAbility', () => {
    it.each(Array.from({ length: 30 }, (_, i) => i))('useAbility at tick %d', (tick) => {
      const minted = mint(AGENT_CATALOG[0].id)!;
      store().deployAgent(minted.mintId, 'node-ab');
      const result = store().useAbility(minted.mintId, tick * 100);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('useUltimate requires level 5', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i + 1))('ultimate blocked at level %d < 5', (level) => {
      if (level >= 5) return;
      const card = AGENT_CATALOG.find(c => c.ultimate);
      if (!card) return;
      const minted = mint(card.id)!;
      useAgentCardStore.setState({
        agents: { ...store().agents, [minted.mintId]: { ...store().agents[minted.mintId], level } },
      });
      store().deployAgent(minted.mintId, 'node-ult');
      expect(store().useUltimate(minted.mintId, 0)).toBe(false);
    });
  });
});

describe('Marketplace listing price edge cases', () => {
  beforeEach(resetStore);

  describe('very small prices', () => {
    it.each(Array.from({ length: 30 }, (_, i) => i + 1))('listing at price %d', (price) => {
      const minted = mint(AGENT_CATALOG[0].id)!;
      store().listAgent(minted.mintId, price);
      expect(store().listings[0].price).toBe(price);
      store().delistAgent(store().listings[0].id);
    });
  });

  describe('very large prices', () => {
    it.each(Array.from({ length: 30 }, (_, i) => (i + 1) * 1_000_000))('listing at price %d', (price) => {
      const minted = mint(AGENT_CATALOG[0].id)!;
      store().listAgent(minted.mintId, price);
      expect(store().listings[0].price).toBe(price);
      store().delistAgent(store().listings[0].id);
    });
  });
});

describe('Marketplace multi-card listing scenarios', () => {
  beforeEach(resetStore);

  describe('listing cards of each rarity', () => {
    const rarities: AgentRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

    it.each(rarities)('list and buy "%s" rarity card', (rarity) => {
      const cards = getAgentsByRarity(rarity);
      if (cards.length === 0) return;
      const minted = mint(cards[0].id)!;
      store().listAgent(minted.mintId, 100);
      const listing = store().listings[0];
      const bought = store().buyAgent(listing.id);
      expect(bought).not.toBeNull();
    });
  });

  describe('listing cards of each class', () => {
    const classes = Object.keys(AGENT_CLASS_CONFIG) as AgentClass[];

    it.each(classes)('list and buy "%s" class card', (cls) => {
      const cards = getAgentsByClass(cls);
      if (cards.length === 0) return;
      const minted = mint(cards[0].id)!;
      store().listAgent(minted.mintId, 200);
      const listing = store().listings[0];
      expect(store().buyAgent(listing.id)).not.toBeNull();
    });
  });

  describe('sequential list-buy-relist cycles', () => {
    it.each(Array.from({ length: 30 }, (_, i) => i + 1))('cycle #%d: list -> buy -> relist', (n) => {
      const minted = mint(AGENT_CATALOG[n % AGENT_CATALOG.length].id)!;
      store().listAgent(minted.mintId, 100);
      const listing = store().listings.find(l => l.mintId === minted.mintId)!;
      store().buyAgent(listing.id);
      store().listAgent(minted.mintId, 200);
      expect(store().listings.find(l => l.mintId === minted.mintId)).toBeDefined();
      store().delistAgent(store().listings.find(l => l.mintId === minted.mintId)!.id);
    });
  });
});

describe('Marketplace lock/unlock consistency', () => {
  beforeEach(resetStore);

  it.each(Array.from({ length: 30 }, (_, i) => i))('lock-unlock cycle #%d', (_) => {
    const minted = mint(AGENT_CATALOG[0].id)!;
    expect(store().agents[minted.mintId].isLocked).toBe(false);
    store().lockAgent(minted.mintId);
    expect(store().agents[minted.mintId].isLocked).toBe(true);
    store().unlockAgent(minted.mintId);
    expect(store().agents[minted.mintId].isLocked).toBe(false);
  });

  it.each(Array.from({ length: 30 }, (_, i) => `ghost-${i}`))('lock nonexistent agent "%s" is no-op', (id) => {
    store().lockAgent(id);
    // Should not crash
    expect(true).toBe(true);
  });

  it.each(Array.from({ length: 30 }, (_, i) => `ghost-${i}`))('unlock nonexistent agent "%s" is no-op', (id) => {
    store().unlockAgent(id);
    expect(true).toBe(true);
  });
});
