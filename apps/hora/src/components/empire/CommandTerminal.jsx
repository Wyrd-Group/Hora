import React from 'react';
import { Command } from 'cmdk';
import { useEmpireStore } from '../../store/empireStore';
import { CMD_ITEMS } from '../../data/seed';

const CMD_ICONS = {
  routes: '⇄',
  crime:  '⚠',
  dept:   '☰',
  market: '◈',
  athena:  '◆',
  pack:   '◇',
};

const CommandTerminal = () => {
  const setTerminalOpen = useEmpireStore(s => s.setTerminalOpen);

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center pt-[80px] sm:pt-[100px] px-4 sm:px-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => { if (e.target === e.currentTarget) setTerminalOpen(false); }}
    >
      <Command
        className="w-full max-w-[540px] max-h-[80vh] bg-[#0a0e1a] border border-tactical-border/60 rounded-xl shadow-[0_25px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(0,229,255,0.06)] overflow-hidden animate-fade-in"
        loop
        label="Command palette"
      >
        {/* Input bar */}
        <div className="px-4 py-3 border-b border-tactical-border/40 flex items-center gap-3 bg-[#0d1220]">
          <span className="text-[#00e5ff] text-xs font-mono font-bold tracking-wider">▶</span>
          <Command.Input
            autoFocus
            placeholder="Type a command..."
            aria-label="Search commands"
            className="flex-1 bg-transparent border-none outline-none text-tactical-text font-mono text-[13px] placeholder:text-tactical-text/20 caret-[#00e5ff]"
          />
          <button
            onClick={() => setTerminalOpen(false)}
            aria-label="Close command palette"
            className="font-mono text-[8px] text-tactical-text/40 border border-tactical-border/40 px-2 py-1 rounded hover:text-tactical-text hover:border-tactical-border transition-colors"
          >
            ESC
          </button>
        </div>

        <Command.List className="max-h-[380px] overflow-y-auto custom-scrollbar">
          <Command.Empty className="p-6 py-10 text-center text-tactical-text/30 text-[10px] font-mono tracking-widest uppercase">
            No command recognized.
          </Command.Empty>

          <Command.Group heading={
            <div className="px-4 py-2.5 text-[8px] text-tactical-text/25 uppercase tracking-[0.2em] font-mono border-b border-tactical-border/10">
              Available Directives
            </div>
          }>
            {CMD_ITEMS.map((item) => (
              <Command.Item
                key={item.key}
                onSelect={() => {
                  const store = useEmpireStore.getState();
                  if (item.key === 'routes') store.setShowRoutes(!store.showRoutes);
                  else if (item.key === 'crime') { store.setActiveTab('defcon'); store.setLeftRailOpen(true); }
                  else if (item.key === 'dept') { store.setActiveTab('departments'); store.setLeftRailOpen(true); }
                  else if (item.key === 'market') { store.setActiveTab('market'); store.setLeftRailOpen(true); }
                  else if (item.key === 'athena') store.setAthenaOpen(true);
                  else if (item.key === 'pack') store.setPackOpen(true);
                  setTerminalOpen(false);
                }}
                className="px-4 py-3 cursor-pointer aria-selected:bg-[#00e5ff]/[0.06] aria-selected:border-l-2 aria-selected:border-l-[#00e5ff]/50 transition-all flex items-center gap-3 group border-l-2 border-l-transparent"
              >
                <span className="text-[#00e5ff]/40 group-aria-selected:text-[#00e5ff] text-sm w-5 text-center transition-colors font-mono">
                  {CMD_ICONS[item.key] || '▸'}
                </span>
                <div className="flex flex-col gap-0.5">
                  <div className="text-[12px] text-tactical-text/80 group-aria-selected:text-tactical-text font-mono transition-colors">{item.label}</div>
                  <div className="text-[9px] text-tactical-text/30 group-aria-selected:text-tactical-text/50 font-mono transition-colors">{item.desc}</div>
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-tactical-border/20 flex items-center justify-between bg-[#080c16]">
          <span className="text-[8px] text-tactical-text/20 font-mono tracking-widest">↑↓ Navigate</span>
          <span className="text-[8px] text-tactical-text/20 font-mono tracking-widest">↵ Select</span>
          <span className="text-[8px] text-tactical-text/20 font-mono tracking-widest">ESC Close</span>
        </div>
      </Command>
    </div>
  );
};

export default CommandTerminal;
