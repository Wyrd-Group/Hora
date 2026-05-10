/**
 * AgentCardGallery -- Grid view of all owned agent cards.
 *
 * Features:
 * - Responsive grid: 2 cols mobile, 3 tablet, 4 desktop
 * - Filter by class and rarity
 * - Sort by level, rarity, name
 * - Click card to expand into full AgentCardNFT view
 * - Collection stats banner at top
 */

import { useState, useMemo, useCallback } from 'react';
import { useAgentCardStore } from '../../store/agentCardStore';
import {
  AGENT_CATALOG,
  AGENT_RARITY_CONFIG,
  AGENT_CLASS_CONFIG,
  getAgentById,
} from '../../data/agentCards';
import AgentCardNFT from './AgentCardNFT';

// ── Constants ───────────────────────────────────────────────────

const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];
const ALL_CLASSES = Object.keys(AGENT_CLASS_CONFIG);

const SORT_OPTIONS = [
  { key: 'rarity-desc', label: 'Rarity (High)' },
  { key: 'rarity-asc',  label: 'Rarity (Low)' },
  { key: 'level-desc',  label: 'Level (High)' },
  { key: 'level-asc',   label: 'Level (Low)' },
  { key: 'name-asc',    label: 'Name (A-Z)' },
  { key: 'name-desc',   label: 'Name (Z-A)' },
];

// ── Gallery Component ───────────────────────────────────────────

