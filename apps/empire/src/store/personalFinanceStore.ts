/**
 * personalFinanceStore.ts — State for the F0 Practice Hub.
 *
 * Holds the personal-finance primitives each F0 course teaches:
 *   income, expenses, savings vault, debts, bank accounts, investments,
 *   insurance, retirement, tax planning, and the scam shield log.
 *
 * Each slice is independently addressable so a Foundations panel can read
 * only what it needs without wiring to the empire mega-store.
 */

import { createPersistedStore } from './createPersistedStore';
import { eventBridge } from '../lib/eventBridge';
import { useEmpireStore } from './empireStore';

// ── Events ──────────────────────────────────────────────────────

export const PF_EVENTS = {
  INCOME_ADDED: 'pf:incomeAdded',
  EXPENSE_LOGGED: 'pf:expenseLogged',
  VAULT_DEPOSITED: 'pf:vaultDeposited',
  DEBT_PAID: 'pf:debtPaid',
  SCAM_REPORTED: 'pf:scamReported',
} as const;

// ── Types ───────────────────────────────────────────────────────

export type IncomeKind = 'salary' | 'freelance' | 'passive' | 'gift' | 'other';
export type ExpenseCategory = 'needs' | 'wants' | 'savings_debt';
export type DebtKind = 'credit_card' | 'student_loan' | 'mortgage' | 'personal_loan' | 'auto_loan';
export type InsuranceKind = 'health' | 'life' | 'liability' | 'property' | 'disability';
export type RetirementAccount = '401k' | 'ira_traditional' | 'ira_roth' | 'pension' | 'taxable_brokerage';

export interface IncomeStream {
  id: string;
  label: string;
  monthlyAmount: number;
  kind: IncomeKind;
  addedAt: number;
}

export interface ExpenseEntry {
  id: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
  loggedAt: number;
}

export interface VaultDeposit {
  id: string;
  amount: number;
  at: number;
}

export interface DebtAccount {
  id: string;
  label: string;
  balance: number;
  apr: number;
  kind: DebtKind;
  minimumPayment: number;
}

export interface BankAccount {
  id: string;
  nickname: string;
  kind: 'checking' | 'savings' | 'money_market';
  balance: number;
  apr: number;
}

export interface InsurancePolicy {
  id: string;
  kind: InsuranceKind;
  provider: string;
  monthlyPremium: number;
  coverageAmount: number;
  deductible: number;
}

export interface RetirementContribution {
  id: string;
  account: RetirementAccount;
  monthlyAmount: number;
  employerMatchPct: number;
}

export interface ScamReport {
  id: string;
  type: string;
  detail: string;
  reportedAt: number;
  resolved: boolean;
}

// ── Budget math ────────────────────────────────────────────────

/**
 * 50/30/20 rule: 50% needs, 30% wants, 20% savings/debt.
 * Returns health of the budget relative to monthly income.
 */
export function evaluateBudget(
  monthlyIncome: number,
  expenses: ExpenseEntry[],
): {
  needsPct: number;
  wantsPct: number;
  savingsDebtPct: number;
  healthy: boolean;
  guidance: string;
} {
  if (monthlyIncome <= 0) {
    return {
      needsPct: 0, wantsPct: 0, savingsDebtPct: 0, healthy: false,
      guidance: 'Add at least one income stream to see your budget mix.',
    };
  }
  const totals = { needs: 0, wants: 0, savings_debt: 0 };
  for (const e of expenses) totals[e.category] += e.amount;
  const n = (totals.needs / monthlyIncome) * 100;
  const w = (totals.wants / monthlyIncome) * 100;
  const s = (totals.savings_debt / monthlyIncome) * 100;
  const healthy = n <= 50 && w <= 30 && s >= 20;
  const guidance = healthy
    ? 'On track — your 50/30/20 split is within the recommended range.'
    : n > 50
      ? `Needs are ${n.toFixed(0)}% of income; target ≤ 50%.`
      : w > 30
        ? `Wants are ${w.toFixed(0)}% of income; target ≤ 30%.`
        : `Savings/debt is ${s.toFixed(0)}% of income; target ≥ 20%.`;
  return { needsPct: n, wantsPct: w, savingsDebtPct: s, healthy, guidance };
}

