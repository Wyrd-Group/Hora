/**
 * BureaucracyPanel.jsx — Comprehensive legal, compliance, and administration panel.
 * Covers: governance, fines, heat, audits, jurisdiction, tax, regulatory history.
 */
import React, { useState } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { useAdStore } from '../../store/adStore';
import { fmtGameTime } from '../../lib/fmtGameTime';
import AdCardInline from '../ads/AdCardInline';

const fmt = (n) => {
  if (n == null || !isFinite(n)) return '\u20AC0';
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e9) return `${sign}\u20AC${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}\u20AC${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}\u20AC${(a / 1e3).toFixed(0)}K`;
  return `${sign}\u20AC${Math.round(a)}`;
};

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: '\u25C8' },
  { id: 'fines', label: 'Fines & Penalties', icon: '\u26A0' },
  { id: 'jurisdiction', label: 'Jurisdiction & Tax', icon: '\u2302' },
  { id: 'legal-actions', label: 'Legal Actions', icon: '\u2696' },
  { id: 'history', label: 'Regulatory History', icon: '\u2630' },
];

export default function BureaucracyPanel() {
  const [section, setSection] = useState('dashboard');
  const store = useEmpireStore();

  const governance = store.governance ?? 0;
  const heat = store.heat ?? 0;
  const complianceFines = store.complianceFines ?? 0;
  const assetsFrozen = store.assetsFrozen ?? false;
  const taxRate = store.taxRate ?? 0.20;
  const companyCountry = store.companyCountry;
  const residencyCountry = store.residencyCountry;
  const gameTick = store.gameTick ?? 0;

  // Legal dept projects
  const legalProjects = (store.projects || []).filter(p => p.dept === 'Legal');
  const financeProjects = (store.projects || []).filter(p => p.dept === 'Finance');

  // Crimes (for regulatory exposure view)
  const crimes = store.crimes || [];

  // Board data
  const boardSatisfaction = store.boardSatisfaction ?? 50;
  const boardGoals = store.boardGoals || [];
  const governanceWarnings = store.governanceWarnings ?? 0;

  // Recent ticker events related to legal/compliance
  const legalTicker = (store.ticker || []).filter(t =>
    t.type === 'crime' || t.type === 'alert' || t.type === 'board' ||
    (t.text && (t.text.includes('FINE') || t.text.includes('COMPLIANCE') || t.text.includes('AUDIT') ||
     t.text.includes('BANKING') || t.text.includes('DEFAULT') || t.text.includes('GOVERNANCE')))
  ).slice(0, 15);

  // Cooldown info
  const structureCooldown = store.getCooldownRemaining?.('structure') ?? 0;
  const residencyCooldown = store.getCooldownRemaining?.('residency') ?? 0;
  const jurisdictionCooldown = store.getCooldownRemaining?.('jurisdiction') ?? 0;

  // Governance risk level
  const govRisk = governance < 20 ? { level: 'CRITICAL', color: '#ef4444', desc: 'Severe regulatory penalties imminent' }
    : governance < 40 ? { level: 'HIGH', color: '#f59e0b', desc: 'Board dissatisfied, fines increasing' }
    : governance < 60 ? { level: 'MODERATE', color: '#eab308', desc: 'Some compliance gaps to address' }
    : governance < 80 ? { level: 'LOW', color: '#10b981', desc: 'Mostly compliant, minor issues' }
    : { level: 'MINIMAL', color: '#22d3ee', desc: 'Excellent governance standing' };

  const heatRisk = heat > 80 ? { level: 'CRITICAL', color: '#ef4444', desc: 'Assets frozen — no purchases allowed' }
    : heat > 60 ? { level: 'SEVERE', color: '#f97316', desc: 'Income penalties active (-20%)' }
    : heat > 40 ? { level: 'ELEVATED', color: '#f59e0b', desc: 'Increased regulatory scrutiny' }
    : heat > 20 ? { level: 'WATCH', color: '#eab308', desc: 'Minor regulatory attention' }
    : { level: 'CLEAR', color: '#10b981', desc: 'No regulatory concerns' };

  return (
    <div className="space-y-3">
      {/* Section nav */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-2 py-1 rounded font-mono text-[7px] uppercase tracking-widest whitespace-nowrap transition-all ${
              section === s.id
                ? 'bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/40'
                : 'text-tactical-text/40 hover:text-tactical-text/70 border border-transparent'
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {section === 'dashboard' && (
        <div className="space-y-3">
          {/* Status cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3 text-center">
              <div className="text-[7px] text-tactical-text/30 uppercase tracking-widest mb-1">Governance</div>
              <div className="text-2xl font-bold font-mono" style={{ color: govRisk.color }}>{governance}</div>
              <div className="text-[7px] font-mono mt-1 px-1.5 py-0.5 rounded inline-block" style={{ color: govRisk.color, background: `${govRisk.color}15` }}>
                {govRisk.level}
              </div>
            </div>
            <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3 text-center">
              <div className="text-[7px] text-tactical-text/30 uppercase tracking-widest mb-1">Heat</div>
              <div className="text-2xl font-bold font-mono" style={{ color: heatRisk.color }}>{heat}</div>
              <div className="text-[7px] font-mono mt-1 px-1.5 py-0.5 rounded inline-block" style={{ color: heatRisk.color, background: `${heatRisk.color}15` }}>
                {heatRisk.level}
              </div>
            </div>
            <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3 text-center">
              <div className="text-[7px] text-tactical-text/30 uppercase tracking-widest mb-1">Unpaid Fines</div>
              <div className={`text-lg font-bold font-mono ${complianceFines > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                {complianceFines > 0 ? fmt(complianceFines) : 'CLEAR'}
              </div>
            </div>
            <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3 text-center">
              <div className="text-[7px] text-tactical-text/30 uppercase tracking-widest mb-1">Tax Rate</div>
              <div className="text-lg font-bold font-mono text-[#f59e0b]">{(taxRate * 100).toFixed(1)}%</div>
              <div className="text-[7px] font-mono text-tactical-text/40 mt-0.5">{companyCountry || 'No jurisdiction'}</div>
            </div>
          </div>

          {/* Asset freeze warning */}
          {assetsFrozen && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3 text-center">
              <div className="text-[10px] font-mono font-bold text-[#ef4444] mb-1">{'\u26D4'} ASSETS FROZEN</div>
              <div className="text-[8px] font-mono text-[#ef4444]/70">
                Heat exceeds 80. All purchases and acquisitions are blocked until heat is reduced.
              </div>
            </div>
          )}

          {/* Governance warnings */}
          {governanceWarnings > 0 && (
            <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg p-3">
              <div className="text-[8px] font-mono font-bold text-[#f59e0b] mb-1">{'\u26A0'} Governance Warnings: {governanceWarnings}</div>
              <div className="text-[7px] font-mono text-[#f59e0b]/60">
                Consecutive low governance ticks. Continued negligence will trigger board intervention and potential sacking.
              </div>
            </div>
          )}

          {/* Board satisfaction */}
          <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[8px] font-mono text-tactical-text/50 uppercase tracking-widest">Board Satisfaction</span>
              <span className="text-[10px] font-mono font-bold" style={{ color: boardSatisfaction > 60 ? '#10b981' : boardSatisfaction > 30 ? '#f59e0b' : '#ef4444' }}>
                {boardSatisfaction}%
              </span>
            </div>
            <div className="h-1.5 bg-tactical-border/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${boardSatisfaction}%`,
                  backgroundColor: boardSatisfaction > 60 ? '#10b981' : boardSatisfaction > 30 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
          </div>

          {/* Recent legal events */}
          {legalTicker.length > 0 && (
            <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
              <div className="text-[8px] font-mono text-tactical-text/50 uppercase tracking-widest mb-2">Recent Legal Events</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {legalTicker.map(t => (
                  <div key={t.id} className="text-[7px] font-mono text-tactical-text/50 leading-relaxed">
                    <span className={t.type === 'crime' ? 'text-[#ef4444]' : t.type === 'alert' ? 'text-[#f59e0b]' : 'text-[#00e5ff]'}>
                      {'\u2022'} </span>
                    {t.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FINES & PENALTIES ── */}
      {section === 'fines' && (
        <div className="space-y-3">
          <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-4 text-center">
            <div className="text-[8px] font-mono text-tactical-text/40 uppercase tracking-widest mb-2">Outstanding Compliance Fines</div>
            <div className={`text-3xl font-bold font-mono ${complianceFines > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
              {complianceFines > 0 ? fmt(complianceFines) : '\u2713 No Fines'}
            </div>
            {complianceFines > 0 && (
              <div className="text-[7px] font-mono text-[#ef4444]/50 mt-2">
                Fines are deducted automatically at 10% per game day from company balance.
              </div>
            )}
          </div>

          {complianceFines > 0 && (
            <>
              {/* Pay fine in full */}
              {(() => {
                const canPayFull = store.companyBalance >= complianceFines;
                return (
                  <button
                    onClick={() => {
                      if (canPayFull) {
                        useEmpireStore.setState({
                          companyBalance: store.companyBalance - complianceFines,
                          complianceFines: 0,
                        });
                      }
                    }}
                    disabled={!canPayFull}
                    className={`w-full py-2 rounded font-mono text-[9px] font-bold uppercase tracking-widest transition-all ${
                      canPayFull ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 hover:brightness-125' : 'bg-[#333] text-tactical-text/30 border border-tactical-border/20 cursor-not-allowed'
                    }`}
                  >
                    {canPayFull ? `Pay Full Fine \u2014 ${fmt(complianceFines)}` : `Insufficient Funds (Need ${fmt(complianceFines)})`}
                  </button>
                );
              })()}

              {/* Pay partial */}
              {(() => {
                const halfFine = Math.round(complianceFines / 2);
                const canPayHalf = store.companyBalance >= halfFine && complianceFines > 1000;
                return canPayHalf ? (
                  <button
                    onClick={() => {
                      useEmpireStore.setState({
                        companyBalance: store.companyBalance - halfFine,
                        complianceFines: complianceFines - halfFine,
                      });
                    }}
                    className="w-full py-1.5 rounded font-mono text-[8px] font-bold uppercase tracking-widest transition-all bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30 hover:brightness-125"
                  >
                    Pay 50% Settlement \u2014 {fmt(halfFine)}
                  </button>
                ) : null;
              })()}

              {/* Watch ad to erase 50% of fines */}
              <button
                onClick={() => useAdStore.getState().requestFineRelief()}
                className="w-full py-2 rounded font-mono text-[9px] font-bold uppercase tracking-widest transition-all bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 hover:brightness-125 flex items-center justify-center gap-2"
              >
                <span className="text-[10px]">▶</span>
                Watch 1-Min Ad — Erase 50% of Fines ({fmt(Math.round(complianceFines / 2))})
              </button>
            </>
          )}

          {/* Fine prevention tips */}
          <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
            <div className="text-[8px] font-mono text-tactical-text/50 uppercase tracking-widest mb-2">Fine Prevention</div>
            <div className="space-y-1.5">
              {[
                { tip: 'Keep governance above 40 to avoid board penalties', met: governance >= 40 },
                { tip: 'Reduce heat below 60 to avoid income penalties', met: heat < 60 },
                { tip: 'Reduce heat below 80 to prevent asset freeze', met: heat < 80 },
                { tip: 'Run Compliance Review projects (Legal dept)', met: legalProjects.some(p => p.active) },
                { tip: 'Set a favorable tax jurisdiction', met: !!companyCountry },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[7px] font-mono">
                  <span className={item.met ? 'text-[#10b981]' : 'text-[#ef4444]'}>{item.met ? '\u2713' : '\u2717'}</span>
                  <span className={item.met ? 'text-tactical-text/40' : 'text-tactical-text/60'}>{item.tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Regulatory exposure */}
          <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
            <div className="text-[8px] font-mono text-tactical-text/50 uppercase tracking-widest mb-2">Regulatory Exposure</div>
            <div className="space-y-1">
              {crimes.slice(0, 8).map(c => (
                <div key={c.id} className="flex items-center justify-between text-[7px] font-mono">
                  <span className="text-tactical-text/50">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#f59e0b]/60">DET {c.detectionPct}%</span>
                    <span className="text-[#ef4444]/60">PEN {c.penaltyMultiplier}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── JURISDICTION & TAX ── */}
      {section === 'jurisdiction' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
              <div className="text-[7px] font-mono text-tactical-text/30 uppercase tracking-widest mb-1">Company Jurisdiction</div>
              <div className="text-[11px] font-mono font-bold text-[#00e5ff]">{companyCountry || 'Not Registered'}</div>
              {jurisdictionCooldown > 0 && (
                <div className="text-[6px] font-mono text-[#f59e0b]/60 mt-1">
                  Cooldown: {fmtGameTime(jurisdictionCooldown)}
                </div>
              )}
            </div>
            <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
              <div className="text-[7px] font-mono text-tactical-text/30 uppercase tracking-widest mb-1">Tax Residency</div>
              <div className="text-[11px] font-mono font-bold text-[#00e5ff]">{residencyCountry || 'Not Set'}</div>
              {residencyCooldown > 0 && (
                <div className="text-[6px] font-mono text-[#f59e0b]/60 mt-1">
                  Cooldown: {fmtGameTime(residencyCooldown)}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[8px] font-mono text-tactical-text/50 uppercase">Effective Tax Rate</span>
              <span className="text-[12px] font-mono font-bold text-[#f59e0b]">{(taxRate * 100).toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-tactical-border/30 rounded-full overflow-hidden">
              <div className="h-full bg-[#f59e0b] rounded-full transition-all" style={{ width: `${taxRate * 100 / 0.6 * 100}%` }} />
            </div>
            <div className="text-[6px] font-mono text-tactical-text/30 mt-1">
              Base rate determined by jurisdiction. Reduced by Tax Optimisation and Transfer Pricing projects.
            </div>
          </div>

          {/* Corporate structure cooldown */}
          {structureCooldown > 0 && (
            <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg p-3">
              <div className="text-[8px] font-mono text-[#f59e0b]">
                Structure change cooldown: {fmtGameTime(structureCooldown)} remaining
              </div>
            </div>
          )}

          {/* Tax optimization tips */}
          <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
            <div className="text-[8px] font-mono text-tactical-text/50 uppercase tracking-widest mb-2">Tax Optimization Actions</div>
            <div className="space-y-1.5">
              {financeProjects.filter(p => p.name.toLowerCase().includes('tax') || p.name.toLowerCase().includes('transfer')).map(p => (
                <div key={p.id} className="flex items-center justify-between text-[7px] font-mono">
                  <span className="text-tactical-text/60">{p.name}</span>
                  <span className="text-[#10b981]/60">{p.effect}</span>
                </div>
              ))}
              {legalProjects.filter(p => p.name.toLowerCase().includes('compliance') || p.name.toLowerCase().includes('regulatory')).map(p => (
                <div key={p.id} className="flex items-center justify-between text-[7px] font-mono">
                  <span className="text-tactical-text/60">{p.name}</span>
                  <span className="text-[#10b981]/60">{p.effect}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LEGAL ACTIONS ── */}
      {section === 'legal-actions' && (
        <div className="space-y-3">
          <div className="text-[7px] font-mono text-tactical-text/30 mb-1">
            Legal department projects that can be activated through the Departments tab.
          </div>

          {/* Legal dept projects */}
          <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
            <div className="text-[8px] font-mono text-tactical-text/50 uppercase tracking-widest mb-2">{'\u2696'} Legal Department Projects</div>
            <div className="space-y-2">
              {legalProjects.map(p => (
                <div key={p.id} className="bg-tactical-bg/40 rounded p-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-mono font-bold text-tactical-text/80">{p.name}</span>
                    <span className="text-[7px] font-mono px-1.5 py-0.5 rounded bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20">
                      {p.active ? 'ACTIVE' : fmt(p.cost)}
                    </span>
                  </div>
                  <div className="text-[7px] font-mono text-tactical-text/40 mb-1">
                    {p.focusSessions} focus sessions \u00B7 {p.successRate}% success
                  </div>
                  <div className="text-[7px] font-mono text-[#10b981]/60">{p.effect}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Finance compliance projects */}
          <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
            <div className="text-[8px] font-mono text-tactical-text/50 uppercase tracking-widest mb-2">{'\u{1F4B0}'} Finance Compliance Projects</div>
            <div className="space-y-2">
              {financeProjects.filter(p => p.name.toLowerCase().includes('tax') || p.name.toLowerCase().includes('audit') || p.name.toLowerCase().includes('compliance') || p.name.toLowerCase().includes('bond')).map(p => (
                <div key={p.id} className="bg-tactical-bg/40 rounded p-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-mono font-bold text-tactical-text/80">{p.name}</span>
                    <span className="text-[7px] font-mono px-1.5 py-0.5 rounded bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20">
                      {p.active ? 'ACTIVE' : fmt(p.cost)}
                    </span>
                  </div>
                  <div className="text-[7px] font-mono text-tactical-text/40 mb-1">
                    {p.focusSessions} focus sessions \u00B7 {p.successRate}% success
                  </div>
                  <div className="text-[7px] font-mono text-[#10b981]/60">{p.effect}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
            <div className="text-[8px] font-mono text-tactical-text/50 uppercase tracking-widest mb-2">Quick Actions</div>
            <div className="space-y-1.5">
              <div className="text-[7px] font-mono text-tactical-text/40">
                {'\u2022'} Hire a Security Specialist employee card to reduce crime detection rates
              </div>
              <div className="text-[7px] font-mono text-tactical-text/40">
                {'\u2022'} Hire a Chief Compliance Officer to reduce tax exposure
              </div>
              <div className="text-[7px] font-mono text-tactical-text/40">
                {'\u2022'} Run ESG projects to improve governance and Impact scores
              </div>
              <div className="text-[7px] font-mono text-tactical-text/40">
                {'\u2022'} Complete a Quarterly Audit (Finance dept) for +5 Governance
              </div>
              <div className="text-[7px] font-mono text-tactical-text/40">
                {'\u2022'} Set up a Regulatory Sandbox (Legal dept) for -20% crime detection
              </div>
            </div>
          </div>
        </div>
      )}

      <AdCardInline variant="wide" />

      {/* ── REGULATORY HISTORY ── */}
      {section === 'history' && (
        <div className="space-y-3">
          {/* Board goals with governance impact */}
          {boardGoals.length > 0 && (
            <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
              <div className="text-[8px] font-mono text-tactical-text/50 uppercase tracking-widest mb-2">Board Mandates</div>
              <div className="space-y-1.5">
                {boardGoals.map((g, i) => {
                  const ticksLeft = g.deadline - gameTick;
                  const isExpired = ticksLeft <= 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-[7px] font-mono">
                      <span className={`flex-1 ${g.met ? 'text-[#10b981]' : isExpired ? 'text-[#ef4444]' : 'text-tactical-text/60'}`}>
                        {g.met ? '\u2713' : isExpired ? '\u2717' : '\u25CB'} {g.description}
                      </span>
                      {!g.met && !isExpired && (
                        <span className="text-tactical-text/30 ml-2">{fmtGameTime(ticksLeft)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legal/compliance event log */}
          <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
            <div className="text-[8px] font-mono text-tactical-text/50 uppercase tracking-widest mb-2">Event Log</div>
            {legalTicker.length === 0 ? (
              <div className="text-[8px] font-mono text-tactical-text/20 text-center py-4">No regulatory events recorded</div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {legalTicker.map(t => (
                  <div key={t.id} className="text-[7px] font-mono leading-relaxed bg-tactical-bg/30 rounded p-1.5">
                    <span className={
                      t.type === 'crime' ? 'text-[#ef4444]' :
                      t.type === 'alert' ? 'text-[#f59e0b]' :
                      'text-[#00e5ff]'
                    }>{t.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Governance trend */}
          <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
            <div className="text-[8px] font-mono text-tactical-text/50 uppercase tracking-widest mb-2">Compliance Status Summary</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-[7px] font-mono">
                <div className="text-tactical-text/30">Governance</div>
                <div style={{ color: govRisk.color }}>{governance}/100 ({govRisk.level})</div>
              </div>
              <div className="text-[7px] font-mono">
                <div className="text-tactical-text/30">Heat</div>
                <div style={{ color: heatRisk.color }}>{heat}/100 ({heatRisk.level})</div>
              </div>
              <div className="text-[7px] font-mono">
                <div className="text-tactical-text/30">Outstanding Fines</div>
                <div className={complianceFines > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}>{complianceFines > 0 ? fmt(complianceFines) : 'None'}</div>
              </div>
              <div className="text-[7px] font-mono">
                <div className="text-tactical-text/30">Gov Warnings</div>
                <div className={governanceWarnings > 0 ? 'text-[#f59e0b]' : 'text-[#10b981]'}>{governanceWarnings}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
