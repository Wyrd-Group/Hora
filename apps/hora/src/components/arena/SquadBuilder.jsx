/**
 * SquadBuilder — FUT-style squad builder with chemistry visualization.
 *
 * Renders a boardroom org-chart layout with 10 position slots,
 * chemistry connection lines between adjacent positions, and
 * a bottom agent picker panel.
 */

import { useState, useMemo } from 'react';

// ── Constants ───────────────────────────────────────────────────

const FORMATIONS = [
  { id: '4-3-3', label: '4-3-3' },
  { id: '4-4-2', label: '4-4-2' },
  { id: '3-5-2', label: '3-5-2' },
  { id: '5-3-2', label: '5-3-2' },
];

const POSITION_META = {
  CEO:         { label: 'CEO',         row: 0, col: 2, fullLabel: 'Chief Executive Officer' },
  CTO:         { label: 'CTO',         row: 1, col: 0.5, fullLabel: 'Chief Technology Officer' },
  CFO:         { label: 'CFO',         row: 1, col: 1.5, fullLabel: 'Chief Financial Officer' },
  CMO:         { label: 'CMO',         row: 1, col: 2.5, fullLabel: 'Chief Marketing Officer' },
  COO:         { label: 'COO',         row: 1, col: 3.5, fullLabel: 'Chief Operating Officer' },
  Analyst_1:   { label: 'ANL-1',       row: 2, col: 1, fullLabel: 'Senior Analyst' },
  Analyst_2:   { label: 'ANL-2',       row: 2, col: 3, fullLabel: 'Senior Analyst' },
  Operative_1: { label: 'OPS-1',       row: 3, col: 0.5, fullLabel: 'Field Operative' },
  Operative_2: { label: 'OPS-2',       row: 3, col: 2, fullLabel: 'Field Operative' },
  Wildcard:    { label: 'WILD',        row: 3, col: 3.5, fullLabel: 'Wildcard' },
};

// Adjacency map for chemistry lines
const CONNECTIONS = [
  ['CEO', 'CTO'],
  ['CEO', 'CFO'],
  ['CEO', 'CMO'],
  ['CEO', 'COO'],
  ['CTO', 'Analyst_1'],
  ['COO', 'Analyst_2'],
  ['CFO', 'Analyst_1'],
  ['CMO', 'Analyst_2'],
  ['Analyst_1', 'Operative_1'],
  ['Analyst_1', 'Operative_2'],
  ['Analyst_2', 'Operative_2'],
  ['Analyst_2', 'Wildcard'],
  ['Operative_1', 'Operative_2'],
  ['Operative_2', 'Wildcard'],
];

// ── Helpers ─────────────────────────────────────────────────────

function ovrColor(ovr) {
  if (ovr >= 85) return '#34d399';
  if (ovr >= 70) return '#22d3ee';
  if (ovr >= 55) return '#fbbf24';
  return '#f87171';
}

function chemColor(score) {
  if (score >= 7) return '#34D399';
  if (score >= 4) return '#FBBF24';
  return '#EF4444';
}

function chemWidth(score) {
  if (score >= 7) return 3;
  if (score >= 4) return 2;
  return 1;
}

function chemistryOverallColor(chem) {
  if (chem >= 75) return '#34D399';
  if (chem >= 50) return '#FBBF24';
  return '#EF4444';
}

function GlassCard({ children, className = '' }) {
  return (
    <div className={`rounded-lg border border-white/[0.06] bg-white/[0.03] backdrop-blur-md ${className}`}>
      {children}
    </div>
  );
}

// ── Slot Component ──────────────────────────────────────────────

function PositionSlot({ position, slot, onClickSlot, isSelected }) {
  const meta = POSITION_META[position];
  const hasAgent = slot && slot.mintId;

  return (
    <button
      onClick={() => onClickSlot(position)}
      className={`
        relative w-[100px] h-[120px] rounded-lg border-2 transition-all duration-200
        flex flex-col items-center justify-center gap-1 group
        ${hasAgent
          ? 'border-cyan-500/30 bg-cyan-500/[0.06] hover:border-cyan-500/50'
          : 'border-dashed border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
        }
        ${isSelected ? 'ring-2 ring-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : ''}
      `}
    >
      {/* Position label */}
      <span className="text-[9px] font-mono tracking-[0.15em] text-white/30 uppercase">
        {meta.label}
      </span>

      {hasAgent ? (
        <>
          {/* Agent icon */}
          <div className="text-2xl leading-none">{slot.iconGlyph || '🤖'}</div>
          {/* OVR */}
          <span
            className="text-[12px] font-mono font-bold"
            style={{ color: ovrColor(slot.ovr) }}
          >
            {slot.ovr}
          </span>
          {/* Name */}
          <span className="text-[9px] font-mono text-white/60 truncate max-w-[80px]">
            {slot.name}
          </span>
          {/* Chemistry badge */}
          {slot.chemistryScore != null && (
            <span
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[8px] font-mono font-bold flex items-center justify-center border"
              style={{
                color: chemColor(slot.chemistryScore),
                background: `${chemColor(slot.chemistryScore)}15`,
                borderColor: `${chemColor(slot.chemistryScore)}40`,
              }}
            >
              {slot.chemistryScore}
            </span>
          )}
        </>
      ) : (
        <div className="text-white/15 text-2xl group-hover:text-white/30 transition-colors">+</div>
      )}
    </button>
  );
}

