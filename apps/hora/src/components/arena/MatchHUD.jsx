/**
 * MatchHUD — Overlay for private server matches showing:
 *   - Match timer with day/week/month timeline
 *   - Live leaderboard with intel-gated visibility
 *   - Activity feed (trades/actions via Broadcast)
 *   - PvP confrontation UI (attack players, resolve battles)
 *   - Enhanced match end results with scoring breakdown
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useMatchStore } from '../../store/matchStore';

// ── Helpers ─────────────────────────────────────────────────────

function formatTime(ms) {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatMoney(n) {
  if (n >= 1e9) return `€${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `€${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `€${(n / 1e3).toFixed(1)}K`;
  return `€${Math.round(n).toLocaleString()}`;
}

function formatMoneyApprox(n) {
  // Round to nearest 100K for low intel
  const rounded = Math.round(n / 100_000) * 100_000;
  return formatMoney(rounded);
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'now';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

const ACTION_ICONS = {
  buy: { icon: '↗', color: 'text-emerald-400' },
  sell: { icon: '↘', color: 'text-rose-400' },
  acquire_node: { icon: '⊕', color: 'text-cyan-400' },
  deploy_agent: { icon: '◈', color: 'text-purple-400' },
  recall_agent: { icon: '◇', color: 'text-amber-400' },
  take_loan: { icon: '₿', color: 'text-yellow-400' },
  fund_invest: { icon: '◉', color: 'text-blue-400' },
  shadow_op: { icon: '⚡', color: 'text-red-400' },
  milestone: { icon: '★', color: 'text-[#a78bfa]' },
  pvp_attack: { icon: '⚔', color: 'text-orange-400' },
  pvp_defend: { icon: '🛡', color: 'text-sky-400' },
  steal_node: { icon: '⊗', color: 'text-rose-500' },
  poach_agent: { icon: '◈', color: 'text-fuchsia-400' },
};

const ACTION_VERBS = {
  buy: 'bought',
  sell: 'sold',
  acquire_node: 'acquired',
  deploy_agent: 'deployed',
  recall_agent: 'recalled',
  take_loan: 'took loan',
  fund_invest: 'invested in',
  shadow_op: 'ran',
  milestone: '',
  pvp_attack: 'attacked',
  pvp_defend: 'defended',
  steal_node: 'seized',
  poach_agent: 'poached',
};

const TREND_ICONS = { up: '▲', down: '▼', flat: '─' };
const TREND_COLORS = { up: 'text-emerald-400', down: 'text-rose-400', flat: 'text-white/20' };

// ── Intel Level Descriptions ───────────────────────────────────

const INTEL_DESCRIPTIONS = [
  'BLIND — Deploy Infiltrator/Scout agents for intel',
  'BASIC — Name + approximate net worth',
  'MODERATE — Exact financials + trade count',
  'DETAILED — Full stats + trends + P&L',
  'FULL SPECTRUM — Complete visibility + recent actions',
];

// ── Timer Bar ───────────────────────────────────────────────────

function TimerBar({ timer, mode, intelLevel, intelAgentCount }) {
  const isUnlimited = timer.totalTicks === 0;
  const pct = isUnlimited ? 0 : Math.min(timer.progress * 100, 100);
  const isLow = !isUnlimited && timer.realRemainingMs < 60_000;

  return (
    <div className="w-full">
      {/* Day / Time Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-3">
          <span className={`text-[13px] font-mono font-bold tracking-wider ${isLow ? 'text-rose-400 animate-pulse' : 'text-[#a78bfa]'}`}>
            DAY {timer.gameDay}
          </span>
          <span className="text-[9px] font-mono text-white/25 tracking-wide">
            Week {timer.gameWeek} · Month {timer.gameMonth}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Intel indicator */}
          <span className={`text-[8px] font-mono tracking-wider px-1.5 py-0.5 rounded ${
            intelLevel === 0 ? 'text-white/20 bg-white/[0.03]' :
            intelLevel <= 2 ? 'text-amber-400/60 bg-amber-400/[0.06]' :
            'text-cyan-400/70 bg-cyan-400/[0.08]'
          }`} title={INTEL_DESCRIPTIONS[intelLevel]}>
            INTEL {intelLevel}/4 ({intelAgentCount} agents)
          </span>
          <span className="text-[9px] font-mono text-white/20 tracking-wide uppercase">{mode?.replace(/_/g, ' ')}</span>
          {isUnlimited ? (
            <span className="text-[12px] font-mono font-bold tracking-wider text-[#a78bfa]/60">∞ UNLIMITED</span>
          ) : (
            <span className={`text-[12px] font-mono font-bold tracking-wider ${isLow ? 'text-rose-400 animate-pulse' : 'text-white/60'}`}>
              {formatTime(timer.realRemainingMs)}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isUnlimited ? (
        <div className="relative w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 right-0 bg-[#a78bfa]/20 rounded-full animate-pulse" />
        </div>
      ) : (
        <div className="relative w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-linear ${
              isLow ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-[#a78bfa] shadow-[0_0_6px_rgba(167,139,250,0.3)]'
            }`}
            style={{ width: `${pct}%` }}
          />
          {[25, 50, 75].map(mark => (
            <div key={mark} className="absolute top-0 bottom-0 w-px bg-white/[0.08]" style={{ left: `${mark}%` }} />
          ))}
        </div>
      )}

      {/* Sub-labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[7px] font-mono text-white/15">
          {isUnlimited ? `${timer.currentTick} ticks elapsed` : `${timer.currentTick}/${timer.totalTicks} ticks`}
        </span>
        <span className="text-[7px] font-mono text-white/15">
          {isUnlimited ? `${formatTime(timer.realElapsedMs)} played` : `${Math.round(pct)}% complete`}
        </span>
      </div>
    </div>
  );
}

// ── Leaderboard (Intel-Gated) ──────────────────────────────────

function Leaderboard({ leaderboard, myPlayerId, startingCapital, intelLevel, onAttack, pvpCooldownUntil }) {
  const canAttack = Date.now() >= pvpCooldownUntil;
  const cooldownRemaining = Math.max(0, pvpCooldownUntil - Date.now());

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] tracking-[0.2em] uppercase text-white/25 font-mono">LEADERBOARD</span>
        <span className="text-[8px] font-mono text-white/15">{leaderboard.length} players</span>
      </div>

      {/* Cooldown indicator */}
      {cooldownRemaining > 0 && (
        <div className="text-[8px] font-mono text-amber-400/50 text-center mb-1">
          PvP cooldown: {Math.ceil(cooldownRemaining / 1000)}s
        </div>
      )}

      {leaderboard.map((player, i) => {
        const isMe = player.playerId === myPlayerId;
        const pnl = player.netWorth - startingCapital;
        const pnlPct = ((pnl / startingCapital) * 100).toFixed(1);
        const isPositive = pnl >= 0;

        // Intel gating for opponent details
        const isOpponent = !isMe && !player.isBot;
        const showNetWorth = isMe || player.isBot || intelLevel >= 1;
        const showExactNetWorth = isMe || player.isBot || intelLevel >= 2;
        const showTradeDetails = isMe || player.isBot || intelLevel >= 2;
        const showTrend = isMe || player.isBot || intelLevel >= 3;
        const showPnl = isMe || player.isBot || intelLevel >= 3;
        const showPvpStats = isMe || player.isBot || intelLevel >= 3;

        return (
          <div
            key={player.playerId}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded transition-all ${
              isMe
                ? 'bg-[#a78bfa]/[0.08] border border-[#a78bfa]/20'
                : i === 0
                  ? 'bg-amber-500/[0.04] border border-amber-500/10'
                  : 'bg-white/[0.015] border border-transparent'
            }`}
          >
            {/* Rank */}
            <span className={`w-5 text-center text-[11px] font-mono font-bold ${
              i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-white/25'
            }`}>
              {player.rank}
            </span>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-mono truncate ${isMe ? 'text-[#a78bfa] font-bold' : 'text-white/60'}`}>
                  {player.displayName}
                </span>
                {isMe && <span className="text-[7px] font-mono text-[#a78bfa]/50 tracking-wider">YOU</span>}
                {player.isBot && <span className="text-[7px] font-mono text-white/15 tracking-wider">BOT</span>}
              </div>
              <div className="flex items-center gap-2 text-[8px] font-mono text-white/20">
                {showTradeDetails ? (
                  <>
                    <span>{player.tradesExecuted} trades</span>
                    <span>·</span>
                    <span>{player.nodesOwned} nodes</span>
                  </>
                ) : (
                  <span className="text-white/10 italic">intel required</span>
                )}
                {showPvpStats && (player.pvpWins > 0 || player.pvpLosses > 0) && (
                  <>
                    <span>·</span>
                    <span className="text-orange-400/50">{player.pvpWins}W/{player.pvpLosses}L</span>
                  </>
                )}
              </div>
            </div>

            {/* Net Worth + Trend + Attack Button */}
            <div className="text-right flex items-center gap-1.5">
              <div>
                {showNetWorth ? (
                  <div className="text-[11px] font-mono font-bold text-white/70">
                    {showExactNetWorth ? formatMoney(player.netWorth) : formatMoneyApprox(player.netWorth)}
                  </div>
                ) : (
                  <div className="text-[11px] font-mono text-white/15">???</div>
                )}
                {showPnl ? (
                  <div className={`text-[9px] font-mono flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                    {showTrend && <span className={TREND_COLORS[player.trend]}>{TREND_ICONS[player.trend]}</span>}
                    <span>{isPositive ? '+' : ''}{pnlPct}%</span>
                  </div>
                ) : showNetWorth ? (
                  <div className="text-[9px] font-mono text-white/10">~P&L hidden</div>
                ) : null}
              </div>

              {/* PvP Attack Button (only for opponents) */}
              {!isMe && (
                <button
                  onClick={() => onAttack?.(player.playerId, player.displayName)}
                  disabled={!canAttack}
                  className={`ml-1 px-1.5 py-1 rounded text-[7px] font-mono tracking-wider transition-all ${
                    canAttack
                      ? 'text-orange-400/80 bg-orange-400/[0.08] border border-orange-400/20 hover:bg-orange-400/[0.15] hover:text-orange-400 cursor-pointer'
                      : 'text-white/10 bg-white/[0.02] border border-white/[0.04] cursor-not-allowed'
                  }`}
                  title={canAttack ? `Attack ${player.displayName}` : `Cooldown: ${Math.ceil(cooldownRemaining / 1000)}s`}
                >
                  ⚔
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── PvP Battle Overlay ─────────────────────────────────────────

function PvPBattleOverlay({ attack, onResolve }) {
  const [resolved, setResolved] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!attack || attack.resolved) return;
    const iv = setInterval(() => {
      const remaining = Math.max(0, attack.resolvesAt - Date.now());
      setTimeLeft(remaining);
      if (remaining <= 0 && !resolved) {
        setResolved(true);
        onResolve?.();
      }
    }, 100);
    return () => clearInterval(iv);
  }, [attack?.id]);

  if (!attack) return null;

  const progress = attack.resolved ? 100 : Math.min(100, ((Date.now() - attack.startedAt) / (attack.resolvesAt - attack.startedAt)) * 100);

  return (
    <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
      <div className="w-80 bg-[#0a0a14]/95 border border-orange-400/20 rounded-xl p-5 shadow-[0_0_40px_rgba(249,115,22,0.1)]">
        <div className="text-center mb-4">
          <div className="text-[9px] tracking-[0.3em] uppercase text-orange-400/60 font-mono mb-1">
            {attack.resolved ? (attack.won ? 'VICTORY' : 'DEFEATED') : 'PVP CONFRONTATION'}
          </div>
          <div className="text-[14px] font-mono font-bold text-white/80">
            {attack.attackerName} <span className="text-orange-400">⚔</span> {attack.defenderName}
          </div>
          <div className="text-[10px] font-mono text-white/30 mt-1">
            Target: {attack.targetName} ({attack.targetType})
          </div>
        </div>

        {/* Power bars */}
        <div className="space-y-2 mb-4">
          <div>
            <div className="flex justify-between text-[8px] font-mono mb-0.5">
              <span className="text-emerald-400/70">ATK {attack.attackPower}</span>
              <span className="text-white/20">Attack Power</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500/60 rounded-full transition-all" style={{ width: `${(attack.attackPower / (attack.attackPower + attack.defensePower)) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[8px] font-mono mb-0.5">
              <span className="text-rose-400/70">DEF {attack.defensePower}</span>
              <span className="text-white/20">Defense Power</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-rose-500/60 rounded-full transition-all" style={{ width: `${(attack.defensePower / (attack.attackPower + attack.defensePower)) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Resolution progress or result */}
        {attack.resolved ? (
          <div className={`text-center py-3 rounded-lg ${attack.won ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
            <div className={`text-[16px] font-mono font-bold ${attack.won ? 'text-emerald-400' : 'text-rose-400'}`}>
              {attack.won ? 'TAKEOVER SUCCESSFUL' : 'ATTACK REPELLED'}
            </div>
            <div className="text-[9px] font-mono text-white/30 mt-1">
              {attack.won ? `${attack.targetName} is now yours` : `${attack.defenderName} held their ground`}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between text-[8px] font-mono text-white/30 mb-1">
              <span>Resolving...</span>
              <span>{Math.ceil(timeLeft / 1000)}s</span>
            </div>
            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-orange-400/50 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Activity Feed ───────────────────────────────────────────────

function ActivityFeed({ feed, intelLevel }) {
  const feedRef = useRef(null);

  return (
    <div className="space-y-0.5" ref={feedRef}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] tracking-[0.2em] uppercase text-white/25 font-mono">LIVE FEED</span>
        <span className="text-[8px] font-mono text-white/15">{feed.length} events</span>
      </div>

      {/* Intel warning for low visibility */}
      {intelLevel < 4 && (
        <div className="text-[7px] font-mono text-amber-400/30 text-center mb-1 px-2">
          {intelLevel < 2 ? 'Deploy Infiltrator/Scout agents to see opponent actions' : 'Deploy more intel agents for full feed visibility'}
        </div>
      )}

      <div className="space-y-0.5 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
        {feed.map((entry, i) => {
          const age = (Date.now() - entry.timestamp) / 1000;
          const opacity = age < 5 ? 1 : age < 30 ? 0.7 : age < 120 ? 0.4 : 0.2;
          const cfg = ACTION_ICONS[entry.action] || ACTION_ICONS.milestone;
          const verb = ACTION_VERBS[entry.action] || '';
          const isSystem = entry.playerId === 'system';

          // Gate opponent actions behind intel level 4
          const isOpponentAction = !isSystem && entry.playerId !== 'self';
          if (isOpponentAction && intelLevel < 4 && !entry.action?.startsWith('pvp') && entry.action !== 'milestone') {
            // Show redacted version at intel 2-3
            if (intelLevel >= 2) {
              return (
                <div key={entry.id} className="flex items-start gap-2 px-2 py-1 rounded" style={{ opacity: opacity * 0.6 }}>
                  <span className="text-[10px] mt-0.5 text-white/15">?</span>
                  <span className="text-[10px] font-mono text-white/20 italic">
                    <span className="text-white/30">{entry.playerName}</span> performed an action
                  </span>
                  <span className="text-[8px] font-mono text-white/15 shrink-0 mt-0.5 ml-auto">{timeAgo(entry.timestamp)}</span>
                </div>
              );
            }
            // Hide completely at intel 0-1
            return null;
          }

          return (
            <div
              key={entry.id}
              className={`flex items-start gap-2 px-2 py-1 rounded transition-all ${
                isSystem ? 'bg-[#a78bfa]/[0.06] border border-[#a78bfa]/10' :
                entry.action?.startsWith('pvp') ? 'bg-orange-400/[0.04] border border-orange-400/10' :
                i === 0 ? 'bg-white/[0.02]' : ''
              }`}
              style={{ opacity }}
            >
              <span className={`text-[10px] mt-0.5 ${cfg.color}`}>{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                {isSystem ? (
                  <span className="text-[10px] font-mono text-[#a78bfa]/70">{entry.detail}</span>
                ) : (
                  <span className="text-[10px] font-mono text-white/50">
                    <span className="text-white/70 font-bold">{entry.playerName}</span>
                    {' '}{verb}{' '}
                    <span className="text-white/60">{entry.detail}</span>
                  </span>
                )}
              </div>
              <span className="text-[8px] font-mono text-white/15 shrink-0 mt-0.5">
                {timeAgo(entry.timestamp)}
              </span>
            </div>
          );
        })}
        {feed.length === 0 && (
          <div className="text-center py-6 text-[10px] font-mono text-white/15">Waiting for activity...</div>
        )}
      </div>
    </div>
  );
}

// ── Score Bar (for match results) ──────────────────────────────

function ScoreBar({ label, score, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-white/30 w-20 text-right">{label}</span>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[9px] font-mono text-white/50 w-8">{score}</span>
    </div>
  );
}

// ── Match Results Screen (Enhanced) ────────────────────────────

function MatchResults({ leaderboard, myPlayerId, startingCapital, scoreBreakdowns, onExit }) {
  const winner = leaderboard[0];
  const me = leaderboard.find(p => p.playerId === myPlayerId);
  const myRank = me?.rank || leaderboard.length;
  const myPnl = me ? me.netWorth - startingCapital : 0;
  const myBreakdown = scoreBreakdowns?.find(s => s.playerId === myPlayerId);

  const [expandedPlayer, setExpandedPlayer] = useState(null);

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center overflow-y-auto py-8">
      <div className="w-full max-w-lg mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-[10px] tracking-[0.3em] uppercase text-white/30 font-mono mb-2">MATCH COMPLETE</div>
          <div className="text-4xl font-mono font-bold text-[#a78bfa] mb-1">
            {myRank === 1 ? 'VICTORY' : myRank <= 3 ? 'PODIUM FINISH' : `#${myRank}`}
          </div>
          <div className={`text-[13px] font-mono ${myPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {myPnl >= 0 ? '+' : ''}{formatMoney(myPnl)} P&L
          </div>
        </div>

        {/* Your Scoring Breakdown */}
        {myBreakdown && (
          <div className="bg-[#0a0a14]/90 border border-[#a78bfa]/15 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] tracking-[0.2em] uppercase text-[#a78bfa]/50 font-mono">YOUR PERFORMANCE</span>
              <span className="text-[14px] font-mono font-bold text-[#a78bfa]">{myBreakdown.totalScore} pts</span>
            </div>
            <div className="space-y-1.5">
              <ScoreBar label="Wealth" score={myBreakdown.wealthScore} color="bg-emerald-500/70" />
              <ScoreBar label="Trading" score={myBreakdown.tradingScore} color="bg-cyan-500/70" />
              <ScoreBar label="Empire" score={myBreakdown.empireScore} color="bg-purple-500/70" />
              <ScoreBar label="PvP" score={myBreakdown.pvpScore} color="bg-orange-500/70" />
              <ScoreBar label="Consistency" score={myBreakdown.consistencyScore} color="bg-blue-500/70" />
            </div>
            <div className="mt-3 flex gap-3 text-[8px] font-mono text-white/20">
              <span>Peak: {formatMoney(myBreakdown.peakNetWorth)}</span>
              <span>·</span>
              <span>Best rank: #{myBreakdown.peakRank}</span>
              {myBreakdown.biggestTrade && (
                <>
                  <span>·</span>
                  <span>Big trade: {myBreakdown.biggestTrade}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Final Standings with expandable breakdowns */}
        <div className="bg-[#0a0a14]/90 border border-white/5 rounded-xl p-4 mb-6">
          <div className="text-[9px] tracking-[0.2em] uppercase text-white/25 font-mono mb-3">FINAL STANDINGS</div>
          {leaderboard.map((player, i) => {
            const isMe = player.playerId === myPlayerId;
            const pnl = player.netWorth - startingCapital;
            const breakdown = scoreBreakdowns?.find(s => s.playerId === player.playerId);
            const isExpanded = expandedPlayer === player.playerId;

            return (
              <div key={player.playerId} className="mb-1">
                <div
                  onClick={() => setExpandedPlayer(isExpanded ? null : player.playerId)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer transition-all ${
                    isMe ? 'bg-[#a78bfa]/10 border border-[#a78bfa]/20' :
                    i === 0 ? 'bg-amber-500/5' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <span className={`w-6 text-center text-[14px] font-mono font-bold ${
                    i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-white/20'
                  }`}>
                    {i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${player.rank}`}
                  </span>
                  <div className="flex-1">
                    <span className={`text-[12px] font-mono ${isMe ? 'text-[#a78bfa] font-bold' : 'text-white/60'}`}>
                      {player.displayName}
                      {isMe && ' (You)'}
                    </span>
                    <div className="flex items-center gap-2 text-[8px] font-mono text-white/20 mt-0.5">
                      <span>{player.tradesExecuted} trades</span>
                      <span>·</span>
                      <span>{player.nodesOwned} nodes</span>
                      {(player.pvpWins > 0 || player.pvpLosses > 0) && (
                        <>
                          <span>·</span>
                          <span className="text-orange-400/50">⚔ {player.pvpWins}W/{player.pvpLosses}L</span>
                        </>
                      )}
                      {player.nodesStolen > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-rose-400/50">{player.nodesStolen} seized</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-mono font-bold text-white/70">{formatMoney(player.netWorth)}</div>
                    <div className={`text-[9px] font-mono ${pnl >= 0 ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>
                      {pnl >= 0 ? '+' : ''}{formatMoney(pnl)}
                    </div>
                  </div>
                  {breakdown && (
                    <span className="text-[10px] font-mono font-bold text-white/30 ml-1">{breakdown.totalScore}pt</span>
                  )}
                  <span className="text-[8px] text-white/15">{isExpanded ? '▾' : '▸'}</span>
                </div>

                {/* Expanded breakdown */}
                {isExpanded && breakdown && (
                  <div className="px-4 py-2 ml-9 mr-2 bg-white/[0.015] rounded-b border-x border-b border-white/[0.04]">
                    <div className="space-y-1">
                      <ScoreBar label="Wealth" score={breakdown.wealthScore} color="bg-emerald-500/60" />
                      <ScoreBar label="Trading" score={breakdown.tradingScore} color="bg-cyan-500/60" />
                      <ScoreBar label="Empire" score={breakdown.empireScore} color="bg-purple-500/60" />
                      <ScoreBar label="PvP" score={breakdown.pvpScore} color="bg-orange-500/60" />
                    </div>
                    <div className="mt-2 text-[7px] font-mono text-white/15">
                      Peak: {formatMoney(breakdown.peakNetWorth)} · Best rank: #{breakdown.peakRank}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Why they won section */}
        {winner && scoreBreakdowns?.length > 0 && (
          <div className="bg-[#0a0a14]/90 border border-amber-500/10 rounded-xl p-4 mb-6">
            <div className="text-[9px] tracking-[0.2em] uppercase text-amber-400/40 font-mono mb-2">WHY {winner.displayName.toUpperCase()} WON</div>
            <div className="space-y-1 text-[10px] font-mono text-white/50">
              {(() => {
                const wb = scoreBreakdowns.find(s => s.playerId === winner.playerId);
                if (!wb) return null;
                const reasons = [];
                if (wb.wealthScore >= 80) reasons.push(`Dominated wealth: ${formatMoney(winner.netWorth)} final net worth`);
                if (wb.tradingScore >= 60) reasons.push(`Active trader: ${winner.tradesExecuted} trades executed`);
                if (wb.empireScore >= 60) reasons.push(`Empire builder: ${winner.nodesOwned} nodes controlled`);
                if (wb.pvpScore >= 70 && (winner.pvpWins > 0)) reasons.push(`PvP dominance: ${winner.pvpWins} victories in combat`);
                if (winner.nodesStolen > 0) reasons.push(`Aggressive expansion: ${winner.nodesStolen} hostile takeovers`);
                if (reasons.length === 0) reasons.push('Balanced performance across all categories');
                return reasons.map((r, i) => <div key={i} className="flex items-start gap-2"><span className="text-amber-400/40 mt-0.5">▸</span><span>{r}</span></div>);
              })()}
            </div>
          </div>
        )}

        {/* Exit */}
        <button
          onClick={onExit}
          className="w-full py-3 rounded-lg text-[12px] font-mono tracking-[0.2em] font-bold bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30 hover:bg-[#a78bfa]/25 transition-all"
        >
          RETURN TO HUB
        </button>
      </div>
    </div>
  );
}

// ── Main MatchHUD ───────────────────────────────────────────────

export default function MatchHUD({ myPlayerId, onMatchEnd }) {
  const active = useMatchStore(s => s.active);
  const timer = useMatchStore(s => s.timer);
  const leaderboard = useMatchStore(s => s.leaderboard);
  const activityFeed = useMatchStore(s => s.activityFeed);
  const mode = useMatchStore(s => s.mode);
  const startingCapital = useMatchStore(s => s.startingCapital);
  const myRank = useMatchStore(s => s.myRank);
  const intelLevel = useMatchStore(s => s.intelLevel);
  const intelAgentCount = useMatchStore(s => s.intelAgentCount);
  const activePvPAttack = useMatchStore(s => s.activePvPAttack);
  const pvpCooldownUntil = useMatchStore(s => s.pvpCooldownUntil);
  const scoreBreakdowns = useMatchStore(s => s.scoreBreakdowns);

  const [hudExpanded, setHudExpanded] = useState(true);
  const [timerCollapsed, setTimerCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'feed'
  const [showResults, setShowResults] = useState(false);
  const [showBattle, setShowBattle] = useState(false);

  // Show results when match ends
  useEffect(() => {
    if (timer.isFinished && !showResults) {
      setShowResults(true);
    }
  }, [timer.isFinished]);

  // Show battle overlay when PvP attack is active
  useEffect(() => {
    if (activePvPAttack && !activePvPAttack.resolved) {
      setShowBattle(true);
    }
  }, [activePvPAttack?.id]);

  // Auto-hide battle overlay after resolution
  useEffect(() => {
    if (activePvPAttack?.resolved && showBattle) {
      const timeout = setTimeout(() => setShowBattle(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [activePvPAttack?.resolved]);

  // Force re-render for timeAgo + cooldown
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  if (!active && !showResults) return null;

  // Handle PvP attack
  const handleAttack = (targetPlayerId, targetName) => {
    const myNetWorth = leaderboard.find(p => p.playerId === myPlayerId)?.netWorth || 0;
    useMatchStore.getState().launchPvPAttack(targetPlayerId, 'node', `${targetName}'s assets`, myNetWorth);
  };

  // Handle PvP resolve
  const handleResolve = () => {
    useMatchStore.getState().resolvePvPAttack();
  };

  // Match Results overlay
  if (showResults) {
    return (
      <MatchResults
        leaderboard={leaderboard}
        myPlayerId={myPlayerId}
        startingCapital={startingCapital}
        scoreBreakdowns={scoreBreakdowns}
        onExit={() => {
          setShowResults(false);
          onMatchEnd?.();
        }}
      />
    );
  }

  return (
    <>
      {/* ── Timer Bar (retractable) ──────────────────────────────── */}
      {timerCollapsed ? (
        <div className="fixed top-10 left-0 right-0 z-40 px-4 pointer-events-none">
          <div className="max-w-xs mx-auto">
            <button
              onClick={() => setTimerCollapsed(false)}
              className="pointer-events-auto w-full bg-[#060a12]/90 backdrop-blur-xl border border-white/[0.06] rounded-lg px-4 py-1.5 shadow-[0_4px_30px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2 hover:border-[#a78bfa]/30 transition-colors"
            >
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Day {timer.gameDay}</span>
              <span className="text-[11px] font-mono text-[#a78bfa] font-bold tabular-nums">
                {timer.realRemainingMs > 0 ? formatTime(timer.realRemainingMs) : formatTime(timer.realElapsedMs)}
              </span>
              <span className="text-[8px] text-white/20">▾</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="fixed top-10 left-0 right-0 z-40 px-4 pointer-events-none">
          <div className="max-w-3xl mx-auto bg-[#060a12]/90 backdrop-blur-xl border border-white/[0.06] rounded-lg px-4 py-2.5 pointer-events-auto shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <TimerBar timer={timer} mode={mode} intelLevel={intelLevel} intelAgentCount={intelAgentCount} />
              </div>
              <button
                onClick={() => setTimerCollapsed(true)}
                className="text-white/20 hover:text-white/50 text-[10px] font-mono transition-colors shrink-0 ml-2"
                title="Collapse timer"
              >▴</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PvP Battle Overlay ──────────────────────────────────────── */}
      {showBattle && activePvPAttack && (
        <PvPBattleOverlay attack={activePvPAttack} onResolve={handleResolve} />
      )}

      {/* ── Side Panel (leaderboard + feed) ─────────────────────────── */}
      <div className={`fixed top-24 z-40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        hudExpanded ? 'right-2' : '-right-[290px]'
      }`}>
        {/* Toggle handle */}
        <button
          onClick={() => setHudExpanded(!hudExpanded)}
          className="absolute -left-7 top-2 w-7 h-14 bg-[#060a12]/90 border border-r-0 border-white/[0.06] rounded-l-lg flex items-center justify-center text-white/30 hover:text-[#a78bfa] transition-colors cursor-pointer"
        >
          <span className="text-[9px] font-mono" style={{ writingMode: 'vertical-rl' }}>
            {hudExpanded ? '▸' : '◂'} #{myRank}
          </span>
        </button>

        <div className="w-[280px] bg-[#060a12]/95 backdrop-blur-xl border border-white/[0.06] rounded-lg shadow-[0_4px_40px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Tab header */}
          <div className="flex border-b border-white/[0.04]">
            {[
              { key: 'leaderboard', label: 'RANKINGS' },
              { key: 'feed', label: 'ACTIVITY' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 text-[9px] font-mono tracking-[0.15em] transition-all ${
                  activeTab === tab.key
                    ? 'text-[#a78bfa] border-b border-[#a78bfa]/40 bg-[#a78bfa]/[0.04]'
                    : 'text-white/25 hover:text-white/40'
                }`}
              >
                {tab.label}
                {tab.key === 'feed' && activityFeed.length > 0 && (
                  <span className="ml-1 text-[7px] text-white/20">({activityFeed.length})</span>
                )}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="p-3 max-h-[calc(100vh-180px)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
            {activeTab === 'leaderboard' ? (
              <Leaderboard
                leaderboard={leaderboard}
                myPlayerId={myPlayerId}
                startingCapital={startingCapital}
                intelLevel={intelLevel}
                onAttack={handleAttack}
                pvpCooldownUntil={pvpCooldownUntil}
              />
            ) : (
              <ActivityFeed feed={activityFeed} intelLevel={intelLevel} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
