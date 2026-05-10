import React, { useEffect, useMemo } from 'react';
import { useWorldIntelStore } from '../../store/worldIntelStore';

// ── Category Config ────────────────────────────────────────────

const CATEGORIES = [
  { key: 'shipments',    icon: '🚢', label: 'CARGO',   color: 'text-sky-400' },
  { key: 'competition',  icon: '⚔',  label: 'RIVALS',  color: 'text-amber-400' },
  { key: 'government',   icon: '🏛',  label: 'GOV',     color: 'text-violet-400' },
  { key: 'targets',      icon: '◎',  label: 'M&A',     color: 'text-emerald-400' },
  { key: 'cyber',        icon: '⚡',  label: 'CYBER',   color: 'text-rose-400' },
  { key: 'shadow',       icon: '☠',  label: 'SHADOW',  color: 'text-red-400' },
];

const SEVERITY_COLORS = {
  low:      'text-emerald-400 border-emerald-500/30',
  medium:   'text-amber-400 border-amber-500/30',
  high:     'text-rose-400 border-rose-500/30',
  critical: 'text-red-500 border-red-500/50 animate-pulse',
};

const STATUS_COLORS = {
  in_transit: 'text-sky-400',
  delivered:  'text-emerald-400',
  delayed:    'text-amber-400',
  seized:     'text-red-500',
  rerouted:   'text-violet-400',
  at_port:    'text-cyan-400',
  detected:   'text-amber-400',
  mitigated:  'text-emerald-400',
  active:     'text-red-500',
  investigating: 'text-violet-400',
};

const CLASSIFICATION_COLORS = {
  NOTICE:     'bg-sky-500/20 text-sky-400 border-sky-500/30',
  WARNING:    'bg-amber-500/20 text-amber-400 border-amber-500/30',
  CRITICAL:   'bg-red-500/20 text-red-400 border-red-500/30',
  CLASSIFIED: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
};

// ── Time Formatting ────────────────────────────────────────────

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ── Sub-Renderers ──────────────────────────────────────────────

