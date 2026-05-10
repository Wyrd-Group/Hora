import React, { useState, useMemo } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { PriceFilter, applyPriceFilter } from './PriceFilter';
import AdCardInline from '../ads/AdCardInline';

// ── Loan config (mirrors store logic for UI display) ──
const LOAN_CONFIG = {
  business:  { label: 'Business',  rate: 0.06, maxTerm: 36,  min: 100_000,   max: 5_000_000,   requireBanks: 0 },
  expansion: { label: 'Expansion', rate: 0.08, maxTerm: 60,  min: 500_000,   max: 20_000_000,  requireBanks: 0 },
  emergency: { label: 'Emergency', rate: 0.12, maxTerm: 12,  min: 50_000,    max: 2_000_000,   requireBanks: 0 },
  megadeal:  { label: 'Mega Deal', rate: 0.05, maxTerm: 120, min: 5_000_000, max: 100_000_000, requireBanks: 3 },
};

function calcMonthlyPayment(amount, rate, termMonths) {
  const monthlyRate = rate / 12;
  if (monthlyRate <= 0) return Math.round(amount / termMonths);
  return Math.round(amount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1));
}

function fmtMoney(n) {
  if (n >= 1e9) return `€${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `€${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `€${(n / 1e3).toFixed(0)}K`;
  return `€${n.toLocaleString()}`;
}

export default function FundsModule({ onClose }) {
  const funds = useEmpireStore(state => state.funds);
  const companyBalance = useEmpireStore(state => state.companyBalance);
  const netWorth = useEmpireStore(state => state.netWorth);
  const nodes = useEmpireStore(state => state.nodes);
  const loans = useEmpireStore(state => state.loans);
  const maxCreditLine = useEmpireStore(state => state.maxCreditLine);
  const allocateToFund = useEmpireStore(state => state.allocateToFund);
  const takeLoan = useEmpireStore(state => state.takeLoan);
  const makePayment = useEmpireStore(state => state.makePayment);

  const [activeSection, setActiveSection] = useState('funds'); // 'funds' | 'loans'
  const [selectedFundId, setSelectedFundId] = useState(null);
  const [allocationAmount, setAllocationAmount] = useState('');
  const [fundsSort, setFundsSort] = useState('default');
  const [fundsPriceMin, setFundsPriceMin] = useState('');
  const [fundsPriceMax, setFundsPriceMax] = useState('');

  // Loan form state
  const [loanType, setLoanType] = useState('business');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanError, setLoanError] = useState('');

  const selectedFund = funds.find(f => f.id === selectedFundId);

  const ownedBankNodes = useMemo(() =>
    Object.values(nodes).filter(n => n.owner === 'player' && n.type === 'finance' && n.status === 'operational').length,
    [nodes]
  );

  const totalDebt = useMemo(() =>
    loans.filter(l => l.status === 'active').reduce((sum, l) => sum + l.remainingBalance, 0),
    [loans]
  );

  const creditLine = useMemo(() =>
    Math.round((companyBalance * 0.5) + (ownedBankNodes * 5_000_000) + (netWorth * 0.3)),
    [companyBalance, ownedBankNodes, netWorth]
  );

  const activeLoans = loans.filter(l => l.status === 'active');
  const completedLoans = loans.filter(l => l.status !== 'active');

  const currentConfig = LOAN_CONFIG[loanType];
  const loanAmtNum = parseInt(loanAmount, 10) || 0;
  const monthlyPaymentPreview = loanAmtNum > 0
    ? calcMonthlyPayment(loanAmtNum, currentConfig.rate, currentConfig.maxTerm)
    : 0;
  const totalRepayment = monthlyPaymentPreview * currentConfig.maxTerm;
  const totalInterest = totalRepayment - loanAmtNum;

  const handleAllocate = () => {
    const amt = parseInt(allocationAmount, 10);
    if (amt > 0 && selectedFund && companyBalance >= amt && amt >= selectedFund.minimumBuyIn) {
      allocateToFund(selectedFund.id, amt);
      setAllocationAmount('');
    }
  };

  const handleTakeLoan = () => {
    setLoanError('');
    if (loanAmtNum < currentConfig.min) {
      setLoanError(`Minimum: ${fmtMoney(currentConfig.min)}`);
      return;
    }
    if (loanAmtNum > currentConfig.max) {
      setLoanError(`Maximum: ${fmtMoney(currentConfig.max)}`);
      return;
    }
    if (currentConfig.requireBanks > 0 && ownedBankNodes < currentConfig.requireBanks) {
      setLoanError(`Requires ${currentConfig.requireBanks}+ bank nodes (you own ${ownedBankNodes})`);
      return;
    }
    if (totalDebt + loanAmtNum > creditLine) {
      setLoanError('Exceeds credit line capacity');
      return;
    }
    const success = takeLoan(loanType, loanAmtNum);
    if (success) {
      setLoanAmount('');
      setLoanError('');
    } else {
      setLoanError('Loan application denied');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 font-mono tracking-tight">
      <div className="absolute inset-0 z-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-7xl h-[85vh] bg-[#020617] border border-blue-900 shadow-2xl flex flex-col overflow-hidden rounded-md">

        {/* Terminal Header */}
        <div className="border-b border-blue-900/50 bg-[#0f172a] p-3 flex justify-between items-center text-xs">
          <div className="flex items-center space-x-4">
            <span className="text-blue-500 font-bold">ALADDIN_CORE_VS //</span>
            <span className="text-blue-300">ASSET_MANAGEMENT_TERMINAL</span>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <span className="text-blue-500/50 mr-2">LIQUIDITY_RESERVE:</span>
              <span className="text-emerald-400 font-bold">{fmtMoney(companyBalance)}</span>
            </div>
            <button onClick={onClose} className="text-blue-500 hover:text-white px-2 cursor-pointer bg-blue-900/20 rounded">
              [X] CLOSE
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="border-b border-blue-900/50 bg-[#0f172a]/60 flex text-xs">
          <button
            onClick={() => setActiveSection('funds')}
            className={`px-6 py-2.5 font-bold tracking-wider transition-colors cursor-pointer ${
              activeSection === 'funds'
                ? 'text-blue-300 border-b-2 border-blue-400 bg-blue-900/20'
                : 'text-blue-500/50 hover:text-blue-400'
            }`}
          >
            FUNDS
          </button>
          <button
            onClick={() => setActiveSection('loans')}
            className={`px-6 py-2.5 font-bold tracking-wider transition-colors cursor-pointer flex items-center space-x-2 ${
              activeSection === 'loans'
                ? 'text-blue-300 border-b-2 border-blue-400 bg-blue-900/20'
                : 'text-blue-500/50 hover:text-blue-400'
            }`}
          >
            <span>LOANS</span>
            {activeLoans.length > 0 && (
              <span className="bg-amber-500/20 text-amber-400 text-[9px] px-1.5 rounded">{activeLoans.length}</span>
            )}
          </button>
        </div>

        {/* ═══════════════════════ FUNDS TAB ═══════════════════════ */}
        {activeSection === 'funds' && (
          <div className="flex flex-1 overflow-hidden">

            {/* Data Grid (Left Side) */}
            <div className="w-2/3 border-r border-blue-900/30 bg-[#020617] flex flex-col">
              <div className="p-2 border-b border-blue-900/30">
                <PriceFilter sortBy={fundsSort} setSortBy={setFundsSort} priceMin={fundsPriceMin} setPriceMin={setFundsPriceMin} priceMax={fundsPriceMax} setPriceMax={setFundsPriceMax} variant="blue" label="$" />
              </div>
              <div className="grid grid-cols-6 gap-2 p-3 border-b border-blue-900/50 text-[10px] text-blue-500 font-bold bg-[#0f172a]/50 uppercase">
                <div className="col-span-2">Fund Name</div>
                <div>Strategy</div>
                <div>AUM</div>
                <div>Hist Return</div>
                <div>Min. Buy-In</div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {applyPriceFilter(funds, 'minimumBuyIn', fundsSort, fundsPriceMin, fundsPriceMax).map(fund => (
                  <div
                    key={fund.id}
                    onClick={() => setSelectedFundId(fund.id)}
                    className={`grid grid-cols-6 gap-2 p-3 text-[11px] border-b border-blue-900/10 cursor-pointer transition-colors ${
                      selectedFundId === fund.id ? 'bg-blue-900/20 text-white' : 'text-blue-300 hover:bg-blue-900/10'
                    }`}
                  >
                    <div className="col-span-2 font-bold flex items-center">
                      {fund.stakedAmount > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />}
                      {fund.name}
                    </div>
                    <div className="truncate">{fund.strategy}</div>
                    <div>{(fund.aum / 1_000_000_000).toFixed(1)}B</div>
                    <div className="text-emerald-400">{fund.historicalReturns}</div>
                    <div>{fund.minimumBuyIn >= 1_000_000 ? `${(fund.minimumBuyIn / 1_000_000).toFixed(1)}M` : fund.minimumBuyIn.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Allocation Dashboard (Right Side) */}
            <div className="w-1/3 bg-[#020617] p-6 flex flex-col">
              {selectedFund ? (
                <div className="h-full flex flex-col border border-blue-900/50 rounded bg-[#0f172a]/30 p-6 relative">
                  <div className="absolute top-0 right-0 bg-blue-900/40 text-blue-300 text-[10px] px-2 py-1 rounded-bl">PROSPECTUS</div>

                  <h3 className="text-xl font-bold text-blue-400 mb-1">{selectedFund.name}</h3>
                  <span className="text-[10px] text-blue-500 uppercase tracking-widest block mb-4 border-b border-blue-900/30 pb-2">
                    CLASS: {selectedFund.type}
                  </span>

                  <div className="text-xs text-blue-300/80 leading-relaxed mb-6">
                    {selectedFund.description}
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6 text-xs border border-blue-900/30 p-4 bg-black/40 rounded">
                    <div className="min-w-0">
                      <span className="block text-blue-500/50 mb-1 truncate">AUM</span>
                      <span className="text-white font-bold truncate block">${(selectedFund.aum / 1_000_000_000).toFixed(1)}B</span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-blue-500/50 mb-1 truncate">FEE STRUCTURE</span>
                      <span className="text-white font-bold truncate block">{selectedFund.managementFee}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-blue-500/50 mb-1 truncate">MIN COMMITMENT</span>
                      <span className="text-emerald-400 font-bold truncate block">${(selectedFund.minimumBuyIn / 1_000_000).toFixed(1)}M</span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-blue-500/50 mb-1 truncate">YOUR STAKE</span>
                      <span className="text-emerald-400 font-bold truncate block">
                        {selectedFund.stakedAmount ? `$${(selectedFund.stakedAmount / 1_000_000).toFixed(1)}M` : '$0'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto border-t border-blue-900/50 pt-6">
                    <label className="block text-xs text-blue-500 mb-2">ALLOCATE CAPITAL (EUR)</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder={selectedFund.minimumBuyIn.toString()}
                        value={allocationAmount}
                        onChange={(e) => setAllocationAmount(e.target.value)}
                        className="flex-1 bg-[#020617] border border-blue-900/50 text-white p-2 text-sm focus:outline-none focus:border-blue-500 placeholder-blue-900/50 rounded-sm"
                      />
                      <button
                        onClick={handleAllocate}
                        disabled={!allocationAmount || parseInt(allocationAmount) < selectedFund.minimumBuyIn || parseInt(allocationAmount) > companyBalance}
                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/20 disabled:text-blue-500/30 text-white px-6 text-xs font-bold rounded-sm transition-colors"
                      >
                        EXECUTE
                      </button>
                    </div>
                    {allocationAmount && parseInt(allocationAmount) < selectedFund.minimumBuyIn && (
                      <div className="text-red-500 text-[10px] mt-2">Error: Below minimum commitment threshold.</div>
                    )}
                    {allocationAmount && parseInt(allocationAmount) > companyBalance && (
                      <div className="text-red-500 text-[10px] mt-2">Error: Insufficient liquid corporate capital.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-blue-500/30 text-xs border border-blue-900/30 border-dashed rounded">
                  <span className="text-2xl mb-2">&#x25EC;</span>
                  AWAITING FUND SELECTION
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════ LOANS TAB ═══════════════════════ */}
        {activeSection === 'loans' && (
          <div className="flex flex-1 overflow-hidden">

            {/* Left: Credit Overview + Active Loans */}
            <div className="w-2/3 border-r border-blue-900/30 bg-[#020617] flex flex-col overflow-y-auto">

              {/* Credit Line Banner */}
              <div className="p-4 border-b border-blue-900/30 bg-[#0f172a]/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">CREDIT FACILITY STATUS</span>
                  <span className="text-[10px] text-blue-500/50">BANK NODES: <span className="text-blue-300 font-bold">{ownedBankNodes}</span></span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="border border-blue-900/30 bg-black/40 rounded p-3">
                    <span className="block text-[10px] text-blue-500/50 mb-1">CREDIT LINE</span>
                    <span className="text-emerald-400 font-bold text-sm">{fmtMoney(creditLine)}</span>
                  </div>
                  <div className="border border-blue-900/30 bg-black/40 rounded p-3">
                    <span className="block text-[10px] text-blue-500/50 mb-1">TOTAL DEBT</span>
                    <span className={`font-bold text-sm ${totalDebt > 0 ? 'text-amber-400' : 'text-blue-300'}`}>{fmtMoney(totalDebt)}</span>
                  </div>
                  <div className="border border-blue-900/30 bg-black/40 rounded p-3">
                    <span className="block text-[10px] text-blue-500/50 mb-1">AVAILABLE</span>
                    <span className="text-white font-bold text-sm">{fmtMoney(Math.max(0, creditLine - totalDebt))}</span>
                  </div>
                </div>
                {/* Utilization bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[9px] text-blue-500/50 mb-1">
                    <span>UTILIZATION</span>
                    <span>{creditLine > 0 ? Math.round((totalDebt / creditLine) * 100) : 0}%</span>
                  </div>
                  <div className="h-1.5 bg-blue-900/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        creditLine > 0 && (totalDebt / creditLine) > 0.8 ? 'bg-red-500' :
                        creditLine > 0 && (totalDebt / creditLine) > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${creditLine > 0 ? Math.min(100, (totalDebt / creditLine) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Active Loans List */}
              <div className="p-4">
                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider block mb-3">ACTIVE OBLIGATIONS</span>
                {activeLoans.length === 0 ? (
                  <div className="text-center py-12 text-blue-500/30 text-xs border border-blue-900/20 border-dashed rounded">
                    NO ACTIVE LOANS
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeLoans.map(loan => (
                      <div key={loan.id} className="border border-blue-900/30 bg-[#0f172a]/30 rounded p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              loan.type === 'megadeal' ? 'bg-purple-900/40 text-purple-300' :
                              loan.type === 'emergency' ? 'bg-red-900/40 text-red-300' :
                              loan.type === 'expansion' ? 'bg-amber-900/40 text-amber-300' :
                              'bg-blue-900/40 text-blue-300'
                            }`}>
                              {loan.type.toUpperCase()}
                            </span>
                            <span className="text-xs text-white font-bold">{fmtMoney(loan.principal)}</span>
                          </div>
                          <button
                            onClick={() => makePayment(loan.id)}
                            disabled={companyBalance < loan.monthlyPayment}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/20 disabled:text-blue-500/30 text-white px-4 py-1.5 text-[10px] font-bold rounded cursor-pointer transition-colors"
                          >
                            PAY {fmtMoney(loan.monthlyPayment)}
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-3 text-[10px]">
                          <div>
                            <span className="block text-blue-500/50 mb-0.5">REMAINING</span>
                            <span className="text-amber-400 font-bold">{fmtMoney(loan.remainingBalance)}</span>
                          </div>
                          <div>
                            <span className="block text-blue-500/50 mb-0.5">MONTHLY</span>
                            <span className="text-white font-bold">{fmtMoney(loan.monthlyPayment)}</span>
                          </div>
                          <div>
                            <span className="block text-blue-500/50 mb-0.5">APR</span>
                            <span className="text-white font-bold">{(loan.interestRate * 100).toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="block text-blue-500/50 mb-0.5">MONTHS LEFT</span>
                            <span className="text-white font-bold">{loan.monthsRemaining}</span>
                          </div>
                        </div>
                        {/* Repayment progress bar */}
                        <div className="mt-3">
                          <div className="h-1 bg-blue-900/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.round(((loan.termMonths - loan.monthsRemaining) / loan.termMonths) * 100)}%` }}
                            />
                          </div>
                          <div className="text-[9px] text-blue-500/40 mt-1 text-right">
                            {Math.round(((loan.termMonths - loan.monthsRemaining) / loan.termMonths) * 100)}% repaid
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Completed/Defaulted Loans */}
                {completedLoans.length > 0 && (
                  <div className="mt-6">
                    <span className="text-[10px] text-blue-500/40 font-bold uppercase tracking-wider block mb-2">HISTORY</span>
                    {completedLoans.map(loan => (
                      <div key={loan.id} className="flex items-center justify-between py-2 px-3 text-[10px] border-b border-blue-900/10">
                        <span className="text-blue-500/50">{loan.type.toUpperCase()}</span>
                        <span className="text-blue-500/50">{fmtMoney(loan.principal)}</span>
                        <span className={loan.status === 'paid_off' ? 'text-emerald-400' : 'text-red-400'}>
                          {loan.status === 'paid_off' ? 'PAID OFF' : 'DEFAULTED'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: New Loan Application */}
            <div className="w-1/3 bg-[#020617] p-6 flex flex-col">
              <div className="h-full flex flex-col border border-blue-900/50 rounded bg-[#0f172a]/30 p-6 relative">
                <div className="absolute top-0 right-0 bg-blue-900/40 text-blue-300 text-[10px] px-2 py-1 rounded-bl">APPLICATION</div>

                <h3 className="text-lg font-bold text-blue-400 mb-1">New Loan</h3>
                <span className="text-[10px] text-blue-500 uppercase tracking-widest block mb-5 border-b border-blue-900/30 pb-2">
                  CREDIT FACILITY REQUEST
                </span>

                {/* Loan Type Selector */}
                <label className="block text-[10px] text-blue-500 mb-2 font-bold">LOAN TYPE</label>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {Object.entries(LOAN_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => { setLoanType(key); setLoanError(''); }}
                      className={`p-2.5 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                        loanType === key
                          ? 'border-blue-400 bg-blue-900/30 text-blue-300'
                          : 'border-blue-900/30 bg-black/20 text-blue-500/50 hover:border-blue-700'
                      } ${cfg.requireBanks > 0 && ownedBankNodes < cfg.requireBanks ? 'opacity-40' : ''}`}
                    >
                      <div>{cfg.label}</div>
                      <div className="text-[9px] font-normal mt-0.5">{(cfg.rate * 100).toFixed(0)}% APR</div>
                    </button>
                  ))}
                </div>

                {/* Loan Details */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5 text-[10px] border border-blue-900/30 p-3 bg-black/40 rounded">
                  <div>
                    <span className="block text-blue-500/50 mb-0.5">MIN</span>
                    <span className="text-white font-bold">{fmtMoney(currentConfig.min)}</span>
                  </div>
                  <div>
                    <span className="block text-blue-500/50 mb-0.5">MAX</span>
                    <span className="text-white font-bold">{fmtMoney(currentConfig.max)}</span>
                  </div>
                  <div>
                    <span className="block text-blue-500/50 mb-0.5">TERM</span>
                    <span className="text-white font-bold">{currentConfig.maxTerm} months</span>
                  </div>
                  <div>
                    <span className="block text-blue-500/50 mb-0.5">RATE</span>
                    <span className="text-white font-bold">{(currentConfig.rate * 100).toFixed(1)}% APR</span>
                  </div>
                  {currentConfig.requireBanks > 0 && (
                    <div className="col-span-2">
                      <span className="block text-blue-500/50 mb-0.5">REQUIRES</span>
                      <span className={`font-bold ${ownedBankNodes >= currentConfig.requireBanks ? 'text-emerald-400' : 'text-red-400'}`}>
                        {currentConfig.requireBanks}+ bank nodes ({ownedBankNodes} owned)
                      </span>
                    </div>
                  )}
                </div>

                {/* Amount Input */}
                <label className="block text-[10px] text-blue-500 mb-2 font-bold">LOAN AMOUNT (EUR)</label>
                <input
                  type="number"
                  placeholder={currentConfig.min.toString()}
                  value={loanAmount}
                  onChange={(e) => { setLoanAmount(e.target.value); setLoanError(''); }}
                  className="w-full bg-[#020617] border border-blue-900/50 text-white p-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-blue-900/50 rounded-sm mb-4"
                />

                {/* Payment Preview */}
                {loanAmtNum > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-4 text-[10px] border border-blue-900/30 p-3 bg-black/40 rounded">
                    <div>
                      <span className="block text-blue-500/50 mb-0.5">MONTHLY</span>
                      <span className="text-emerald-400 font-bold">{fmtMoney(monthlyPaymentPreview)}</span>
                    </div>
                    <div>
                      <span className="block text-blue-500/50 mb-0.5">TOTAL COST</span>
                      <span className="text-white font-bold">{fmtMoney(totalRepayment)}</span>
                    </div>
                    <div>
                      <span className="block text-blue-500/50 mb-0.5">INTEREST</span>
                      <span className="text-amber-400 font-bold">{fmtMoney(totalInterest)}</span>
                    </div>
                  </div>
                )}

                {loanError && (
                  <div className="text-red-500 text-[10px] mb-3 bg-red-900/10 border border-red-900/30 rounded p-2">{loanError}</div>
                )}

                <div className="mt-auto">
                  <button
                    onClick={handleTakeLoan}
                    disabled={loanAmtNum <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/20 disabled:text-blue-500/30 text-white py-3 text-xs font-bold rounded-sm transition-colors cursor-pointer"
                  >
                    TAKE LOAN
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <AdCardInline variant="wide" />
      </div>
    </div>
  );
}
