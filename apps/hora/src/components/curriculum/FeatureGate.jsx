/**
 * FeatureGate — wraps a gameplay panel behind an F0 unlock.
 *
 * Usage:
 *   <FeatureGate feature="savingsVault">
 *     <FullSavingsVaultUI />
 *   </FeatureGate>
 *
 * When the player has not yet passed the gating F0 exam, a teaser card
 * is rendered instead. The teaser is aware of the specific feature and
 * points the player to the correct module in the Foundations tab.
 *
 * Dev override: useFoundationsStore.getState().forceUnlock('feature')
 */

import React from 'react';
import { useFoundationsStore } from '../../store/foundationsStore';
import { getUnlockForFeature } from '../../lib/foundationsUnlocks';

export default function FeatureGate({ feature, children, fallback }) {
  const unlocked = useFoundationsStore(s => s.isUnlocked(feature));
  if (unlocked) return children;
  return fallback ?? <FeatureTeaser feature={feature} />;
}

export function FeatureTeaser({ feature }) {
  const unlock = getUnlockForFeature(feature);
  if (!unlock) {
    return (
      <div className="p-6 rounded-xl border border-white/[0.06] bg-white/[0.02] text-tactical-text/50 font-mono text-xs">
        Feature &ldquo;{feature}&rdquo; is not yet available.
      </div>
    );
  }
  return (
    <div className="p-6 rounded-xl border border-[#00e5ff22] bg-gradient-to-br from-[#00e5ff10] to-transparent">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded"
          style={{ color: '#00e5ff', backgroundColor: '#00e5ff15', border: '1px solid #00e5ff30' }}>
          LOCKED · F0 · {unlock.order}
        </span>
        <h3 className="text-sm font-mono font-bold text-tactical-text">{unlock.featureLabel}</h3>
      </div>
      <p className="text-[11px] font-mono text-tactical-text/50 mb-3 max-w-lg">
        {unlock.featureDescription}
      </p>
      <div className="text-[10px] font-mono text-tactical-text/40">
        Unlock by passing the <span className="text-[#00e5ff]">{unlock.courseId}</span> exam
        in <span className="text-[#00e5ff]">Curriculum › Foundations</span>.
      </div>
    </div>
  );
}
