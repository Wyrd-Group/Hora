import React, { useState, useMemo } from 'react';
import { useEmpireStore } from '../../../store/empireStore';
import { TEAM_META } from '../../../data/teamMeta';

/**
 * DevelopmentTab — Player/staff training & development (agent bridge).
 * Shows player cards with OVR, potential, XP, and training controls.
 */

// Sport-specific stat categories
const FOOTBALL_STATS = ['Pace', 'Shooting', 'Passing', 'Defense', 'Physical'];
const NBA_STATS = ['3-Point', 'Mid-Range', 'Layup/Dunk', 'Defense', 'Rebounding'];
const F1_STATS = ['Race Pace', 'Tire Mgmt', 'Overtaking', 'Consistency', 'Wet Driving'];

// Derive stats from OVR + position using seeded variation
function deriveStats(player, league, statNames) {
  const seed = player.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (i) => ((seed * 31 + i * 17) % 100) / 100;
  return statNames.map((name, i) => {
    const base = player.overall * (0.7 + rng(i) * 0.6);
    return { name, value: Math.round(Math.min(99, Math.max(20, base))) };
  });
}

function computePotential(player) {
  return Math.min(99, player.overall + Math.round((100 - player.overall) * 0.35 * (1 - player.age / 40)));
}

const TRAINING_INTENSITIES = [
  { key: 'light', label: 'Light', xpPerDay: 5, moraleImpact: 0, color: '#10b981' },
  { key: 'moderate', label: 'Moderate', xpPerDay: 12, moraleImpact: -5, color: '#f59e0b' },
  { key: 'intense', label: 'Intense', xpPerDay: 25, moraleImpact: -15, color: '#ef4444' },
];

