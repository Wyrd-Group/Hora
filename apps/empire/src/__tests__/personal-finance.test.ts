/**
 * Personal-finance lab tests — pure helpers + store actions.
 *
 * Covers the F0 Practice Hub: budget rule evaluation, emergency-fund target,
 * debt-payoff orderings, retirement projection, progressive tax, and the
 * cross-store wiring (vault → empire cash).
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  usePersonalFinanceStore,
  evaluateBudget,
  emergencyFundTarget,
  avalancheOrder,
  snowballOrder,
  retirementProjection,
  progressiveTax,
  type DebtAccount,
  type RetirementContribution,
  type ExpenseEntry,
} from '../store/personalFinanceStore';
import { useEmpireStore } from '../store/empireStore';

// ── Setup ──────────────────────────────────────────────────────

function resetAll() {
  usePersonalFinanceStore.setState({
    incomeStreams: [],
    expenses: [],
    vaultBalance: 0,
    vaultDeposits: [],
    debts: [],
    bankAccounts: [],
    insurancePolicies: [],
    retirementContributions: [],
    scamReports: [],
    shieldChecksCompleted: 0,
  });
  useEmpireStore.setState({ personalBalance: 0 });
}

beforeEach(resetAll);

// ══════════════════════════════════════════════════════════════
// Pure-function math
// ══════════════════════════════════════════════════════════════

describe('evaluateBudget — 50/30/20 rule', () => {
  it('returns healthy: true when mix is within ranges', () => {
    const e: ExpenseEntry[] = [
      { id: '1', label: 'rent', amount: 1500, category: 'needs', loggedAt: 0 },
      { id: '2', label: 'dining', amount: 900, category: 'wants', loggedAt: 0 },
      { id: '3', label: 'roth', amount: 1000, category: 'savings_debt', loggedAt: 0 },
    ];
    const r = evaluateBudget(5000, e);
    expect(r.needsPct).toBe(30);
    expect(r.wantsPct).toBe(18);
    expect(r.savingsDebtPct).toBe(20);
    expect(r.healthy).toBe(true);
  });

  it('flags when needs exceed 50%', () => {
    const e: ExpenseEntry[] = [
      { id: '1', label: 'rent', amount: 3000, category: 'needs', loggedAt: 0 },
    ];
    const r = evaluateBudget(5000, e);
    expect(r.healthy).toBe(false);
    expect(r.guidance).toMatch(/Needs are 60%/);
  });

  it('flags when savings < 20%', () => {
    const e: ExpenseEntry[] = [
      { id: '1', label: 'rent', amount: 2000, category: 'needs', loggedAt: 0 },
      { id: '2', label: 'saving', amount: 500, category: 'savings_debt', loggedAt: 0 },
    ];
    const r = evaluateBudget(5000, e);
    expect(r.healthy).toBe(false);
    expect(r.guidance).toMatch(/Savings\/debt/);
  });

  it('handles zero income gracefully', () => {
    expect(evaluateBudget(0, []).healthy).toBe(false);
  });
});

describe('emergencyFundTarget — 3-6× essentials', () => {
  it('defaults to 6 months of essentials (needs + savings_debt)', () => {
    const e: ExpenseEntry[] = [
      { id: '1', label: 'rent', amount: 1500, category: 'needs', loggedAt: 0 },
      { id: '2', label: 'debt', amount: 500, category: 'savings_debt', loggedAt: 0 },
      { id: '3', label: 'fun', amount: 700, category: 'wants', loggedAt: 0 }, // excluded
    ];
    expect(emergencyFundTarget(5000, e)).toBe(12_000);
    expect(emergencyFundTarget(5000, e, 3)).toBe(6_000);
  });

  it('falls back to 70% of income when no expenses logged', () => {
    expect(emergencyFundTarget(5000, [], 3)).toBe(10_500);
  });
});

describe('avalanche vs snowball debt ordering', () => {
  const debts: DebtAccount[] = [
    { id: 'cc', label: 'CC', balance: 3000, apr: 24, kind: 'credit_card', minimumPayment: 75 },
    { id: 'student', label: 'Loan', balance: 15000, apr: 6, kind: 'student_loan', minimumPayment: 200 },
    { id: 'car', label: 'Car', balance: 8000, apr: 9, kind: 'auto_loan', minimumPayment: 300 },
  ];

  it('avalanche: highest APR first', () => {
    expect(avalancheOrder(debts)).toEqual(['cc', 'car', 'student']);
  });

  it('snowball: smallest balance first', () => {
    expect(snowballOrder(debts)).toEqual(['cc', 'car', 'student']);
  });

  it('leaves input unmutated', () => {
    const copy = [...debts];
    avalancheOrder(debts);
    snowballOrder(debts);
    expect(debts).toEqual(copy);
  });
});

describe('retirementProjection — compound interest', () => {
  it('zero years → 0', () => {
    const c: RetirementContribution[] = [
      { id: 'r', account: '401k', monthlyAmount: 500, employerMatchPct: 50 },
    ];
    expect(retirementProjection(c, 0)).toBe(0);
  });

  it('zero rate returns simple multiplication', () => {
    const c: RetirementContribution[] = [
      { id: 'r', account: '401k', monthlyAmount: 1000, employerMatchPct: 0 },
    ];
    expect(retirementProjection(c, 10, 0)).toBe(120_000);
  });

  it('employer match inflates effective monthly contribution', () => {
    const c: RetirementContribution[] = [
      { id: 'r', account: '401k', monthlyAmount: 1000, employerMatchPct: 50 },
    ];
    // Effective monthly = 1500 → 10 yrs @ 0% = 180k
    expect(retirementProjection(c, 10, 0)).toBe(180_000);
  });

  it('typical 7% return over 30 years is in reasonable range', () => {
    const c: RetirementContribution[] = [
      { id: 'r', account: '401k', monthlyAmount: 1000, employerMatchPct: 0 },
    ];
    const fv = retirementProjection(c, 30, 0.07);
    // Analytical FV ≈ 1.22M for €1,000/mo @ 7% for 30y
    expect(fv).toBeGreaterThan(1_100_000);
    expect(fv).toBeLessThan(1_300_000);
  });
});

describe('progressiveTax — 3-bracket Euro model', () => {
  it('zero income → zero tax', () => {
    const r = progressiveTax(0);
    expect(r.tax).toBe(0);
    expect(r.effectiveRate).toBe(0);
    expect(r.brackets).toHaveLength(0);
  });

  it('income entirely in first bracket', () => {
    const r = progressiveTax(15_000);
    expect(r.tax).toBe(3_000);
    expect(r.marginalRate).toBe(20);
    expect(r.brackets).toHaveLength(1);
  });

  it('income spans all three brackets', () => {
    const r = progressiveTax(100_000);
    // €20k * 0.20 = 4,000
    // €40k * 0.30 = 12,000
    // €40k * 0.40 = 16,000
    // total = 32,000
    expect(r.tax).toBe(32_000);
    expect(r.marginalRate).toBe(40);
    expect(r.brackets).toHaveLength(3);
    expect(r.effectiveRate).toBeCloseTo(32, 1);
  });

  it('income exactly at bracket boundary', () => {
    const r = progressiveTax(60_000);
    expect(r.tax).toBe(16_000); // 4,000 + 12,000
    expect(r.marginalRate).toBe(30);
  });
});

// ══════════════════════════════════════════════════════════════
// Store actions — vault ↔ empire cash integration
// ══════════════════════════════════════════════════════════════

describe('SavingsVault → Empire cash bridge', () => {
  it('deposit moves cash from personalBalance into vault', () => {
    useEmpireStore.setState({ personalBalance: 10_000 });
    const ok = usePersonalFinanceStore.getState().depositToVault(2_500);
    expect(ok).toBe(true);
    expect(useEmpireStore.getState().personalBalance).toBe(7_500);
    expect(usePersonalFinanceStore.getState().vaultBalance).toBe(2_500);
    expect(usePersonalFinanceStore.getState().vaultDeposits).toHaveLength(1);
  });

  it('refuses to deposit more than personalBalance', () => {
    useEmpireStore.setState({ personalBalance: 500 });
    const ok = usePersonalFinanceStore.getState().depositToVault(1_000);
    expect(ok).toBe(false);
    expect(usePersonalFinanceStore.getState().vaultBalance).toBe(0);
  });

  it('withdraw returns cash to personalBalance', () => {
    useEmpireStore.setState({ personalBalance: 10_000 });
    usePersonalFinanceStore.getState().depositToVault(3_000);
    const ok = usePersonalFinanceStore.getState().withdrawFromVault(1_000);
    expect(ok).toBe(true);
    expect(useEmpireStore.getState().personalBalance).toBe(8_000);
    expect(usePersonalFinanceStore.getState().vaultBalance).toBe(2_000);
  });
});

describe('debt repayment', () => {
  it('partial payment reduces balance, keeps debt', () => {
    useEmpireStore.setState({ personalBalance: 5_000 });
    usePersonalFinanceStore.getState().addDebt({
      label: 'CC',
      balance: 1_000,
      apr: 20,
      kind: 'credit_card',
      minimumPayment: 50,
    });
    const [debt] = usePersonalFinanceStore.getState().debts;
    const ok = usePersonalFinanceStore.getState().payDebt(debt.id, 400);
    expect(ok).toBe(true);
    expect(usePersonalFinanceStore.getState().debts[0].balance).toBe(600);
    expect(useEmpireStore.getState().personalBalance).toBe(4_600);
  });

  it('full payment removes the debt from the list', () => {
    useEmpireStore.setState({ personalBalance: 5_000 });
    usePersonalFinanceStore.getState().addDebt({
      label: 'CC',
      balance: 500,
      apr: 20,
      kind: 'credit_card',
      minimumPayment: 50,
    });
    const [debt] = usePersonalFinanceStore.getState().debts;
    usePersonalFinanceStore.getState().payDebt(debt.id, 500);
    expect(usePersonalFinanceStore.getState().debts).toHaveLength(0);
  });

  it('refuses to overpay cash', () => {
    useEmpireStore.setState({ personalBalance: 200 });
    usePersonalFinanceStore.getState().addDebt({
      label: 'CC',
      balance: 1_000,
      apr: 20,
      kind: 'credit_card',
      minimumPayment: 50,
    });
    const [debt] = usePersonalFinanceStore.getState().debts;
    const ok = usePersonalFinanceStore.getState().payDebt(debt.id, 500);
    expect(ok).toBe(false);
  });
});

describe('selectors — net worth snapshot', () => {
  it('nets vault + bank accounts against debts', () => {
    const s = usePersonalFinanceStore.getState();
    s.openBankAccount({ nickname: 'Checking', kind: 'checking', balance: 3_000, apr: 0.5 });
    s.openBankAccount({ nickname: 'HYSA', kind: 'savings', balance: 12_000, apr: 4.5 });
    useEmpireStore.setState({ personalBalance: 10_000 });
    s.depositToVault(5_000);
    s.addDebt({ label: 'CC', balance: 4_000, apr: 24, kind: 'credit_card', minimumPayment: 100 });

    const nw = usePersonalFinanceStore.getState().netWorthSnapshot();
    // assets = 3k checking + 12k HYSA + 5k vault + 5k leftover cash = 25k
    expect(nw.assets).toBe(25_000);
    expect(nw.liabilities).toBe(4_000);
    expect(nw.net).toBe(21_000);
  });
});
