/**
 * panels.jsx — The 10 F0 Foundations gameplay panels.
 *
 * Each panel is a focused, interactive mini-lab for the concept its gating
 * F0 course teaches. Each panel is wrapped by FeatureGate so the teaser
 * renders when the course hasn't been passed yet.
 *
 * Design principles:
 *  - Narrow scope: each panel demonstrates ONE idea the course covered.
 *  - Real state: every action writes to personalFinanceStore (persisted).
 *  - Instant feedback: calculations render inline, no separate "calculate".
 *  - Consistent styling: card-glass panel, mono headers, muted helper copy.
 */

import React, { useState } from 'react';
import FeatureGate from '../curriculum/FeatureGate';
import {
  usePersonalFinanceStore,
  evaluateBudget,
  emergencyFundTarget,
  avalancheOrder,
  retirementProjection,
  progressiveTax,
} from '../../store/personalFinanceStore';
import { useEmpireStore } from '../../store/empireStore';

const cardClass =
  'p-5 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-4';
const sectionTitle =
  'text-sm font-mono font-bold text-tactical-text tracking-wide';
const labelClass =
  'text-[10px] font-mono uppercase tracking-widest text-tactical-text/50';
const inputClass =
  'px-3 py-2 rounded bg-black/30 border border-white/[0.1] text-tactical-text text-sm font-mono focus:outline-none focus:border-[#00e5ff]/40';
const buttonClass =
  'px-3 py-2 rounded bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] text-xs font-mono font-bold hover:bg-[#00e5ff]/20 transition';
const dangerButton =
  'px-2 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-mono hover:bg-rose-500/20 transition';

const fmtCurrency = (n) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

// ═══════════════════════════════════════════════════════════════════
// 1. Income Tracker  — f0-money-earning → incomeTracker
// ═══════════════════════════════════════════════════════════════════

