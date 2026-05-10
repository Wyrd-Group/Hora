import React from 'react';
import { useAdStore, REWARDED_AP_AMOUNT } from '../../store/adStore';

/**
 * RewardedAdButton — Compact inline button to trigger a rewarded video.
 * Designed to blend into the tactical UI. Shows remaining watches and AP reward.
 *
 * Placement options:
 * - Battle Pass footer (watch to skip tier)
 * - HUD action bar (daily AP earn)
 * - Post-match/post-trade reward screen
 * - Card economy shop
 *
 * Props:
 *  - variant: 'default' | 'compact' | 'inline' | 'battlepass'
 *  - label: custom label override
 *  - className: additional classes
 */
const RewardedAdButton = ({ variant = 'default', label, className = '' }) => {
  const { requestRewarded, canWatchRewarded, getRewardedRemaining } = useAdStore();

  const remaining = getRewardedRemaining();
  const available = canWatchRewarded();

  const handleClick = (e) => {
    e.stopPropagation();
    if (available) requestRewarded();
  };

  if (remaining <= 0) return null;

  // ── Compact: small inline chip ──
  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        disabled={!available}
        className={`
          flex items-center gap-1 px-2 py-0.5 rounded
          font-mono text-[7px] tracking-wider uppercase
          transition-all duration-200
          ${available
            ? 'text-[#10b981]/70 border border-[#10b981]/20 bg-[#10b981]/5 hover:bg-[#10b981]/10 hover:text-[#10b981] cursor-pointer'
            : 'text-white/15 border border-white/5 bg-white/[0.02] cursor-not-allowed'
          }
          ${className}
        `}
      >
        <span className="text-[8px]">▶</span>
        <span>{label || `+${REWARDED_AP_AMOUNT} AP`}</span>
      </button>
    );
  }

  // ── Inline: text-like link ──
  if (variant === 'inline') {
    return (
      <button
        onClick={handleClick}
        disabled={!available}
        className={`
          font-mono text-[8px] tracking-wider uppercase
          transition-all duration-200
          ${available
            ? 'text-[#10b981]/60 hover:text-[#10b981] underline decoration-[#10b981]/20 hover:decoration-[#10b981]/50 cursor-pointer'
            : 'text-white/15 cursor-not-allowed'
          }
          ${className}
        `}
      >
        ▶ {label || `Watch ad for ${REWARDED_AP_AMOUNT} AP`} ({remaining} left)
      </button>
    );
  }

  // ── Battle Pass variant: wider, styled for BP footer ──
  if (variant === 'battlepass') {
    return (
      <button
        onClick={handleClick}
        disabled={!available}
        className={`
          w-full py-2.5 rounded border flex items-center justify-center gap-2 group transition-all
          ${available
            ? 'border-[#10b981]/20 bg-[#10b981]/5 hover:bg-[#10b981]/10 cursor-pointer'
            : 'border-white/5 bg-white/[0.02] cursor-not-allowed'
          }
          ${className}
        `}
      >
        <span className={`text-[10px] ${available ? 'text-[#10b981]/60 group-hover:text-[#10b981]' : 'text-white/15'}`}>
          ▶
        </span>
        <span className={`font-mono text-[9px] tracking-[0.15em] uppercase ${available ? 'text-[#10b981]/70 group-hover:text-[#10b981]' : 'text-white/15'}`}>
          {label || `Watch Ad for ${REWARDED_AP_AMOUNT.toLocaleString()} AP`}
        </span>
        <span className={`font-mono text-[8px] ${available ? 'text-[#10b981]/40' : 'text-white/10'}`}>
          ({remaining}/day)
        </span>
      </button>
    );
  }

  // ── Default: standard button ──
  return (
    <button
      onClick={handleClick}
      disabled={!available}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg
        font-mono text-[8px] tracking-[0.12em] uppercase
        transition-all duration-200
        ${available
          ? 'text-[#10b981]/80 border border-[#10b981]/20 bg-[#10b981]/5 hover:bg-[#10b981]/10 hover:text-[#10b981] hover:border-[#10b981]/40 cursor-pointer'
          : 'text-white/15 border border-white/5 bg-white/[0.02] cursor-not-allowed'
        }
        ${className}
      `}
    >
      <span className="text-[9px]">▶</span>
      <span>{label || `Earn ${REWARDED_AP_AMOUNT.toLocaleString()} AP`}</span>
      <span className={`text-[7px] ${available ? 'text-[#10b981]/40' : 'text-white/10'}`}>
        {remaining} left
      </span>
    </button>
  );
};

export default RewardedAdButton;