/**
 * Emergency fund target: 3-6× monthly essentials (needs + savings/debt).
 */
export function emergencyFundTarget(
  monthlyIncome: number,
  expenses: ExpenseEntry[],
  months: number = 6,
): number {
  const essentials = expenses
    .filter(e => e.category === 'needs' || e.category === 'savings_debt')
    .reduce((s, e) => s + e.amount, 0);
  // If no expenses logged yet, estimate 70% of income as essentials.
  const monthly = essentials > 0 ? essentials : monthlyIncome * 0.7;
  return Math.round(monthly * months);
}

/**
 * Avalanche debt payoff: highest APR first. Returns ordered debt ids.
 */
export function avalancheOrder(debts: DebtAccount[]): string[] {
  return [...debts].sort((a, b) => b.apr - a.apr).map(d => d.id);
}

/**
 * Snowball debt payoff: smallest balance first.
 */
export function snowballOrder(debts: DebtAccount[]): string[] {
  return [...debts].sort((a, b) => a.balance - b.balance).map(d => d.id);
}

/**
 * Simple compound-interest projection for retirement planning.
 * Returns future value assuming monthly contributions at annual rate r, for
 * years y. Employer match added on top.
 */
export function retirementProjection(
  contributions: RetirementContribution[],
  years: number,
  annualRate: number = 0.07,
): number {
  const m = contributions.reduce((sum, c) => {
    const selfPlusMatch = c.monthlyAmount * (1 + c.employerMatchPct / 100);
    return sum + selfPlusMatch;
  }, 0);
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return m * n;
  return Math.round(m * ((Math.pow(1 + r, n) - 1) / r));
}

/**
 * Progressive tax: simple 3-bracket model (for the Foundations lab).
 * 20% up to 20k, 30% 20k-60k, 40% above 60k.
 */
export function progressiveTax(annualIncome: number): {
  tax: number;
  effectiveRate: number;
  marginalRate: number;
  brackets: { range: string; taxed: number; paid: number }[];
} {
  let tax = 0;
  const brackets: { range: string; taxed: number; paid: number }[] = [];
  let marginalRate = 0;

  if (annualIncome > 0) {
    const b1 = Math.min(annualIncome, 20_000);
    tax += b1 * 0.20;
    brackets.push({ range: '€0-€20k @ 20%', taxed: b1, paid: b1 * 0.20 });
    marginalRate = 20;
  }
  if (annualIncome > 20_000) {
    const b2 = Math.min(annualIncome - 20_000, 40_000);
    tax += b2 * 0.30;
    brackets.push({ range: '€20k-€60k @ 30%', taxed: b2, paid: b2 * 0.30 });
    marginalRate = 30;
  }
  if (annualIncome > 60_000) {
    const b3 = annualIncome - 60_000;
    tax += b3 * 0.40;
    brackets.push({ range: '€60k+ @ 40%', taxed: b3, paid: b3 * 0.40 });
    marginalRate = 40;
  }

  const effective = annualIncome > 0 ? (tax / annualIncome) * 100 : 0;
  return { tax: Math.round(tax), effectiveRate: effective, marginalRate, brackets };
}

// ── State ───────────────────────────────────────────────────────

interface PersonalFinanceState {
  incomeStreams: IncomeStream[];
  expenses: ExpenseEntry[];
  vaultBalance: number;
  vaultApr: number;
  vaultDeposits: VaultDeposit[];
  debts: DebtAccount[];
  bankAccounts: BankAccount[];
  insurancePolicies: InsurancePolicy[];
  retirementContributions: RetirementContribution[];
  scamReports: ScamReport[];
  /** Last-known safe check state for consumer protection shield. */
  shieldChecksCompleted: number;

