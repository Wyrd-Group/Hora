import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useAgentCardStore } from '../../store/agentCardStore';
import { useEmpireStore } from '../../store/empireStore';
import { getAgentById, AGENT_RARITY_CONFIG } from '../../data/agentCards';

const FLOOR_DEFS = [
  { id: 'executive', name: 'Executive', icon: '♛', accent: '#fbbf24', roomIds: ['ceo'] },
  { id: 'trading', name: 'Trading', icon: '📈', accent: '#60a5fa', roomIds: ['trading'] },
  { id: 'rnd', name: 'R&D', icon: '🧪', accent: '#34d399', roomIds: ['rnd'] },
  { id: 'ops', name: 'Operations', icon: '⚙️', accent: '#f97316', roomIds: ['ops'] },
  { id: 'intel', name: 'Intelligence', icon: '🔎', accent: '#a78bfa', roomIds: ['intel'] },
  { id: 'lobby', name: 'Main Floor', icon: '🏢', accent: '#22d3ee', roomIds: ['floor'] },
];

const XP_TICK_MS = 5000;
const BASE_XP_PER_TICK = 2;
const MAX_EQUIP_LEVEL = 5;

const rarityRank = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Mythic: 5 };

const KEYFRAMES = `
@keyframes office-cinematic-in {
  0% { opacity: 0; transform: scale(0.98) translateY(8px); filter: blur(4px); }
  100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
}
@keyframes office-cinematic-out {
  0% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
  100% { opacity: 0; transform: scale(1.02) translateY(-8px); filter: blur(3px); }
}
@keyframes office-scan {
  0% { transform: translateY(-100%); opacity: 0.15; }
  100% { transform: translateY(200%); opacity: 0; }
}
@keyframes desk-pulse {
  0%, 100% { box-shadow: 0 0 0 rgba(34,211,238,0.0); }
  50% { box-shadow: 0 0 14px rgba(34,211,238,0.2); }
}
`;

function getSeniorityScore(agent, def) {
  return (agent.level || 1) * 2 + (rarityRank[def.rarity] || 0) * 3 + (agent.currentOverallRating || 0) / 10;
}

function mapAgentToFloor(agent, def) {
  if (!agent.deployedTo) return 'lobby';
  if (agent.deployedTo === 'office-ceo') return 'executive';
  if (agent.deployedTo === 'office-trading') return 'trading';
  if (agent.deployedTo === 'office-rnd') return 'rnd';
  if (agent.deployedTo === 'office-ops') return 'ops';
  if (agent.deployedTo === 'office-intel') return 'intel';

  // fallback by class if deployed elsewhere
  if (['Trader', 'Analyst'].includes(def.class)) return 'trading';
  if (['Researcher', 'Coder'].includes(def.class)) return 'rnd';
  if (['Infiltrator', 'Specialist', 'Scout', 'Jobhunter', 'Social'].includes(def.class)) return 'intel';
  if (['Orchestrator', 'Navigator', 'Autonomous'].includes(def.class)) return 'ops';
  return 'lobby';
}

function productivityFromAgents(entries) {
  if (entries.length === 0) return 0;
  const total = entries.reduce((sum, e) => sum + (e.agent.currentOverallRating || 40), 0);
  return Math.min(100, Math.round(total / entries.length));
}

function floorMultiplier(level) {
  return 1 + level * 0.12;
}

