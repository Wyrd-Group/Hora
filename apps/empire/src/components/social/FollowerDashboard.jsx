import React, { useMemo } from 'react';
import { useSocialExtStore } from '../../store/socialExtStore';
import AdCardInline from '../ads/AdCardInline';

// ── Tier config ──────────────────────────────────────────────────────
const TIER_META = {
  unknown: { label: 'UNKNOWN', color: 'text-white/40', bg: 'bg-white/[0.06]', border: 'border-white/10' },
  micro:   { label: 'MICRO',   color: 'text-emerald-400', bg: 'bg-emerald-500/[0.08]', border: 'border-emerald-500/20' },
  mid:     { label: 'MID',     color: 'text-[#00e5ff]',   bg: 'bg-cyan-500/[0.08]',    border: 'border-cyan-500/20' },
  macro:   { label: 'MACRO',   color: 'text-purple-400',  bg: 'bg-purple-500/[0.08]',  border: 'border-purple-500/20' },
  mega:    { label: 'MEGA',    color: 'text-amber-400',   bg: 'bg-amber-500/[0.08]',   border: 'border-amber-500/20' },
};

const TIER_ORDER = ['unknown', 'micro', 'mid', 'macro', 'mega'];
const TIER_THRESHOLDS = { unknown: 0, micro: 100, mid: 1_000, macro: 10_000, mega: 100_000 };

// ── Mini sparkline ───────────────────────────────────────────────────
function Sparkline({ data }) {
  if (!data || data.length < 2) return null;
  const points = data.slice(-30);
  const vals = points.map((p) => p.count);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 160;
  const h = 32;

  const pathD = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const trending = vals[vals.length - 1] >= vals[0];

  return (
    <svg width={w} height={h} className="overflow-visible">
      <path
        d={pathD}
        fill="none"
        stroke={trending ? '#34d399' : '#f87171'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────
export default function FollowerDashboard() {
  const followers = useSocialExtStore((s) => s.followers);
  const followerHistory = useSocialExtStore((s) => s.followerHistory);
  const influencerTier = useSocialExtStore((s) => s.influencerTier);
  const isVerified = useSocialExtStore((s) => s.isVerified);
  const sponsorships = useSocialExtStore((s) => s.sponsorships);
  const credibility = useSocialExtStore((s) => s.credibility);

  const tierMeta = TIER_META[influencerTier] || TIER_META.unknown;

  // Sponsorship income
  const monthlyIncome = useMemo(() => {
    const now = Date.now();
    return sponsorships
      .filter((sp) => sp.expiresAt > now)
      .reduce((sum, sp) => sum + (sp.cpmRate * followers) / 1000, 0);
  }, [sponsorships, followers]);

  // Next tier progress
  const nextTier = useMemo(() => {
    const idx = TIER_ORDER.indexOf(influencerTier);
    if (idx >= TIER_ORDER.length - 1) return null;
    const next = TIER_ORDER[idx + 1];
    const threshold = TIER_THRESHOLDS[next];
    const progress = Math.min(100, Math.round((followers / threshold) * 100));
    return { name: next, threshold, progress };
  }, [influencerTier, followers]);

  // Verification progress — computed locally to avoid infinite loop from new object ref in selector
  const accountCreatedAt = useSocialExtStore((s) => s.accountCreatedAt);
  const verification = useMemo(() => {
    const ageDays = (Date.now() - accountCreatedAt) / 86_400_000;
    return {
      eligible: followers >= 1_000 && credibility >= 70 && ageDays >= 30,
      progress: {
        followers: Math.min(100, Math.round((followers / 1_000) * 100)),
        credibility: Math.min(100, Math.round((credibility / 70) * 100)),
        activityDays: Math.min(100, Math.round((ageDays / 30) * 100)),
      },
    };
  }, [followers, credibility, accountCreatedAt]);

  return (
    <div className="border border-tactical-border/30 bg-[#0a0e18]/80 rounded-lg p-4 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-[10px] tracking-widest uppercase text-white/50">
          Follower Intelligence
        </h3>
        <div className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider ${tierMeta.bg} ${tierMeta.border} border ${tierMeta.color}`}>
          {tierMeta.label}
        </div>
      </div>

      {/* Follower count + sparkline */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-2xl font-mono font-bold text-tactical-text tabular-nums">
            {followers.toLocaleString()}
          </div>
          <div className="text-[9px] font-mono text-white/30 tracking-wider uppercase mt-0.5">
            Followers
          </div>
        </div>
        <Sparkline data={followerHistory} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="border border-white/[0.06] bg-white/[0.02] rounded-md p-2 text-center">
          <div className="text-xs font-mono font-bold text-emerald-400">
            {monthlyIncome > 0 ? `\u20AC${Math.round(monthlyIncome).toLocaleString()}` : '--'}
          </div>
          <div className="text-[8px] font-mono text-white/30 tracking-wider uppercase mt-0.5">
            Income/mo
          </div>
        </div>
        <div className="border border-white/[0.06] bg-white/[0.02] rounded-md p-2 text-center">
          <div className={`text-xs font-mono font-bold ${credibility >= 70 ? 'text-emerald-400' : credibility >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
            {credibility}
          </div>
          <div className="text-[8px] font-mono text-white/30 tracking-wider uppercase mt-0.5">
            Credibility
          </div>
        </div>
        <div className="border border-white/[0.06] bg-white/[0.02] rounded-md p-2 text-center">
          <div className="text-xs font-mono font-bold text-[#00e5ff]">
            {sponsorships.filter((sp) => sp.expiresAt > Date.now()).length}
          </div>
          <div className="text-[8px] font-mono text-white/30 tracking-wider uppercase mt-0.5">
            Sponsors
          </div>
        </div>
      </div>

      {/* Tier progress */}
      {nextTier && (
        <div className="mb-4">
          <div className="flex justify-between text-[9px] font-mono text-white/30 mb-1">
            <span>{TIER_META[influencerTier]?.label}</span>
            <span>{TIER_META[nextTier.name]?.label} ({nextTier.threshold.toLocaleString()})</span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00e5ff]/60 rounded-full transition-all duration-500"
              style={{ width: `${nextTier.progress}%` }}
            />
          </div>
          <div className="text-right text-[8px] font-mono text-white/20 mt-0.5">
            {(nextTier.threshold - followers).toLocaleString()} to go
          </div>
        </div>
      )}

      <AdCardInline variant="wide" />

      {/* Verification status */}
      <div className="border-t border-white/[0.04] pt-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-mono tracking-widest uppercase text-white/40">
            Verification
          </span>
          {isVerified ? (
            <span className="text-[9px] font-mono font-bold text-[#00e5ff] bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              VERIFIED
            </span>
          ) : (
            <span className="text-[9px] font-mono text-white/20">NOT VERIFIED</span>
          )}
        </div>
        {!isVerified && (
          <div className="space-y-1.5">
            <ProgressRow
              label="Followers"
              value={`${followers.toLocaleString()} / 1,000`}
              pct={verification.progress.followers}
            />
            <ProgressRow
              label="Credibility"
              value={`${credibility} / 70`}
              pct={verification.progress.credibility}
            />
            <ProgressRow
              label="Activity"
              value={`${verification.progress.activityDays}%`}
              pct={verification.progress.activityDays}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressRow({ label, value, pct }) {
  return (
    <div>
      <div className="flex justify-between text-[8px] font-mono text-white/30 mb-0.5">
        <span className="tracking-wider uppercase">{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${pct >= 100 ? 'bg-emerald-400/60' : 'bg-white/20'}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