export default function AgentCardGallery() {
  const agents = useAgentCardStore((s) => s.agents);
  const deployAgent = useAgentCardStore((s) => s.deployAgent);
  const quickSellAgent = useAgentCardStore((s) => s.quickSellAgent);

  const [filterClass, setFilterClass] = useState('All');
  const [filterRarity, setFilterRarity] = useState('All');
  const [sortKey, setSortKey] = useState('rarity-desc');
  const [expandedMintId, setExpandedMintId] = useState(null);

  // Build list of owned agents with their card definitions
  const ownedAgents = useMemo(() => {
    return Object.values(agents)
      .map((minted) => {
        const def = getAgentById(minted.cardId);
        if (!def) return null;
        return { minted, def };
      })
      .filter(Boolean);
  }, [agents]);

  // Filtered + sorted
  const displayedAgents = useMemo(() => {
    let list = [...ownedAgents];

    // Filter by class
    if (filterClass !== 'All') {
      list = list.filter((a) => a.def.class === filterClass);
    }

    // Filter by rarity
    if (filterRarity !== 'All') {
      list = list.filter((a) => a.def.rarity === filterRarity);
    }

    // Sort
    const [field, dir] = sortKey.split('-');
    const mult = dir === 'desc' ? -1 : 1;

    list.sort((a, b) => {
      if (field === 'rarity') {
        return mult * (RARITY_ORDER.indexOf(a.def.rarity) - RARITY_ORDER.indexOf(b.def.rarity));
      }
      if (field === 'level') {
        return mult * (a.minted.level - b.minted.level);
      }
      if (field === 'name') {
        return mult * a.def.name.localeCompare(b.def.name);
      }
      return 0;
    });

    return list;
  }, [ownedAgents, filterClass, filterRarity, sortKey]);

  // Collection stats
  const stats = useMemo(() => {
    const total = AGENT_CATALOG.length;
    const ownedIds = new Set(ownedAgents.map((a) => a.def.id));
    const uniqueOwned = ownedIds.size;

    let rarestIdx = -1;
    let rarestAgent = null;
    let totalValue = 0;

    for (const a of ownedAgents) {
      const idx = RARITY_ORDER.indexOf(a.def.rarity);
      if (idx > rarestIdx) {
        rarestIdx = idx;
        rarestAgent = a;
      }
      const cfg = AGENT_RARITY_CONFIG[a.def.rarity];
      totalValue += cfg.quickSellValue * (1 + (a.minted.level - 1) * 0.2);
    }

    return {
      total,
      uniqueOwned,
      totalOwned: ownedAgents.length,
      rarestAgent,
      totalValue: Math.floor(totalValue),
    };
  }, [ownedAgents]);

  const expandedEntry = expandedMintId
    ? ownedAgents.find((a) => a.minted.mintId === expandedMintId) ?? null
    : null;

  const handleCloseExpanded = useCallback(() => setExpandedMintId(null), []);

  // ── Render ──────────────────────────────────────────────────

  return (
    <div
      className="w-full"
      style={{
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        color: '#E8E0D0',
      }}
    >
      {/* ─── COLLECTION STATS BANNER ────────────────────── */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{
          background: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(167,139,250,0.04) 100%)',
          border: '1px solid rgba(6,182,212,0.12)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">&#x1F5C3;&#xFE0F;</span>
          <h2 className="font-bold tracking-wide text-sm uppercase text-cyan-400">
            Agent Collection
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBlock
            label="Unique Agents"
            value={`${stats.uniqueOwned} / ${stats.total}`}
            sub={`${Math.round((stats.uniqueOwned / stats.total) * 100)}% complete`}
            color="#06B6D4"
          />
          <StatBlock
            label="Total Cards"
            value={stats.totalOwned}
            sub={`${stats.totalOwned} minted`}
            color="#34D399"
          />
          <StatBlock
            label="Rarest Card"
            value={stats.rarestAgent ? stats.rarestAgent.def.name : '--'}
            sub={stats.rarestAgent ? stats.rarestAgent.def.rarity : ''}
            color={stats.rarestAgent ? AGENT_RARITY_CONFIG[stats.rarestAgent.def.rarity].color : '#9CA3AF'}
          />
          <StatBlock
            label="Collection Value"
            value={`${stats.totalValue.toLocaleString()} AP`}
            sub="Quick-sell total"
            color="#FBBF24"
          />
        </div>
      </div>

      {/* ─── FILTERS + SORT ─────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Class filter */}
        <FilterSelect
          label="Class"
          value={filterClass}
          onChange={setFilterClass}
          options={['All', ...ALL_CLASSES]}
          renderOption={(opt) => {
            if (opt === 'All') return 'All Classes';
            const cfg = AGENT_CLASS_CONFIG[opt];
            return `${cfg?.icon ?? ''} ${opt}`;
          }}
        />

        {/* Rarity filter */}
        <FilterSelect
          label="Rarity"
          value={filterRarity}
          onChange={setFilterRarity}
          options={['All', ...RARITY_ORDER]}
          renderOption={(opt) => opt === 'All' ? 'All Rarities' : opt}
        />

        {/* Sort */}
        <FilterSelect
          label="Sort"
          value={sortKey}
          onChange={setSortKey}
          options={SORT_OPTIONS.map((s) => s.key)}
          renderOption={(key) => SORT_OPTIONS.find((s) => s.key === key)?.label ?? key}
        />

        {/* Count */}
        <div className="ml-auto">
          <span className="font-mono text-white/30" style={{ fontSize: 10 }}>
            Showing {displayedAgents.length} of {ownedAgents.length}
          </span>
        </div>
      </div>

      {/* ─── CARD GRID ──────────────────────────────────── */}
      {displayedAgents.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.08)',
          }}
        >
          <span className="text-3xl block mb-3">&#x1F4E6;</span>
          <p className="font-mono text-white/30 text-sm">
            {ownedAgents.length === 0
              ? 'No agents in your collection yet. Open packs to get started!'
              : 'No agents match your current filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {displayedAgents.map(({ minted, def }) => (
            <CompactCard
              key={minted.mintId}
              minted={minted}
              def={def}
              onClick={() => setExpandedMintId(minted.mintId)}
            />
          ))}
        </div>
      )}

      {/* ─── EXPANDED OVERLAY ───────────────────────────── */}
      {expandedEntry && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={handleCloseExpanded}
        >
          <div
            className="relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}
          >
            {/* Close button */}
            <button
              onClick={handleCloseExpanded}
              className="absolute top-2 right-2 z-[1000] font-mono text-white/40 hover:text-white/80 transition-colors cursor-pointer"
              style={{
                fontSize: 20,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              &#x2715;
            </button>

            <AgentCardNFT
              card={expandedEntry.def}
              minted={expandedEntry.minted}
              edition={expandedEntry.minted.editionNumber}
              onDeploy={() => {
                // Deployment target selector — deferred to post-beta agent deployment milestone
              }}
              onSell={() => {
                const value = quickSellAgent(expandedEntry.minted.mintId);
                if (value > 0) {
                  setExpandedMintId(null);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Compact Card (Grid Tile) ────────────────────────────────────

function CompactCard({ minted, def, onClick }) {
  const rarityConfig = AGENT_RARITY_CONFIG[def.rarity];
  const classConfig = AGENT_CLASS_CONFIG[def.class];
  const [hovered, setHovered] = useState(false);

  const totalStats = Object.values(def.stats).reduce((a, b) => a + b, 0);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left w-full rounded-xl overflow-hidden transition-all duration-200 cursor-pointer"
      style={{
        background: hovered
          ? 'linear-gradient(180deg, rgba(15,17,22,1) 0%, rgba(20,22,28,1) 100%)'
          : 'linear-gradient(180deg, rgba(10,12,16,1) 0%, rgba(13,15,20,1) 100%)',
        border: `1px solid ${hovered ? rarityConfig.color + '55' : rarityConfig.color + '22'}`,
        boxShadow: hovered ? rarityConfig.glow : '0 2px 8px rgba(0,0,0,0.4)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {/* Portrait */}
      <div
        className="relative flex items-center justify-center"
        style={{
          height: 90,
          background: `linear-gradient(135deg, ${def.portraitGradient[0]}66, ${def.portraitGradient[1]}66, ${def.portraitGradient[2]}66)`,
        }}
      >
        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)',
          }}
        />

        <span style={{ fontSize: 36, filter: `drop-shadow(0 0 10px ${def.portraitGradient[1]}66)` }}>
          {def.iconGlyph}
        </span>

        {/* Level */}
        <span
          className="absolute bottom-1 right-1.5 font-mono font-bold px-1.5 py-0.5 rounded"
          style={{
            fontSize: 8,
            background: 'rgba(0,0,0,0.7)',
            color: rarityConfig.color,
            border: `1px solid ${rarityConfig.color}33`,
          }}
        >
          LV.{minted.level}
        </span>

        {/* Deployed indicator */}
        {minted.deployedTo && (
          <span
            className="absolute top-1 right-1.5 font-mono uppercase px-1 py-0.5 rounded"
            style={{
              fontSize: 6,
              background: 'rgba(16,185,129,0.2)',
              color: '#10B981',
              border: '1px solid rgba(16,185,129,0.4)',
            }}
          >
            Deployed
          </span>
        )}

        {/* Rarity dot */}
        <span
          className="absolute top-1.5 left-1.5"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: rarityConfig.color,
            boxShadow: rarityConfig.glow,
            display: 'inline-block',
          }}
        />
      </div>

      {/* Info */}
      <div className="p-2.5">
        <div
          className="font-bold tracking-wide truncate leading-tight"
          style={{ fontSize: 12, color: '#E2E8F0' }}
        >
          {def.name}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span style={{ fontSize: 10 }}>{classConfig.icon}</span>
          <span
            className="font-mono truncate"
            style={{ fontSize: 8, color: classConfig.color }}
          >
            {def.class}
          </span>
          <span className="font-mono text-white/20" style={{ fontSize: 8 }}>
            &#x2022;
          </span>
          <span
            className="font-mono font-bold"
            style={{ fontSize: 8, color: rarityConfig.color }}
          >
            {def.rarity}
          </span>
        </div>

        {/* Mini stat bar */}
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(totalStats / 600) * 100}%`,
                background: `linear-gradient(90deg, ${classConfig.color}88, ${rarityConfig.color})`,
              }}
            />
          </div>
          <span className="font-mono text-white/25" style={{ fontSize: 7 }}>
            {totalStats}
          </span>
        </div>

        {/* Edition */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-mono text-white/20" style={{ fontSize: 7 }}>
            #{String(minted.editionNumber).padStart(3, '0')}/{def.maxSupply}
          </span>
          <span className="font-mono text-white/15" style={{ fontSize: 7 }}>
            {def.edition}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Stat Block (Collection Stats) ───────────────────────────────

function StatBlock({ label, value, sub, color }) {
  return (
    <div
      className="rounded-lg p-2.5"
      style={{
        background: `${color}06`,
        border: `1px solid ${color}15`,
      }}
    >
      <div
        className="font-mono uppercase tracking-wider text-white/25 mb-0.5"
        style={{ fontSize: 8 }}
      >
        {label}
      </div>
      <div
        className="font-mono font-bold"
        style={{ fontSize: 14, color }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="font-mono text-white/20 mt-0.5"
          style={{ fontSize: 8 }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Filter Select ───────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options, renderOption }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono uppercase tracking-wider text-white/20" style={{ fontSize: 8 }}>
        {label}:
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-white/60 rounded px-2 py-1 cursor-pointer outline-none"
        style={{
          fontSize: 10,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          appearance: 'auto',
        }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt} style={{ background: '#111318', color: '#E2E8F0' }}>
            {renderOption ? renderOption(opt) : opt}
          </option>
        ))}
      </select>
    </div>
  );
}