export default function OfficeFloor() {
  const storeAgents = useAgentCardStore((s) => s.agents);
  const addXP = useAgentCardStore((s) => s.addXP);

  const companyBalance = useEmpireStore((s) => s.companyBalance);
  const setCompanyBalance = useEmpireStore((s) => s.setCompanyBalance);

  const [selectedFloor, setSelectedFloor] = useState(null);
  const [cinematicState, setCinematicState] = useState('idle'); // idle|enter|exit
  const [toast, setToast] = useState(null);

  const [equipmentLevels, setEquipmentLevels] = useState({
    executive: 1,
    trading: 1,
    rnd: 1,
    ops: 1,
    intel: 1,
    lobby: 1,
  });

  const resolvedAgents = useMemo(() => {
    return Object.values(storeAgents)
      .map((agent) => {
        const def = getAgentById(agent.cardId);
        return def ? { agent, def } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b.agent.currentOverallRating || 0) - (a.agent.currentOverallRating || 0));
  }, [storeAgents]);

  const floorAssignments = useMemo(() => {
    const map = {
      executive: [],
      trading: [],
      rnd: [],
      ops: [],
      intel: [],
      lobby: [],
    };
    for (const entry of resolvedAgents) {
      const floorId = mapAgentToFloor(entry.agent, entry.def);
      map[floorId].push(entry);
    }
    return map;
  }, [resolvedAgents]);

  const totalOfficeLevel = useMemo(
    () => Object.values(equipmentLevels).reduce((a, b) => a + b, 0),
    [equipmentLevels]
  );

  const globalDevBoost = useMemo(() => {
    const avg = Object.values(equipmentLevels).reduce((a, b) => a + floorMultiplier(b), 0) / Object.keys(equipmentLevels).length;
    return `${Math.round((avg - 1) * 100)}%`;
  }, [equipmentLevels]);

  const avgProductivity = useMemo(() => {
    const values = FLOOR_DEFS.map((f) => productivityFromAgents(floorAssignments[f.id]));
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [floorAssignments]);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  }, []);

  const enterFloor = useCallback((floorId) => {
    setCinematicState('enter');
    setTimeout(() => {
      setSelectedFloor(floorId);
      setCinematicState('idle');
    }, 320);
  }, []);

  const exitFloor = useCallback(() => {
    setCinematicState('exit');
    setTimeout(() => {
      setSelectedFloor(null);
      setCinematicState('idle');
    }, 260);
  }, []);

  const upgradeFloor = useCallback((floorId) => {
    const current = equipmentLevels[floorId];
    if (current >= MAX_EQUIP_LEVEL) {
      showToast('Max level reached', 'warn');
      return;
    }

    const cost = 25000 * current;
    if (companyBalance < cost) {
      showToast(`Need €${(cost - companyBalance).toLocaleString()} more`, 'error');
      return;
    }

    setCompanyBalance(companyBalance - cost);
    setEquipmentLevels((prev) => ({ ...prev, [floorId]: Math.min(MAX_EQUIP_LEVEL, prev[floorId] + 1) }));
    showToast(`Upgraded ${FLOOR_DEFS.find(f => f.id === floorId)?.name} equipment`, 'success');
  }, [equipmentLevels, companyBalance, setCompanyBalance, showToast]);

  useEffect(() => {
    const interval = setInterval(() => {
      for (const floor of FLOOR_DEFS) {
        const entries = floorAssignments[floor.id];
        if (!entries || entries.length === 0) continue;
        const mult = floorMultiplier(equipmentLevels[floor.id]);

        for (const entry of entries) {
          const seniority = getSeniorityScore(entry.agent, entry.def);
          const seniorityFactor = seniority >= 26 ? 1.2 : seniority >= 16 ? 1.1 : 1;
          const xp = Math.max(1, Math.round(BASE_XP_PER_TICK * mult * seniorityFactor));
          addXP(entry.agent.mintId, xp);
        }
      }
    }, XP_TICK_MS);

    return () => clearInterval(interval);
  }, [floorAssignments, equipmentLevels, addXP]);

  const currentFloorDef = selectedFloor ? FLOOR_DEFS.find((f) => f.id === selectedFloor) : null;
  const currentAgents = selectedFloor ? floorAssignments[selectedFloor] : [];

  return (
    <div className="fixed inset-0 pt-12 z-20 font-mono select-none overflow-auto bg-[#060a12]">
      <style>{KEYFRAMES}</style>

      {toast && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[120] px-4 py-2 rounded-md text-[11px] font-semibold"
          style={{
            background: toast.type === 'error' ? 'rgba(239,68,68,0.92)' : toast.type === 'warn' ? 'rgba(245,158,11,0.92)' : 'rgba(34,211,238,0.92)',
            color: '#051018',
          }}
        >
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto mt-4 mb-10 rounded-lg border border-white/10 bg-[#0b1120]/80 backdrop-blur-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 bg-[#0a101d]/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-cyan-300 text-sm">🏢</span>
            <span className="text-[11px] tracking-[0.16em] uppercase text-white/80">Agents Tower</span>
          </div>
          <div className="flex items-center gap-5 text-[10px] text-white/60">
            <span>Office LVL {totalOfficeLevel}</span>
            <span>Productivity {avgProductivity}%</span>
            <span>Dev Boost +{globalDevBoost}</span>
            <span>Budget €{Math.floor(companyBalance).toLocaleString()}</span>
          </div>
        </div>

        {!selectedFloor && (
          <div className="p-4 md:p-6 relative" style={{ animation: cinematicState === 'enter' ? 'office-cinematic-in .32s ease-out' : undefined }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div style={{ animation: 'office-scan 2.2s linear infinite', height: 120, background: 'linear-gradient(180deg, rgba(34,211,238,0.10), rgba(34,211,238,0.00))' }} />
            </div>

            <div className="max-w-4xl mx-auto border border-white/10 rounded-lg overflow-hidden bg-[#0b1221]">
              {FLOOR_DEFS.map((floor, idx) => {
                const entries = floorAssignments[floor.id];
                const equipLevel = equipmentLevels[floor.id];
                const prod = productivityFromAgents(entries);
                return (
                  <button
                    key={floor.id}
                    onClick={() => enterFloor(floor.id)}
                    className="w-full text-left px-4 py-4 border-b border-white/5 hover:bg-white/[0.03] transition-all"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span style={{ color: floor.accent }}>{floor.icon}</span>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.12em]" style={{ color: floor.accent }}>{floor.name} Floor</div>
                          <div className="text-[10px] text-white/50">{entries.length} agents active • Equip Lv.{equipLevel}</div>
                        </div>
                      </div>
                      <div className="w-40">
                        <div className="flex items-center justify-between text-[9px] text-white/55 mb-1">
                          <span>Productivity</span>
                          <span>{prod}%</span>
                        </div>
                        <div className="h-1.5 rounded bg-white/10">
                          <div className="h-full rounded" style={{ width: `${prod}%`, background: floor.accent }} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedFloor && currentFloorDef && (
          <div
            className="p-4 md:p-6 relative"
            style={{ animation: cinematicState === 'exit' ? 'office-cinematic-out .26s ease-in' : 'office-cinematic-in .32s ease-out' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[12px] uppercase tracking-[0.16em]" style={{ color: currentFloorDef.accent }}>
                  {currentFloorDef.icon} {currentFloorDef.name} Office
                </div>
                <div className="text-[10px] text-white/50 mt-1">
                  Agents visible at workstations. Upgrading equipment increases development speed.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => upgradeFloor(selectedFloor)}
                  className="px-3 py-1.5 rounded border text-[10px] uppercase tracking-[0.1em]"
                  style={{
                    borderColor: `${currentFloorDef.accent}66`,
                    color: currentFloorDef.accent,
                    background: `${currentFloorDef.accent}10`,
                  }}
                >
                  Upgrade Equip (Lv.{equipmentLevels[selectedFloor]})
                </button>
                <button
                  onClick={exitFloor}
                  className="px-3 py-1.5 rounded border border-white/20 text-white/70 text-[10px] uppercase tracking-[0.1em] hover:bg-white/5"
                >
                  Back to Tower
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#0a101c] p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-white/10 bg-[#0d1526] p-2 relative"
                    style={{ animation: 'desk-pulse 2.6s ease-in-out infinite', animationDelay: `${i * 0.2}s` }}
                  >
                    <div className="text-[8px] uppercase tracking-[0.12em] text-white/40 mb-1">Desk {i + 1}</div>
                    <div className="h-8 rounded bg-gradient-to-b from-cyan-500/20 to-transparent border border-cyan-400/20" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {currentAgents.map(({ agent, def }) => {
                  const rarityCfg = AGENT_RARITY_CONFIG[def.rarity];
                  const [c1, c2, c3] = def.portraitGradient;
                  return (
                    <div key={agent.mintId} className="rounded-md border p-2" style={{ borderColor: `${rarityCfg.color}44`, background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${c1}, ${c2}, ${c3})`, border: `1px solid ${rarityCfg.color}` }}
                        >
                          <span className="text-[11px]">{def.iconGlyph}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] truncate" style={{ color: rarityCfg.color }}>{def.name}</div>
                          <div className="text-[9px] text-white/50 truncate">OVR {agent.currentOverallRating} • Lv.{agent.level}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {currentAgents.length === 0 && (
                  <div className="col-span-full text-center text-[10px] text-white/45 py-8">
                    No agents currently assigned to this floor.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
