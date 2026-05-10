import React, { useEffect, useRef, useMemo } from 'react';
import { useBattlePassStore } from '../../store/battlePassStore';
import { TIER_REWARDS, TIERS_TOTAL, PREMIUM_COST } from '../../data/battlePassRewards';
import RewardedAdButton from '../ads/RewardedAdButton';
import { useAuthStore, selectHasPremiumPass } from '../../store/authStore';

// ── Helpers ───────────────────────────────────────────────────────

const REWARD_ICONS = {
  ap: '\u00A4',   // currency sign
  pack:   '\u25A3',   // square with fill
  xp:     '\u2605',   // star
  badge:  '\u2666',   // diamond
  title:  '\u2655',   // queen
};

function formatCountdown(ms) {
  if (ms <= 0) return '00d 00h 00m';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${String(d).padStart(2, '0')}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

// ── Component ─────────────────────────────────────────────────────

const BattlePassTrack = ({ onClose }) => {
  const {
    currentTier, bpXp, xpPerTier, isPremium: bpPremium,
    seasonStart, seasonEnd,
    claimedFree, claimedPremium,
    initSeason, claimReward, upgradeToPremium,
    totalBpXpEarned,
  } = useBattlePassStore();
  const hasPremiumSub = useAuthStore(selectHasPremiumPass);
  const isPremium = bpPremium || hasPremiumSub;

  const scrollRef = useRef(null);

  // Init season on mount
  useEffect(() => { initSeason(); }, [initSeason]);

  // Auto-scroll to current tier
  useEffect(() => {
    if (scrollRef.current) {
      const tierEl = scrollRef.current.querySelector(`[data-tier="${currentTier}"]`);
      if (tierEl) {
        tierEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentTier]);

  // ESC to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Build tier data map
  const tierMap = useMemo(() => {
    const map = {};
    for (let t = 1; t <= TIERS_TOTAL; t++) {
      map[t] = { free: null, premium: null };
    }
    for (const r of TIER_REWARDS) {
      if (r.track === 'both') {
        map[r.tier].free = r;
        map[r.tier].premium = r;
      } else {
        map[r.tier][r.track] = r;
      }
    }
    return map;
  }, []);

  const timeLeft = Math.max(0, seasonEnd - Date.now());
  const progressPct = xpPerTier > 0 ? Math.min(100, (bpXp / xpPerTier) * 100) : 0;

  const handleClaim = (tier, track) => {
    claimReward(tier, track);
  };

  const handleUpgrade = () => {
    upgradeToPremium();
  };

  // ── Render tier node ────────────────────────────────────────────
  const renderTierNode = (tier, reward, track) => {
    if (!reward) return <div className="h-[72px]" />;

    const isReached = tier <= currentTier;
    const isCurrent = tier === currentTier;
    const claimedList = track === 'free' ? claimedFree : claimedPremium;
    const isClaimed = claimedList.includes(tier);
    const isLocked = track === 'premium' && !isPremium;
    const canClaim = isReached && !isClaimed && !isLocked;

    const accentColor = track === 'free' ? '#10b981' : '#f59e0b';
    const icon = REWARD_ICONS[reward.type] || '?';

    return (
      <button
        onClick={() => canClaim && handleClaim(tier, track)}
        disabled={!canClaim}
        className={[
          'relative w-[72px] h-[72px] rounded-md border flex flex-col items-center justify-center transition-all duration-200 shrink-0',
          isClaimed
            ? 'bg-white/5 border-white/10 opacity-50'
            : isLocked
              ? 'bg-white/[0.02] border-white/5 opacity-30 cursor-not-allowed'
              : canClaim
                ? 'bg-white/5 border-opacity-60 hover:scale-105 hover:bg-white/10 cursor-pointer'
                : 'bg-white/[0.03] border-white/10 cursor-default',
          isCurrent && !isClaimed ? 'ring-1 ring-offset-1 ring-offset-transparent' : '',
        ].join(' ')}
        style={{
          borderColor: isReached ? `${accentColor}66` : 'rgba(255,255,255,0.06)',
          boxShadow: isCurrent && !isClaimed ? `0 0 12px ${accentColor}33` : 'none',
          ...(isCurrent && !isClaimed ? { ringColor: accentColor } : {}),
        }}
      >
        {isClaimed && (
          <div className="absolute inset-0 flex items-center justify-center text-white/30 text-lg">
            &#10003;
          </div>
        )}
        <span
          className="text-base leading-none"
          style={{ color: isReached ? accentColor : 'rgba(255,255,255,0.25)' }}
        >
          {icon}
        </span>
        <span className="text-[8px] font-mono text-tactical-text/60 mt-1 text-center leading-tight px-0.5 truncate w-full">
          {reward.label}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060a12]/95 backdrop-blur-md flex flex-col items-center overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="w-full max-w-6xl px-6 pt-6 flex items-start justify-between">
        <div>
          <h1 className="font-mono text-[10px] tracking-[0.3em] uppercase text-tactical-text/40">
            Battle Pass
          </h1>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="font-mono text-xl text-tactical-text">
              Tier {currentTier}
              <span className="text-tactical-text/40 text-sm"> / {TIERS_TOTAL}</span>
            </span>
            {isPremium && (
              <span className="text-[9px] font-mono tracking-widest uppercase px-2 py-0.5 rounded border border-[#f59e0b]/30 text-[#f59e0b]/80 bg-[#f59e0b]/5">
                Premium
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Season timer */}
          <div className="text-right">
            <div className="font-mono text-[9px] tracking-widest uppercase text-tactical-text/40">
              Season ends
            </div>
            <div className="font-mono text-sm text-tactical-text/70">
              {formatCountdown(timeLeft)}
            </div>
          </div>

          {/* Close */}
          <button
            onClick={() => onClose?.()}
            className="w-8 h-8 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all font-mono text-xs"
          >
            &#10005;
          </button>
        </div>
      </div>

      {/* ── XP progress bar ─────────────────────────────────────── */}
      <div className="w-full max-w-6xl px-6 mt-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] tracking-widest uppercase text-tactical-text/40 shrink-0">
            BP-XP
          </span>
          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, #10b981, #34d399)`,
              }}
            />
          </div>
          <span className="font-mono text-[10px] text-tactical-text/60 shrink-0">
            {bpXp} / {xpPerTier}
          </span>
          <span className="font-mono text-[9px] text-tactical-text/30 shrink-0">
            ({totalBpXpEarned} total)
          </span>
        </div>
      </div>

      {/* ── Tier track ──────────────────────────────────────────── */}
      <div className="flex-1 w-full max-w-6xl px-6 mt-6 overflow-hidden flex flex-col">
        {/* Track labels */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#10b981]/60" />
            <span className="font-mono text-[9px] tracking-widest uppercase text-tactical-text/40">
              Free
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#f59e0b]/60" />
            <span className="font-mono text-[9px] tracking-widest uppercase text-tactical-text/40">
              Premium
            </span>
          </div>
        </div>

        {/* Scrollable track */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden pb-4 scrollbar-thin"
        >
          <div className="inline-flex gap-1 min-w-max">
            {Array.from({ length: TIERS_TOTAL }, (_, i) => i + 1).map((tier) => {
              const data = tierMap[tier];
              const isReached = tier <= currentTier;
              const isCurrent = tier === currentTier;

              return (
                <div
                  key={tier}
                  data-tier={tier}
                  className="flex flex-col items-center gap-1 w-[76px]"
                >
                  {/* Free track row */}
                  {renderTierNode(tier, data.free, 'free')}

                  {/* Tier number + connector */}
                  <div className="flex flex-col items-center py-0.5">
                    <div
                      className={[
                        'w-5 h-5 rounded-full flex items-center justify-center font-mono text-[8px] border transition-all',
                        isCurrent
                          ? 'bg-[#10b981]/20 border-[#10b981]/60 text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                          : isReached
                            ? 'bg-white/5 border-white/20 text-tactical-text/60'
                            : 'bg-white/[0.02] border-white/5 text-tactical-text/20',
                      ].join(' ')}
                    >
                      {tier}
                    </div>
                  </div>

                  {/* Premium track row */}
                  {renderTierNode(tier, data.premium, 'premium')}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="w-full max-w-6xl px-6 pb-6 space-y-2">
        {!isPremium && (
          <button
            onClick={handleUpgrade}
            className="w-full py-3 rounded border border-[#f59e0b]/30 bg-[#f59e0b]/5 hover:bg-[#f59e0b]/10 transition-all flex items-center justify-center gap-2 group"
          >
            <span className="font-mono text-[10px] tracking-widest uppercase text-[#f59e0b]/80 group-hover:text-[#f59e0b]">
              Upgrade to Premium
            </span>
            <span className="font-mono text-[10px] text-[#f59e0b]/50">
              {PREMIUM_COST} AP
            </span>
          </button>
        )}
        {/* Rewarded ad — earn AP to help upgrade or unlock tiers */}
        <RewardedAdButton variant="battlepass" label="Watch Ad to Earn AP" />
      </div>
    </div>
  );
};

export default BattlePassTrack;