export function IncomeTrackerPanel() {
  const streams = usePersonalFinanceStore(s => s.incomeStreams);
  const addIncome = usePersonalFinanceStore(s => s.addIncome);
  const removeIncome = usePersonalFinanceStore(s => s.removeIncome);
  const total = usePersonalFinanceStore(s => s.totalMonthlyIncome());

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState('salary');

  const submit = () => {
    const n = parseFloat(amount);
    if (!label.trim() || !Number.isFinite(n) || n <= 0) return;
    addIncome({ label: label.trim(), monthlyAmount: n, kind });
    setLabel('');
    setAmount('');
  };

  return (
    <FeatureGate feature="incomeTracker">
      <div className={cardClass}>
        <div className="flex items-baseline justify-between">
          <h3 className={sectionTitle}>Income Tracker</h3>
          <div className="text-lg font-mono font-bold text-emerald-400">
            {fmtCurrency(total)}<span className="text-[10px] text-tactical-text/40">/mo</span>
          </div>
        </div>
        <p className="text-[11px] font-mono text-tactical-text/50">
          Log every recurring income stream. Passive and earned income both count — the mix is what matters.
        </p>

        <div className="grid grid-cols-12 gap-2">
          <input className={inputClass + ' col-span-5'} placeholder="Source (e.g. Day job)"
            value={label} onChange={e => setLabel(e.target.value)} />
          <input className={inputClass + ' col-span-3'} placeholder="€/month" type="number"
            value={amount} onChange={e => setAmount(e.target.value)} />
          <select className={inputClass + ' col-span-3'} value={kind} onChange={e => setKind(e.target.value)}>
            <option value="salary">Salary</option>
            <option value="freelance">Freelance</option>
            <option value="passive">Passive</option>
            <option value="gift">Gift</option>
            <option value="other">Other</option>
          </select>
          <button className={buttonClass + ' col-span-1'} onClick={submit}>+</button>
        </div>

        {streams.length === 0 ? (
          <div className="text-[11px] font-mono text-tactical-text/30 italic">No streams yet.</div>
        ) : (
          <div className="space-y-1">
            {streams.map(s => (
              <div key={s.id} className="flex justify-between items-center px-3 py-2 bg-black/20 rounded text-xs font-mono">
                <div>
                  <span className="text-tactical-text">{s.label}</span>
                  <span className="ml-2 text-[9px] uppercase text-tactical-text/40">{s.kind}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">{fmtCurrency(s.monthlyAmount)}</span>
                  <button className={dangerButton} onClick={() => removeIncome(s.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FeatureGate>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. Expense / 50-30-20 Budget — f0-spending-budgeting → expenseCategorizer
// ═══════════════════════════════════════════════════════════════════

export function BudgetPanel() {
  const expenses = usePersonalFinanceStore(s => s.expenses);
  const logExpense = usePersonalFinanceStore(s => s.logExpense);
  const removeExpense = usePersonalFinanceStore(s => s.removeExpense);
  const monthlyIncome = usePersonalFinanceStore(s => s.totalMonthlyIncome());

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('needs');

  const budget = evaluateBudget(monthlyIncome, expenses);

  const submit = () => {
    const n = parseFloat(amount);
    if (!label.trim() || !Number.isFinite(n) || n <= 0) return;
    logExpense({ label: label.trim(), amount: n, category });
    setLabel('');
    setAmount('');
  };

  const bar = (pct, color) => (
    <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );

  return (
    <FeatureGate feature="expenseCategorizer">
      <div className={cardClass}>
        <h3 className={sectionTitle}>Budget — 50/30/20</h3>
        <p className="text-[11px] font-mono text-tactical-text/50">
          Needs ≤ 50% · Wants ≤ 30% · Savings/Debt ≥ 20%.
        </p>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-tactical-text/60">NEEDS ({budget.needsPct.toFixed(0)}%)</span>
              <span className="text-tactical-text/40">target ≤ 50%</span>
            </div>
            {bar(budget.needsPct * 2, budget.needsPct <= 50 ? '#34d399' : '#f87171')}
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-tactical-text/60">WANTS ({budget.wantsPct.toFixed(0)}%)</span>
              <span className="text-tactical-text/40">target ≤ 30%</span>
            </div>
            {bar((budget.wantsPct / 30) * 100, budget.wantsPct <= 30 ? '#34d399' : '#fbbf24')}
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-tactical-text/60">SAVINGS/DEBT ({budget.savingsDebtPct.toFixed(0)}%)</span>
              <span className="text-tactical-text/40">target ≥ 20%</span>
            </div>
            {bar((budget.savingsDebtPct / 20) * 100, budget.savingsDebtPct >= 20 ? '#34d399' : '#fbbf24')}
          </div>
        </div>

        <div className={`text-[11px] font-mono ${budget.healthy ? 'text-emerald-400' : 'text-amber-400'}`}>
          {budget.guidance}
        </div>

        <div className="grid grid-cols-12 gap-2">
          <input className={inputClass + ' col-span-5'} placeholder="Expense (e.g. Rent)"
            value={label} onChange={e => setLabel(e.target.value)} />
          <input className={inputClass + ' col-span-3'} placeholder="€/month" type="number"
            value={amount} onChange={e => setAmount(e.target.value)} />
          <select className={inputClass + ' col-span-3'} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="needs">Needs</option>
            <option value="wants">Wants</option>
            <option value="savings_debt">Savings/Debt</option>
          </select>
          <button className={buttonClass + ' col-span-1'} onClick={submit}>+</button>
        </div>

        {expenses.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {expenses.map(e => (
              <div key={e.id} className="flex justify-between items-center px-3 py-1.5 bg-black/20 rounded text-xs font-mono">
                <div>
                  <span className="text-tactical-text">{e.label}</span>
                  <span className="ml-2 text-[9px] uppercase text-tactical-text/40">{e.category.replace('_', '/')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-rose-400">{fmtCurrency(e.amount)}</span>
                  <button className={dangerButton} onClick={() => removeExpense(e.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FeatureGate>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3. Savings Vault — f0-saving-emergency → savingsVault
// ═══════════════════════════════════════════════════════════════════

export function SavingsVaultPanel() {
  const vaultBalance = usePersonalFinanceStore(s => s.vaultBalance);
  const vaultApr = usePersonalFinanceStore(s => s.vaultApr);
  const deposit = usePersonalFinanceStore(s => s.depositToVault);
  const withdraw = usePersonalFinanceStore(s => s.withdrawFromVault);
  const monthlyIncome = usePersonalFinanceStore(s => s.totalMonthlyIncome());
  const expenses = usePersonalFinanceStore(s => s.expenses);
  const personalBalance = useEmpireStore(s => s.personalBalance ?? 0);

  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');

  const target = emergencyFundTarget(monthlyIncome, expenses, 6);
  const pct = target > 0 ? Math.min(100, (vaultBalance / target) * 100) : 0;

  const handle = (action) => () => {
    setErr('');
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) { setErr('Enter a positive amount.'); return; }
    const ok = action(n);
    if (!ok) { setErr('Insufficient balance.'); return; }
    setAmount('');
  };

  return (
    <FeatureGate feature="savingsVault">
      <div className={cardClass}>
        <h3 className={sectionTitle}>Savings Vault · {vaultApr.toFixed(1)}% APR</h3>
        <p className="text-[11px] font-mono text-tactical-text/50">
          Target: 3-6 months of essential expenses. Available to withdraw instantly.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-black/20 rounded">
            <div className={labelClass}>Vault Balance</div>
            <div className="text-xl font-mono font-bold text-emerald-400">{fmtCurrency(vaultBalance)}</div>
          </div>
          <div className="p-3 bg-black/20 rounded">
            <div className={labelClass}>Emergency Target (6mo)</div>
            <div className="text-xl font-mono font-bold text-tactical-text/80">{fmtCurrency(target)}</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[10px] font-mono mb-1">
            <span className="text-tactical-text/60">PROGRESS</span>
            <span className="text-tactical-text/40">{pct.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
            <div className="h-full rounded-full"
              style={{ width: `${pct}%`, background: pct >= 100 ? '#34d399' : '#00e5ff' }} />
          </div>
        </div>

        <div className="flex gap-2">
          <input className={inputClass + ' flex-1'} placeholder="Amount"
            type="number" value={amount} onChange={e => setAmount(e.target.value)} />
          <button className={buttonClass} onClick={handle(deposit)}>Deposit</button>
          <button className={buttonClass} onClick={handle(withdraw)}>Withdraw</button>
        </div>
        {err && <div className="text-[11px] font-mono text-rose-400">{err}</div>}
        <div className="text-[10px] font-mono text-tactical-text/40">
          Personal wallet available: {fmtCurrency(personalBalance)}
        </div>
      </div>
    </FeatureGate>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 4. Credit / Debts — f0-debt-credit → creditBonds
// ═══════════════════════════════════════════════════════════════════

export function CreditDebtPanel() {
  const debts = usePersonalFinanceStore(s => s.debts);
  const addDebt = usePersonalFinanceStore(s => s.addDebt);
  const payDebt = usePersonalFinanceStore(s => s.payDebt);
  const totalDebt = usePersonalFinanceStore(s => s.totalDebt());

  const [label, setLabel] = useState('');
  const [balance, setBalance] = useState('');
  const [apr, setApr] = useState('');
  const [kind, setKind] = useState('credit_card');
  const [payAmount, setPayAmount] = useState({});
  const [err, setErr] = useState('');

  const submit = () => {
    const b = parseFloat(balance);
    const a = parseFloat(apr);
    if (!label.trim() || !Number.isFinite(b) || b <= 0 || !Number.isFinite(a) || a < 0) return;
    addDebt({
      label: label.trim(),
      balance: b,
      apr: a,
      kind,
      minimumPayment: Math.max(25, b * 0.02),
    });
    setLabel(''); setBalance(''); setApr('');
  };

  const avalancheIds = avalancheOrder(debts);
  const nextToKill = avalancheIds[0];

  const pay = (id) => {
    setErr('');
    const n = parseFloat(payAmount[id] || '0');
    if (!Number.isFinite(n) || n <= 0) { setErr('Enter a positive amount.'); return; }
    const ok = payDebt(id, n);
    if (!ok) { setErr('Insufficient wallet balance.'); return; }
    setPayAmount({ ...payAmount, [id]: '' });
  };

  return (
    <FeatureGate feature="creditBonds">
      <div className={cardClass}>
        <div className="flex items-baseline justify-between">
          <h3 className={sectionTitle}>Credit Lines & Debts</h3>
          <div className="text-lg font-mono font-bold text-rose-400">-{fmtCurrency(totalDebt)}</div>
        </div>
        <p className="text-[11px] font-mono text-tactical-text/50">
          Avalanche: highest APR first — mathematically optimal. Snowball: smallest balance first — behaviourally sticky.
        </p>

        <div className="grid grid-cols-12 gap-2">
          <input className={inputClass + ' col-span-4'} placeholder="Name (e.g. Visa Card)"
            value={label} onChange={e => setLabel(e.target.value)} />
          <input className={inputClass + ' col-span-3'} placeholder="Balance €" type="number"
            value={balance} onChange={e => setBalance(e.target.value)} />
          <input className={inputClass + ' col-span-2'} placeholder="APR %" type="number"
            value={apr} onChange={e => setApr(e.target.value)} />
          <select className={inputClass + ' col-span-2'} value={kind} onChange={e => setKind(e.target.value)}>
            <option value="credit_card">Credit Card</option>
            <option value="student_loan">Student</option>
            <option value="mortgage">Mortgage</option>
            <option value="personal_loan">Personal</option>
            <option value="auto_loan">Auto</option>
          </select>
          <button className={buttonClass + ' col-span-1'} onClick={submit}>+</button>
        </div>

        {debts.length === 0 ? (
          <div className="text-[11px] font-mono text-tactical-text/30 italic">Debt-free. 🎉</div>
        ) : (
          <div className="space-y-2">
            {debts.map(d => (
              <div key={d.id} className={`px-3 py-2 bg-black/20 rounded text-xs font-mono ${d.id === nextToKill ? 'border border-amber-400/30' : ''}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-tactical-text font-bold">{d.label}</span>
                    <span className="ml-2 text-[9px] uppercase text-tactical-text/40">{d.kind.replace('_', ' ')}</span>
                    {d.id === nextToKill && (
                      <span className="ml-2 text-[9px] text-amber-400">AVALANCHE TARGET</span>
                    )}
                  </div>
                  <div className="text-rose-400">{fmtCurrency(d.balance)}</div>
                </div>
                <div className="text-[10px] text-tactical-text/50 mt-1">
                  {d.apr.toFixed(2)}% APR · min. {fmtCurrency(d.minimumPayment)}
                </div>
                <div className="flex gap-2 mt-2">
                  <input className={inputClass + ' flex-1 text-xs py-1'} placeholder="Pay €" type="number"
                    value={payAmount[d.id] || ''} onChange={e => setPayAmount({ ...payAmount, [d.id]: e.target.value })} />
                  <button className={buttonClass + ' text-[10px]'} onClick={() => pay(d.id)}>Pay</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {err && <div className="text-[11px] font-mono text-rose-400">{err}</div>}
      </div>
    </FeatureGate>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 5. Bank Accounts — f0-banking-payments → bankAccounts
// ═══════════════════════════════════════════════════════════════════

export function BankAccountsPanel() {
  const accounts = usePersonalFinanceStore(s => s.bankAccounts);
  const open = usePersonalFinanceStore(s => s.openBankAccount);
  const close = usePersonalFinanceStore(s => s.closeBankAccount);

  const [nickname, setNickname] = useState('');
  const [kind, setKind] = useState('checking');
  const [balance, setBalance] = useState('');
  const [apr, setApr] = useState('');

  const submit = () => {
    const b = parseFloat(balance);
    const a = parseFloat(apr);
    if (!nickname.trim() || !Number.isFinite(b) || b < 0) return;
    open({
      nickname: nickname.trim(),
      kind,
      balance: b,
      apr: Number.isFinite(a) ? a : 0,
    });
    setNickname(''); setBalance(''); setApr('');
  };

  return (
    <FeatureGate feature="bankAccounts">
      <div className={cardClass}>
        <h3 className={sectionTitle}>Bank Accounts</h3>
        <p className="text-[11px] font-mono text-tactical-text/50">
          Diversify across checking, savings, and money-market accounts. Under FSCS/DGS, up to €100k per institution is protected.
        </p>

        <div className="grid grid-cols-12 gap-2">
          <input className={inputClass + ' col-span-4'} placeholder="Nickname (e.g. Revolut)"
            value={nickname} onChange={e => setNickname(e.target.value)} />
          <select className={inputClass + ' col-span-3'} value={kind} onChange={e => setKind(e.target.value)}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="money_market">Money Market</option>
          </select>
          <input className={inputClass + ' col-span-2'} placeholder="Balance" type="number"
            value={balance} onChange={e => setBalance(e.target.value)} />
          <input className={inputClass + ' col-span-2'} placeholder="APR %" type="number"
            value={apr} onChange={e => setApr(e.target.value)} />
          <button className={buttonClass + ' col-span-1'} onClick={submit}>+</button>
        </div>

        {accounts.length === 0 ? (
          <div className="text-[11px] font-mono text-tactical-text/30 italic">No accounts yet.</div>
        ) : (
          <div className="space-y-1">
            {accounts.map(a => (
              <div key={a.id} className="flex justify-between items-center px-3 py-2 bg-black/20 rounded text-xs font-mono">
                <div>
                  <span className="text-tactical-text">{a.nickname}</span>
                  <span className="ml-2 text-[9px] uppercase text-tactical-text/40">{a.kind.replace('_', ' ')} · {a.apr.toFixed(1)}% APR</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">{fmtCurrency(a.balance)}</span>
                  <button className={dangerButton} onClick={() => close(a.id)}>close</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FeatureGate>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 6. Market Access — f0-markets-investing → markets
// ═══════════════════════════════════════════════════════════════════

export function MarketAccessPanel() {
  return (
    <FeatureGate feature="markets">
      <div className={cardClass}>
        <h3 className={sectionTitle}>Market Access · Unlocked</h3>
        <p className="text-[11px] font-mono text-tactical-text/60">
          Equities, ETFs, bonds, and fund access is now live on the Desk.
          Remember: index funds over stock-picking for most retail investors.
        </p>
        <div className="p-3 bg-[#00e5ff]/5 border border-[#00e5ff]/20 rounded text-[11px] font-mono text-tactical-text/70 space-y-1">
          <div>• Dollar-cost average monthly, not in lump sums.</div>
          <div>• Rebalance annually or on ±5% drift bands.</div>
          <div>• Expense ratios under 0.3% are a hard rule for passive funds.</div>
          <div>• Never chase performance — last year's winner rarely repeats.</div>
        </div>
        <a href="#desk" className={buttonClass + ' inline-block'}>Open Desk →</a>
      </div>
    </FeatureGate>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 7. Insurance — f0-insurance-risk → insurance
// ═══════════════════════════════════════════════════════════════════

export function InsurancePanel() {
  const policies = usePersonalFinanceStore(s => s.insurancePolicies);
  const buy = usePersonalFinanceStore(s => s.buyInsurance);
  const cancel = usePersonalFinanceStore(s => s.cancelInsurance);
  const total = usePersonalFinanceStore(s => s.totalInsurancePremium());

  const [kind, setKind] = useState('health');
  const [provider, setProvider] = useState('');
  const [premium, setPremium] = useState('');
  const [coverage, setCoverage] = useState('');
  const [deductible, setDeductible] = useState('');

  const submit = () => {
    const p = parseFloat(premium);
    const c = parseFloat(coverage);
    const d = parseFloat(deductible);
    if (!provider.trim() || !Number.isFinite(p) || p <= 0) return;
    buy({
      kind,
      provider: provider.trim(),
      monthlyPremium: p,
      coverageAmount: Number.isFinite(c) ? c : 0,
      deductible: Number.isFinite(d) ? d : 0,
    });
    setProvider(''); setPremium(''); setCoverage(''); setDeductible('');
  };

  return (
    <FeatureGate feature="insurance">
      <div className={cardClass}>
        <div className="flex items-baseline justify-between">
          <h3 className={sectionTitle}>Insurance Coverage</h3>
          <div className="text-lg font-mono font-bold text-amber-400">{fmtCurrency(total)}<span className="text-[10px] text-tactical-text/40">/mo</span></div>
        </div>
        <p className="text-[11px] font-mono text-tactical-text/50">
          Insurance transfers catastrophic risk. Buy for events that would bankrupt you — not for things you can absorb.
        </p>

        <div className="grid grid-cols-12 gap-2">
          <select className={inputClass + ' col-span-2'} value={kind} onChange={e => setKind(e.target.value)}>
            <option value="health">Health</option>
            <option value="life">Life</option>
            <option value="liability">Liability</option>
            <option value="property">Property</option>
            <option value="disability">Disability</option>
          </select>
          <input className={inputClass + ' col-span-3'} placeholder="Provider"
            value={provider} onChange={e => setProvider(e.target.value)} />
          <input className={inputClass + ' col-span-2'} placeholder="€/month" type="number"
            value={premium} onChange={e => setPremium(e.target.value)} />
          <input className={inputClass + ' col-span-2'} placeholder="Coverage €" type="number"
            value={coverage} onChange={e => setCoverage(e.target.value)} />
          <input className={inputClass + ' col-span-2'} placeholder="Deductible €" type="number"
            value={deductible} onChange={e => setDeductible(e.target.value)} />
          <button className={buttonClass + ' col-span-1'} onClick={submit}>+</button>
        </div>

        {policies.length === 0 ? (
          <div className="text-[11px] font-mono text-tactical-text/30 italic">No coverage yet — you&apos;re uninsured.</div>
        ) : (
          <div className="space-y-1">
            {policies.map(p => (
              <div key={p.id} className="flex justify-between items-center px-3 py-2 bg-black/20 rounded text-xs font-mono">
                <div>
                  <span className="text-tactical-text">{p.provider}</span>
                  <span className="ml-2 text-[9px] uppercase text-tactical-text/40">{p.kind} · covers {fmtCurrency(p.coverageAmount)} · ded {fmtCurrency(p.deductible)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">{fmtCurrency(p.monthlyPremium)}/mo</span>
                  <button className={dangerButton} onClick={() => cancel(p.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FeatureGate>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 8. Retirement — f0-retirement-longterm → retirement
// ═══════════════════════════════════════════════════════════════════

export function RetirementPanel() {
  const contribs = usePersonalFinanceStore(s => s.retirementContributions);
  const addContrib = usePersonalFinanceStore(s => s.setRetirementContribution);
  const rem = usePersonalFinanceStore(s => s.removeRetirementContribution);

  const [account, setAccount] = useState('401k');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [match, setMatch] = useState('');
  const [years, setYears] = useState(30);
  const [rate, setRate] = useState(7);

  const submit = () => {
    const m = parseFloat(monthlyAmount);
    const em = parseFloat(match);
    if (!Number.isFinite(m) || m <= 0) return;
    addContrib({
      account,
      monthlyAmount: m,
      employerMatchPct: Number.isFinite(em) ? em : 0,
    });
    setMonthlyAmount(''); setMatch('');
  };

  const fv = retirementProjection(contribs, years, rate / 100);
  const totalMonthly = contribs.reduce((s, c) => s + c.monthlyAmount * (1 + c.employerMatchPct / 100), 0);

  return (
    <FeatureGate feature="retirement">
      <div className={cardClass}>
        <h3 className={sectionTitle}>Retirement Plan</h3>
        <p className="text-[11px] font-mono text-tactical-text/50">
          Compound interest is an exponential force. Every decade of delay roughly halves your retirement balance.
        </p>

        <div className="grid grid-cols-12 gap-2">
          <select className={inputClass + ' col-span-3'} value={account} onChange={e => setAccount(e.target.value)}>
            <option value="401k">401(k)</option>
            <option value="ira_traditional">Traditional IRA</option>
            <option value="ira_roth">Roth IRA</option>
            <option value="pension">Pension</option>
            <option value="taxable_brokerage">Taxable Brokerage</option>
          </select>
          <input className={inputClass + ' col-span-3'} placeholder="€/month" type="number"
            value={monthlyAmount} onChange={e => setMonthlyAmount(e.target.value)} />
          <input className={inputClass + ' col-span-3'} placeholder="Employer match %" type="number"
            value={match} onChange={e => setMatch(e.target.value)} />
          <button className={buttonClass + ' col-span-3'} onClick={submit}>Add Contribution</button>
        </div>

        <div className="grid grid-cols-2 gap-4 p-3 bg-black/20 rounded">
          <div>
            <div className={labelClass}>Years to retire</div>
            <input className={inputClass + ' w-full mt-1'} type="number"
              value={years} onChange={e => setYears(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <div className={labelClass}>Expected annual return %</div>
            <input className={inputClass + ' w-full mt-1'} type="number"
              value={rate} onChange={e => setRate(parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded">
          <div className={labelClass}>Projected at retirement</div>
          <div className="text-2xl font-mono font-bold text-emerald-400">{fmtCurrency(fv)}</div>
          <div className="text-[10px] font-mono text-tactical-text/50 mt-1">
            Contributing {fmtCurrency(totalMonthly)}/mo (incl. employer match) for {years} years at {rate}%.
          </div>
        </div>

        {contribs.length > 0 && (
          <div className="space-y-1">
            {contribs.map(c => (
              <div key={c.id} className="flex justify-between items-center px-3 py-1.5 bg-black/20 rounded text-xs font-mono">
                <div>
                  <span className="text-tactical-text">{c.account.replace('_', ' ').toUpperCase()}</span>
                  <span className="ml-2 text-[9px] uppercase text-tactical-text/40">match {c.employerMatchPct}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">{fmtCurrency(c.monthlyAmount)}/mo</span>
                  <button className={dangerButton} onClick={() => rem(c.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FeatureGate>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 9. Tax Optimizer — f0-taxes-govt → taxOptimizer
// ═══════════════════════════════════════════════════════════════════

export function TaxOptimizerPanel() {
  const monthlyIncome = usePersonalFinanceStore(s => s.totalMonthlyIncome());
  const [annualIncome, setAnnualIncome] = useState('');
  const [deductions, setDeductions] = useState('');

  const income = annualIncome !== '' ? parseFloat(annualIncome) : monthlyIncome * 12;
  const ded = parseFloat(deductions) || 0;
  const taxable = Math.max(0, income - ded);
  const result = progressiveTax(taxable);

  return (
    <FeatureGate feature="taxOptimizer">
      <div className={cardClass}>
        <h3 className={sectionTitle}>Tax Optimizer</h3>
        <p className="text-[11px] font-mono text-tactical-text/50">
          Progressive brackets: 20% up to €20k, 30% to €60k, 40% above. Every deductible euro saves your marginal rate, not your average.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={labelClass}>Annual Income</div>
            <input className={inputClass + ' w-full mt-1'} type="number"
              placeholder={String(Math.round(monthlyIncome * 12))}
              value={annualIncome} onChange={e => setAnnualIncome(e.target.value)} />
          </div>
          <div>
            <div className={labelClass}>Deductions</div>
            <input className={inputClass + ' w-full mt-1'} type="number" placeholder="0"
              value={deductions} onChange={e => setDeductions(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-black/20 rounded">
            <div className={labelClass}>Tax Owed</div>
            <div className="text-lg font-mono font-bold text-rose-400">{fmtCurrency(result.tax)}</div>
          </div>
          <div className="p-3 bg-black/20 rounded">
            <div className={labelClass}>Effective Rate</div>
            <div className="text-lg font-mono font-bold text-amber-400">{result.effectiveRate.toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-black/20 rounded">
            <div className={labelClass}>Marginal Rate</div>
            <div className="text-lg font-mono font-bold text-tactical-text/80">{result.marginalRate}%</div>
          </div>
        </div>

        {result.brackets.length > 0 && (
          <div className="space-y-1 text-[11px] font-mono">
            {result.brackets.map((b, i) => (
              <div key={i} className="flex justify-between px-3 py-1.5 bg-black/20 rounded">
                <span className="text-tactical-text/70">{b.range}</span>
                <span>
                  <span className="text-tactical-text/40">{fmtCurrency(b.taxed)} → </span>
                  <span className="text-rose-400">{fmtCurrency(b.paid)}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded text-[11px] font-mono text-tactical-text/70">
          💡 Loss-harvesting, retirement contributions, and charitable gifts shift income across brackets.
          Save at your marginal rate — €1,000 deduction at 40% saves €400.
        </div>
      </div>
    </FeatureGate>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 10. Consumer Protection Shield — f0-scams-protection → consumerProtection
// ═══════════════════════════════════════════════════════════════════

const SCAM_TYPES = [
  'Phishing email',
  'Crypto "guaranteed returns"',
  'Romance / investment romance',
  'Fake tech support',
  'Spoofed bank call',
  'Fake government / tax agency',
  'Pig-butchering',
  'Advance-fee fraud',
  'Other',
];

const CHECKLIST = [
  { key: 'url', label: 'Verify URL (lock icon, exact spelling)' },
  { key: 'contact', label: 'Caller/sender is an independently known number/email' },
  { key: 'pressure', label: 'No urgency or threat used to force action' },
  { key: 'payment', label: 'No request for gift cards, wire, or crypto' },
  { key: 'returns', label: 'No "guaranteed" returns above 10-15% annualised' },
  { key: 'personal', label: 'No request for password, 2FA code, or SSN' },
];

export function ScamShieldPanel() {
  const reports = usePersonalFinanceStore(s => s.scamReports);
  const report = usePersonalFinanceStore(s => s.reportScam);
  const resolve = usePersonalFinanceStore(s => s.resolveScam);
  const logShieldCheck = usePersonalFinanceStore(s => s.logShieldCheck);
  const checks = usePersonalFinanceStore(s => s.shieldChecksCompleted);

  const [type, setType] = useState(SCAM_TYPES[0]);
  const [detail, setDetail] = useState('');
  const [answers, setAnswers] = useState({});

  const allChecked = CHECKLIST.every(c => answers[c.key]);

  const submit = () => {
    if (!detail.trim()) return;
    report(type, detail.trim());
    setDetail('');
  };

  const runSafetyCheck = () => {
    if (!allChecked) return;
    logShieldCheck();
    setAnswers({});
  };

  return (
    <FeatureGate feature="consumerProtection">
      <div className={cardClass}>
        <h3 className={sectionTitle}>Consumer Protection Shield</h3>
        <p className="text-[11px] font-mono text-tactical-text/50">
          Run the 6-point safety check before any unfamiliar payment. You&apos;ve completed {checks} safety checks.
        </p>

        <div className="p-3 bg-black/20 rounded space-y-2">
          <div className={labelClass}>6-Point Safety Check</div>
          {CHECKLIST.map(c => (
            <label key={c.key} className="flex items-center gap-2 text-xs font-mono text-tactical-text/80 cursor-pointer">
              <input
                type="checkbox"
                checked={!!answers[c.key]}
                onChange={e => setAnswers({ ...answers, [c.key]: e.target.checked })}
              />
              {c.label}
            </label>
          ))}
          <button
            className={buttonClass + (allChecked ? '' : ' opacity-40 cursor-not-allowed')}
            disabled={!allChecked}
            onClick={runSafetyCheck}
          >
            {allChecked ? '✓ Proceed safely' : 'Complete all 6 checks first'}
          </button>
        </div>

        <div className={labelClass}>Report a scam attempt</div>
        <div className="grid grid-cols-12 gap-2">
          <select className={inputClass + ' col-span-4'} value={type} onChange={e => setType(e.target.value)}>
            {SCAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className={inputClass + ' col-span-7'} placeholder="What happened?"
            value={detail} onChange={e => setDetail(e.target.value)} />
          <button className={buttonClass + ' col-span-1'} onClick={submit}>+</button>
        </div>

        {reports.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {reports.map(r => (
              <div key={r.id} className={`flex justify-between items-center px-3 py-1.5 rounded text-xs font-mono ${r.resolved ? 'bg-emerald-500/5 opacity-60' : 'bg-rose-500/5'}`}>
                <div>
                  <span className="text-tactical-text">{r.type}</span>
                  <span className="ml-2 text-[10px] text-tactical-text/50">{r.detail}</span>
                </div>
                {!r.resolved && (
                  <button className={buttonClass + ' text-[10px]'} onClick={() => resolve(r.id)}>Mark handled</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </FeatureGate>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Hub — renders all 10 panels with the Foundations progress header
// ═══════════════════════════════════════════════════════════════════

export function PracticeHub() {
  const bankAccounts = usePersonalFinanceStore(s => s.bankAccounts);
  const debts = usePersonalFinanceStore(s => s.debts);
  const vaultBalance = usePersonalFinanceStore(s => s.vaultBalance);
  const personalCash = useEmpireStore(s => s.personalBalance);
  const netWorth = React.useMemo(() => {
    const bankTotal = bankAccounts.reduce((s, a) => s + (a.balance ?? 0), 0);
    const debtTotal = debts.reduce((s, d) => s + (d.balance ?? 0), 0);
    const assets = bankTotal + vaultBalance + (personalCash ?? 0);
    return { assets, liabilities: debtTotal, net: assets - debtTotal };
  }, [bankAccounts, debts, vaultBalance, personalCash]);
  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl border border-[#00e5ff]/20 bg-gradient-to-br from-[#00e5ff]/10 to-transparent">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-mono font-bold text-tactical-text">Foundations Practice Lab</h2>
            <p className="text-[11px] font-mono text-tactical-text/60 mt-1">
              Each F0 course you pass unlocks a lab. Practice what you learned — your state persists across sessions.
            </p>
          </div>
          <div className="text-right">
            <div className={labelClass}>Net Worth (tracked)</div>
            <div className={`text-xl font-mono font-bold ${netWorth.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {fmtCurrency(netWorth.net)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IncomeTrackerPanel />
        <BudgetPanel />
        <SavingsVaultPanel />
        <CreditDebtPanel />
        <BankAccountsPanel />
        <MarketAccessPanel />
        <InsurancePanel />
        <RetirementPanel />
        <TaxOptimizerPanel />
        <ScamShieldPanel />
      </div>
    </div>
  );
}

export default PracticeHub;
