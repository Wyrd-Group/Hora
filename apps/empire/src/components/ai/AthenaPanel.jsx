import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { useMatchStore } from '../../store/matchStore';
import { useAgentCardStore } from '../../store/agentCardStore';
import { useAthenaStore } from '../../store/athenaStore';
import { ATHENA_TOOLS, getToolsByCategory, CATEGORY_META } from '../../data/athenaTools';
import { useAuthStore, selectHasFullAthena } from '../../store/authStore';
import { TIER_CONFIG } from '../../data/subscriptionTiers';
import { useAdStore } from '../../store/adStore';
import { useFeatureStore } from '../../store/featureStore';
import { apiFetch } from '../../lib/apiFetch';

// ── Daily Athena query limiter for free/operative tiers ─────────
const ATHENA_DAILY_KEY = 'athena-daily-queries';
const MAX_FREE_QUERIES = 10;      // 10 free per day (was 5)
const BONUS_PER_AD = 5;           // +5 queries per interstitial ad watched

function getAthenaDaily() {
  try {
    const raw = JSON.parse(localStorage.getItem(ATHENA_DAILY_KEY) || '{}');
    const today = new Date().toISOString().slice(0, 10);
    if (raw.day !== today) return { day: today, count: 0, bonusGranted: 0 };
    return { day: raw.day, count: raw.count || 0, bonusGranted: raw.bonusGranted || 0 };
  } catch { return { day: new Date().toISOString().slice(0, 10), count: 0, bonusGranted: 0 }; }
}

function incrementAthenaDaily() {
  const d = getAthenaDaily();
  d.count++;
  localStorage.setItem(ATHENA_DAILY_KEY, JSON.stringify(d));
  return d.count;
}

function grantAdBonus() {
  const d = getAthenaDaily();
  d.bonusGranted += BONUS_PER_AD;
  localStorage.setItem(ATHENA_DAILY_KEY, JSON.stringify(d));
  return d.bonusGranted;
}

function getEffectiveLimit() {
  const d = getAthenaDaily();
  return MAX_FREE_QUERIES + d.bonusGranted;
}

// ── Markdown Code Block Renderer ────────────────────────────────
// Splits message text into plain text and ```code``` blocks for proper rendering.
function renderMessageContent(text) {
  if (!text || typeof text !== 'string') return text;

  // Split on triple-backtick code blocks: ```lang\ncode\n```
  const parts = text.split(/(```[\s\S]*?```)/g);
  if (parts.length === 1) return text; // No code blocks, return as-is

  return parts.map((part, i) => {
    const codeMatch = part.match(/^```(\w+)?\n?([\s\S]*?)```$/);
    if (codeMatch) {
      const lang = codeMatch[1] || '';
      const code = codeMatch[2].trimEnd();
      return (
        <div key={i} className="my-2 rounded-md overflow-hidden border border-white/[0.08]">
          {lang && (
            <div className="flex items-center justify-between px-3 py-1 bg-white/[0.06] border-b border-white/[0.06]">
              <span className="text-[8px] uppercase tracking-widest text-[#7c3aed]/70 font-bold">{lang}</span>
              <button
                className="text-[8px] text-tactical-text/40 hover:text-tactical-text/70 transition-colors"
                onClick={() => { navigator.clipboard.writeText(code); }}
              >
                COPY
              </button>
            </div>
          )}
          <pre className="p-3 overflow-x-auto bg-[#0a0a0f] text-[10px] leading-[1.6] font-mono text-emerald-300/80">
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    // Render inline `code` within plain text segments
    const inlineParts = part.split(/(`[^`]+`)/g);
    if (inlineParts.length === 1) return <span key={i}>{part}</span>;
    return (
      <span key={i}>
        {inlineParts.map((ip, j) => {
          const inlineMatch = ip.match(/^`([^`]+)`$/);
          if (inlineMatch) {
            return <code key={j} className="px-1 py-0.5 rounded bg-white/[0.06] text-[#00e5ff] text-[10px] font-mono">{inlineMatch[1]}</code>;
          }
          return <span key={j}>{ip}</span>;
        })}
      </span>
    );
  });
}