  // ── income / expense ──
  addIncome: (s: Omit<IncomeStream, 'id' | 'addedAt'>) => void;
  removeIncome: (id: string) => void;
  logExpense: (e: Omit<ExpenseEntry, 'id' | 'loggedAt'>) => void;
  removeExpense: (id: string) => void;

  // ── vault ──
  depositToVault: (amount: number) => boolean;
  withdrawFromVault: (amount: number) => boolean;

  // ── debt ──
  addDebt: (d: Omit<DebtAccount, 'id'>) => void;
  payDebt: (id: string, amount: number) => boolean;

  // ── banks ──
  openBankAccount: (b: Omit<BankAccount, 'id'>) => void;
  closeBankAccount: (id: string) => void;

  // ── insurance ──
  buyInsurance: (p: Omit<InsurancePolicy, 'id'>) => void;
  cancelInsurance: (id: string) => void;

  // ── retirement ──
  setRetirementContribution: (c: Omit<RetirementContribution, 'id'>) => void;
  removeRetirementContribution: (id: string) => void;

  // ── scam shield ──
  reportScam: (type: string, detail: string) => void;
  resolveScam: (id: string) => void;
  logShieldCheck: () => void;

  // ── selectors ──
  totalMonthlyIncome: () => number;
  totalMonthlyExpenses: () => number;
  totalDebt: () => number;
  totalInsurancePremium: () => number;
  netWorthSnapshot: () => { assets: number; liabilities: number; net: number };