function ShipmentCard({ item }) {
  return (
    <div className={`px-3 py-2 border-b border-[rgba(232,224,208,0.06)] hover:bg-white/[0.03] transition ${item.flagged ? 'border-l-2 border-l-red-500/60' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-mono text-[#E8E0D0] truncate flex-1">{item.commodity}</span>
        <span className={`text-[9px] font-mono uppercase ${STATUS_COLORS[item.status] || 'text-[#9C8E7E]'}`}>
          {item.status.replace('_', ' ')}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[9px] text-[#9C8E7E] font-mono truncate">{item.origin}</span>
        <span className="text-[9px] text-sky-500">→</span>
        <span className="text-[9px] text-[#9C8E7E] font-mono truncate">{item.destination}</span>
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full rounded-full transition-all ${item.status === 'seized' ? 'bg-red-500' : item.status === 'delayed' ? 'bg-amber-500' : 'bg-sky-500'}`}
          style={{ width: `${item.progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-[#9C8E7E] font-mono">{item.carrier} · {item.quantity}</span>
        <div className="flex items-center gap-2">
          {item.owner !== 'player' && (
            <span className={`text-[8px] font-mono uppercase px-1 rounded ${item.owner === 'rival' ? 'bg-amber-500/15 text-amber-400' : 'bg-white/5 text-[#9C8E7E]'}`}>
              {item.owner}
            </span>
          )}
          <span className="text-[9px] text-[#9C8E7E] font-mono">ETA {item.eta}</span>
        </div>
      </div>
    </div>
  );
}

function CompetitionCard({ item }) {
  const actionIcons = {
    expansion: '📈', price_cut: '📉', hiring_spree: '👥', acquisition: '🏗',
    ipo_filing: '📋', partnership: '🤝', product_launch: '🚀', market_exit: '🚪',
  };

  return (
    <div className="px-3 py-2 border-b border-[rgba(232,224,208,0.06)] hover:bg-white/[0.03] transition">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{actionIcons[item.action] || '⚔'}</span>
          <span className="text-[11px] font-mono font-semibold text-[#E8E0D0]">{item.rivalName}</span>
        </div>
        <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${SEVERITY_COLORS[item.severity]}`}>
          {item.severity}
        </span>
      </div>
      <p className="text-[10px] text-[#E8E0D0]/80 font-mono leading-relaxed mb-1">{item.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-[#9C8E7E] font-mono capitalize">{item.sector} · {item.region}</span>
        <span className="text-[9px] text-amber-400/70 font-mono">{item.impactEstimate}</span>
      </div>
    </div>
  );
}

function GovernmentCard({ item }) {
  const typeIcons = {
    regulation: '📜', tax_audit: '🔍', investigation: '🕵', sanction: '🚫',
    trade_policy: '📊', subsidy: '💰', antitrust: '⚖', environmental: '🌿',
  };

  return (
    <div className="px-3 py-2 border-b border-[rgba(232,224,208,0.06)] hover:bg-white/[0.03] transition">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{typeIcons[item.eventType] || '🏛'}</span>
          <span className="text-[10px] font-mono text-[#9C8E7E]">{item.agency}</span>
        </div>
        <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${CLASSIFICATION_COLORS[item.classification]}`}>
          {item.classification}
        </span>
      </div>
      <p className="text-[10px] text-[#E8E0D0]/80 font-mono leading-relaxed mb-1">{item.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {item.affectedSectors.map(s => (
            <span key={s} className="text-[8px] font-mono text-violet-400/70 bg-violet-500/10 px-1 rounded capitalize">{s}</span>
          ))}
        </div>
        <span className="text-[9px] text-[#9C8E7E] font-mono">eff. {item.effectiveDate}</span>
      </div>
    </div>
  );
}

function TargetCard({ item }) {
  const typeColors = {
    acquisition: 'text-emerald-400', merger: 'text-sky-400', hostile_takeover: 'text-red-400',
    partnership: 'text-cyan-400', franchise: 'text-amber-400', distressed_sale: 'text-rose-400',
  };

  return (
    <div className="px-3 py-2 border-b border-[rgba(232,224,208,0.06)] hover:bg-white/[0.03] transition">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-mono font-semibold text-[#E8E0D0] truncate flex-1">{item.targetName}</span>
        <span className={`text-[9px] font-mono uppercase ${typeColors[item.opportunityType] || 'text-[#9C8E7E]'}`}>
          {item.opportunityType.replace('_', ' ')}
        </span>
      </div>
      <p className="text-[10px] text-[#E8E0D0]/80 font-mono leading-relaxed mb-1.5">{item.description}</p>
      <div className="flex items-center gap-3 mb-1">
        <div className="flex-1">
          <div className="text-[8px] text-[#9C8E7E] font-mono mb-0.5">STRATEGIC VALUE</div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.strategicValue}%` }} />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[8px] text-[#9C8E7E] font-mono mb-0.5">SELLER WILL.</div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${item.sellerWillingness > 60 ? 'bg-emerald-500' : item.sellerWillingness > 30 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${item.sellerWillingness}%` }} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-[#9C8E7E] font-mono capitalize">{item.sector} · {item.region}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-400 font-mono font-semibold">{item.valuation}</span>
          <span className="text-[8px] text-amber-400/70 font-mono">⏱ {item.expiresIn}</span>
        </div>
      </div>
    </div>
  );
}

function CyberCard({ item }) {
  const typeIcons = {
    ddos: '🌐', phishing: '🎣', ransomware: '🔒', data_breach: '💾',
    espionage: '🕵', insider_threat: '👤', supply_chain_attack: '🔗',
  };

  return (
    <div className="px-3 py-2 border-b border-[rgba(232,224,208,0.06)] hover:bg-white/[0.03] transition">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{typeIcons[item.threatType] || '⚡'}</span>
          <span className="text-[10px] font-mono text-rose-400/80 uppercase">{item.threatType.replace('_', ' ')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${SEVERITY_COLORS[item.severity]}`}>
            {item.severity}
          </span>
          <span className={`text-[8px] font-mono uppercase ${STATUS_COLORS[item.status]}`}>
            {item.status}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-[#E8E0D0]/80 font-mono leading-relaxed mb-1">{item.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-[#9C8E7E] font-mono">SRC: {item.source}</span>
        <span className="text-[9px] text-rose-400/60 font-mono">TGT: {item.target}</span>
      </div>
    </div>
  );
}

function ShadowCard({ item }) {
  const typeIcons = {
    smuggling: '📦', black_market: '🏴', money_laundering: '🏧', insider_trading: '📊',
    cartel_activity: '⛓', arms_deal: '💣', crypto_wash: '₿',
  };

  return (
    <div className="px-3 py-2 border-b border-[rgba(232,224,208,0.06)] hover:bg-white/[0.03] transition">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{typeIcons[item.operationType] || '☠'}</span>
          <span className="text-[10px] font-mono text-red-400/80 uppercase">{item.operationType.replace('_', ' ')}</span>
        </div>
        <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${SEVERITY_COLORS[item.riskLevel]}`}>
          {item.riskLevel}
        </span>
      </div>
      <p className="text-[10px] text-[#E8E0D0]/80 font-mono leading-relaxed mb-1">{item.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-[#9C8E7E] font-mono">{item.actors} · {item.region}</span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-emerald-400/70 font-mono">{item.profitPotential}</span>
          <span className="text-[8px] text-[#9C8E7E] font-mono">{item.confidence}% conf</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function MapIntelFeed() {
  const feedOpen = useWorldIntelStore(s => s.feedOpen);
  const activeCategory = useWorldIntelStore(s => s.activeCategory);
  const unreadCounts = useWorldIntelStore(s => s.unreadCounts);
  const setCategory = useWorldIntelStore(s => s.setCategory);
  const toggleFeed = useWorldIntelStore(s => s.toggleFeed);
  const markRead = useWorldIntelStore(s => s.markRead);
  const refreshAll = useWorldIntelStore(s => s.refreshAll);

  const shipments = useWorldIntelStore(s => s.shipments);
  const competition = useWorldIntelStore(s => s.competition);
  const government = useWorldIntelStore(s => s.government);
  const targets = useWorldIntelStore(s => s.targets);
  const cyber = useWorldIntelStore(s => s.cyber);
  const shadow = useWorldIntelStore(s => s.shadow);

  // Initial load + auto-refresh every 90s
  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 90_000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Mark current category as read when switching
  useEffect(() => {
    if (feedOpen) markRead(activeCategory);
  }, [activeCategory, feedOpen, markRead]);

  const totalUnread = useMemo(
    () => Object.values(unreadCounts).reduce((a, b) => a + b, 0),
    [unreadCounts],
  );

  const feedData = { shipments, competition, government, targets, cyber, shadow };
  const currentFeed = feedData[activeCategory] || [];

  // Sort by timestamp descending
  const sortedFeed = useMemo(
    () => [...currentFeed].sort((a, b) => b.timestamp - a.timestamp),
    [currentFeed],
  );

  const renderCard = (item) => {
    switch (activeCategory) {
      case 'shipments': return <ShipmentCard key={item.id} item={item} />;
      case 'competition': return <CompetitionCard key={item.id} item={item} />;
      case 'government': return <GovernmentCard key={item.id} item={item} />;
      case 'targets': return <TargetCard key={item.id} item={item} />;
      case 'cyber': return <CyberCard key={item.id} item={item} />;
      case 'shadow': return <ShadowCard key={item.id} item={item} />;
      default: return null;
    }
  };

  return (
    <>
      {/* Feed Panel (toggle moved to Layers panel) */}
      {feedOpen && (
        <div className="absolute bottom-32 left-3 z-50 w-[340px] max-h-[60vh] flex flex-col
          rounded-lg bg-[rgba(12,11,10,0.96)] border border-[rgba(232,224,208,0.12)]
          backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.5)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(232,224,208,0.08)] shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-sm">◈</span>
              <span className="text-[#E8E0D0] text-[10px] font-mono font-semibold tracking-widest">
                WORLD INTELLIGENCE
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={refreshAll}
                className="text-[#9C8E7E] hover:text-emerald-400 text-[10px] font-mono transition-colors px-1"
                title="Refresh all feeds"
              >
                ↻
              </button>
              <button
                onClick={toggleFeed}
                className="text-[#9C8E7E] hover:text-[#E8E0D0] text-xs transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex border-b border-[rgba(232,224,208,0.06)] shrink-0 overflow-x-auto">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2 px-1 transition-all text-center
                  ${activeCategory === cat.key
                    ? `${cat.color} border-b-2 border-current bg-white/[0.03]`
                    : 'text-[#9C8E7E] hover:text-[#E8E0D0] hover:bg-white/[0.02]'
                  }`}
              >
                <div className="flex items-center gap-0.5">
                  <span className="text-[10px]">{cat.icon}</span>
                  {unreadCounts[cat.key] > 0 && activeCategory !== cat.key && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  )}
                </div>
                <span className="text-[8px] font-mono tracking-wide">{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Feed Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {sortedFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-[#9C8E7E]">
                <span className="text-2xl mb-2 opacity-30">◌</span>
                <span className="text-[10px] font-mono">No intelligence available</span>
              </div>
            ) : (
              sortedFeed.map(item => (
                <div key={item.id} className="relative">
                  <div className="absolute top-2 right-2 text-[8px] text-[#9C8E7E]/50 font-mono">
                    {timeAgo(item.timestamp)}
                  </div>
                  {renderCard(item)}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-[rgba(232,224,208,0.06)] shrink-0">
            <span className="text-[8px] text-[#9C8E7E]/50 font-mono">
              {sortedFeed.length} entries · auto-refresh 90s · AEGIS Intelligence Division
            </span>
          </div>
        </div>
      )}
    </>
  );
}