// ── Feature Test Card Component ─────────────────────────────────
// Renders sandbox test results for AI-generated features
function FeatureTestCard({ text }) {
  const [showCode, setShowCode] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Parse feature info from the result text
  const passedMatch = text.match(/FEATURE CREATED & TESTED ✓: "([^"]+)" \(ID: ([^)]+)\)/);
  const failedMatch = text.match(/FEATURE CREATED BUT TEST FAILED ✗: "([^"]+)"/);
  const isPass = !!passedMatch;
  const name = passedMatch?.[1] || failedMatch?.[1] || 'Unknown';
  const featureId = passedMatch?.[2] || '';
  const actionsLine = text.match(/Actions it would take: (.+)/)?.[1] || '';
  const logsLine = text.match(/Logs: (.+)/)?.[1] || '';
  const errorLine = text.match(/Error: (.+)/)?.[1] || '';

  // Find the feature's code in the store
  const featureCode = React.useMemo(() => {
    try {
      const feat = useFeatureStore.getState().features.find(f => f.id === featureId);
      return feat?.code || '';
    } catch { return ''; }
  }, [featureId]);

  const handleDeploy = () => {
    try {
      useFeatureStore.getState().deployFeature(featureId);
    } catch (e) { console.warn('Deploy failed:', e); }
  };

  const handleRetest = () => {
    const store = useAthenaStore.getState();
    store.sendMessage(`Test the feature with ID "${featureId}" again`, {});
  };

  return (
    <div className="my-2 rounded-lg overflow-hidden border"
         style={{ borderColor: isPass ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                  background: isPass ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isPass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {isPass ? '✓ PASSED' : '✗ FAILED'}
        </span>
        <span className="text-[11px] font-medium text-[#E8E0D0]">{name}</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1.5">
        {actionsLine && actionsLine !== 'none (pure logic)' && (
          <div>
            <span className="text-[8px] uppercase tracking-widest text-[#9C8E7E]">Actions</span>
            <div className="text-[10px] text-[#cbd5e1] mt-0.5">{actionsLine.split('; ').map((a, i) => (
              <div key={i} className="flex items-center gap-1"><span className="text-emerald-400/60">•</span> {a}</div>
            ))}</div>
          </div>
        )}

        {errorLine && (
          <div>
            <span className="text-[8px] uppercase tracking-widest text-red-400/70">Error</span>
            <div className="text-[10px] text-red-300 mt-0.5 font-mono">{errorLine}</div>
          </div>
        )}

        {/* Logs (collapsible) */}
        {logsLine && (
          <div>
            <button onClick={() => setShowLogs(!showLogs)} className="text-[8px] uppercase tracking-widest text-[#9C8E7E] hover:text-[#E8E0D0] transition-colors">
              {showLogs ? '▾ Logs' : '▸ Logs'}
            </button>
            {showLogs && (
              <pre className="text-[9px] text-[#9C8E7E] font-mono mt-1 p-2 bg-black/30 rounded max-h-24 overflow-auto">
                {logsLine.replace(/; /g, '\n')}
              </pre>
            )}
          </div>
        )}

        {/* Code viewer (collapsible) */}
        {featureCode && (
          <div>
            <button onClick={() => setShowCode(!showCode)} className="text-[8px] uppercase tracking-widest text-[#9C8E7E] hover:text-[#E8E0D0] transition-colors">
              {showCode ? '▾ Source Code' : '▸ Source Code'}
            </button>
            {showCode && (
              <pre className="text-[9px] text-emerald-300/80 font-mono mt-1 p-2 bg-[#0a0a0f] rounded border border-white/[0.06] max-h-48 overflow-auto">
                <code>{featureCode}</code>
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {isPass && (
          <button
            onClick={handleDeploy}
            className="text-[9px] font-bold px-3 py-1 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
          >
            DEPLOY
          </button>
        )}
        <button
          onClick={handleRetest}
          className="text-[9px] font-bold px-3 py-1 rounded bg-white/[0.06] border border-white/[0.08] text-[#9C8E7E] hover:text-[#E8E0D0] transition-colors"
        >
          RE-TEST
        </button>
      </div>
    </div>
  );
}

// Check if a message contains feature test results
function hasFeatureTestResult(text) {
  if (!text || typeof text !== 'string') return false;
  return text.includes('FEATURE CREATED & TESTED') || text.includes('FEATURE CREATED BUT TEST FAILED');
}

// ── Proposal Card Component ──────────────────────────────────────
// Renders Athena's proposal with tiered options and Approve/Reject buttons
function ProposalCard({ proposal, onApprove, onReject }) {
  const [selectedOpt, setSelectedOpt] = useState(null);
  const tierColors = {
    budget:   { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', text: '#10b981', label: '💰 BUDGET' },
    standard: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)', text: '#3b82f6', label: '⚡ STANDARD' },
    premium:  { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.3)', text: '#a855f7', label: '👑 PREMIUM' },
    custom:   { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b', label: '🔧 CUSTOM' },
  };

  const isExecuted = proposal.status === 'executed';
  const isRejected = proposal.status === 'rejected';
  const isPending = proposal.status === 'pending';
  const fmt = (n) => n >= 1e6 ? `€${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `€${(n / 1e3).toFixed(0)}K` : `€${n.toLocaleString()}`;

  return (
    <div className="border border-[#f59e0b]/30 bg-[#f59e0b]/[0.03] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#f59e0b]/20 bg-[#f59e0b]/[0.05]">
        <div className="flex items-center justify-between">
          <div className="text-[9px] text-[#f59e0b] tracking-[0.2em] font-bold">ATHENA PROPOSAL</div>
          <div className={`text-[8px] px-1.5 py-0.5 rounded border ${
            isExecuted ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' :
            isRejected ? 'text-rose-400 border-rose-400/30 bg-rose-400/10' :
            'text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/10 animate-pulse'
          }`}>
            {isExecuted ? '✓ EXECUTED' : isRejected ? '✕ REJECTED' : '◉ AWAITING APPROVAL'}
          </div>
        </div>
        <div className="text-xs font-bold text-tactical-text mt-1">{proposal.title}</div>
      </div>

      {/* Analysis */}
      <div className="px-3 py-2 text-[10px] text-tactical-text/60 border-b border-white/[0.04]">
        {proposal.analysis}
      </div>

      {/* Options */}
      <div className="p-2 space-y-2">
        {proposal.options.map((opt) => {
          const tier = tierColors[opt.tier] || tierColors.standard;
          const isSelected = selectedOpt === opt.id;
          const isExecutedOption = isExecuted && proposal.selectedOptionId === opt.id;

          return (
            <div
              key={opt.id}
              onClick={() => isPending && setSelectedOpt(isSelected ? null : opt.id)}
              className={`rounded-lg border p-2.5 transition-all ${isPending ? 'cursor-pointer' : ''} ${
                isExecutedOption ? 'border-emerald-400/40 bg-emerald-400/[0.06]' :
                isSelected ? `border-[${tier.text}]/50 bg-[${tier.text}]/10` :
                'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
              style={isSelected ? { borderColor: tier.border, background: tier.bg } : isExecutedOption ? {} : undefined}
            >
              {/* Option header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-bold tracking-wider" style={{ color: tier.text }}>{tier.label}</span>
                  <span className="text-[10px] font-bold text-tactical-text">{opt.label}</span>
                </div>
                <span className="text-sm font-black" style={{ color: tier.text }}>{fmt(opt.estimatedCost)}</span>
              </div>

              {/* Description */}
              <div className="text-[10px] text-tactical-text/70 mb-2">{opt.description}</div>

              {/* Comparables */}
              {opt.comparables.length > 0 && (
                <div className="mb-1.5">
                  <div className="text-[8px] text-tactical-text/30 tracking-widest mb-0.5">COMPARABLE PRICING</div>
                  {opt.comparables.map((c, i) => (
                    <div key={i} className="text-[9px] text-[#00e5ff]/60 pl-2 border-l border-[#00e5ff]/20">↗ {c}</div>
                  ))}
                </div>
              )}

              {/* Requirements & Risks row */}
              <div className="flex gap-3">
                {opt.requirements.length > 0 && (
                  <div className="flex-1">
                    <div className="text-[8px] text-tactical-text/30 tracking-widest mb-0.5">REQUIREMENTS</div>
                    {opt.requirements.map((r, i) => (
                      <div key={i} className="text-[9px] text-[#f59e0b]/60">• {r}</div>
                    ))}
                  </div>
                )}
                {opt.risks.length > 0 && (
                  <div className="flex-1">
                    <div className="text-[8px] text-tactical-text/30 tracking-widest mb-0.5">RISKS</div>
                    {opt.risks.map((r, i) => (
                      <div key={i} className="text-[9px] text-rose-400/60">⚠ {r}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Execution results */}
              {isExecutedOption && proposal.executionResults && (
                <div className="mt-2 pt-2 border-t border-emerald-400/20">
                  <div className="text-[8px] text-emerald-400 tracking-widest mb-0.5">EXECUTION RESULTS</div>
                  {proposal.executionResults.map((r, i) => (
                    <div key={i} className={`text-[9px] ${r.startsWith('ERROR') ? 'text-rose-400/70' : 'text-emerald-400/70'}`}>
                      {r.startsWith('ERROR') ? '✕' : '✓'} {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      {isPending && (
        <div className="px-3 pb-3 flex gap-2">
          <button
            onClick={() => selectedOpt && onApprove(selectedOpt)}
            disabled={!selectedOpt}
            className={`flex-1 py-2 rounded text-[10px] font-bold tracking-wider transition-all border ${
              selectedOpt
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 cursor-pointer'
                : 'bg-white/[0.02] border-white/[0.06] text-white/20 cursor-not-allowed'
            }`}
          >
            {selectedOpt ? '✓ APPROVE SELECTED' : 'SELECT AN OPTION'}
          </button>
          <button
            onClick={() => onReject()}
            className="px-4 py-2 rounded text-[10px] font-bold tracking-wider border border-rose-500/30 text-rose-400/60 hover:bg-rose-500/10 hover:text-rose-400 transition-all cursor-pointer"
          >
            ✕ REJECT
          </button>
        </div>
      )}
    </div>
  );
}

// All AI calls go through /api/v1/athena/* — key stays server-side
const ATHENA_CHAT_URL  = '/api/v1/athena/chat';
const ATHENA_BRIEF_URL = '/api/v1/athena/brief';

// Build a rich system prompt from live empire state
function buildSystemPrompt(state) {
  const ownedNodes = Object.values(state.nodes ?? {}).filter(n => n.owner === 'player');
  const rivalNodes = Object.values(state.nodes ?? {}).filter(n => n.owner === 'rival');
  const sectorCounts = {};
  ownedNodes.forEach(n => { sectorCounts[n.type] = (sectorCounts[n.type] ?? 0) + 1; });
  const dominantSector = Object.entries(sectorCounts).sort((a,b) => b[1]-a[1])[0]?.[0] ?? 'finance';

  return `You are ATHENA, the strategic AI advisor embedded inside the AEGIS Empire Command platform.
Your role is to give sharp, tactical, financially grounded intelligence to the empire operator.

CURRENT EMPIRE STATE:
- Company balance: €${(state.companyBalance ?? 0).toLocaleString()}
- Personal balance: €${(state.personalBalance ?? 0).toLocaleString()}
- Net worth: €${(state.netWorth ?? 0).toLocaleString()}
- Monthly income: €${(state.monthlyIncome ?? 0).toLocaleString()}
- Corporate structure: ${state.structure ?? 'Unknown'}
- Tax rate: ${((state.taxRate ?? 0.15) * 100).toFixed(1)}%
- Heat level: ${state.heat ?? 0}/100
- Company country: ${state.companyCountry ?? 'Not registered'}
- Residency country: ${state.residencyCountry ?? 'Not set'}
- Macro regime: ${state.athenaRegime ?? 'unknown'} (risk score ${state.athenaScore ?? 50}/100${state.athenaStale ? ', data stale' : ''})

AXES:
- Growth: ${state.growth ?? 0}/100
- Governance: ${state.governance ?? 0}/100
- Impact: ${state.impact ?? 0}/100
- Power: ${state.power ?? 0}/100

ASSETS:
- Owned nodes: ${ownedNodes.length} (dominant sector: ${dominantSector})
- Rival nodes: ${rivalNodes.length}
- Employee cards: ${Object.keys(state.cards ?? {}).length}

INSTRUCTIONS:
- Be concise, tactical, and direct. No filler.
- Reference the actual empire numbers above when relevant.
- For tax questions, give real jurisdiction comparisons with accurate rates.
- For strategy questions, recommend specific actions (decrypt intel, upgrade nodes, open packs, etc.).
- Never break character. You are ATHENA — intelligence-grade, not friendly-corporate.
- Format with short paragraphs. Use bullet points for comparisons. Max 4 paragraphs per response.`;
}

// ── Token usage tracker (persisted in localStorage) ──
const USAGE_KEY = 'athena-token-usage';
function getUsageLog() {
  try { return JSON.parse(localStorage.getItem(USAGE_KEY) || '{"calls":0,"inputTokens":0,"outputTokens":0,"history":[]}'); }
  catch { return { calls: 0, inputTokens: 0, outputTokens: 0, history: [] }; }
}
function logUsage(type, usage) {
  if (!usage) return;
  const log = getUsageLog();
  log.calls++;
  log.inputTokens += usage.input_tokens || 0;
  log.outputTokens += usage.output_tokens || 0;
  log.history.push({
    type,
    input: usage.input_tokens || 0,
    output: usage.output_tokens || 0,
    ts: Date.now(),
  });
  // Keep last 500 entries
  if (log.history.length > 500) log.history = log.history.slice(-500);
  localStorage.setItem(USAGE_KEY, JSON.stringify(log));
}

// ── Sentinel Investment Memo Generator ──────────────────────────
function SentinelMemo({ nodes, companyBalance, netWorth, monthlyIncome, heat, growth, governance, impact, power }) {
  const allNodes = Object.values(nodes ?? {});
  const owned = allNodes.filter(n => n.owner === 'player');
  const rivals = allNodes.filter(n => n.owner === 'rival');
  const market = allNodes.filter(n => n.owner === 'market');

  const [selectedNode, setSelectedNode] = useState(null);

  // Sector breakdown
  const sectorMap = {};
  owned.forEach(n => {
    const s = n.type || 'other';
    if (!sectorMap[s]) sectorMap[s] = { count: 0, income: 0, capex: 0 };
    sectorMap[s].count++;
    sectorMap[s].income += n.income || 0;
    sectorMap[s].capex += n.capex || 0;
  });
  const sectors = Object.entries(sectorMap).sort((a, b) => b[1].income - a[1].income);
  const totalIncome = owned.reduce((s, n) => s + (n.income || 0), 0);
  const totalCapex = owned.reduce((s, n) => s + (n.capex || 0), 0);

  // Generate memo for a specific node
  const generateMemo = (node) => {
    const roi = node.income > 0 && node.capex > 0 ? ((node.income * 12) / node.capex * 100).toFixed(1) : '0.0';
    const paybackMonths = node.income > 0 ? Math.ceil(node.capex / node.income) : Infinity;
    const opexRatio = node.income > 0 ? ((node.opex || 0) / node.income * 100).toFixed(0) : '0';
    const sectorNodes = owned.filter(n => n.type === node.type);
    const sectorConcentration = owned.length > 0 ? ((sectorNodes.length / owned.length) * 100).toFixed(0) : '0';

    const riskFactors = [];
    if (heat > 60) riskFactors.push('HIGH HEAT — regulatory exposure elevated');
    if (parseInt(sectorConcentration) > 40) riskFactors.push(`CONCENTRATION RISK — ${sectorConcentration}% portfolio in ${node.type}`);
    if (paybackMonths > 24) riskFactors.push(`SLOW PAYBACK — ${paybackMonths}mo recovery period`);
    if (parseInt(opexRatio) > 70) riskFactors.push(`HIGH OPEX — ${opexRatio}% of revenue consumed by operations`);
    if (governance < 20) riskFactors.push('WEAK GOVERNANCE — compliance risk');

    const opportunities = [];
    if (parseFloat(roi) > 15) opportunities.push(`STRONG ROI at ${roi}% annual — outperforms sector average`);
    if (paybackMonths < 12) opportunities.push(`FAST PAYBACK — capital recovered in ${paybackMonths} months`);
    if (sectorNodes.length >= 3) opportunities.push(`SYNERGY CLUSTER — ${sectorNodes.length} ${node.type} assets enable vertical integration`);
    if (growth > 60) opportunities.push('HIGH GROWTH momentum amplifies returns');

    return { roi, paybackMonths, opexRatio, sectorConcentration, riskFactors, opportunities };
  };

  // Portfolio-level memo
  const portfolioHealth = () => {
    const diversification = sectors.length;
    const avgRoi = totalCapex > 0 ? ((totalIncome * 12) / totalCapex * 100).toFixed(1) : '0.0';
    const cashRunway = monthlyIncome > 0 ? Math.floor(companyBalance / (monthlyIncome * 0.3)) : 0;

    let rating = 'C';
    const score = (diversification * 10) + (parseFloat(avgRoi) * 2) + (governance * 0.3) + (100 - heat) * 0.2;
    if (score > 80) rating = 'AAA';
    else if (score > 65) rating = 'AA';
    else if (score > 50) rating = 'A';
    else if (score > 35) rating = 'BBB';
    else if (score > 20) rating = 'BB';
    else rating = 'B';

    return { diversification, avgRoi, cashRunway, rating, score: Math.round(score) };
  };

  const portfolio = portfolioHealth();
  const fmt = (n) => n >= 1e6 ? `€${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `€${(n / 1e3).toFixed(0)}K` : `€${n}`;
  const ratingColor = { AAA: '#10b981', AA: '#10b981', A: '#22d3ee', BBB: '#f59e0b', BB: '#f97316', B: '#ef4444', C: '#ef4444' };

  if (owned.length === 0) {
    return (
      <div className="p-6 text-center py-12">
        <div className="text-2xl mb-3">📊</div>
        <div className="text-[#f59e0b] mb-2 font-bold uppercase tracking-widest text-xs">No Assets to Analyze</div>
        <div className="text-[10px] text-tactical-text/50 max-w-xs mx-auto">
          Acquire infrastructure nodes from the MARKET tab to generate Sentinel investment memos.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 text-xs font-mono">
      {/* Portfolio Rating Banner */}
      <div className="border border-[#f59e0b]/30 bg-[#f59e0b]/5 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] text-[#f59e0b] tracking-[0.2em] font-bold">SENTINEL PORTFOLIO RATING</span>
          <span className="text-lg font-black" style={{ color: ratingColor[portfolio.rating] }}>{portfolio.rating}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div><div className="text-[8px] text-tactical-text/40">AVG ROI</div><div className="text-[#10b981] font-bold">{portfolio.avgRoi}%</div></div>
          <div><div className="text-[8px] text-tactical-text/40">SECTORS</div><div className="text-[#00e5ff] font-bold">{portfolio.diversification}</div></div>
          <div><div className="text-[8px] text-tactical-text/40">ASSETS</div><div className="text-tactical-text font-bold">{owned.length}</div></div>
          <div><div className="text-[8px] text-tactical-text/40">RUNWAY</div><div className="text-[#a78bfa] font-bold">{portfolio.cashRunway}mo</div></div>
        </div>
      </div>

      {/* Sector Breakdown */}
      <div className="space-y-1">
        <div className="text-[9px] text-tactical-text/40 tracking-widest">SECTOR ALLOCATION</div>
        {sectors.map(([sector, data]) => {
          const pct = totalIncome > 0 ? (data.income / totalIncome * 100).toFixed(0) : 0;
          return (
            <div key={sector} className="flex items-center gap-2 text-[10px]">
              <span className="text-tactical-text/60 uppercase w-24 truncate">{sector}</span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#f59e0b]/60 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-tactical-text/50 w-8 text-right">{pct}%</span>
              <span className="text-[#10b981] w-16 text-right">{fmt(data.income)}/mo</span>
              <span className="text-tactical-text/30 w-5 text-right">{data.count}×</span>
            </div>
          );
        })}
      </div>

      {/* Node List for Memo Selection */}
      <div className="space-y-1">
        <div className="text-[9px] text-tactical-text/40 tracking-widest">SELECT ASSET FOR INVESTMENT MEMO</div>
        <div className="max-h-40 overflow-y-auto space-y-0.5">
          {owned.map(node => (
            <button
              key={node.id}
              onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
              className={`w-full text-left px-2 py-1.5 rounded text-[10px] flex items-center justify-between transition-all ${
                selectedNode?.id === node.id
                  ? 'bg-[#f59e0b]/15 border border-[#f59e0b]/40 text-[#f59e0b]'
                  : 'bg-white/[0.02] hover:bg-white/[0.05] text-tactical-text/70'
              }`}
            >
              <span className="truncate flex-1">{node.name}</span>
              <span className="text-[8px] uppercase text-tactical-text/30 mx-2">{node.type}</span>
              <span className="text-[#10b981]">{fmt(node.income || 0)}/mo</span>
            </button>
          ))}
        </div>
      </div>

      {/* Investment Memo */}
      {selectedNode && (() => {
        const memo = generateMemo(selectedNode);
        return (
          <div className="border border-[#f59e0b]/20 bg-black/30 rounded-lg p-3 space-y-3">
            <div className="border-b border-[#f59e0b]/20 pb-2">
              <div className="text-[9px] text-[#f59e0b]/60 tracking-widest">SENTINEL INVESTMENT MEMO</div>
              <div className="text-sm font-bold text-tactical-text mt-0.5">{selectedNode.name}</div>
              <div className="text-[9px] text-tactical-text/40 mt-0.5">
                {selectedNode.type?.toUpperCase()} · {selectedNode.region || selectedNode.country || 'Global'}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white/[0.03] rounded p-2">
                <div className="text-[8px] text-tactical-text/40">ANNUAL ROI</div>
                <div className={`font-bold ${parseFloat(memo.roi) > 10 ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>{memo.roi}%</div>
              </div>
              <div className="bg-white/[0.03] rounded p-2">
                <div className="text-[8px] text-tactical-text/40">PAYBACK</div>
                <div className={`font-bold ${memo.paybackMonths < 18 ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>{memo.paybackMonths === Infinity ? '∞' : `${memo.paybackMonths}mo`}</div>
              </div>
              <div className="bg-white/[0.03] rounded p-2">
                <div className="text-[8px] text-tactical-text/40">OPEX RATIO</div>
                <div className={`font-bold ${parseInt(memo.opexRatio) < 50 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{memo.opexRatio}%</div>
              </div>
              <div className="bg-white/[0.03] rounded p-2">
                <div className="text-[8px] text-tactical-text/40">SECTOR WT</div>
                <div className="font-bold text-[#00e5ff]">{memo.sectorConcentration}%</div>
              </div>
            </div>

            {/* Financials */}
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div><span className="text-tactical-text/40">CAPEX: </span><span className="text-tactical-text">{fmt(selectedNode.capex || 0)}</span></div>
              <div><span className="text-tactical-text/40">OPEX: </span><span className="text-tactical-text">{fmt(selectedNode.opex || 0)}/mo</span></div>
              <div><span className="text-tactical-text/40">INCOME: </span><span className="text-[#10b981]">{fmt(selectedNode.income || 0)}/mo</span></div>
            </div>

            {/* Risk Factors */}
            {memo.riskFactors.length > 0 && (
              <div>
                <div className="text-[9px] text-[#ef4444] tracking-widest mb-1">▼ RISK FACTORS</div>
                {memo.riskFactors.map((r, i) => (
                  <div key={i} className="text-[10px] text-[#ef4444]/70 pl-2 border-l border-[#ef4444]/20 mb-0.5">{r}</div>
                ))}
              </div>
            )}

            {/* Opportunities */}
            {memo.opportunities.length > 0 && (
              <div>
                <div className="text-[9px] text-[#10b981] tracking-widest mb-1">▲ OPPORTUNITIES</div>
                {memo.opportunities.map((o, i) => (
                  <div key={i} className="text-[10px] text-[#10b981]/70 pl-2 border-l border-[#10b981]/20 mb-0.5">{o}</div>
                ))}
              </div>
            )}

            {/* Verdict */}
            <div className="border-t border-[#f59e0b]/20 pt-2">
              <div className="text-[9px] text-[#f59e0b] tracking-widest mb-1">SENTINEL VERDICT</div>
              <div className="text-[10px] text-tactical-text/70">
                {parseFloat(memo.roi) > 15 && memo.paybackMonths < 18
                  ? '✓ STRONG BUY — High returns with rapid payback. Consider expanding sector position.'
                  : parseFloat(memo.roi) > 8
                  ? '◉ HOLD — Solid performer. Monitor opex ratio and maintain operational efficiency.'
                  : parseFloat(memo.roi) > 3
                  ? '◎ UNDERPERFORMING — Below benchmark returns. Review operational strategy or consider divestment.'
                  : '✕ DIVEST — Capital is trapped. Liquidate and redeploy to higher-yield assets.'}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Athena Match Actions ─────────────────────────────────────────
// Quick-action buttons and natural language command execution during matches

/* ── Universal Athena Actions (replaces old match-only AthenaMatchActions) ── */
function AthenaUniversalActions({ navCallbacks, pendingProposal }) {
  const matchActive = useMatchStore(s => s.active);
  const executeTool = useAthenaStore(s => s.executeTool);
  const approveProposal = useAthenaStore(s => s.approveProposal);
  const rejectProposal = useAthenaStore(s => s.rejectProposal);
  const actionQueue = useAthenaStore(s => s.actionQueue);
  const [commandInput, setCommandInput] = useState('');
  const [expandedCat, setExpandedCat] = useState(null);

  const toolsByCategory = getToolsByCategory(matchActive);
  const categories = Object.keys(toolsByCategory);

  const handleQuickAction = (tool) => {
    // For tools with no required params, execute immediately
    const requiredParams = Object.entries(tool.parameters).filter(([_, p]) => p.required);
    if (requiredParams.length === 0) {
      executeTool(tool.name, {}, navCallbacks);
    } else {
      // Pre-fill command input with tool name for user to add params
      setCommandInput(`${tool.name.replace(/_/g, ' ')}`);
    }
  };

  // Send command through Athena AI for intelligent parsing
  const executeCommand = async () => {
    const cmd = commandInput.trim();
    if (!cmd) return;
    setCommandInput('');
    // Use athenaStore.sendMessage which goes through Blackbox AI tool-calling
    await useAthenaStore.getState().sendMessage(cmd, navCallbacks);
  };

  const recentActions = actionQueue.slice(-15).reverse();

  return (
    <div className="p-4 space-y-3 text-xs font-mono">
      {/* Command Input — AI-powered */}
      <div className="border border-[#7c3aed]/30 bg-[#7c3aed]/5 rounded-lg p-3">
        <div className="text-[9px] text-[#7c3aed] tracking-[0.2em] font-bold mb-2">ATHENA DIRECTIVE</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={commandInput}
            onChange={e => setCommandInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') executeCommand(); }}
            placeholder="e.g. 'acquire cheapest node', 'attack player 2', 'decrypt intel'..."
            className="flex-1 bg-tactical-bg/60 border border-tactical-border/40 rounded px-2 py-1.5 text-[10px] font-mono text-tactical-text placeholder-tactical-text/30 outline-none focus:border-[#7c3aed]/60"
          />
          <button
            onClick={executeCommand}
            disabled={!commandInput.trim()}
            className={`px-3 py-1.5 rounded text-[9px] font-mono tracking-wider transition-all ${
              commandInput.trim()
                ? 'bg-[#7c3aed]/20 text-[#7c3aed] border border-[#7c3aed]/40 hover:bg-[#7c3aed]/30 cursor-pointer'
                : 'bg-white/[0.02] text-white/15 border border-white/[0.04] cursor-not-allowed'
            }`}
          >
            EXECUTE
          </button>
        </div>
        <div className="text-[8px] text-tactical-text/20 mt-1">
          Natural language commands: buy, sell, acquire, steal, attack, deploy, decrypt, upgrade, cyber strike
        </div>
      </div>

      {/* Pending Proposal */}
      {pendingProposal && pendingProposal.status === 'pending' && (
        <ProposalCard
          proposal={pendingProposal}
          onApprove={(optId) => approveProposal(optId, navCallbacks)}
          onReject={(reason) => rejectProposal(reason)}
        />
      )}

      {/* Quick Actions — collapsible categories */}
      <div className="space-y-1">
        {categories.map(cat => {
          const meta = CATEGORY_META[cat] || { label: cat.toUpperCase(), icon: '•' };
          const tools = toolsByCategory[cat];
          const isExpanded = expandedCat === cat;

          return (
            <div key={cat}>
              <button
                onClick={() => setExpandedCat(isExpanded ? null : cat)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.02] border border-white/[0.04] hover:border-[#7c3aed]/20 transition-all text-left"
              >
                <span className="text-[10px] opacity-60">{meta.icon}</span>
                <span className="text-[8px] text-tactical-text/50 tracking-[0.2em] flex-1">{meta.label}</span>
                <span className="text-[8px] text-tactical-text/20">{tools.length}</span>
                <span className="text-[8px] text-tactical-text/20">{isExpanded ? '▼' : '▸'}</span>
              </button>
              {isExpanded && (
                <div className="grid grid-cols-2 gap-1 mt-1 ml-2">
                  {tools.map(tool => {
                    const disabled = tool.matchOnly && !matchActive;
                    return (
                      <button
                        key={tool.name}
                        onClick={() => !disabled && handleQuickAction(tool)}
                        disabled={disabled}
                        className={`text-left px-2 py-1.5 rounded border transition-all ${
                          disabled
                            ? 'bg-white/[0.01] border-white/[0.03] opacity-30 cursor-not-allowed'
                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-[#7c3aed]/[0.06] hover:border-[#7c3aed]/20 cursor-pointer'
                        }`}
                      >
                        <div className="text-[9px] text-tactical-text/70">{tool.name.replace(/_/g, ' ')}</div>
                        <div className="text-[7px] text-tactical-text/20 mt-0.5 truncate">{tool.description}</div>
                        {disabled && <div className="text-[6px] text-rose-400/40 mt-0.5">MATCH ONLY</div>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Log */}
      {recentActions.length > 0 && (
        <div>
          <div className="text-[8px] text-tactical-text/30 tracking-[0.2em] mb-1">ACTION LOG</div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {recentActions.map((entry, i) => (
              <div key={`${entry.timestamp}-${i}`} className={`flex items-start gap-2 px-2 py-1 rounded text-[9px] ${
                entry.status === 'done' ? 'bg-emerald-500/[0.04] text-emerald-400/70' : 'bg-rose-500/[0.04] text-rose-400/70'
              }`}>
                <span>{entry.status === 'done' ? '✓' : '✕'}</span>
                <span className="text-tactical-text/30 text-[8px]">{entry.toolName}</span>
                <span className="flex-1">{entry.result}</span>
                <span className="text-tactical-text/15 text-[7px]">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const AthenaPanel = ({
  onClose,
  initialQuery = '',
  initialTab = 'brief',
  fullPage = false,
  navCallbacks = {},
  docked = false,
  dockPosition = 'right',
  dockWidth = 420,
  dockHeight = '78vh',
  dockOffset = { bottom: 16, left: 16, right: 16 },
}) => {
  const hasFullAthena = useAuthStore(selectHasFullAthena);
  const currentTier = useAuthStore(s => s.subscriptionTier);
  const [dailyQueries, setDailyQueries] = useState(() => getAthenaDaily().count);
  const [effectiveLimit, setEffectiveLimit] = useState(() => getEffectiveLimit());
  const [adLoading, setAdLoading] = useState(false);

  const [tab, setTab] = useState(initialTab === 'query' || initialTab === 'actions' ? 'athena' : initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [usageStats, setUsageStats] = useState(getUsageLog);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);
  const messagesEndRef = useRef(null);

  // Athena store (unified messages + tools + proposals)
  const storeMessages = useAthenaStore(s => s.messages);
  const isLoading = useAthenaStore(s => s.isLoading);
  const pendingProposal = useAthenaStore(s => s.pendingProposal);
  const approveProposal = useAthenaStore(s => s.approveProposal);
  const rejectProposal = useAthenaStore(s => s.rejectProposal);
  const lastProvider = useAthenaStore(s => s.lastProvider);
  const actionQueue = useAthenaStore(s => s.actionQueue);
  const executeTool = useAthenaStore(s => s.executeTool);

  const matchActive = useMatchStore(s => s.active);

  const athenaRegime    = useEmpireStore((s) => s.athenaRegime);
  const athenaScore     = useEmpireStore((s) => s.athenaScore);
  const athenaStale     = useEmpireStore((s) => s.athenaStale);
  const companyBalance = useEmpireStore((s) => s.companyBalance);
  const netWorth       = useEmpireStore((s) => s.netWorth);
  const monthlyIncome  = useEmpireStore((s) => s.monthlyIncome);
  const heat           = useEmpireStore((s) => s.heat);
  const growth         = useEmpireStore((s) => s.growth);
  const governance     = useEmpireStore((s) => s.governance);
  const impact         = useEmpireStore((s) => s.impact);
  const power          = useEmpireStore((s) => s.power);
  const nodes          = useEmpireStore((s) => s.nodes);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [storeMessages, isLoading]);

  // Unified send — routes ALL messages through athenaStore.sendMessage (tool-calling enabled)
  const handleSend = async () => {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;

    // Enforce daily limit for non-full tiers (10 free + unlimited via ads)
    if (!hasFullAthena) {
      const current = getAthenaDaily();
      const limit = MAX_FREE_QUERIES + current.bonusGranted;
      if (current.count >= limit) return; // limit reached — show ad prompt
      incrementAthenaDaily();
      setDailyQueries(current.count + 1);
    }

    setQuery('');
    await useAthenaStore.getState().sendMessage(trimmed, navCallbacks);
    logUsage('chat', { input_tokens: 0, output_tokens: 0 }); // usage tracked in store
    setUsageStats(getUsageLog());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
    // Also send on plain Enter (single line) if not shift-held
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick action handler
  const handleQuickAction = (tool) => {
    const requiredParams = Object.entries(tool.parameters).filter(([_, p]) => p.required);
    if (requiredParams.length === 0) {
      executeTool(tool.name, {}, navCallbacks);
    } else {
      setQuery(`${tool.name.replace(/_/g, ' ')}`);
      setShowQuickActions(false);
    }
  };

  const toolsByCategory = getToolsByCategory(matchActive);
  const categories = Object.keys(toolsByCategory);
  const recentActions = actionQueue.slice(-10).reverse();

  const generateBrief = useCallback(async () => {
    setBriefLoading(true);
    setBrief('');
    const s = useEmpireStore.getState();
    const ownedNodes = Object.values(s.nodes).filter(n => n.owner === 'player');
    const prompt = `Generate a 3-paragraph SITREP for this empire. Be direct and tactical — no fluff.
Macro regime: ${athenaRegime.toUpperCase()} (risk score ${athenaScore}/100${athenaStale ? ', STALE' : ''})
Financials: €${s.companyBalance.toLocaleString()} company · €${s.netWorth.toLocaleString()} net worth · €${s.monthlyIncome.toLocaleString()}/mo · ${s.taxRate*100}% tax · heat ${s.heat}/100
Axes: Growth ${s.growth} · Governance ${s.governance} · Impact ${s.impact} · Power ${s.power}
Assets: ${ownedNodes.length} owned nodes · ${Object.keys(s.cards).length} employee cards
Structure: ${s.structure} in ${s.companyCountry ?? 'unregistered'}
Paragraph 1: Financial health and macro risk exposure.
Paragraph 2: Operational vulnerabilities (heat, axes, node coverage).
Paragraph 3: Top 2 recommended actions right now.`;

    try {
      const res = await apiFetch(ATHENA_BRIEF_URL, {
        method: 'POST',
        body: JSON.stringify({
          system: buildSystemPrompt(s),
          prompt,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setBrief(data.text ?? '(no response)');
      if (data.usage) { logUsage('brief', data.usage); setUsageStats(getUsageLog()); }
    } catch (err) {
      setBrief(`BRIEF_ERROR: ${err.message}`);
    } finally {
      setBriefLoading(false);
    }
  }, [athenaRegime, athenaScore, athenaStale]);

  const panelStyle = docked
    ? {
        width: typeof dockWidth === 'number' ? `${dockWidth}px` : dockWidth,
        maxHeight: dockHeight,
        bottom: dockOffset?.bottom ?? 16,
        left: dockPosition === 'left' ? (dockOffset?.left ?? 16) : 'auto',
        right: dockPosition === 'right' ? (dockOffset?.right ?? 16) : 'auto',
      }
    : undefined;

  return (
    <div
      className={`${docked
        ? 'fixed z-[70] bg-tactical-bg/95 border border-tactical-border/70 rounded-xl flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl'
        : 'absolute bottom-16 left-1/2 -translate-x-1/2 w-[calc(100vw-1rem)] max-w-[720px] max-h-[70vh] bg-tactical-bg/95 border border-tactical-border/70 rounded-xl z-30 flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl'
      }`}
      style={panelStyle}
    >

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-tactical-border/50 flex-shrink-0 bg-black/40">
        <span className="font-bold tracking-widest text-sm uppercase text-[#7c3aed]">ATHENA AI</span>
        <span className="text-tactical-text/30 text-[10px] uppercase tracking-widest">Empire Operations Intelligence</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] font-mono px-2 py-0.5 rounded border text-[#7c3aed] border-[#7c3aed]/40 bg-[#7c3aed]/10">
            AI ONLINE
          </span>
          <button onClick={onClose} aria-label="Close Athena panel" className="text-tactical-text/40 hover:text-tactical-text transition-colors p-1">✕</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-tactical-border/40 flex-shrink-0 bg-black/20">
        {[
          { id: 'brief',    label: 'EMPIRE SITREP' },
          { id: 'athena',   label: 'ATHENA' },
          { id: 'sentinel', label: 'SENTINEL MEMO' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-[10px] font-mono uppercase tracking-widest border-b-2 transition-colors ${
              tab === id
                ? 'border-[#7c3aed] text-[#7c3aed]'
                : 'border-transparent text-tactical-text/40 hover:text-tactical-text/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto font-mono">

        {tab === 'brief' && (
          <div className="p-4 space-y-3 text-xs font-mono">
            {/* Live KPI strip */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'COMPANY',    value: `€${companyBalance.toLocaleString()}` },
                { label: 'NET WORTH',  value: `€${netWorth.toLocaleString()}` },
                { label: 'MO. INCOME', value: `€${monthlyIncome.toLocaleString()}` },
                { label: 'HEAT',       value: `${heat}/100`, warn: heat > 50 },
              ].map(({ label, value, warn }) => (
                <div key={label} className="border border-tactical-border/40 bg-black/30 rounded p-2">
                  <div className="text-[9px] text-tactical-text/40 tracking-widest">{label}</div>
                  <div className={`font-bold mt-0.5 ${warn ? 'text-red-400' : 'text-tactical-text'}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Axes */}
            <div className="border border-tactical-border/40 bg-black/30 rounded p-2 space-y-1.5">
              {[
                { label: 'GROWTH',     value: growth,     color: '#10b981' },
                { label: 'GOVERNANCE', value: governance, color: '#3b82f6' },
                { label: 'IMPACT',     value: impact,     color: '#f59e0b' },
                { label: 'POWER',      value: power,      color: '#7c3aed' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-[9px] text-tactical-text/40 w-20 tracking-widest">{label}</span>
                  <div className="flex-1 h-1 bg-tactical-border/30 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
                  </div>
                  <span className="text-[9px] w-6 text-right" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Macro regime badge */}
            <div className="flex items-center justify-between border border-tactical-border/40 bg-black/30 rounded p-2">
              <div>
                <div className="text-[9px] text-tactical-text/40 tracking-widest">MACRO REGIME</div>
                <div className={`font-bold mt-0.5 ${
                  athenaRegime === 'risk-on'  ? 'text-green-400'  :
                  athenaRegime === 'risk-off' ? 'text-red-400'    :
                  athenaRegime === 'neutral'  ? 'text-yellow-400' : 'text-tactical-text/40'
                }`}>
                  {athenaRegime.toUpperCase()}
                  {athenaStale && <span className="text-tactical-text/30 text-[9px] ml-1">(STALE)</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-tactical-text/40 tracking-widest">RISK SCORE</div>
                <div className={`font-bold mt-0.5 ${athenaScore > 65 ? 'text-red-400' : athenaScore > 35 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {athenaScore}/100
                </div>
              </div>
            </div>

            {/* Node coverage */}
            <div className="border border-tactical-border/40 bg-black/30 rounded p-2">
              <div className="text-[9px] text-tactical-text/40 tracking-widest mb-1">NODE COVERAGE</div>
              <div className="flex gap-2 flex-wrap">
                {['player','market','rival'].map(owner => {
                  const count = Object.values(nodes).filter(n => n.owner === owner).length;
                  const colors = { player: 'text-green-400', market: 'text-tactical-text/50', rival: 'text-red-400' };
                  return (
                    <span key={owner} className={`text-[9px] ${colors[owner]}`}>
                      {owner.toUpperCase()} {count}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Generated brief */}
            <div className="border border-[#7c3aed]/30 bg-[#7c3aed]/5 rounded p-3">
              {brief ? (
                <p className="text-tactical-text/70 leading-relaxed whitespace-pre-wrap">{brief}</p>
              ) : (
                <div className="text-center py-2">
                  <div className="text-[10px] text-tactical-text/30 mb-2">
                    {briefLoading ? 'Generating intelligence brief…' : 'No brief generated yet.'}
                  </div>
                  {briefLoading && (
                    <div className="flex justify-center gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={generateBrief}
              disabled={briefLoading}
              className="w-full py-1.5 text-[10px] tracking-widest rounded border transition-all"
              style={{
                borderColor: briefLoading ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.5)',
                color:       briefLoading ? 'rgba(124,58,237,0.4)' : '#7c3aed',
                background:  'rgba(124,58,237,0.08)',
                cursor:      briefLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {briefLoading ? 'GENERATING…' : brief ? 'REGENERATE BRIEF' : 'GENERATE SITREP'}
            </button>
          </div>
        )}

        {tab === 'athena' && (
          <div className="flex flex-col h-full">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {storeMessages.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <div className="text-[#7c3aed] text-xs mb-2 uppercase tracking-widest">ATHENA standing by</div>
                  <div className="text-tactical-text/30 text-[10px] max-w-sm mx-auto">
                    Ask questions or give commands — "buy 5 AAPL", "acquire cheapest node", "what's my portfolio?", "attack the leader"
                  </div>
                  <div className="text-tactical-text/20 text-[9px] mt-2">Enter to send · Shift+Enter for new line</div>
                </div>
              )}

              {storeMessages.map((msg, i) => {
                // Skip tool-result messages in chat display (they're summarized by the assistant)
                if (msg.role === 'tool') return null;

                // Render proposal messages
                if (msg.proposal) {
                  return (
                    <div key={`msg-${i}`} className="w-full">
                      {msg.content && (
                        <div className="flex justify-start mb-2">
                          <div className="max-w-[85%] rounded-lg px-3 py-2.5 text-[11px] leading-relaxed whitespace-pre-wrap"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1' }}>
                            <div className="text-[8px] text-[#7c3aed] uppercase tracking-widest mb-1.5">ATHENA</div>
                            {msg.content}
                          </div>
                        </div>
                      )}
                      <ProposalCard
                        proposal={msg.proposal}
                        onApprove={(optId) => approveProposal(optId, navCallbacks)}
                        onReject={(reason) => rejectProposal(reason)}
                      />
                    </div>
                  );
                }

                // Regular messages
                return (
                  <div key={`msg-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="max-w-[85%] rounded-lg px-3 py-2.5 text-[11px] leading-relaxed whitespace-pre-wrap"
                      style={
                        msg.role === 'user'
                          ? { background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#e2e8f0' }
                          : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1' }
                      }
                    >
                      {msg.role === 'assistant' && (
                        <div className="text-[8px] text-[#7c3aed] uppercase tracking-widest mb-1.5">ATHENA</div>
                      )}
                      {msg.role === 'assistant' ? renderMessageContent(msg.content) : msg.content}
                      {/* Feature Test Results Card */}
                      {msg.role === 'assistant' && hasFeatureTestResult(msg.content) && (
                        <FeatureTestCard text={msg.content} />
                      )}
                      {/* Show tool call badges on assistant messages */}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-1.5 border-t border-white/[0.06]">
                          {msg.toolCalls.map((tc, j) => (
                            <span key={j} className="text-[7px] px-1.5 py-0.5 rounded bg-[#7c3aed]/10 border border-[#7c3aed]/20 text-[#7c3aed]/70">
                              ⚡ {tc.name.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Pending proposal not yet in store messages */}
              {pendingProposal && pendingProposal.status === 'pending' && !storeMessages.some(m => m.proposal?.id === pendingProposal.id) && (
                <div className="w-full">
                  <ProposalCard
                    proposal={pendingProposal}
                    onApprove={(optId) => approveProposal(optId, navCallbacks)}
                    onReject={(reason) => rejectProposal(reason)}
                  />
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="text-[8px] text-[#7c3aed] uppercase tracking-widest mb-1.5">ATHENA</div>
                    <div className="flex gap-1 items-center">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-bounce"
                             style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent action log — inline in the chat */}
              {recentActions.length > 0 && (
                <div className="border border-white/[0.04] rounded-lg overflow-hidden">
                  <div className="px-2.5 py-1.5 bg-white/[0.02] border-b border-white/[0.04]">
                    <div className="text-[8px] text-tactical-text/30 tracking-[0.2em]">ACTION LOG</div>
                  </div>
                  <div className="space-y-0 max-h-28 overflow-y-auto">
                    {recentActions.map((entry, i) => (
                      <div key={`${entry.timestamp}-${i}`} className={`flex items-start gap-2 px-2.5 py-1 text-[9px] ${
                        entry.status === 'done' ? 'text-emerald-400/70' : 'text-rose-400/70'
                      }`}>
                        <span>{entry.status === 'done' ? '✓' : '✕'}</span>
                        <span className="text-tactical-text/30 text-[8px]">{entry.toolName}</span>
                        <span className="flex-1 truncate">{entry.result}</span>
                        <span className="text-tactical-text/15 text-[7px]">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Collapsible Quick Actions */}
            {showQuickActions && (
              <div className="border-t border-tactical-border/40 bg-black/30 max-h-48 overflow-y-auto p-2 space-y-1">
                {categories.map(cat => {
                  const meta = CATEGORY_META[cat] || { label: cat.toUpperCase(), icon: '•' };
                  const tools = toolsByCategory[cat];
                  const isExpanded = expandedCat === cat;
                  return (
                    <div key={cat}>
                      <button
                        onClick={() => setExpandedCat(isExpanded ? null : cat)}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded bg-white/[0.02] border border-white/[0.04] hover:border-[#7c3aed]/20 transition-all text-left"
                      >
                        <span className="text-[10px] opacity-60">{meta.icon}</span>
                        <span className="text-[8px] text-tactical-text/50 tracking-[0.2em] flex-1">{meta.label}</span>
                        <span className="text-[8px] text-tactical-text/20">{tools.length}</span>
                        <span className="text-[8px] text-tactical-text/20">{isExpanded ? '▼' : '▸'}</span>
                      </button>
                      {isExpanded && (
                        <div className="grid grid-cols-3 gap-1 mt-1 ml-2">
                          {tools.map(tool => {
                            const disabled = tool.matchOnly && !matchActive;
                            return (
                              <button
                                key={tool.name}
                                onClick={() => !disabled && handleQuickAction(tool)}
                                disabled={disabled}
                                className={`text-left px-2 py-1 rounded border transition-all ${
                                  disabled
                                    ? 'bg-white/[0.01] border-white/[0.03] opacity-30 cursor-not-allowed'
                                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-[#7c3aed]/[0.06] hover:border-[#7c3aed]/20 cursor-pointer'
                                }`}
                              >
                                <div className="text-[8px] text-tactical-text/70">{tool.name.replace(/_/g, ' ')}</div>
                                {disabled && <div className="text-[6px] text-rose-400/40">MATCH ONLY</div>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Athena tier limit banner */}
            {!hasFullAthena && (
              <div className="px-3 py-2 border-t border-tactical-border/40 bg-[#7c3aed]/[0.04]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-[#7c3aed]/70">
                    {dailyQueries >= effectiveLimit
                      ? 'Queries used up'
                      : `${effectiveLimit - dailyQueries} of ${effectiveLimit} queries remaining`}
                  </span>
                  {dailyQueries >= effectiveLimit ? (
                    <button
                      className="text-[9px] font-mono font-bold text-[#00e5ff] hover:text-[#00e5ff]/80 tracking-wider uppercase transition-colors"
                      disabled={adLoading}
                      onClick={() => {
                        setAdLoading(true);
                        // Trigger interstitial ad — after completion, grant bonus
                        try {
                          useAdStore.getState().triggerInterstitial();
                          // Listen for interstitial dismissal (ad completed)
                          const checkInterval = setInterval(() => {
                            if (!useAdStore.getState().showInterstitial) {
                              clearInterval(checkInterval);
                              const newBonus = grantAdBonus();
                              setEffectiveLimit(MAX_FREE_QUERIES + newBonus);
                              setAdLoading(false);
                            }
                          }, 500);
                          // Safety timeout
                          setTimeout(() => { clearInterval(checkInterval); setAdLoading(false); }, 90000);
                        } catch { setAdLoading(false); }
                      }}
                    >
                      {adLoading ? '⏳ Watching…' : '▶ Watch 1min ad for +5 queries'}
                    </button>
                  ) : (
                    <span className="text-[8px] font-mono text-[#a78bfa]/50 tracking-wider uppercase">
                      Upgrade to {TIER_CONFIG[2].name} for unlimited
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Unified Input Bar */}
            <div className="p-3 border-t border-tactical-border/40 bg-black/20 flex-shrink-0">
              <div className="flex gap-2 items-end">
                {/* Quick actions toggle */}
                <button
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className={`px-2 py-2 rounded text-[10px] transition-all border ${
                    showQuickActions
                      ? 'bg-[#7c3aed]/15 border-[#7c3aed]/40 text-[#7c3aed]'
                      : 'bg-white/[0.02] border-white/[0.06] text-tactical-text/30 hover:text-tactical-text/60'
                  }`}
                  title="Quick Actions"
                >
                  ⚡
                </button>
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask or command Athena…"
                  rows={1}
                  className="flex-1 bg-tactical-bg/60 border border-tactical-border/40 rounded p-2 text-xs font-mono
                    text-tactical-text placeholder-tactical-text/30 resize-none outline-none
                    focus:border-[#7c3aed]/60 transition-colors"
                  style={{ minHeight: '36px', maxHeight: '80px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!query.trim() || isLoading || (!hasFullAthena && dailyQueries >= effectiveLimit)}
                  className="px-3 py-2 rounded text-xs flex items-center justify-center transition-all"
                  style={{
                    background: query.trim() && !isLoading ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${query.trim() && !isLoading ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
                    color:  query.trim() && !isLoading ? '#7c3aed' : '#4b5563',
                    cursor: query.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  }}
                >
                  {isLoading ? '…' : (!hasFullAthena && dailyQueries >= effectiveLimit) ? '🔒' : 'SEND'}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'sentinel' && (
          <SentinelMemo nodes={nodes} companyBalance={companyBalance} netWorth={netWorth} monthlyIncome={monthlyIncome} heat={heat} growth={growth} governance={governance} impact={impact} power={power} />
        )}
      </div>

      {/* Footer with token usage */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-tactical-border/30 bg-black/40
        text-[8px] text-tactical-text/25 font-mono flex items-center justify-between">
        <span className="tracking-widest">ATHENA v5.0 · {lastProvider ? lastProvider.toUpperCase() : 'OFFLINE'} · UNIFIED</span>
        <span className="text-tactical-text/35">
          {usageStats.calls > 0 ? (
            <>
              {usageStats.calls} calls · {(usageStats.inputTokens + usageStats.outputTokens).toLocaleString()} tokens · ~${((usageStats.inputTokens * 0.80 + usageStats.outputTokens * 4.00) / 1_000_000).toFixed(4)}
            </>
          ) : 'No usage yet'}
        </span>
        <span className="tracking-widest">UNCLASSIFIED</span>
      </div>
    </div>
  );
};

export default AthenaPanel;