  // ── reset ──
  resetPersonalFinance: () => void;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const usePersonalFinanceStore = createPersistedStore<PersonalFinanceState>(
  'personal-finance',
  (set, get) => ({
    incomeStreams: [],
    expenses: [],
    vaultBalance: 0,
    vaultApr: 4.0,
    vaultDeposits: [],
    debts: [],
    bankAccounts: [],
    insurancePolicies: [],
    retirementContributions: [],
    scamReports: [],
    shieldChecksCompleted: 0,

    addIncome: (s) => {
      const entry: IncomeStream = { ...s, id: uid('inc'), addedAt: Date.now() };
      set(state => ({ incomeStreams: [...state.incomeStreams, entry] }));
      eventBridge.emit(PF_EVENTS.INCOME_ADDED, entry);
    },
    removeIncome: (id) => {
      set(state => ({ incomeStreams: state.incomeStreams.filter(i => i.id !== id) }));
    },

    logExpense: (e) => {
      const entry: ExpenseEntry = { ...e, id: uid('exp'), loggedAt: Date.now() };
      set(state => ({ expenses: [...state.expenses, entry] }));
      eventBridge.emit(PF_EVENTS.EXPENSE_LOGGED, entry);
    },
    removeExpense: (id) => {
      set(state => ({ expenses: state.expenses.filter(e => e.id !== id) }));
    },

    depositToVault: (amount) => {
      if (amount <= 0) return false;
      const empire = useEmpireStore.getState();
      if ((empire.personalBalance ?? 0) < amount) return false;
      useEmpireStore.setState(s => ({ personalBalance: (s.personalBalance ?? 0) - amount }));
      const dep: VaultDeposit = { id: uid('dep'), amount, at: Date.now() };
      set(state => ({
        vaultBalance: state.vaultBalance + amount,
        vaultDeposits: [...state.vaultDeposits, dep],
      }));
      eventBridge.emit(PF_EVENTS.VAULT_DEPOSITED, dep);
      return true;
    },
    withdrawFromVault: (amount) => {
      if (amount <= 0) return false;
      const state = get();
      if (state.vaultBalance < amount) return false;
      useEmpireStore.setState(s => ({ personalBalance: (s.personalBalance ?? 0) + amount }));
      set({ vaultBalance: state.vaultBalance - amount });
      return true;
    },

    addDebt: (d) => {
      const entry: DebtAccount = { ...d, id: uid('debt') };
      set(state => ({ debts: [...state.debts, entry] }));
    },
    payDebt: (id, amount) => {
      if (amount <= 0) return false;
      const state = get();
      const debt = state.debts.find(d => d.id === id);
      if (!debt) return false;
      const empire = useEmpireStore.getState();
      const pay = Math.min(amount, debt.balance);
      if ((empire.personalBalance ?? 0) < pay) return false;
      useEmpireStore.setState(s => ({ personalBalance: (s.personalBalance ?? 0) - pay }));
      set({
        debts: state.debts
          .map(d => d.id === id ? { ...d, balance: d.balance - pay } : d)
          .filter(d => d.balance > 0.01),
      });
      eventBridge.emit(PF_EVENTS.DEBT_PAID, { id, amount: pay });
      return true;
    },

    openBankAccount: (b) => {
      const entry: BankAccount = { ...b, id: uid('bank') };
      set(state => ({ bankAccounts: [...state.bankAccounts, entry] }));
    },
    closeBankAccount: (id) => {
      set(state => ({ bankAccounts: state.bankAccounts.filter(a => a.id !== id) }));
    },

    buyInsurance: (p) => {
      const entry: InsurancePolicy = { ...p, id: uid('ins') };
      set(state => ({ insurancePolicies: [...state.insurancePolicies, entry] }));
    },
    cancelInsurance: (id) => {
      set(state => ({ insurancePolicies: state.insurancePolicies.filter(p => p.id !== id) }));
    },

    setRetirementContribution: (c) => {
      const entry: RetirementContribution = { ...c, id: uid('ret') };
      set(state => ({ retirementContributions: [...state.retirementContributions, entry] }));
    },
    removeRetirementContribution: (id) => {
      set(state => ({ retirementContributions: state.retirementContributions.filter(c => c.id !== id) }));
    },

    reportScam: (type, detail) => {
      const entry: ScamReport = {
        id: uid('scam'),
        type,
        detail,
        reportedAt: Date.now(),
        resolved: false,
      };
      set(state => ({ scamReports: [...state.scamReports, entry] }));
      eventBridge.emit(PF_EVENTS.SCAM_REPORTED, entry);
    },
    resolveScam: (id) => {
      set(state => ({
        scamReports: state.scamReports.map(s => s.id === id ? { ...s, resolved: true } : s),
      }));
    },
    logShieldCheck: () => {
      set(state => ({ shieldChecksCompleted: state.shieldChecksCompleted + 1 }));
    },

    totalMonthlyIncome: () => get().incomeStreams.reduce((s, i) => s + i.monthlyAmount, 0),
    totalMonthlyExpenses: () => get().expenses.reduce((s, e) => s + e.amount, 0),
    totalDebt: () => get().debts.reduce((s, d) => s + d.balance, 0),
    totalInsurancePremium: () => get().insurancePolicies.reduce((s, p) => s + p.monthlyPremium, 0),

    netWorthSnapshot: () => {
      const s = get();
      const assets =
        s.vaultBalance +
        s.bankAccounts.reduce((sum, a) => sum + a.balance, 0) +
        (useEmpireStore.getState().personalBalance ?? 0);
      const liabilities = s.debts.reduce((sum, d) => sum + d.balance, 0);
      return { assets, liabilities, net: assets - liabilities };
    },

    resetPersonalFinance: () => {
      set({
        incomeStreams: [],
        expenses: [],
        vaultBalance: 0,
        vaultApr: 4.0,
        vaultDeposits: [],
        debts: [],
        bankAccounts: [],
        insurancePolicies: [],
        retirementContributions: [],
        scamReports: [],
        shieldChecksCompleted: 0,
      });
    },
  }),
);
