import { useState } from 'react';
import { useDeskStore } from '../../store/deskStore';
import { WATCHLIST_TEMPLATES } from '../../data/deskContent';

/**
 * WatchlistPanel -- Watchlist management: create, delete, add/remove instruments, preset templates.
 */
export default function WatchlistPanel() {
  const {
    watchlists, createWatchlist, removeWatchlist,
    addToWatchlist, removeFromWatchlist,
  } = useDeskStore();

  const [newName, setNewName] = useState('');
  const [newInstrument, setNewInstrument] = useState('');
  const [addingTo, setAddingTo] = useState(null); // index of watchlist being added to
  const [showTemplates, setShowTemplates] = useState(false);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createWatchlist(newName.trim(), []);
    setNewName('');
  };

  const handleAddInstrument = (index) => {
    if (!newInstrument.trim()) return;
    addToWatchlist(index, newInstrument.trim().toUpperCase());
    setNewInstrument('');
    setAddingTo(null);
  };

  const handleImportTemplate = (template) => {
    createWatchlist(template.name, [...template.instruments]);
    setShowTemplates(false);
  };

  return (
    <div className="space-y-3 text-tactical-text">
      {/* Create new watchlist */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="New watchlist name..."
          className="flex-1 bg-black/30 border border-tactical-border rounded px-2 py-1 text-[10px] font-mono text-tactical-text placeholder:text-tactical-text/30 outline-none focus:border-[#00e5ff]/40"
        />
        <button
          onClick={handleCreate}
          className="px-3 py-1 rounded text-[10px] font-mono tracking-wider bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20 hover:bg-[#00e5ff]/20 transition-colors"
        >
          CREATE
        </button>
      </div>

      {/* Templates toggle */}
      <button
        onClick={() => setShowTemplates(!showTemplates)}
        className="text-[9px] font-mono text-[#00e5ff]/60 hover:text-[#00e5ff] transition-colors"
      >
        {showTemplates ? '[-] HIDE TEMPLATES' : '[+] PRESET TEMPLATES'}
      </button>

      {showTemplates && (
        <div className="space-y-1.5">
          {WATCHLIST_TEMPLATES.map((tpl, i) => (
            <div key={i} className="bg-black/20 border border-tactical-border rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] font-mono text-tactical-text">{tpl.name}</div>
                <button
                  onClick={() => handleImportTemplate(tpl)}
                  className="px-2 py-0.5 rounded text-[9px] font-mono tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                >
                  IMPORT
                </button>
              </div>
              <div className="text-[9px] font-mono text-tactical-text/30 mb-1">{tpl.description}</div>
              <div className="flex flex-wrap gap-1">
                {tpl.instruments.map(sym => (
                  <span key={sym} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-mono text-tactical-text/50">
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Watchlists */}
      {watchlists.length === 0 && !showTemplates && (
        <div className="text-center text-[10px] font-mono text-tactical-text/30 py-6">
          No watchlists yet. Create one or import a template.
        </div>
      )}

      {watchlists.map((wl, index) => (
        <div key={index} className="bg-[#0a1020] border border-tactical-border rounded p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] font-mono text-tactical-text">{wl.name}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAddingTo(addingTo === index ? null : index)}
                className="text-[9px] font-mono text-[#00e5ff]/60 hover:text-[#00e5ff] transition-colors"
              >
                [+ADD]
              </button>
              <button
                onClick={() => removeWatchlist(index)}
                className="text-[9px] font-mono text-rose-400/60 hover:text-rose-400 transition-colors"
              >
                [DEL]
              </button>
            </div>
          </div>

          {/* Add instrument input */}
          {addingTo === index && (
            <div className="flex gap-2 mb-1.5">
              <input
                type="text"
                value={newInstrument}
                onChange={e => setNewInstrument(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddInstrument(index)}
                placeholder="Ticker symbol..."
                className="flex-1 bg-black/30 border border-tactical-border rounded px-2 py-0.5 text-[9px] font-mono text-tactical-text placeholder:text-tactical-text/30 outline-none focus:border-[#00e5ff]/40"
                autoFocus
              />
              <button
                onClick={() => handleAddInstrument(index)}
                className="px-2 py-0.5 rounded text-[9px] font-mono bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20 hover:bg-[#00e5ff]/20 transition-colors"
              >
                ADD
              </button>
            </div>
          )}

          {/* Instruments */}
          {wl.instruments.length === 0 ? (
            <div className="text-[9px] font-mono text-tactical-text/20 py-1">Empty watchlist</div>
          ) : (
            <div className="space-y-0.5">
              {wl.instruments.map(sym => (
                <div key={sym} className="flex items-center justify-between px-1.5 py-0.5 rounded bg-black/20">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-tactical-text">{sym}</span>
                    {/* Sparkline placeholder */}
                    <div className="w-12 h-3 bg-white/5 rounded" />
                  </div>
                  <button
                    onClick={() => removeFromWatchlist(index, sym)}
                    className="text-[9px] font-mono text-rose-400/40 hover:text-rose-400 transition-colors"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
