import React from 'react';
import LegalModal from './LegalModal';

const FinancialDisclaimer = ({ onClose }) => {
  return (
    <LegalModal onClose={onClose} title="Financial Disclaimer">
      <div className="py-2">
        <h3 className="text-[11px] tracking-[0.2em] uppercase text-cyan-400/70 font-bold mt-6 mb-2">
          Educational Simulation Only
        </h3>
        <p className="text-[10px] text-[#E8E0D0]/70 leading-relaxed mb-3">
          AEGIS Empire is an educational simulation designed to teach financial concepts. It is
          <span className="text-rose-400 font-bold"> NOT </span>
          financial advice and does
          <span className="text-rose-400 font-bold"> NOT </span>
          constitute investment recommendations of any kind.
        </p>

        <h3 className="text-[11px] tracking-[0.2em] uppercase text-cyan-400/70 font-bold mt-6 mb-2">
          Simulated Environment
        </h3>
        <p className="text-[10px] text-[#E8E0D0]/70 leading-relaxed mb-3">
          All trading activity, portfolios, market data, and financial instruments within AEGIS
          Empire are entirely simulated. No real money is at risk during gameplay. Virtual
          currencies, including Aegis Points, have no real monetary value.
        </p>

        <h3 className="text-[11px] tracking-[0.2em] uppercase text-cyan-400/70 font-bold mt-6 mb-2">
          No Guarantee of Real-World Results
        </h3>
        <p className="text-[10px] text-[#E8E0D0]/70 leading-relaxed mb-3">
          Past performance in the simulation does not predict, guarantee, or indicate real-world
          investment results. Simulated markets may not accurately reflect the complexity, risks,
          or volatility of real financial markets.
        </p>

        <h3 className="text-[11px] tracking-[0.2em] uppercase text-cyan-400/70 font-bold mt-6 mb-2">
          Seek Professional Advice
        </h3>
        <p className="text-[10px] text-[#E8E0D0]/70 leading-relaxed mb-3">
          Before making any real investment decisions, consult a qualified financial advisor. AEGIS
          Empire and its operators accept no responsibility for financial decisions made based on
          knowledge gained through the platform.
        </p>
      </div>

      <p className="text-[9px] text-[#9C8E7E] mt-6 mb-2">Last updated: April 2026</p>
    </LegalModal>
  );
};

export default FinancialDisclaimer;