// ── Chemistry Lines (SVG) ───────────────────────────────────────

function ChemistryLines({ slots, containerWidth, containerHeight }) {
  // Compute pixel positions for each position based on row/col grid
  const colCount = 4;
  const rowCount = 4;
  const cellW = containerWidth / colCount;
  const cellH = containerHeight / rowCount;

  function getCenter(pos) {
    const meta = POSITION_META[pos];
    return {
      x: cellW * meta.col + 50, // +50 = half slot width
      y: cellH * meta.row + 60, // +60 = half slot height
    };
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={containerWidth}
      height={containerHeight}
      style={{ zIndex: 0 }}
    >
      {CONNECTIONS.map(([posA, posB]) => {
        const a = getCenter(posA);
        const b = getCenter(posB);

        // Find chemistry between the two slots
        const slotA = slots.find((s) => s.position === posA);
        const slotB = slots.find((s) => s.position === posB);
        const bothFilled = slotA?.mintId && slotB?.mintId;

        if (!bothFilled) {
          // Faint line for empty connections
          return (
            <line
              key={`${posA}-${posB}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        }

        const avgChem = Math.round(
          ((slotA.chemistryScore ?? 5) + (slotB.chemistryScore ?? 5)) / 2
        );
        const color = chemColor(avgChem);
        const width = chemWidth(avgChem);

        return (
          <g key={`${posA}-${posB}`}>
            {/* Glow */}
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={color}
              strokeWidth={width + 4}
              opacity="0.1"
            />
            {/* Main line */}
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={color}
              strokeWidth={width}
              opacity="0.6"
            />
          </g>
        );
      })}
    </svg>
  );
}

// ── Agent Picker ────────────────────────────────────────────────

function AgentPicker({ agents, onSelect, selectedMintId, classFilter, onClassFilterChange }) {
  const classes = useMemo(() => {
    const set = new Set(agents.map((a) => a.class));
    return ['All', ...Array.from(set).sort()];
  }, [agents]);

  const filtered = classFilter === 'All'
    ? agents
    : agents.filter((a) => a.class === classFilter);

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-mono tracking-[0.2em] text-cyan-400/80 uppercase">
          Agent Picker
        </span>
        <select
          value={classFilter}
          onChange={(e) => onClassFilterChange(e.target.value)}
          className="bg-black/40 border border-white/10 rounded text-[10px] font-mono text-white/70 px-2 py-1 outline-none focus:border-cyan-500/40"
        >
          {classes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {filtered.length === 0 && (
          <p className="text-[11px] font-mono text-white/25 py-4 w-full text-center">
            No available agents
          </p>
        )}
        {filtered.map((agent) => (
          <button
            key={agent.mintId}
            onClick={() => onSelect(agent.mintId)}
            className={`flex-shrink-0 w-[90px] rounded-lg border p-2 flex flex-col items-center gap-1 transition-all ${
              selectedMintId === agent.mintId
                ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
            }`}
          >
            <span className="text-xl">{agent.iconGlyph || '🤖'}</span>
            <span
              className="text-[11px] font-mono font-bold"
              style={{ color: ovrColor(agent.currentOverallRating) }}
            >
              {agent.currentOverallRating}
            </span>
            <span className="text-[8px] font-mono text-white/50 truncate max-w-[75px]">
              {agent.name}
            </span>
            <span className="text-[7px] font-mono text-cyan-400/40 uppercase tracking-wider">
              {agent.class}
            </span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function SquadBuilder({
  squad,
  availableAgents = [],
  onAssignAgent,
  onRemoveAgent,
  onSetFormation,
  onSave,
  onBack,
}) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [classFilter, setClassFilter] = useState('All');
  const [pickerOpen, setPickerOpen] = useState(false);

  // Build a lookup for slot data
  const slotMap = useMemo(() => {
    const map = {};
    (squad?.slots || []).forEach((s) => {
      const agent = availableAgents.find((a) => a.mintId === s.mintId);
      map[s.position] = {
        ...s,
        name: agent?.name ?? '',
        ovr: agent?.currentOverallRating ?? 0,
        iconGlyph: agent?.iconGlyph ?? '',
        portraitGradient: agent?.portraitGradient ?? '',
      };
    });
    return map;
  }, [squad, availableAgents]);

  // Agents not already in squad
  const pickableAgents = useMemo(() => {
    const inSquad = new Set((squad?.slots || []).filter((s) => s.mintId).map((s) => s.mintId));
    return availableAgents.filter((a) => !inSquad.has(a.mintId));
  }, [squad, availableAgents]);

  // Handle slot click
  function handleSlotClick(position) {
    const slot = slotMap[position];
    if (slot?.mintId && !selectedAgent) {
      // Clicking a filled slot without an agent selected => prompt remove
      onRemoveAgent(position);
      return;
    }
    if (selectedAgent) {
      // Place selected agent into this slot
      onAssignAgent(position, selectedAgent);
      setSelectedAgent(null);
      return;
    }
    // Open picker and mark slot
    setSelectedSlot(position);
    setPickerOpen(true);
  }

  // Handle agent pick
  function handleAgentSelect(mintId) {
    if (selectedSlot) {
      onAssignAgent(selectedSlot, mintId);
      setSelectedSlot(null);
      setSelectedAgent(null);
    } else {
      setSelectedAgent(mintId === selectedAgent ? null : mintId);
      setPickerOpen(true);
    }
  }

  // Container dimensions for SVG chemistry lines
  const GRID_W = 500;
  const GRID_H = 520;

  const chemColor_ = chemistryOverallColor(squad?.chemistry ?? 0);

  return (
    <div className="min-h-screen bg-[#060a12] text-white/90 font-mono p-6">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/50 hover:text-white/80 hover:border-white/20 transition-all text-sm"
        >
          ←
        </button>
        <h2 className="text-[15px] font-mono tracking-[0.15em] text-white/90 uppercase">
          Squad Builder
        </h2>
      </div>

      {/* ─── Top Bar: Name, OVR, Chemistry, Formation ───────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex items-center flex-wrap gap-6">
          {/* Squad name */}
          <div>
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-0.5">Squad</div>
            <div className="text-[16px] font-mono text-white/90 font-semibold">
              {squad?.name || 'Untitled Squad'}
            </div>
          </div>

          {/* OVR */}
          <div className="text-center">
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-0.5">OVR</div>
            <div
              className="text-[22px] font-mono font-bold leading-none"
              style={{ color: ovrColor(squad?.overallRating ?? 0) }}
            >
              {squad?.overallRating ?? '--'}
            </div>
          </div>

          {/* Chemistry */}
          <div className="text-center">
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-0.5">Chemistry</div>
            <div className="flex items-center gap-2">
              <div
                className="text-[22px] font-mono font-bold leading-none"
                style={{ color: chemColor_ }}
              >
                {squad?.chemistry ?? '--'}
              </div>
              <div className="w-20 h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${squad?.chemistry ?? 0}%`,
                    background: chemColor_,
                    boxShadow: `0 0 8px ${chemColor_}40`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Formation */}
          <div>
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-1">Formation</div>
            <select
              value={squad?.formation || '4-3-3'}
              onChange={(e) => onSetFormation(e.target.value)}
              className="bg-black/40 border border-white/10 rounded text-[11px] font-mono text-white/70 px-3 py-1.5 outline-none focus:border-cyan-500/40"
            >
              {FORMATIONS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Save */}
          <button
            onClick={onSave}
            className="ml-auto px-5 py-2 rounded-lg text-[11px] font-mono tracking-wider border bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 hover:shadow-[0_0_16px_rgba(34,211,238,0.2)] transition-all uppercase"
          >
            Save Squad
          </button>
        </div>
      </GlassCard>

      {/* ─── Org Chart Grid ─────────────────────────────────────── */}
      <GlassCard className="p-6 mb-6 overflow-hidden">
        <div className="flex justify-center">
          <div className="relative" style={{ width: GRID_W, height: GRID_H }}>
            {/* Chemistry connection lines */}
            <ChemistryLines
              slots={squad?.slots || []}
              containerWidth={GRID_W}
              containerHeight={GRID_H}
            />

            {/* Position slots */}
            {Object.entries(POSITION_META).map(([position, meta]) => {
              const colCount = 4;
              const rowCount = 4;
              const cellW = GRID_W / colCount;
              const cellH = GRID_H / rowCount;
              const left = cellW * meta.col;
              const top = cellH * meta.row;

              const slotData = slotMap[position] || (squad?.slots || []).find((s) => s.position === position);

              return (
                <div
                  key={position}
                  className="absolute"
                  style={{ left, top, zIndex: 1 }}
                >
                  <PositionSlot
                    position={position}
                    slot={slotData}
                    onClickSlot={handleSlotClick}
                    isSelected={selectedSlot === position}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* ─── Agent Picker (expandable) ──────────────────────────── */}
      <div>
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="flex items-center gap-2 mb-3 text-[11px] font-mono tracking-wider text-white/40 hover:text-white/60 transition-colors uppercase"
        >
          <span className={`transition-transform ${pickerOpen ? 'rotate-90' : ''}`}>▶</span>
          Agent Picker
          <span className="text-[10px] text-white/20">({pickableAgents.length} available)</span>
        </button>

        {pickerOpen && (
          <AgentPicker
            agents={pickableAgents}
            onSelect={handleAgentSelect}
            selectedMintId={selectedAgent}
            classFilter={classFilter}
            onClassFilterChange={setClassFilter}
          />
        )}
      </div>
    </div>
  );
}
