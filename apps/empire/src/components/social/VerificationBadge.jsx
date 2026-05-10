import React from 'react';
import { useSocialExtStore } from '../../store/socialExtStore';

// ── Inline check icon (no dependency) ────────────────────────────────
function CheckIcon({ className }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ── Progress bar helper ──────────────────────────────────────────────
function RequirementBar({ label, current, target, pct }) {
  const met = pct >= 100;
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex justify-between text-[8px] font-mono mb-0.5">
        <span className="tracking-wider uppercase text-white/30">{label}</span>
        <span className={`tabular-nums ${met ? 'text-emerald-400' : 'text-white/40'}`}>
          {current} / {target}
        </span>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            met ? 'bg-emerald-400/60' : 'bg-white/15'
          }`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────
export default function VerificationBadge() {
  const isVerified = useSocialExtStore((s) => s.isVerified);
  const followers = useSocialExtStore((s) => s.followers);
  const credibility = useSocialExtStore((s) => s.credibility);
  const verify = useSocialExtStore((s) => s.verify);
  const checkVerification = useSocialExtStore((s) => s.checkVerification);

  const { eligible, progress } = checkVerification();

  // Compact verified badge
  if (isVerified) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">
        <CheckIcon className="w-3.5 h-3.5 text-[#00e5ff]" />
        <span className="text-[9px] font-mono font-bold tracking-wider text-[#00e5ff]">
          VERIFIED
        </span>
      </div>
    );
  }

  // Not verified — show progress
  const activityDays = progress.activityDays;

  return (
    <div className="border border-tactical-border/30 bg-[#0a0e18]/80 rounded-lg p-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <CheckIcon className="w-3.5 h-3.5 text-white/20" />
        <span className="text-[9px] font-mono tracking-widest uppercase text-white/40">
          Verification
        </span>
      </div>

      <RequirementBar
        label="Followers"
        current={followers.toLocaleString()}
        target="1,000"
        pct={progress.followers}
      />
      <RequirementBar
        label="Credibility"
        current={credibility}
        target="70"
        pct={progress.credibility}
      />
      <RequirementBar
        label="Activity Days"
        current={`${activityDays}%`}
        target="30d"
        pct={activityDays}
      />

      {eligible && (
        <button
          onClick={() => verify()}
          className="w-full mt-3 py-2 rounded text-[10px] font-mono font-bold tracking-wider text-[#00e5ff] bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
        >
          APPLY FOR VERIFICATION
        </button>
      )}

      {!eligible && (
        <div className="text-[8px] font-mono text-white/15 text-center mt-2">
          Meet all requirements to apply
        </div>
      )}
    </div>
  );
}
