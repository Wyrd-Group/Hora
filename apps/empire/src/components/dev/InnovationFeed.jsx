import React, { useEffect } from 'react';
import { usePlayerDevStore, INNOVATION_REWARDS } from '../../store/playerDevStore';

const TYPE_LABELS = {
  new_sector_hub: 'Sector Hub',
  trade_route_pioneer: 'Trade Route',
  government_type: 'Government',
  market_strategy: 'Market Strategy',
  gameplay_path: 'Gameplay Path',
  regulation_change: 'Regulation',
  political_move: 'Political Move',
};

const TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};

export default function InnovationFeed() {
  const innovations = usePlayerDevStore(s => s.innovations);
  const loadMyInnovations = usePlayerDevStore(s => s.loadMyInnovations);

  useEffect(() => {
    loadMyInnovations();
  }, [loadMyInnovations]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] uppercase tracking-widest text-tactical-accent font-mono">
          Innovation Feed
        </h4>
        <span className="text-[9px] text-tactical-muted font-mono">
          {innovations.length} detected
        </span>
      </div>

      {innovations.length === 0 ? (
        <div className="bg-black/30 rounded p-4 text-center">
          <p className="text-tactical-muted text-xs font-mono">No innovations detected yet.</p>
          <p className="text-tactical-muted/60 text-[10px] font-mono mt-1">
            Found new sector hubs, pioneer trade routes, or create novel strategies to earn rewards.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {innovations.map(inn => {
            const tierInfo = inn.reward_tier ? INNOVATION_REWARDS[inn.reward_tier] : null;
            return (
              <div key={inn.id} className="bg-black/30 rounded p-3 border border-tactical-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-tactical-text font-semibold">
                    {TYPE_LABELS[inn.innovation_type] || inn.innovation_type}
                  </span>
                  <div className="flex items-center gap-2">
                    {inn.reward_tier && (
                      <span
                        className="text-[9px] font-mono font-bold uppercase"
                        style={{ color: TIER_COLORS[inn.reward_tier] || '#9CA3AF' }}
                      >
                        {inn.reward_tier}
                      </span>
                    )}
                    <span
                      className={`text-[9px] font-mono uppercase ${
                        inn.status === 'rewarded'
                          ? 'text-tactical-success'
                          : inn.status === 'verified'
                            ? 'text-tactical-accent'
                            : 'text-tactical-muted'
                      }`}
                    >
                      {inn.status}
                    </span>
                  </div>
                </div>

                {inn.description && (
                  <p className="text-[11px] text-tactical-muted mb-2">{inn.description}</p>
                )}

                <div className="flex gap-4 text-[9px] text-tactical-muted font-mono">
                  <span>Impact: {(inn.impact_score * 100).toFixed(0)}%</span>
                  <span>Followers: {inn.follower_count.toLocaleString()}</span>
                  {tierInfo && (
                    <span className="text-tactical-accent">
                      +{tierInfo.xp} XP · +{tierInfo.ap} AP
                    </span>
                  )}
                </div>

                {/* Progress to next tier */}
                {inn.reward_tier && inn.reward_tier !== 'diamond' && (
                  <div className="mt-2">
                    <div className="h-1 bg-tactical-border rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${Math.min(100, (inn.follower_count / (tierInfo?.minFollowers || 1)) * 100)}%`,
                          backgroundColor: TIER_COLORS[inn.reward_tier] || '#00e5ff',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
