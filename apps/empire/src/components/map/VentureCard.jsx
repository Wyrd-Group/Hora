import React from 'react';
import { useLivingWorldStore } from '../../store/livingWorldStore';
import { useEmpireStore } from '../../store/empireStore';

const SECTOR_EMOJI = {
  finance: '🏦', tech: '💻', manufacturing: '🏭', energy: '⚡',
  oil_gas: '🛢️', defense: '🛡️', pharma: '🔬', healthcare: '🏥',
  education: '🎓', cultural: '🏛️', hospitality: '🏨', venue: '🏪', retail: '🛍️',
};

const SECTOR_COLOR = {
  finance: '#00e5ff', tech: '#7c3aed', manufacturing: '#6366f1', energy: '#10b981',
  oil_gas: '#f59e0b', defense: '#94a3b8', pharma: '#ec4899', healthcare: '#14b8a6',
  education: '#f97316', cultural: '#a78bfa', hospitality: '#fb923c', venue: '#a78bfa', retail: '#f472b6',
};

export default function VentureCard() {
  const selectedVentureId = useLivingWorldStore(s => s.selectedVentureId);
  const worldNodes = useLivingWorldStore(s => s.worldNodes);
  const worldRoutes = useLivingWorldStore(s => s.worldRoutes);
  const selectVenture = useLivingWorldStore(s => s.selectVenture);
  const invest = useLivingWorldStore(s => s.invest);
  const getRoutesForNode = useLivingWorldStore(s => s.getRoutesForNode);

  if (!selectedVentureId || !worldNodes[selectedVentureId]) return null;

  const node = worldNodes[selectedVentureId];
  const routes = getRoutesForNode(selectedVentureId);
  const color = SECTOR_COLOR[node.sector] || '#00e5ff';
  const emoji = SECTOR_EMOJI[node.sector] || '📍';
  const ageHours = Math.round((Date.now() - new Date(node.created_at).getTime()) / 3_600_000);
  const ageDisplay = ageHours < 1 ? 'Just founded' : ageHours < 24 ? `${ageHours}h ago` : `${Math.round(ageHours / 24)}d ago`;

  const supplyChains = routes.filter(r => r.route_type === 'supply_chain').length;
  const partnerships = routes.filter(r => r.route_type === 'partnership').length;
  const franchises = routes.filter(r => r.route_type === 'franchise').length;

  const handleInvest = async () => {
    await invest(selectedVentureId);
  };

  return (
    <div className="fixed right-0 top-[40px] bottom-8 w-80 z-[30]
      bg-tactical-bg/95 border-l border-tactical-border backdrop-blur-xl overflow-y-auto">

      {/* Header */}
      <div className="px-4 py-3 border-b border-tactical-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">{emoji}</span>
            <div className="min-w-0">
              <h3 className="text-tactical-text font-mono text-sm font-semibold truncate">
                {node.name}
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-mono"
                style={{ color }}>
                {node.sector.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={() => selectVenture(null)}
            className="text-tactical-muted hover:text-tactical-text transition text-lg leading-none ml-2"
          >
            &times;
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Level Badge */}
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase"
            style={{ color, backgroundColor: `${color}20`, border: `1px solid ${color}40` }}>
            Level {node.level}
          </div>
          <span className="text-[10px] text-tactical-muted">{ageDisplay}</span>
        </div>

        {/* Business Model */}
        {node.business_model && (
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-tactical-muted mb-1">
              Business Model
            </label>
            <p className="text-tactical-text/80 text-xs leading-relaxed">
              {node.business_model}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Investors" value={node.investor_count} color={color} />
          <StatBox label="Purchases" value={node.purchase_count} color={color} />
          <StatBox label="Income" value={`${node.base_income.toLocaleString()}/mo`} color="#10b981" />
          <StatBox label="Cost" value={`${node.base_cost.toLocaleString()}/mo`} color="#ef4444" />
        </div>

        {/* Connections */}
        {(supplyChains > 0 || partnerships > 0 || franchises > 0) && (
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-tactical-muted mb-2">
              Connections
            </label>
            <div className="space-y-1.5">
              {supplyChains > 0 && (
                <ConnectionRow emoji="🔗" label="Supply Chains" count={supplyChains} color="#00e5ff" />
              )}
              {partnerships > 0 && (
                <ConnectionRow emoji="🤝" label="Partnerships" count={partnerships} color="#a78bfa" />
              )}
              {franchises > 0 && (
                <ConnectionRow emoji="🏪" label="Franchises" count={franchises} color="#f59e0b" />
              )}
            </div>
          </div>
        )}

        {/* Location */}
        <div className="bg-black/30 rounded p-3 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-tactical-muted">Lat/Lng</span>
            <span className="text-tactical-text font-mono">
              {node.lat.toFixed(4)}, {node.lng.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-tactical-muted">H3</span>
            <span className="text-tactical-text font-mono text-[9px]">{node.h3_index}</span>
          </div>
        </div>

        {/* Upvotes */}
        <div className="flex items-center justify-between bg-black/30 rounded p-3">
          <div className="flex items-center gap-2">
            <span className="text-tactical-muted text-xs">Upvotes</span>
            <span className="text-tactical-text font-mono text-sm font-semibold">{node.upvotes}</span>
          </div>
          <div
            className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase
              ${node.status === 'active' ? 'text-tactical-success bg-tactical-success/10' : 'text-tactical-warning bg-tactical-warning/10'}`}
          >
            {node.status}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleInvest}
            className="w-full py-2 rounded font-mono text-xs font-semibold uppercase tracking-wider
              bg-tactical-accent/20 text-tactical-accent border border-tactical-accent/40
              hover:bg-tactical-accent/30 transition"
          >
            Invest
          </button>
          <button
            className="w-full py-2 rounded font-mono text-xs font-semibold uppercase tracking-wider
              bg-empire-tech/10 text-empire-tech border border-empire-tech/30
              hover:bg-empire-tech/20 transition"
          >
            Propose Partnership
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="bg-black/30 rounded p-2.5">
      <p className="text-[9px] uppercase tracking-wider text-tactical-muted">{label}</p>
      <p className="font-mono text-sm font-semibold mt-0.5" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function ConnectionRow({ emoji, label, count, color }) {
  return (
    <div className="flex items-center justify-between bg-black/20 rounded px-2.5 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs">{emoji}</span>
        <span className="text-[10px] text-tactical-text">{label}</span>
      </div>
      <span className="font-mono text-xs font-semibold" style={{ color }}>{count}</span>
    </div>
  );
}
