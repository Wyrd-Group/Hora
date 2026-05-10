import React, { useEffect } from 'react';
import { useLivingWorldStore } from '../../store/livingWorldStore';

const SECTOR_EMOJI = {
  finance: '🏦', tech: '💻', manufacturing: '🏭', energy: '⚡',
  oil_gas: '🛢️', defense: '🛡️', pharma: '🔬', healthcare: '🏥',
  education: '🎓', cultural: '🏛️', hospitality: '🏨', venue: '🏪', retail: '🛍️',
};

export default function TrendingVentures({ onZoomTo }) {
  const trending = useLivingWorldStore(s => s.trending);
  const refreshTrending = useLivingWorldStore(s => s.refreshTrending);
  const worldNodes = useLivingWorldStore(s => s.worldNodes);
  const selectVenture = useLivingWorldStore(s => s.selectVenture);

  useEffect(() => {
    refreshTrending();
    const interval = setInterval(refreshTrending, 60_000);
    return () => clearInterval(interval);
  }, [refreshTrending]);

  const topNodes = trending.top_nodes || [];
  const emergingSectors = trending.emerging_sectors || [];

  if (topNodes.length === 0 && emergingSectors.length === 0) return null;

  const handleClickNode = (nodeId) => {
    selectVenture(nodeId);
    const node = worldNodes[nodeId];
    if (node && onZoomTo) {
      onZoomTo({ longitude: node.lng, latitude: node.lat, zoom: 10 });
    }
  };

  return (
    <div className="absolute left-3 top-[52px] w-56 z-[20] space-y-2">
      {/* Hot Startups */}
      {topNodes.length > 0 && (
        <div className="bg-tactical-bg/90 border border-tactical-border rounded-lg backdrop-blur-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-tactical-border">
            <h4 className="text-[10px] uppercase tracking-widest text-tactical-accent font-mono font-semibold">
              Hot Companies
            </h4>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {topNodes.slice(0, 10).map((node, i) => (
              <button
                key={node.id}
                onClick={() => handleClickNode(node.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition text-left"
              >
                <span className="text-tactical-muted text-[10px] font-mono w-4">{i + 1}</span>
                <span className="text-tactical-text text-[11px] font-mono truncate flex-1">
                  {node.name}
                </span>
                <span className="text-tactical-accent text-[10px] font-mono">
                  {node.investor_count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Emerging Sectors */}
      {emergingSectors.length > 0 && (
        <div className="bg-tactical-bg/90 border border-tactical-border rounded-lg backdrop-blur-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-tactical-border">
            <h4 className="text-[10px] uppercase tracking-widest text-tactical-success font-mono font-semibold">
              Emerging Sectors
            </h4>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {emergingSectors.slice(0, 5).map((item, i) => (
              <div
                key={`${item.h3}-${item.sector}`}
                className="flex items-center justify-between px-3 py-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{SECTOR_EMOJI[item.sector] || '📍'}</span>
                  <span className="text-[10px] text-tactical-text font-mono capitalize">
                    {item.sector.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-tactical-success text-[10px] font-mono">
                  +{Math.round(item.growth * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
