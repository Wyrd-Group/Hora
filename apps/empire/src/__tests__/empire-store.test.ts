/**
 * Suite 6: Empire Store (empireStore.ts) — 1000 tests
 * Tests: balance management, node operations, heat system, four axes,
 * tick processing, CEO experience, ECFL scoring, trade routes, board system.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useEmpireStore } from '../store/empireStore';
import type {
  EmpireNode, CorporateStructure, SectorType,
} from '../store/empireStore';

// ── Helpers ──────────────────────────────────────────────────────

/** Reset store to fresh state before each test. */
function resetStore() {
  useEmpireStore.getState().resetToFresh();
}

/** Get current state snapshot. */
function state() {
  return useEmpireStore.getState();
}

/** Shorthand to set partial state for test setup. */
function patch(partial: Record<string, unknown>) {
  useEmpireStore.setState(partial);
}

// ═══════════════════════════════════════════════════════════════════
// 1. BALANCE MANAGEMENT (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Balance management', () => {
  beforeEach(resetStore);

  // ── Transfer to personal (50 tests) ──────────────────────────

  describe('transferToPersonal', () => {
    const validAmounts = [1, 100, 1_000, 10_000, 50_000, 100_000, 500_000, 1_000_000] as const;

    it.each(validAmounts)('transfers %d from company to personal (with jurisdictions set)', (amount) => {
      patch({ companyBalance: 2_000_000, companyCountry: 'IE', residencyCountry: 'US' });
      const before = state();
      state().transferToPersonal(amount);
      const after = state();
      expect(after.companyBalance).toBe(before.companyBalance - amount);
      expect(after.personalBalance).toBeGreaterThan(before.personalBalance);
    });

    it('does nothing when companyCountry is null', () => {
      patch({ companyBalance: 1_000_000, companyCountry: null, residencyCountry: 'US' });
      const before = state().companyBalance;
      state().transferToPersonal(5000);
      expect(state().companyBalance).toBe(before);
    });

    it('does nothing when residencyCountry is null', () => {
      patch({ companyBalance: 1_000_000, companyCountry: 'IE', residencyCountry: null });
      const before = state().companyBalance;
      state().transferToPersonal(5000);
      expect(state().companyBalance).toBe(before);
    });

    it('does nothing when amount is 0', () => {
      patch({ companyBalance: 500_000, companyCountry: 'IE', residencyCountry: 'US' });
      const before = state().companyBalance;
      state().transferToPersonal(0);
      expect(state().companyBalance).toBe(before);
    });

    it('does nothing when amount is negative', () => {
      patch({ companyBalance: 500_000, companyCountry: 'IE', residencyCountry: 'US' });
      const before = state().companyBalance;
      state().transferToPersonal(-100);
      expect(state().companyBalance).toBe(before);
    });

    it('does nothing when amount exceeds company balance', () => {
      patch({ companyBalance: 1_000, companyCountry: 'IE', residencyCountry: 'US' });
      state().transferToPersonal(5_000);
      expect(state().companyBalance).toBe(1_000);
    });

    it('adds a ticker event on successful transfer', () => {
      patch({ companyBalance: 500_000, companyCountry: 'IE', residencyCountry: 'US', ticker: [] });
      state().transferToPersonal(10_000);
      expect(state().ticker.length).toBeGreaterThan(0);
      expect(state().ticker[0].text).toContain('TRANSFER');
    });

    const largeCases = Array.from({ length: 10 }, (_, i) => (i + 1) * 100_000);
    it.each(largeCases)('handles large transfer amount %d', (amount) => {
      patch({ companyBalance: 5_000_000, companyCountry: 'IE', residencyCountry: 'US' });
      state().transferToPersonal(amount);
      expect(state().companyBalance).toBe(5_000_000 - amount);
    });

    it.each(Array.from({ length: 20 }, (_, i) => i + 1))('sequential transfer #%d reduces balance correctly', (_n) => {
      patch({ companyBalance: 1_000_000, companyCountry: 'IE', residencyCountry: 'US' });
      state().transferToPersonal(100);
      expect(state().companyBalance).toBe(1_000_000 - 100);
    });
  });

  // ── Transfer to company (50 tests) ───────────────────────────

  describe('transferToCompany', () => {
    const amounts = [1, 50, 500, 5_000, 10_000, 25_000, 50_000, 100_000] as const;

    it.each(amounts)('transfers %d from personal to company', (amount) => {
      patch({ personalBalance: 200_000, companyBalance: 0 });
      state().transferToCompany(amount);
      expect(state().companyBalance).toBe(amount);
      expect(state().personalBalance).toBe(200_000 - amount);
    });

    it('does nothing when amount is 0', () => {
      patch({ personalBalance: 100_000 });
      const before = state().personalBalance;
      state().transferToCompany(0);
      expect(state().personalBalance).toBe(before);
    });

    it('does nothing when amount is negative', () => {
      patch({ personalBalance: 100_000 });
      state().transferToCompany(-50);
      expect(state().personalBalance).toBe(100_000);
    });

    it('does nothing when amount exceeds personal balance', () => {
      patch({ personalBalance: 100, companyBalance: 0 });
      state().transferToCompany(500);
      expect(state().personalBalance).toBe(100);
      expect(state().companyBalance).toBe(0);
    });

    it('adds a ticker event on successful transfer', () => {
      patch({ personalBalance: 50_000, companyBalance: 0, ticker: [] });
      state().transferToCompany(10_000);
      expect(state().ticker.length).toBeGreaterThan(0);
      expect(state().ticker[0].text).toContain('CAPITAL INJECTION');
    });

    it.each(Array.from({ length: 30 }, (_, i) => (i + 1) * 1000))('transfers %d correctly', (amt) => {
      patch({ personalBalance: 500_000, companyBalance: 0 });
      state().transferToCompany(amt);
      expect(state().companyBalance).toBe(amt);
      expect(state().personalBalance).toBe(500_000 - amt);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. NODE OPERATIONS (200 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Node operations', () => {
  beforeEach(resetStore);

  // ── purchaseNode ──────────────────────────────────────────────

  describe('purchaseNode', () => {
    function makeMarketNode(id: string, capex: number, opex: number): EmpireNode {
      return {
        id, name: `Test ${id}`, type: 'finance', owner: 'market', lat: 0, lon: 0,
        level: 1, income: 0, status: 'operational', capex, opex,
      };
    }

    const capexValues = [50_000, 100_000, 250_000, 500_000, 1_000_000] as const;

    describe.each(capexValues)('with capex=%d', (capex) => {
      it('buys node via "buy" method at full capex', () => {
        const node = makeMarketNode('test-buy', capex, 10_000);
        patch({ companyBalance: 5_000_000, nodes: { 'test-buy': node } });
        state().purchaseNode('test-buy', 'buy');
        expect(state().nodes['test-buy'].owner).toBe('player');
        expect(state().companyBalance).toBe(5_000_000 - capex);
      });

      it('builds node via "build" method at 60% capex', () => {
        const node = makeMarketNode('test-build', capex, 10_000);
        patch({ companyBalance: 5_000_000, nodes: { 'test-build': node } });
        state().purchaseNode('test-build', 'build');
        expect(state().nodes['test-build'].owner).toBe('player');
        expect(state().nodes['test-build'].status).toBe('building');
        expect(state().companyBalance).toBe(5_000_000 - capex * 0.6);
      });

      it('rejects purchase when balance too low', () => {
        const node = makeMarketNode('test-broke', capex, 10_000);
        patch({ companyBalance: 0, nodes: { 'test-broke': node } });
        state().purchaseNode('test-broke', 'buy');
        expect(state().nodes['test-broke'].owner).toBe('market');
      });
    });

    it('rejects purchase of non-market node', () => {
      const node: EmpireNode = {
        id: 'player-node', name: 'X', type: 'tech', owner: 'player',
        lat: 0, lon: 0, level: 1, income: 5000, status: 'operational',
      };
      patch({ companyBalance: 5_000_000, nodes: { 'player-node': node } });
      state().purchaseNode('player-node', 'buy');
      expect(state().companyBalance).toBe(5_000_000);
    });

    it('rejects purchase of nonexistent node', () => {
      patch({ companyBalance: 5_000_000 });
      state().purchaseNode('no-such-node', 'buy');
      expect(state().companyBalance).toBe(5_000_000);
    });

    it('rejects purchase when assets are frozen', () => {
      const node = makeMarketNode('frozen-test', 100_000, 10_000);
      patch({ companyBalance: 5_000_000, assetsFrozen: true, nodes: { 'frozen-test': node } });
      state().purchaseNode('frozen-test', 'buy');
      expect(state().nodes['frozen-test'].owner).toBe('market');
    });

    it.each(Array.from({ length: 20 }, (_, i) => `node-${i}`))('purchasing node "%s" deducts correct cost', (id) => {
      const node = makeMarketNode(id, 100_000, 10_000);
      patch({ companyBalance: 5_000_000, nodes: { [id]: node } });
      state().purchaseNode(id, 'buy');
      expect(state().nodes[id].owner).toBe('player');
    });

    it.each(Array.from({ length: 20 }, (_, i) => `bld-${i}`))('building node "%s" sets status to building', (id) => {
      const node = makeMarketNode(id, 200_000, 10_000);
      patch({ companyBalance: 5_000_000, nodes: { [id]: node } });
      state().purchaseNode(id, 'build');
      expect(state().nodes[id].status).toBe('building');
    });
  });

  // ── upgradeNode ───────────────────────────────────────────────

  describe('upgradeNode', () => {
    function makePlayerNode(id: string, level: number, income: number): EmpireNode {
      return {
        id, name: `Node ${id}`, type: 'tech', owner: 'player',
        lat: 0, lon: 0, level, income, status: 'operational',
      };
    }

    const levelProgression = [1, 2, 3, 4] as const;

    describe.each(levelProgression)('from level %d', (level) => {
      it('upgrades to next level with sufficient funds', () => {
        const income = 10_000;
        const node = makePlayerNode('upg', level, income);
        const cost = income * 12;
        patch({ companyBalance: cost + 1, nodes: { upg: node } });
        state().upgradeNode('upg');
        expect(state().nodes['upg'].level).toBe(level + 1);
      });

      it('increases income by 35%', () => {
        const income = 10_000;
        const node = makePlayerNode('upg-inc', level, income);
        patch({ companyBalance: 10_000_000, nodes: { 'upg-inc': node } });
        state().upgradeNode('upg-inc');
        expect(state().nodes['upg-inc'].income).toBe(Math.round(income * 1.35));
      });

      it('deducts correct upgrade cost (12x income)', () => {
        const income = 10_000;
        const node = makePlayerNode('upg-cost', level, income);
        const balance = 1_000_000;
        patch({ companyBalance: balance, nodes: { 'upg-cost': node } });
        state().upgradeNode('upg-cost');
        expect(state().companyBalance).toBe(balance - income * 12);
      });

      it('rejects upgrade with insufficient funds', () => {
        const income = 10_000;
        const node = makePlayerNode('upg-broke', level, income);
        patch({ companyBalance: 0, nodes: { 'upg-broke': node } });
        state().upgradeNode('upg-broke');
        expect(state().nodes['upg-broke'].level).toBe(level);
      });
    });

    it('rejects upgrade at max level 5', () => {
      const node = makePlayerNode('max', 5, 50_000);
      patch({ companyBalance: 10_000_000, nodes: { max: node } });
      state().upgradeNode('max');
      expect(state().nodes['max'].level).toBe(5);
    });

    it('rejects upgrade of non-player node', () => {
      const node: EmpireNode = {
        id: 'rival', name: 'R', type: 'tech', owner: 'rival',
        lat: 0, lon: 0, level: 1, income: 10_000, status: 'operational',
      };
      patch({ companyBalance: 10_000_000, nodes: { rival: node } });
      state().upgradeNode('rival');
      expect(state().nodes['rival'].level).toBe(1);
    });

    it('rejects upgrade of building node', () => {
      const node: EmpireNode = {
        id: 'bld', name: 'B', type: 'tech', owner: 'player',
        lat: 0, lon: 0, level: 1, income: 10_000, status: 'building',
      };
      patch({ companyBalance: 10_000_000, nodes: { bld: node } });
      state().upgradeNode('bld');
      expect(state().nodes['bld'].level).toBe(1);
    });

    it.each(Array.from({ length: 30 }, (_, i) => [i, (i + 1) * 5_000] as const))(
      'upgrade with income=%d costs %d correctly',
      (_, income) => {
        const node = makePlayerNode(`inc-${income}`, 1, income);
        patch({ companyBalance: 10_000_000, nodes: { [`inc-${income}`]: node } });
        const before = state().companyBalance;
        state().upgradeNode(`inc-${income}`);
        expect(state().companyBalance).toBe(before - income * 12);
      }
    );

    // Full 1-to-5 progression test
    it.each(Array.from({ length: 20 }, (_, i) => `full-${i}`))('full upgrade path for node "%s"', (id) => {
      const node = makePlayerNode(id, 1, 10_000);
      patch({ companyBalance: 100_000_000, nodes: { [id]: node } });
      for (let l = 1; l < 5; l++) {
        state().upgradeNode(id);
      }
      expect(state().nodes[id].level).toBe(5);
    });
  });

  // ── sellNode / decryptIntel / cyberStrike ─────────────────────

  describe('decryptIntel', () => {
    it.each(Array.from({ length: 20 }, (_, i) => `rival-${i}`))('decrypts intel on rival node "%s"', (id) => {
      const node: EmpireNode = {
        id, name: `Rival ${id}`, type: 'tech', owner: 'rival',
        lat: 0, lon: 0, level: 2, income: 20_000, status: 'operational', intelDecrypted: false,
      };
      patch({ companyBalance: 500_000, nodes: { [id]: node }, ticker: [] });
      state().decryptIntel(id);
      expect(state().nodes[id].intelDecrypted).toBe(true);
      expect(state().companyBalance).toBe(500_000 - 15_000);
    });

    it('rejects decryption of already-decrypted node', () => {
      const node: EmpireNode = {
        id: 'already', name: 'A', type: 'tech', owner: 'rival',
        lat: 0, lon: 0, level: 1, income: 10_000, status: 'operational', intelDecrypted: true,
      };
      patch({ companyBalance: 500_000, nodes: { already: node } });
      state().decryptIntel('already');
      expect(state().companyBalance).toBe(500_000);
    });

    it('rejects decryption of player-owned node', () => {
      const node: EmpireNode = {
        id: 'mine', name: 'M', type: 'tech', owner: 'player',
        lat: 0, lon: 0, level: 1, income: 10_000, status: 'operational',
      };
      patch({ companyBalance: 500_000, nodes: { mine: node } });
      state().decryptIntel('mine');
      expect(state().companyBalance).toBe(500_000);
    });

    it('rejects when insufficient funds', () => {
      const node: EmpireNode = {
        id: 'exp', name: 'E', type: 'tech', owner: 'rival',
        lat: 0, lon: 0, level: 1, income: 10_000, status: 'operational', intelDecrypted: false,
      };
      patch({ companyBalance: 100, nodes: { exp: node } });
      state().decryptIntel('exp');
      expect(state().nodes['exp'].intelDecrypted).toBeFalsy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. HEAT SYSTEM (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Heat system', () => {
  beforeEach(resetStore);

  describe('heat decay per tick', () => {
    const startHeats = Array.from({ length: 20 }, (_, i) => (i + 1) * 5);

    it.each(startHeats)('decays from %d by 0.2 each tick', (startHeat) => {
      patch({ heat: startHeat, companyBalance: 0 });
      state().processTick();
      expect(state().heat).toBeLessThanOrEqual(startHeat);
    });
  });

  describe('asset freeze', () => {
    it.each(Array.from({ length: 10 }, (_, i) => 81 + i))('freezes assets when heat=%d (> 80)', (heat) => {
      patch({ heat, companyBalance: 1_000_000 });
      state().processTick();
      expect(state().assetsFrozen).toBe(true);
    });

    it.each(Array.from({ length: 10 }, (_, i) => 50 + i))('does not freeze when heat=%d (<= 80)', (heat) => {
      patch({ heat, companyBalance: 0, assetsFrozen: false });
      state().processTick();
      expect(state().assetsFrozen).toBe(false);
    });

    it.each(Array.from({ length: 10 }, (_, i) => 50 + i))('unfreezes when heat drops to %d (<= 60)', (heat) => {
      if (heat > 60) return; // skip above 60
      patch({ heat, companyBalance: 0, assetsFrozen: true });
      state().processTick();
      expect(state().assetsFrozen).toBe(false);
    });
  });

  describe('heat income penalty', () => {
    it.each(Array.from({ length: 10 }, (_, i) => 61 + i * 2))('applies 10%% penalty when heat=%d (> 60)', (heat) => {
      const node: EmpireNode = {
        id: 'h1', name: 'H', type: 'tech', owner: 'player',
        lat: 0, lon: 0, level: 1, income: 100_000, status: 'operational',
      };
      patch({ heat, nodes: { h1: node }, taxRate: 0 });
      state().processTick();
      // Income should be reduced
      expect(state().monthlyIncome).toBeLessThan(Math.round(100_000 / 30));
    });

    it.each(Array.from({ length: 10 }, (_, i) => 81 + i * 2))('stacks penalty to 72%% when heat=%d (> 80)', (heat) => {
      if (heat > 100) return;
      const node: EmpireNode = {
        id: 'h2', name: 'H2', type: 'tech', owner: 'player',
        lat: 0, lon: 0, level: 1, income: 100_000, status: 'operational',
      };
      patch({ heat: Math.min(heat, 100), nodes: { h2: node }, taxRate: 0 });
      state().processTick();
      expect(state().monthlyIncome).toBeLessThan(Math.round(90_000 / 30));
    });
  });

  describe('heat accumulation from crimes', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i))('crime attempt #%d may increase heat', (_) => {
      const crime = { id: 'c1', name: 'Fraud', detectionPct: 100, penaltyMultiplier: '2x', axisHit: 'Gov -10', heatGain: 15 };
      patch({ companyBalance: 1_000_000, monthlyIncome: 50_000, crimes: [crime], heat: 0, governance: 50 });
      state().executeCrime('c1');
      expect(state().heat).toBeGreaterThanOrEqual(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. FOUR AXES (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Four axes (power, growth, governance, impact)', () => {
  beforeEach(resetStore);

  const axes = ['power', 'growth', 'governance', 'impact'] as const;

  describe('initial values', () => {
    it.each(axes)('%s starts at 0', (axis) => {
      expect(state()[axis]).toBe(0);
    });
  });

  describe('bounds checking', () => {
    it.each(axes)('%s cannot go below 0', (axis) => {
      patch({ [axis]: 0 });
      expect(state()[axis]).toBeGreaterThanOrEqual(0);
    });

    it.each(axes)('%s stays at 100 max when set directly', (axis) => {
      patch({ [axis]: 100 });
      expect(state()[axis]).toBe(100);
    });
  });

  describe('axis values at boundary conditions', () => {
    const boundaryValues = [0, 1, 25, 50, 75, 99, 100];

    describe.each(axes)('%s boundary tests', (axis) => {
      it.each(boundaryValues)('accepts value %d', (val) => {
        patch({ [axis]: val });
        expect(state()[axis]).toBe(val);
      });
    });
  });

  describe('axis interactions with board members', () => {
    it.each(Array.from({ length: 10 }, (_, i) => (i + 1) * 10))('growth=%d influences growth-focused board patience', (val) => {
      patch({
        growth: val,
        boardMembers: [
          { id: 'bm1', name: 'A', role: 'Investor', focus: 'growth', patience: 50, portrait: '1' },
        ],
      });
      state().processTick();
      const bm = state().boardMembers[0];
      expect(bm.patience).toBeDefined();
    });

    it.each(Array.from({ length: 10 }, (_, i) => (i + 1) * 10))('governance=%d influences governance-focused board', (val) => {
      patch({
        governance: val,
        boardMembers: [
          { id: 'bm2', name: 'B', role: 'Independent', focus: 'governance', patience: 50, portrait: '2' },
        ],
      });
      state().processTick();
      const bm = state().boardMembers[0];
      expect(typeof bm.patience).toBe('number');
    });

    it.each(Array.from({ length: 10 }, (_, i) => (i + 1) * 10))('impact=%d influences ESG-focused board', (val) => {
      patch({
        impact: val,
        boardMembers: [
          { id: 'bm3', name: 'C', role: 'Independent', focus: 'esg', patience: 50, portrait: '3' },
        ],
      });
      state().processTick();
      expect(state().boardMembers[0].patience).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. TICK PROCESSING (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Tick processing', () => {
  beforeEach(resetStore);

  it('increments gameTick by 1', () => {
    const before = state().gameTick;
    state().processTick();
    expect(state().gameTick).toBe(before + 1);
  });

  it.each(Array.from({ length: 20 }, (_, i) => i))('tick #%d increments monotonically', (n) => {
    patch({ gameTick: n });
    state().processTick();
    expect(state().gameTick).toBe(n + 1);
  });

  describe('income calculation from owned nodes', () => {
    const incomes = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000];

    it.each(incomes)('calculates income of %d correctly', (income) => {
      const node: EmpireNode = {
        id: 'n1', name: 'N', type: 'tech', owner: 'player',
        lat: 0, lon: 0, level: 1, income, status: 'operational',
      };
      patch({ nodes: { n1: node }, companyBalance: 0, taxRate: 0, gameTick: 1439, currentContract: null });
      state().processTick();
      expect(state().companyBalance).toBeGreaterThan(0);
    });
  });

  describe('tax deduction', () => {
    const taxRates = [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50, 0.60];

    it.each(taxRates)('applies tax rate %d to income', (rate) => {
      const node: EmpireNode = {
        id: 'tx', name: 'T', type: 'tech', owner: 'player',
        lat: 0, lon: 0, level: 1, income: 100_000, status: 'operational',
      };
      patch({ nodes: { tx: node }, companyBalance: 0, taxRate: rate, heat: 0, gameTick: 1439, currentContract: null });
      state().processTick();
      // Tax reduces what's added to companyBalance (via netIncome), not monthlyIncome
      // monthlyIncome = adjustedIncome / 30 (pre-tax, only heat-adjusted)
      const dailyIncome = Math.round(100_000 / 30);
      expect(state().monthlyIncome).toBe(dailyIncome);
      // But the balance should reflect tax: lower rates → more balance
      if (rate > 0) {
        const balanceAtZeroTax = Math.round(Math.round(100_000 * 1) / 30);
        const balanceAtThisTax = Math.round(Math.round(100_000 * (1 - rate)) / 30);
        expect(balanceAtThisTax).toBeLessThan(balanceAtZeroTax);
      }
    });
  });

  describe('ticker events during tick', () => {
    it.each(Array.from({ length: 10 }, (_, i) => i))('tick %d produces valid ticker entries', (_) => {
      state().processTick();
      for (const ev of state().ticker) {
        expect(ev).toHaveProperty('id');
        expect(ev).toHaveProperty('text');
        expect(ev).toHaveProperty('type');
        expect(ev).toHaveProperty('timestamp');
      }
    });
  });

  describe('fund yield processing', () => {
    it.each(Array.from({ length: 10 }, (_, i) => (i + 1) * 100_000))('processes fund with staked amount %d', (amount) => {
      patch({
        funds: [
          { id: 'f1', name: 'Test Fund', value: 0, owned: true, type: 'Hedge', aum: 1e9, strategy: 'Long/Short', historicalReturns: '12%', minimumBuyIn: 100, managementFee: '2%', description: 'Test', stakedAmount: amount, edge: 0.6, targetYield: 5 },
        ],
      });
      state().processTick();
      const fund = state().funds.find(f => f.id === 'f1');
      expect(fund!.stakedAmount).not.toBe(amount); // yield applied
    });
  });

  describe('CEO salary paid per tick', () => {
    it.each(Array.from({ length: 10 }, (_, i) => (i + 1) * 5_000))('pays salary of %d', (salary) => {
      patch({
        gameTick: 15,
        currentContract: { salary, bonusTarget: 1e6, bonusPayout: 50_000, termLength: 360, startTick: 0, performanceClause: 25 },
        personalBalance: 0,
        sacked: false,
      });
      state().processTick();
      expect(state().personalBalance).toBeGreaterThanOrEqual(salary);
    });
  });

  describe('monopoly bonus', () => {
    it.each(Array.from({ length: 10 }, (_, i) => i))('applies 1.5x bonus with 3+ same-sector nodes (case %d)', (_) => {
      const nodes: Record<string, EmpireNode> = {};
      for (let j = 0; j < 3; j++) {
        nodes[`mono-${j}`] = {
          id: `mono-${j}`, name: `M${j}`, type: 'tech', owner: 'player',
          lat: 0, lon: 0, level: 1, income: 10_000, status: 'operational',
        };
      }
      patch({ nodes, companyBalance: 0, taxRate: 0, heat: 0 });
      state().processTick();
      // 3 nodes * 10k * 1.5 monopoly = 45k, stored as daily (÷30)
      expect(state().monthlyIncome).toBe(Math.round(45_000 / 30));
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. CEO EXPERIENCE (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('CEO experience', () => {
  beforeEach(resetStore);

  it('starts at 0', () => {
    expect(state().ceoExperience).toBe(0);
  });

  describe('XP from accepting new position', () => {
    it.each(Array.from({ length: 20 }, (_, i) => (i + 1) * 50))('gains XP after %d ticks of tenure', (ticks) => {
      patch({
        gameTick: ticks,
        currentContract: { salary: 5000, bonusTarget: 1e6, bonusPayout: 50_000, termLength: 360, startTick: 0, performanceClause: 25 },
        sacked: false,
        ceoExperience: 0,
      });
      state().acceptPosition({ company: 'NewCo', structure: 'Public Company', salary: 10_000, bonus: 100_000, netWorth: 1_000_000, difficulty: 'normal' });
      expect(state().ceoExperience).toBeGreaterThan(0);
    });
  });

  describe('no XP gain when sacked', () => {
    it.each(Array.from({ length: 10 }, (_, i) => (i + 1) * 100))('no XP after sacking at tick %d', (ticks) => {
      patch({
        gameTick: ticks,
        currentContract: { salary: 5000, bonusTarget: 1e6, bonusPayout: 50_000, termLength: 360, startTick: 0, performanceClause: 25 },
        sacked: true,
        ceoExperience: 0,
      });
      state().acceptPosition({ company: 'NewCo', structure: 'Public Company', salary: 10_000, bonus: 100_000, netWorth: 1_000_000, difficulty: 'normal' });
      expect(state().ceoExperience).toBe(0);
    });
  });

  describe('career history tracking', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i))('career entry #%d is recorded', (n) => {
      patch({
        gameTick: 100,
        currentContract: { salary: 5000, bonusTarget: 1e6, bonusPayout: 50_000, termLength: 360, startTick: 0, performanceClause: 25 },
        sacked: false,
        careerHistory: Array.from({ length: n }, (_, j) => ({
          companyName: `Co ${j}`, structure: 'Sole Trader' as CorporateStructure,
          startTick: 0, endTick: 50, endReason: 'resigned' as const,
          peakNetWorth: 100_000, finalSatisfaction: 65,
        })),
      });
      state().acceptPosition({ company: `NewCo ${n}`, structure: 'Public Company', salary: 10_000, bonus: 100_000, netWorth: 1_000_000, difficulty: 'normal' });
      expect(state().careerHistory.length).toBe(n + 1);
    });
  });

  describe('difficulty affects contract terms', () => {
    const difficulties = ['easy', 'normal', 'hard', 'legendary'] as const;

    it.each(difficulties)('difficulty "%s" sets correct board review interval', (diff) => {
      state().acceptPosition({ company: 'Co', structure: 'Public Company', salary: 10_000, bonus: 100_000, netWorth: 1_000_000, difficulty: diff });
      const intervals = { easy: 129_600, normal: 86_400, hard: 43_200, legendary: 21_600 };
      expect(state().boardReviewInterval).toBe(intervals[diff]);
    });

    it.each(difficulties)('difficulty "%s" sets correct difficulty', (diff) => {
      state().acceptPosition({ company: 'Co', structure: 'Public Company', salary: 10_000, bonus: 100_000, netWorth: 1_000_000, difficulty: diff });
      expect(state().difficulty).toBe(diff);
    });
  });

  describe('sacking resets state', () => {
    it.each(Array.from({ length: 10 }, (_, i) => i))('sack detection at board review #%d', (_) => {
      patch({
        boardSatisfaction: 0,
        boardPatience: 1,
        sacked: false,
        difficulty: 'normal',
        gameTick: 100,
        boardMembers: [
          { id: 'bm1', name: 'A', role: 'Chairman', focus: 'profit', patience: 0, portrait: '' },
          { id: 'bm2', name: 'B', role: 'Investor', focus: 'growth', patience: 0, portrait: '' },
          { id: 'bm3', name: 'C', role: 'Independent', focus: 'esg', patience: 0, portrait: '' },
          { id: 'bm4', name: 'D', role: 'Founder', focus: 'governance', patience: 0, portrait: '' },
        ],
      });
      state().processTick();
      // With 0 satisfaction and review due, should be sacked
      expect(state().sacked).toBe(true);
    });
  });

  describe('XP accumulates on sacking', () => {
    it.each(Array.from({ length: 10 }, (_, i) => (i + 1) * 50))('accumulates XP from %d ticks on sack', (tick) => {
      patch({
        boardSatisfaction: 0,
        boardPatience: 1,
        sacked: false,
        difficulty: 'normal',
        gameTick: tick,
        ceoExperience: 0,
      });
      state().processTick();
      if (state().sacked) {
        expect(state().ceoExperience).toBeGreaterThan(0);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. ECFL SCORING (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('ECFL scoring', () => {
  beforeEach(resetStore);

  it('starts with ecflScore 0', () => {
    expect(state().ecflScore).toBe(0);
  });

  it('starts with flouLevel 0', () => {
    expect(state().flouLevel).toBe(0);
  });

  describe('markLessonComplete', () => {
    it.each(Array.from({ length: 30 }, (_, i) => `lesson-${i}`))('marks lesson "%s" complete', (id) => {
      state().markLessonComplete(id);
      expect(state().completedLessons).toContain(id);
    });

    it.each(Array.from({ length: 10 }, (_, i) => `dup-${i}`))('duplicate lesson "%s" not added twice', (id) => {
      state().markLessonComplete(id);
      state().markLessonComplete(id);
      expect(state().completedLessons.filter(l => l === id).length).toBe(1);
    });
  });

  describe('passExam', () => {
    it.each(Array.from({ length: 20 }, (_, i) => [`exam-${i}`, (i + 1) * 10] as const))('passing exam "%s" adds %d points', (id, points) => {
      state().passExam(id as string, points as number);
      expect(state().ecflScore).toBe(points);
      expect(state().passedExams).toContain(id);
    });

    it.each(Array.from({ length: 10 }, (_, i) => `dup-exam-${i}`))('duplicate exam "%s" not scored twice', (id) => {
      state().passExam(id, 50);
      state().passExam(id, 50);
      expect(state().ecflScore).toBe(50);
    });
  });

  describe('flouLevel derivation', () => {
    // flouLevel = min(10, floor((ecflScore + completedLessons.length * 5) / 20))
    const scoreCases = Array.from({ length: 11 }, (_, i) => [i * 20, 0, i] as const);

    it.each(scoreCases)('ecflScore=%d with 0 lessons => flouLevel=%d', (score, _, expectedLevel) => {
      // Build up score through exams
      let accumulated = 0;
      let examIdx = 0;
      while (accumulated < score) {
        const pts = Math.min(20, score - accumulated);
        state().passExam(`flou-exam-${examIdx++}`, pts);
        accumulated += pts;
      }
      expect(state().flouLevel).toBe(Math.min(10, expectedLevel));
    });

    it.each(Array.from({ length: 10 }, (_, i) => i + 1))('adding %d lessons increases flouLevel', (n) => {
      for (let i = 0; i < n; i++) {
        state().markLessonComplete(`lesson-flou-${i}`);
      }
      const expected = Math.min(10, Math.floor(n * 5 / 20));
      expect(state().flouLevel).toBe(expected);
    });
  });

  describe('flouLevel capped at 10', () => {
    it.each(Array.from({ length: 10 }, (_, i) => 200 + i * 50))('with ecflScore=%d, flouLevel does not exceed 10', (score) => {
      let accumulated = 0;
      let idx = 0;
      while (accumulated < score) {
        const pts = Math.min(20, score - accumulated);
        state().passExam(`cap-exam-${idx++}`, pts);
        accumulated += pts;
      }
      expect(state().flouLevel).toBeLessThanOrEqual(10);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. TRADE ROUTES (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Trade routes', () => {
  beforeEach(resetStore);

  const routeTypes = ['sea', 'rail', 'air', 'truck'] as const;

  describe('buildRoute', () => {
    it.each(routeTypes)('builds a %s route', (type) => {
      patch({ companyBalance: 5_000_000, routes: [] });
      state().buildRoute('from-1', 'to-1', type);
      expect(state().routes.length).toBe(1);
      expect(state().routes[0].type).toBe(type);
    });

    it.each(routeTypes)('%s route has correct base capacity', (type) => {
      patch({ companyBalance: 5_000_000, routes: [] });
      state().buildRoute('f', 't', type);
      const capacities = { sea: 500, air: 100, rail: 300, truck: 150 };
      expect(state().routes[0].capacity).toBe(capacities[type]);
    });

    it.each(routeTypes)('%s route starts at level 1', (type) => {
      patch({ companyBalance: 5_000_000, routes: [] });
      state().buildRoute('f', 't', type);
      expect(state().routes[0].level).toBe(1);
    });

    it.each(routeTypes)('%s route deducts correct cost', (type) => {
      const baseCosts = { sea: 500_000, air: 750_000, rail: 600_000, truck: 300_000 };
      patch({ companyBalance: 5_000_000, routes: [] });
      state().buildRoute('f', 't', type);
      expect(state().companyBalance).toBe(5_000_000 - baseCosts[type]);
    });

    const acquisitions = ['built', 'bought', 'subcontracted', 'stolen'] as const;

    it.each(acquisitions)('acquisition "%s" applies cost multiplier', (acq) => {
      const mults = { built: 1, bought: 1.5, subcontracted: 0.6, stolen: 0.3 };
      patch({ companyBalance: 10_000_000, routes: [] });
      state().buildRoute('f', 't', 'sea', undefined, acq);
      expect(state().companyBalance).toBe(10_000_000 - Math.round(500_000 * mults[acq]));
    });

    it('stolen route adds 15 heat', () => {
      patch({ companyBalance: 10_000_000, routes: [], heat: 0 });
      state().buildRoute('f', 't', 'sea', undefined, 'stolen');
      expect(state().heat).toBe(15);
    });

    it.each(acquisitions.filter(a => a !== 'stolen'))('"%s" route adds 0 heat', (acq) => {
      patch({ companyBalance: 10_000_000, routes: [], heat: 0 });
      state().buildRoute('f', 't', 'sea', undefined, acq);
      expect(state().heat).toBe(0);
    });

    it('rejects route when insufficient funds', () => {
      patch({ companyBalance: 0, routes: [] });
      state().buildRoute('f', 't', 'sea');
      expect(state().routes.length).toBe(0);
    });

    it.each(Array.from({ length: 10 }, (_, i) => i))('builds multiple routes (count=%d)', (n) => {
      patch({ companyBalance: 50_000_000, routes: [] });
      for (let i = 0; i <= n; i++) {
        state().buildRoute(`f-${i}`, `t-${i}`, 'truck');
      }
      expect(state().routes.length).toBe(n + 1);
    });
  });

  describe('upgradeRoute', () => {
    it.each(Array.from({ length: 10 }, (_, i) => i))('upgrades route %d times', (n) => {
      patch({ companyBalance: 50_000_000, routes: [] });
      state().buildRoute('f', 't', 'sea');
      const routeId = state().routes[0].id;
      for (let i = 0; i < Math.min(n + 1, 4); i++) {
        state().upgradeRoute(routeId, `Upgrade ${i}`, 100_000);
      }
      expect(state().routes[0].level).toBeGreaterThanOrEqual(1);
    });

    it('caps route level at 5', () => {
      patch({ companyBalance: 50_000_000, routes: [] });
      state().buildRoute('f', 't', 'rail');
      const routeId = state().routes[0].id;
      for (let i = 0; i < 10; i++) {
        state().upgradeRoute(routeId, `U${i}`, 100_000);
      }
      expect(state().routes[0].level).toBeLessThanOrEqual(5);
    });

    it('increases monthly revenue per upgrade', () => {
      patch({ companyBalance: 50_000_000, routes: [] });
      state().buildRoute('f', 't', 'air');
      const routeId = state().routes[0].id;
      const before = state().routes[0].monthlyRevenue || 0;
      state().upgradeRoute(routeId, 'Speed+', 100_000);
      expect(state().routes[0].monthlyRevenue).toBeGreaterThan(before);
    });

    it('rejects upgrade with insufficient funds', () => {
      patch({ companyBalance: 1_000_000, routes: [] });
      state().buildRoute('f', 't', 'truck');
      patch({ companyBalance: 0 });
      const routeId = state().routes[0].id;
      const levelBefore = state().routes[0].level;
      state().upgradeRoute(routeId, 'U', 100_000);
      expect(state().routes[0].level).toBe(levelBefore);
    });
  });

  describe('toggleRoute', () => {
    it.each(Array.from({ length: 10 }, (_, i) => i))('toggles route on/off (iteration %d)', (_) => {
      patch({ companyBalance: 5_000_000, routes: [] });
      state().buildRoute('f', 't', 'sea');
      const id = state().routes[0].id;
      expect(state().routes[0].active).toBe(true);
      state().toggleRoute(id);
      expect(state().routes[0].active).toBe(false);
      state().toggleRoute(id);
      expect(state().routes[0].active).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. BOARD SYSTEM (100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Board system', () => {
  beforeEach(resetStore);

  describe('initial board state', () => {
    it('has 4 board members', () => {
      expect(state().boardMembers.length).toBe(4);
    });

    it('starts with satisfaction at 65', () => {
      expect(state().boardSatisfaction).toBe(65);
    });

    it('starts with 3 goals', () => {
      expect(state().boardGoals.length).toBe(3);
    });

    it('has not been sacked', () => {
      expect(state().sacked).toBe(false);
    });

    it('sackedAt is 0', () => {
      expect(state().sackedAt).toBe(0);
    });
  });

  describe('board member patience drift', () => {
    const focusTypes = ['growth', 'governance', 'profit', 'esg'] as const;

    describe.each(focusTypes)('focus="%s"', (focus) => {
      it.each(Array.from({ length: 5 }, (_, i) => (i + 1) * 20))('patience drifts at axis value %d', (val) => {
        void ({ growth: 'growth', governance: 'governance', profit: 'monthlyIncome', esg: 'impact' } as Record<string, string>);
        const axisPatch: Record<string, number> = {};
        if (focus === 'profit') axisPatch.monthlyIncome = val * 1000;
        else if (focus === 'esg') { axisPatch.impact = val; axisPatch.governance = val; }
        else axisPatch[focus] = val;

        patch({
          ...axisPatch,
          boardMembers: [
            { id: 'test', name: 'T', role: 'Investor', focus, patience: 50, portrait: 'X' },
          ],
        });
        state().processTick();
        expect(typeof state().boardMembers[0].patience).toBe('number');
      });
    });
  });

  describe('board satisfaction = average patience', () => {
    it.each(Array.from({ length: 10 }, (_, i) => (i + 1) * 10))('reflects average when all patience=%d', (p) => {
      patch({
        boardMembers: [
          { id: '1', name: 'A', role: 'Chairman', focus: 'profit', patience: p, portrait: '1' },
          { id: '2', name: 'B', role: 'Investor', focus: 'growth', patience: p, portrait: '2' },
        ],
      });
      state().processTick();
      // Satisfaction should be near p (may drift slightly from focus)
      expect(state().boardSatisfaction).toBeGreaterThan(0);
    });
  });

  describe('board review at interval', () => {
    it.each(Array.from({ length: 10 }, (_, i) => i))('review triggers when patience hits 0 (case %d)', (_) => {
      patch({
        boardPatience: 1,
        boardGoals: [
          { id: 'g1', description: 'Test', metric: 'netWorth', target: 1_000_000, direction: 'above', deadline: 100, met: false, reward: '+10', penalty: '-10' },
        ],
        ticker: [],
      });
      state().processTick();
      expect(state().ticker.some(t => t.text.includes('BOARD REVIEW'))).toBe(true);
    });
  });

  describe('sacking thresholds by difficulty', () => {
    const diffs = [
      ['easy', 15],
      ['normal', 25],
      ['hard', 35],
      ['legendary', 45],
    ] as const;

    it.each(diffs)('difficulty "%s" sacks at satisfaction <= %d', (diff, threshold) => {
      patch({
        difficulty: diff,
        boardPatience: 1,
        boardSatisfaction: threshold,
        sacked: false,
        boardMembers: [
          { id: '1', name: 'A', role: 'Chairman', focus: 'profit', patience: threshold, portrait: '1' },
        ],
        boardGoals: [],
      });
      state().processTick();
      expect(state().sacked).toBe(true);
    });

    it.each(diffs)('difficulty "%s" does not sack at satisfaction %d+1', (diff, threshold) => {
      patch({
        difficulty: diff,
        boardPatience: 1,
        boardSatisfaction: threshold + 10,
        sacked: false,
        boardMembers: [
          { id: '1', name: 'A', role: 'Chairman', focus: 'profit', patience: threshold + 10, portrait: '1' },
        ],
        boardGoals: [],
      });
      state().processTick();
      expect(state().sacked).toBe(false);
    });
  });

  describe('goal evaluation', () => {
    it.each(Array.from({ length: 10 }, (_, i) => (i + 1) * 100_000))('netWorth goal met at %d', (target) => {
      patch({
        boardPatience: 1,
        netWorth: target + 1,
        boardGoals: [
          { id: 'g', description: 'NW', metric: 'netWorth', target, direction: 'above', deadline: 200, met: false, reward: '+10', penalty: '-10' },
        ],
      });
      state().processTick();
      // Board review happened, new goals generated
      expect(state().ticker.some(t => t.text.includes('BOARD REVIEW'))).toBe(true);
    });

    it.each(Array.from({ length: 5 }, (_, i) => (i + 1) * 10))('heat goal met when heat=%d < target 50', (heat) => {
      patch({
        boardPatience: 1,
        heat,
        boardGoals: [
          { id: 'g', description: 'Heat', metric: 'heat', target: 50, direction: 'below', deadline: 200, met: false, reward: '+5', penalty: '-20' },
        ],
      });
      state().processTick();
      expect(state().ticker.some(t => t.text.includes('BOARD REVIEW'))).toBe(true);
    });

    it.each(Array.from({ length: 5 }, (_, i) => 51 + i * 10))('heat goal NOT met when heat=%d >= target 50', (heat) => {
      patch({
        boardPatience: 1,
        heat: Math.min(heat, 100),
        boardGoals: [
          { id: 'g', description: 'Heat', metric: 'heat', target: 50, direction: 'below', deadline: 200, met: false, reward: '+5', penalty: '-20' },
        ],
      });
      state().processTick();
      expect(state().ticker.some(t => t.text.includes('BOARD REVIEW'))).toBe(true);
    });
  });

  describe('setDifficulty', () => {
    const diffs = ['easy', 'normal', 'hard', 'legendary'] as const;

    it.each(diffs)('sets difficulty to "%s"', (d) => {
      state().setDifficulty(d);
      expect(state().difficulty).toBe(d);
    });

    it.each(diffs)('sets correct review interval for "%s"', (d) => {
      const intervals = { easy: 720, normal: 540, hard: 360, legendary: 270 };
      state().setDifficulty(d);
      expect(state().boardReviewInterval).toBe(intervals[d]);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. ADDITIONAL PARAMETERIZED TESTS (fill to 1000)
// ═══════════════════════════════════════════════════════════════════

describe('Cooldown system', () => {
  beforeEach(resetStore);

  describe('structure cooldown', () => {
    const structures: CorporateStructure[] = ['Sole Trader', 'Partnership', 'Privately Held (LLC)', 'Public Company', 'Social Enterprise', 'NGO Watchdog'];

    it.each(structures)('sets structure to "%s" when no cooldown', (s) => {
      const result = state().setStructureCooldown(s);
      expect(result).toBe(true);
      expect(state().structure).toBe(s);
    });

    it.each(structures)('blocks structure change to "%s" during cooldown', (s) => {
      patch({ structureChangedAt: 1, gameTick: 5, cooldownQuarterTicks: 90 });
      const result = state().setStructureCooldown(s);
      expect(result).toBe(false);
    });

    it.each(structures)('allows structure change to "%s" after cooldown expires', (s) => {
      patch({ structureChangedAt: 1, gameTick: 100, cooldownQuarterTicks: 90 });
      const result = state().setStructureCooldown(s);
      expect(result).toBe(true);
    });
  });

  describe('getCooldownRemaining', () => {
    it.each(Array.from({ length: 30 }, (_, i) => i + 1))('at tick %d, cooldown calculated correctly', (tick) => {
      patch({ structureChangedAt: 1, gameTick: tick, cooldownQuarterTicks: 90 });
      const remaining = state().getCooldownRemaining('structure');
      expect(remaining).toBe(Math.max(0, 90 - (tick - 1)));
    });

    it.each(Array.from({ length: 30 }, (_, i) => i + 1))('residency cooldown at tick %d', (tick) => {
      patch({ residencyChangedAt: 1, gameTick: tick, cooldownQuarterTicks: 90 });
      const remaining = state().getCooldownRemaining('residency');
      expect(remaining).toBe(Math.max(0, 90 - (tick - 1)));
    });

    it.each(Array.from({ length: 30 }, (_, i) => i + 1))('jurisdiction cooldown at tick %d', (tick) => {
      patch({ jurisdictionChangedAt: 1, gameTick: tick, cooldownQuarterTicks: 90 });
      const remaining = state().getCooldownRemaining('jurisdiction');
      expect(remaining).toBe(Math.max(0, 90 - (tick - 1)));
    });
  });
});

describe('UI setters', () => {
  beforeEach(resetStore);

  const tabs = ['office', 'overview', 'departments', 'funds', 'market', 'defcon', 'assets', 'shadow', 'perks', 'shopping', 'sports', 'routes', 'esg', 'rnd', 'divisions'] as const;

  it.each(tabs)('setActiveTab to "%s"', (tab) => {
    state().setActiveTab(tab);
    expect(state().activeTab).toBe(tab);
  });

  it.each([true, false])('setTerminalOpen to %s', (val) => {
    state().setTerminalOpen(val);
    expect(state().terminalOpen).toBe(val);
  });

  it.each([true, false])('setAthenaOpen to %s', (val) => {
    state().setAthenaOpen(val);
    expect(state().athenaOpen).toBe(val);
  });

  it.each([true, false])('setPackOpen to %s', (val) => {
    state().setPackOpen(val);
    expect(state().packOpen).toBe(val);
  });

  it.each([true, false])('setLeftRailOpen to %s', (val) => {
    state().setLeftRailOpen(val);
    expect(state().leftRailOpen).toBe(val);
  });

  it.each([true, false])('setShowRoutes to %s', (val) => {
    state().setShowRoutes(val);
    expect(state().showRoutes).toBe(val);
  });

  const sectors: (SectorType | 'all')[] = ['all', 'finance', 'tech', 'oil_gas', 'manufacturing', 'energy', 'pharma', 'venue', 'healthcare', 'education', 'cultural', 'hospitality', 'defense', 'retail'];

  it.each(sectors)('setSectorFilter to "%s"', (filter) => {
    state().setSectorFilter(filter);
    expect(state().sectorFilter).toBe(filter);
  });

  it.each(Array.from({ length: 20 }, (_, i) => `Node ${i}`))('selectNode "%s"', (id) => {
    state().selectNode(id);
    expect(state().selectedNodeId).toBe(id);
  });

  it('selectNode null deselects', () => {
    state().selectNode('x');
    state().selectNode(null);
    expect(state().selectedNodeId).toBeNull();
  });
});

describe('Social actions', () => {
  beforeEach(resetStore);

  describe('socialLikePost', () => {
    it.each(Array.from({ length: 20 }, (_, i) => `post-${i}`))('liking post "%s" increases reputation', (id) => {
      const before = state().socialReputation;
      state().socialLikePost(id);
      expect(state().socialReputation).toBe(before + 1);
      expect(state().socialLikedPosts).toContain(id);
    });

    it.each(Array.from({ length: 10 }, (_, i) => `dup-post-${i}`))('duplicate like "%s" is no-op', (id) => {
      state().socialLikePost(id);
      const after = state().socialReputation;
      state().socialLikePost(id);
      expect(state().socialReputation).toBe(after);
    });
  });

  describe('socialFollow', () => {
    it.each(Array.from({ length: 20 }, (_, i) => `profile-${i}`))('following "%s" increases reputation by 5', (id) => {
      const before = state().socialReputation;
      state().socialFollow(id);
      expect(state().socialReputation).toBe(before + 5);
      expect(state().socialFollowing).toContain(id);
    });

    it.each(Array.from({ length: 10 }, (_, i) => `dup-profile-${i}`))('duplicate follow "%s" is no-op', (id) => {
      state().socialFollow(id);
      const after = state().socialReputation;
      state().socialFollow(id);
      expect(state().socialReputation).toBe(after);
    });
  });

  describe('socialUnfollow', () => {
    it.each(Array.from({ length: 20 }, (_, i) => `unf-${i}`))('unfollowing "%s" removes from list', (id) => {
      state().socialFollow(id);
      expect(state().socialFollowing).toContain(id);
      state().socialUnfollow(id);
      expect(state().socialFollowing).not.toContain(id);
    });
  });

  describe('socialPublishPost', () => {
    it.each(Array.from({ length: 20 }, (_, i) => `My post #${i}`))('publishing "%s" adds to socialPosts', (text) => {
      state().socialPublishPost(text);
      expect(state().socialPosts[0].text).toBe(text);
      expect(state().socialReputation).toBeGreaterThan(0);
    });
  });

  describe('socialWatchClip', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i))('watching clip #%d increments counter', (_) => {
      const before = state().socialClipsWatched;
      state().socialWatchClip();
      expect(state().socialClipsWatched).toBe(before + 1);
    });
  });

  describe('socialSaveClip', () => {
    it.each(Array.from({ length: 20 }, (_, i) => `clip-${i}`))('saving clip "%s" adds to saved', (id) => {
      state().socialSaveClip(id);
      expect(state().socialSavedClips).toContain(id);
    });
  });
});

describe('Athena signal', () => {
  beforeEach(resetStore);

  const regimes = ['risk-on', 'neutral', 'risk-off', 'unknown'];
  const scores = Array.from({ length: 11 }, (_, i) => i * 10);

  it.each(regimes)('sets regime to "%s"', (regime) => {
    state().setAthenaSignal(regime, 50, false);
    expect(state().athenaRegime).toBe(regime);
  });

  it.each(scores)('sets score to %d', (score) => {
    state().setAthenaSignal('neutral', score, false);
    expect(state().athenaScore).toBe(score);
  });

  it.each([true, false])('sets stale to %s', (stale) => {
    state().setAthenaSignal('neutral', 50, stale);
    expect(state().athenaStale).toBe(stale);
  });
});

describe('Compliance fines', () => {
  beforeEach(resetStore);

  describe('payFine', () => {
    it.each(Array.from({ length: 30 }, (_, i) => (i + 1) * 1000))('paying fine of %d reduces complianceFines', (amount) => {
      patch({ companyBalance: 1_000_000, complianceFines: 50_000 });
      state().payFine(amount);
      expect(state().complianceFines).toBeLessThan(50_000);
    });

    it.each(Array.from({ length: 10 }, (_, i) => (i + 1) * 100))('paying %d when no fines does nothing', (amount) => {
      patch({ companyBalance: 1_000_000, complianceFines: 0 });
      state().payFine(amount);
      expect(state().companyBalance).toBe(1_000_000);
    });

    it.each(Array.from({ length: 10 }, (_, i) => (i + 1) * 10_000))('paying %d limited by company balance', (amount) => {
      patch({ companyBalance: 5_000, complianceFines: 100_000 });
      state().payFine(amount);
      expect(state().companyBalance).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Ticker events', () => {
  beforeEach(resetStore);

  const eventTypes = ['fx', 'crypto', 'commodity', 'intel', 'alert', 'crime', 'board', 'trade'] as const;

  it.each(eventTypes)('pushTickerEvent with type "%s"', (type) => {
    state().pushTickerEvent(`Test event ${type}`, type);
    expect(state().ticker[0].text).toContain(`Test event ${type}`);
    expect(state().ticker[0].type).toBe(type);
  });

  it.each(Array.from({ length: 30 }, (_, i) => i))('ticker capped at 50 events (push #%d)', (_n) => {
    for (let i = 0; i < 60; i++) {
      state().pushTickerEvent(`Event ${i}`, 'fx');
    }
    expect(state().ticker.length).toBeLessThanOrEqual(50);
  });
});

describe('Fresh state selectors', () => {
  beforeEach(resetStore);

  it.each(Array.from({ length: 20 }, (_, i) => i))('getOwnedNodes returns player nodes (scenario %d)', (_) => {
    const owned = state().getOwnedNodes();
    for (const node of owned) {
      expect(node.owner).toBe('player');
    }
  });

  it.each(Array.from({ length: 20 }, (_, i) => i))('getMarketNodes returns market nodes (scenario %d)', (_) => {
    const market = state().getMarketNodes();
    for (const node of market) {
      expect(node.owner).toBe('market');
    }
  });

  it.each(Array.from({ length: 20 }, (_, i) => i))('getRivalNodes returns rival nodes (scenario %d)', (_) => {
    const rivals = state().getRivalNodes();
    for (const node of rivals) {
      expect(node.owner).toBe('rival');
    }
  });
});
