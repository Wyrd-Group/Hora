import React, { useState, useMemo } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import {
  COMPANY_JURISDICTIONS,
  RESIDENCY_JURISDICTIONS,
  computeTransfer,
} from '../../data/taxData';
import AdCardInline from '../ads/AdCardInline';

const fmt = (n) =>
  n >= 1e6 ? `€${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `€${(n / 1e3).toFixed(1)}K` : `€${Math.round(n)}`;

const pct = (r) => `${(r * 100).toFixed(1)}%`;

const SECTOR_LABELS = {
  finance: 'Finance', tech: 'Tech', oil_gas: 'Oil & Gas',
  manufacturing: 'Manufacturing', energy: 'Energy', pharma: 'Pharma', venue: 'Venue',
};

// ── Jurisdiction card ────────────────────────────────────────────
function JurisdictionCard({ item, selected, onSelect, rateLabel, rate, accentColor }) {
  return (
    <button
      onClick={() => onSelect(item.code)}
      className="w-full text-left rounded-lg p-3 mb-2 transition-all border"
      style={{
        borderColor: selected ? accentColor : 'rgba(255,255,255,0.06)',
        backgroundColor: selected ? `${accentColor}10` : 'rgba(255,255,255,0.025)',
        boxShadow: selected ? `0 0 12px ${accentColor}18` : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{item.flag}</span>
          <span className="text-[11px] font-bold text-tactical-text">{item.name}</span>
        </div>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ color: accentColor, backgroundColor: `${accentColor}18` }}
        >
          {rateLabel}: {pct(rate)}
        </span>
      </div>

      <p className="text-[9px] text-tactical-text/50 leading-relaxed mb-2">{item.description}</p>

      <div className="grid grid-cols-2 gap-1.5 text-[8px]">
        <div>
          {item.pros.slice(0, 3).map((p, i) => (
            <div key={i} className="text-[#10b981] flex gap-1 mb-0.5">
              <span>+</span><span>{p}</span>
            </div>
          ))}
        </div>
        <div>
          {item.cons.slice(0, 2).map((c, i) => (
            <div key={i} className="text-[#ef4444] flex gap-1 mb-0.5">
              <span>-</span><span>{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sector bonuses */}
      {item.sectorBonus && Object.keys(item.sectorBonus).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(item.sectorBonus).map(([sector, note]) => (
            <span
              key={sector}
              className="text-[8px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#7c3aed18', color: '#a78bfa', border: '1px solid #7c3aed30' }}
              title={note}
            >
              {SECTOR_LABELS[sector] ?? sector} ★
            </span>
          ))}
        </div>
      )}
      {/* Sector penalties */}
      {item.sectorPenalty && Object.keys(item.sectorPenalty).length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {Object.entries(item.sectorPenalty).map(([sector, note]) => (
            <span
              key={sector}
              className="text-[8px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#ef444418', color: '#f87171', border: '1px solid #ef444430' }}
              title={note}
            >
              {SECTOR_LABELS[sector] ?? sector} ↓
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ── Tax breakdown row ────────────────────────────────────────────
function TaxRow({ label, amount, rate, color, bold }) {
  return (
    <div className={`flex justify-between items-center py-1.5 border-b border-[#ffffff08] ${bold ? 'mt-1' : ''}`}>
      <span className="text-[9px] text-tactical-text/50">{label}</span>
      <div className="flex items-center gap-3">
        {rate != null && (
          <span className="text-[9px] font-mono" style={{ color: color ?? '#9ca3af' }}>
            {pct(rate)}
          </span>
        )}
        <span className={`text-[10px] font-mono font-bold`} style={{ color: color ?? '#e2e8f0' }}>
          {amount < 0 ? `−${fmt(Math.abs(amount))}` : fmt(amount)}
        </span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function TransferPanel({ onClose, onAskAthena }) {
  const companyBalance  = useEmpireStore(s => s.companyBalance);
  const personalBalance = useEmpireStore(s => s.personalBalance);
  const companyCountry  = useEmpireStore(s => s.companyCountry);
  const residencyCountry = useEmpireStore(s => s.residencyCountry);
  const nodeMap         = useEmpireStore(s => s.nodes);
  const setCompanyCountry   = useEmpireStore(s => s.setCompanyCountry);
  const setResidencyCountry = useEmpireStore(s => s.setResidencyCountry);
  const transferToPersonal  = useEmpireStore(s => s.transferToPersonal);
  const transferToCompany   = useEmpireStore(s => s.transferToCompany);

  const [direction, setDirection]                 = useState('toPersonal');
  const [companySearch, setCompanySearch]          = useState('');
  const [residencySearch, setResidencySearch]      = useState('');
  const [rawAmount, setRawAmount]                  = useState('');
  const [confirmed, setConfirmed]                  = useState(false);

  const isToPersonal = direction === 'toPersonal';

  // Detect player's dominant sector for Athena advice
  const dominantSector = useMemo(() => {
    const counts = {};
    Object.values(nodeMap).filter(n => n.owner === 'player').forEach(n => {
      counts[n.type] = (counts[n.type] ?? 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : 'finance';
  }, [nodeMap]);

  const amount = parseFloat(rawAmount.replace(/[^0-9.]/g, '')) || 0;

  const breakdown = useMemo(() => {
    if (!companyCountry || !residencyCountry || amount <= 0) return null;
    return computeTransfer(amount, companyCountry, residencyCountry);
  }, [amount, companyCountry, residencyCountry]);

  const filteredCompany   = COMPANY_JURISDICTIONS.filter(j =>
    j.name.toLowerCase().includes(companySearch.toLowerCase()) ||
    j.code.toLowerCase().includes(companySearch.toLowerCase())
  );
  const filteredResidency = RESIDENCY_JURISDICTIONS.filter(j =>
    j.name.toLowerCase().includes(residencySearch.toLowerCase()) ||
    j.code.toLowerCase().includes(residencySearch.toLowerCase())
  );

  const sourceBalance = isToPersonal ? companyBalance : personalBalance;
  const bothSelected = companyCountry && residencyCountry;

  const canTransfer = isToPersonal
    ? bothSelected && breakdown && companyBalance >= amount && amount > 0
    : personalBalance >= amount && amount > 0;

  const handleTransfer = () => {
    if (!canTransfer) return;
    if (isToPersonal) {
      transferToPersonal(amount);
    } else {
      transferToCompany(amount);
    }
    setConfirmed(true);
    setTimeout(() => { setConfirmed(false); setRawAmount(''); }, 2500);
  };

  const handleAthena = () => {
    const query = `I run a ${SECTOR_LABELS[dominantSector] ?? dominantSector} empire. I need advice on the best combination of company registration jurisdiction and personal residency to minimise my effective tax rate when extracting dividends. What structure do you recommend and why?`;
    onAskAthena(query);
  };

  const co = COMPANY_JURISDICTIONS.find(c => c.code === companyCountry);
  const re = RESIDENCY_JURISDICTIONS.find(r => r.code === residencyCountry);

  // Button label logic
  const getButtonLabel = () => {
    if (isToPersonal) {
      if (!bothSelected) return 'Select jurisdictions to continue';
      if (amount <= 0) return 'Enter an amount';
      if (amount > companyBalance) return 'Insufficient company balance';
      return `Execute Transfer — Receive ${fmt(breakdown?.netReceived ?? 0)}`;
    } else {
      if (amount <= 0) return 'Enter an amount';
      if (amount > personalBalance) return 'Insufficient personal balance';
      return `Deposit ${fmt(amount)} into Company`;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(6,10,18,0.85)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-[900px] max-h-[90vh] rounded-xl overflow-hidden flex flex-col font-mono"
        style={{
          background: 'rgba(8,12,22,0.98)',
          border: '1px solid rgba(0,229,255,0.15)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b shrink-0"
          style={{ borderColor: 'rgba(0,229,255,0.12)', background: 'rgba(0,229,255,0.04)' }}
        >
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[12px] font-bold text-[#00e5ff] tracking-[0.2em]">WEALTH TRANSFER</span>
              <span className="ml-3 text-[9px] text-tactical-text/40 tracking-widest">
                {isToPersonal ? 'COMPANY → PERSONAL' : 'PERSONAL → COMPANY'}
              </span>
            </div>
            {/* Direction toggle */}
            <div className="flex rounded overflow-hidden border" style={{ borderColor: 'rgba(0,229,255,0.2)' }}>
              <button
                onClick={() => setDirection('toPersonal')}
                className="px-3 py-1 text-[8px] tracking-widest font-bold transition-all"
                style={{
                  backgroundColor: isToPersonal ? 'rgba(0,229,255,0.15)' : 'transparent',
                  color: isToPersonal ? '#00e5ff' : '#4b5563',
                  borderRight: '1px solid rgba(0,229,255,0.2)',
                }}
              >
                COMPANY → PERSONAL
              </button>
              <button
                onClick={() => setDirection('toCompany')}
                className="px-3 py-1 text-[8px] tracking-widest font-bold transition-all"
                style={{
                  backgroundColor: !isToPersonal ? 'rgba(0,229,255,0.15)' : 'transparent',
                  color: !isToPersonal ? '#00e5ff' : '#4b5563',
                }}
              >
                PERSONAL → COMPANY
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAthena}
              className="px-3 py-1 rounded text-[9px] tracking-widest border transition-all hover:brightness-150"
              style={{ borderColor: '#7c3aed55', backgroundColor: '#7c3aed10', color: '#a78bfa' }}
            >
              ASK ATHENA
            </button>
            <button onClick={onClose} aria-label="Close transfer panel" className="text-tactical-text/40 hover:text-tactical-text">✕</button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Left: Company Registration (only for toPersonal) ── */}
          {isToPersonal && (
            <div className="w-[280px] flex flex-col border-r shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="px-3 pt-3 pb-2 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="text-[9px] text-[#f59e0b] uppercase tracking-widest mb-2">Company Registration</div>
                <input
                  value={companySearch}
                  onChange={e => setCompanySearch(e.target.value)}
                  placeholder="Search jurisdiction..."
                  className="w-full bg-[#ffffff08] border border-[#ffffff12] rounded px-2 py-1.5 text-[10px] text-tactical-text placeholder-tactical-text/30 outline-none focus:border-[#f59e0b55]"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {filteredCompany.map(j => (
                  <JurisdictionCard
                    key={j.code}
                    item={j}
                    selected={companyCountry === j.code}
                    onSelect={setCompanyCountry}
                    rateLabel="Corp"
                    rate={j.corporateTax}
                    accentColor="#f59e0b"
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Centre: Transfer Calculator ── */}
          <div className="flex-1 flex flex-col p-5 overflow-y-auto">
            {/* Wallet summary */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-lg p-3 border min-w-0" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.15)' }}>
                <div className="text-[8px] text-tactical-text/40 uppercase tracking-widest mb-1">Company Wallet</div>
                <div className="text-[18px] font-bold text-[#ef4444] truncate">{fmt(companyBalance)}</div>
                {co && <div className="text-[8px] text-tactical-text/40 mt-1 truncate">{co.flag} {co.name} · Corp {pct(co.corporateTax)} · WHT {pct(co.wht)}</div>}
                {!co && isToPersonal && <div className="text-[8px] text-[#f59e0b] mt-1">← Select registration country</div>}
              </div>
              <div className="rounded-lg p-3 border min-w-0" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.15)' }}>
                <div className="text-[8px] text-tactical-text/40 uppercase tracking-widest mb-1">Personal Wallet</div>
                <div className="text-[18px] font-bold text-[#10b981] truncate">{fmt(personalBalance)}</div>
                {re && <div className="text-[8px] text-tactical-text/40 mt-1 truncate">{re.flag} {re.name} · Dividend tax {pct(re.dividendTax)}</div>}
                {!re && isToPersonal && <div className="text-[8px] text-[#f59e0b] mt-1">← Select residency country</div>}
              </div>
            </div>

            {/* Amount input */}
            <div className="mb-4">
              <div className="text-[9px] text-tactical-text/50 uppercase tracking-widest mb-2">Transfer Amount</div>
              <div className="flex gap-2 mb-2">
                {[50_000, 100_000, 250_000, 500_000].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setRawAmount(String(preset))}
                    className="px-2.5 py-1 rounded text-[9px] border transition-all hover:brightness-150"
                    style={{ borderColor: '#ffffff20', backgroundColor: '#ffffff08', color: '#9ca3af' }}
                  >
                    {fmt(preset)}
                  </button>
                ))}
                <button
                  onClick={() => setRawAmount(String(Math.floor(sourceBalance * 0.5)))}
                  className="px-2.5 py-1 rounded text-[9px] border transition-all hover:brightness-150"
                  style={{ borderColor: '#ffffff20', backgroundColor: '#ffffff08', color: '#9ca3af' }}
                >
                  50% of balance
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={rawAmount}
                onChange={e => setRawAmount(e.target.value)}
                placeholder="Enter amount in €..."
                className="w-full rounded-lg px-4 py-3 text-[14px] font-bold outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${amount > 0 && amount <= sourceBalance ? '#00e5ff40' : '#ffffff15'}`,
                  color: '#e2e8f0',
                }}
              />
              {amount > sourceBalance && (
                <div className="text-[9px] text-[#ef4444] mt-1">
                  Insufficient {isToPersonal ? 'company' : 'personal'} balance
                </div>
              )}
            </div>

            {/* Tax breakdown / deposit message — depends on direction */}
            {isToPersonal ? (
              <>
                {bothSelected && breakdown && amount > 0 ? (
                  <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="text-[9px] text-tactical-text/50 uppercase tracking-widest mb-3">Tax Waterfall</div>

                    <TaxRow label="Gross Transfer" amount={breakdown.gross} />
                    <TaxRow
                      label={`Dividend WHT — ${co?.flag} ${co?.name}`}
                      amount={-breakdown.whtAmount}
                      rate={breakdown.whtRate}
                      color={breakdown.whtAmount > 0 ? '#ef4444' : '#10b981'}
                    />
                    <TaxRow label="Net after WHT" amount={breakdown.netAfterWHT} color="#e2e8f0" />
                    <TaxRow
                      label={`Personal Dividend Tax — ${re?.flag} ${re?.name}`}
                      amount={-breakdown.personalTaxAmount}
                      rate={breakdown.personalTaxRate}
                      color={breakdown.personalTaxAmount > 0 ? '#ef4444' : '#10b981'}
                    />

                    {/* Net received — highlighted */}
                    <div
                      className="flex justify-between items-center mt-3 px-3 py-2.5 rounded-lg"
                      style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                      <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest">You Receive</span>
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] text-tactical-text/50">
                          Effective rate: <span className="text-[#f59e0b]">{pct(breakdown.effectiveRate)}</span>
                        </span>
                        <span className="text-[18px] font-bold text-[#10b981]">{fmt(breakdown.netReceived)}</span>
                      </div>
                    </div>

                    {/* Total tax lost */}
                    <div className="flex justify-between items-center mt-2 text-[9px] text-tactical-text/40">
                      <span>Total taxes paid</span>
                      <span className="text-[#ef4444] font-mono">−{fmt(breakdown.totalTax)}</span>
                    </div>
                  </div>
                ) : bothSelected && amount === 0 ? (
                  <div className="rounded-lg p-4 mb-4 text-center text-[10px] text-tactical-text/30"
                       style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    Enter an amount to see the tax waterfall
                  </div>
                ) : !bothSelected ? (
                  <div className="rounded-lg p-4 mb-4 text-center"
                       style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <div className="text-[10px] text-[#f59e0b] mb-1">Select both jurisdictions</div>
                    <div className="text-[9px] text-tactical-text/40">Choose your company registration country and personal residency to calculate the exact tax cost of this transfer.</div>
                    <button onClick={handleAthena} className="mt-3 px-4 py-1.5 rounded text-[9px] border transition-all hover:brightness-150"
                      style={{ borderColor: '#7c3aed55', backgroundColor: '#7c3aed10', color: '#a78bfa' }}>
                      Ask Athena to recommend a structure for {SECTOR_LABELS[dominantSector] ?? 'your sector'}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              /* toCompany direction — simple deposit, no tax */
              <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-[9px] text-tactical-text/50 uppercase tracking-widest mb-3">Capital Injection</div>
                <div
                  className="flex items-center gap-3 px-3 py-3 rounded-lg"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
                >
                  <span className="text-[16px]">💰</span>
                  <div>
                    <div className="text-[10px] font-bold text-[#10b981]">Direct deposit — no tax applicable</div>
                    <div className="text-[9px] text-tactical-text/40 mt-0.5">
                      Investing personal funds into your own company is not a taxable event.
                    </div>
                  </div>
                </div>
                {amount > 0 && (
                  <div
                    className="flex justify-between items-center mt-3 px-3 py-2.5 rounded-lg"
                    style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)' }}
                  >
                    <span className="text-[10px] font-bold text-[#00e5ff] uppercase tracking-widest">Company Receives</span>
                    <span className="text-[18px] font-bold text-[#00e5ff]">{fmt(amount)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Confirm */}
            {confirmed ? (
              <div className="w-full py-3 rounded-lg text-center text-[10px] font-bold text-[#10b981] tracking-widest"
                   style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                {isToPersonal
                  ? `✓ TRANSFER COMPLETE — ${fmt(breakdown?.netReceived ?? 0)} credited to personal wallet`
                  : `✓ DEPOSIT COMPLETE — ${fmt(amount)} credited to company wallet`}
              </div>
            ) : (
              <button
                onClick={handleTransfer}
                disabled={!canTransfer}
                className="w-full py-3 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all"
                style={{
                  background: canTransfer ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${canTransfer ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: canTransfer ? '#00e5ff' : '#4b5563',
                  cursor: canTransfer ? 'pointer' : 'not-allowed',
                }}
              >
                {getButtonLabel()}
              </button>
            )}
          </div>

          {/* ── Right: Personal Residency (only for toPersonal) ── */}
          {isToPersonal && (
            <div className="w-[280px] flex flex-col border-l shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="px-3 pt-3 pb-2 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="text-[9px] text-[#10b981] uppercase tracking-widest mb-2">Personal Residency</div>
                <input
                  value={residencySearch}
                  onChange={e => setResidencySearch(e.target.value)}
                  placeholder="Search country..."
                  className="w-full bg-[#ffffff08] border border-[#ffffff12] rounded px-2 py-1.5 text-[10px] text-tactical-text placeholder-tactical-text/30 outline-none focus:border-[#10b98155]"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {filteredResidency.map((j, idx) => (
                  <React.Fragment key={j.code}>
                    <JurisdictionCard
                      item={j}
                      selected={residencyCountry === j.code}
                      onSelect={setResidencyCountry}
                      rateLabel="Dividend"
                      rate={j.dividendTax}
                      accentColor="#10b981"
                    />
                    {/* Ad between UAE and Cayman Islands */}
                    {j.code === 'AE' && <div className="mb-2"><AdCardInline variant="compact" /></div>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