export default function DevelopmentTab({ liveTeam, roster }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [trainingFocus, setTrainingFocus] = useState([]);
  const [intensity, setIntensity] = useState('moderate');

  const isF1 = liveTeam.league === 'F1';
  const isNBA = liveTeam.league === 'NBA';
  const statNames = isF1 ? F1_STATS : isNBA ? NBA_STATS : FOOTBALL_STATS;
  const meta = TEAM_META[liveTeam.name] || { color: '#00e5ff', accent: '#FFF' };

  const player = selectedPlayer ? roster.find(p => p.id === selectedPlayer) : null;
  const playerStats = player ? deriveStats(player, liveTeam.league, statNames) : [];
  const potential = player ? computePotential(player) : 0;

  // XP and level system
  const playerLevel = player ? Math.max(1, Math.floor(player.overall / 8)) : 1;
  const xpForNextLevel = playerLevel * 100;
  const currentXP = player ? (player.overall % 8) * 12 : 0; // simulated XP progress

  const toggleTrainingFocus = (statName) => {
    setTrainingFocus(prev => {
      if (prev.includes(statName)) return prev.filter(s => s !== statName);
      if (prev.length >= 3) return prev; // max 3 stats
      return [...prev, statName];
    });
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Player roster grid */}
      <div className="w-80 flex-shrink-0 space-y-2 overflow-y-auto max-h-[60vh] custom-scrollbar pr-2">
        <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">
          {isF1 ? 'Team Staff' : isNBA ? 'Roster' : 'Squad'} Development
        </div>
        {roster.map(p => {
          const pot = computePotential(p);
          const isSelected = selectedPlayer === p.id;
          const ovrColor = p.overall > 80 ? '#10b981' : p.overall > 65 ? '#f59e0b' : '#ef4444';

          return (
            <button
              key={p.id}
              onClick={() => setSelectedPlayer(p.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                isSelected ? 'bg-[#00e5ff]/10 border-[#00e5ff]/40' : 'bg-[#0f172a] border-white/[0.05] hover:border-white/[0.1]'
              }`}
            >
              {/* OVR circle */}
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2"
                  style={{ borderColor: ovrColor, color: ovrColor, backgroundColor: `${ovrColor}15` }}
                >
                  {p.overall}
                </div>
                {/* Potential arrow */}
                {pot > p.overall && (
                  <div className="absolute -top-1 -right-1 text-[8px] text-[#10b981]">▲</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-white font-bold truncate">{p.name}</div>
                <div className="text-[8px] text-[#00e5ff]">{p.position}</div>
              </div>

              <div className="text-right">
                <div className="text-[8px] text-white/30">POT</div>
                <div className="text-[10px] font-bold" style={{ color: pot > p.overall + 5 ? '#10b981' : '#f59e0b' }}>{pot}</div>
              </div>

              {/* Mini XP bar */}
              <div className="w-12">
                <div className="w-full h-1 bg-white/5 rounded-full">
                  <div className="h-full bg-[#7c3aed] rounded-full" style={{ width: `${(currentXP / xpForNextLevel) * 100}%` }} />
                </div>
                <div className="text-[7px] text-white/20 text-center mt-0.5">Lv{Math.max(1, Math.floor(p.overall / 8))}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Training panel (selected player) */}
      <div className="flex-1">
        {!player ? (
          <div className="flex items-center justify-center h-full text-white/20 text-sm">
            Select a player to view development options
          </div>
        ) : (
          <div className="space-y-4">
            {/* Player header */}
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black border-2"
                style={{ borderColor: meta.color, color: meta.color, backgroundColor: `${meta.color}15` }}
              >
                {player.overall}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{player.name}</h3>
                <div className="text-[10px] text-white/40">{player.position} · Age {player.age} · Form: {player.form}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-white/30">Potential:</span>
                  <span className="text-[11px] font-bold" style={{ color: potential > player.overall + 5 ? '#10b981' : '#f59e0b' }}>
                    {potential}
                  </span>
                  {potential > player.overall && (
                    <span className="text-[8px] text-[#10b981]">+{potential - player.overall} room to grow</span>
                  )}
                </div>
              </div>
            </div>

            {/* XP progress bar */}
            <div className="bg-[#0f172a] border border-[#7c3aed]/20 rounded-lg p-3">
              <div className="flex justify-between text-[9px] text-white/40 mb-1">
                <span>Level {playerLevel}</span>
                <span>{currentXP} / {xpForNextLevel} XP</span>
                <span>Level {playerLevel + 1}</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full">
                <div className="h-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7] rounded-full transition-all" style={{ width: `${(currentXP / xpForNextLevel) * 100}%` }} />
              </div>
            </div>

            {/* Stat radar (simplified as bars) */}
            <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-4">
              <div className="text-[9px] text-white/30 uppercase tracking-widest mb-3">
                {isF1 ? 'Driver Skills' : isNBA ? 'Player Skills' : 'Player Attributes'}
              </div>
              <div className="space-y-2">
                {playerStats.map(stat => {
                  const isFocused = trainingFocus.includes(stat.name);
                  const barColor = isFocused ? '#7c3aed' : stat.value > 80 ? '#10b981' : stat.value > 60 ? '#f59e0b' : '#ef4444';
                  return (
                    <button
                      key={stat.name}
                      onClick={() => toggleTrainingFocus(stat.name)}
                      className={`w-full flex items-center gap-3 group text-left transition-all rounded px-2 py-1 ${isFocused ? 'bg-[#7c3aed]/10' : 'hover:bg-white/[0.02]'}`}
                    >
                      <span className={`w-24 text-[10px] ${isFocused ? 'text-[#7c3aed] font-bold' : 'text-white/50'}`}>{stat.name}</span>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${stat.value}%`, backgroundColor: barColor }} />
                      </div>
                      <span className="w-8 text-[10px] text-right font-mono font-bold" style={{ color: barColor }}>{stat.value}</span>
                      {isFocused && <span className="text-[8px] text-[#7c3aed]">FOCUS</span>}
                    </button>
                  );
                })}
              </div>
              <div className="text-[8px] text-white/20 mt-2">Click up to 3 stats to focus training on</div>
            </div>

            {/* Training intensity */}
            <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-4">
              <div className="text-[9px] text-white/30 uppercase tracking-widest mb-3">Training Intensity</div>
              <div className="grid grid-cols-3 gap-2">
                {TRAINING_INTENSITIES.map(ti => {
                  const isActive = intensity === ti.key;
                  return (
                    <button
                      key={ti.key}
                      onClick={() => setIntensity(ti.key)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        isActive ? `border-[${ti.color}]/40 bg-[${ti.color}]/10` : 'border-white/[0.05] bg-[#0f172a] hover:border-white/[0.1]'
                      }`}
                      style={isActive ? { borderColor: `${ti.color}60`, backgroundColor: `${ti.color}10` } : {}}
                    >
                      <div className="text-[11px] font-bold" style={{ color: ti.color }}>{ti.label}</div>
                      <div className="text-[8px] text-white/30 mt-1">+{ti.xpPerDay} XP/day</div>
                      {ti.moraleImpact !== 0 && (
                        <div className="text-[8px] text-[#ef4444] mt-0.5">{ti.moraleImpact} morale</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Training summary */}
            {trainingFocus.length > 0 && (
              <div className="bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-lg p-3">
                <div className="text-[10px] text-[#7c3aed] font-bold">
                  Training Plan: {trainingFocus.join(', ')} — {TRAINING_INTENSITIES.find(t => t.key === intensity)?.label} intensity
                </div>
                <div className="text-[9px] text-white/40 mt-1">
                  Development will progress automatically each game week. Higher intensity = faster growth but lower morale.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
