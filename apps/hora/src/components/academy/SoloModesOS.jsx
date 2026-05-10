

export default function SoloModesOS() {
  const modes = [
    { id: 'shadow', label: 'SHADOW ARENA', desc: 'Compete anonymously against market makers. Survive 30 days of simulated volatility.', status: 'LIVE', color: 'tactical-red' },
    { id: 'replay', label: 'MARKET REPLAY', desc: 'Relive historical market conditions. 2008 crisis, 2020 COVID crash, 2021 meme frenzy.', status: 'AVAILABLE', color: 'tactical-cyan' },
    { id: 'lab',    label: 'MARKET LAB',    desc: 'Speed-controlled sandbox. Test strategies at 1x, 2x, or 5x time compression.', status: 'AVAILABLE', color: 'tactical-green' },
    { id: 'duel',   label: 'DUEL MODE',     desc: 'Challenge another trader head-to-head. Best P&L over 10 days wins.', status: 'SOON', color: 'tactical-amber' },
    { id: 'crisis', label: 'CRISIS SIM',    desc: 'Navigate a black swan event. Liquidity dries up. Can you manage tail risk?', status: 'SOON', color: 'tactical-amber' },
    { id: 'hft',    label: 'HFT TERMINAL',  desc: 'High-frequency simulation. Execute 100+ orders per second in a low-latency arena.', status: 'LOCKED', color: 'tactical-muted' },
  ]
  return (
    <div className="fixed inset-0 pt-16 z-20 backdrop-blur-xl bg-[#060a12]/80 flex p-8">
      <div className="flex flex-col w-full h-full gap-4">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-tactical-bright text-lg font-mono font-bold">SOLO MODES</p>
            <p className="text-tactical-muted text-xs font-mono mt-0.5">Choose your arena. Train your edge.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-tactical-muted">
            <span className="w-2 h-2 rounded-full bg-tactical-green inline-block" /> 2 ACTIVE
            <span className="w-2 h-2 rounded-full bg-tactical-amber inline-block ml-2" /> 2 COMING SOON
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 flex-1 overflow-y-auto">
          {modes.map(m => (
            <div key={m.id} className={`border bg-black/40 rounded-xl p-5 flex flex-col gap-3 transition-all cursor-pointer hover:bg-black/60 ${m.status === 'LOCKED' ? 'border-tactical-border/20 opacity-40 cursor-not-allowed' : 'border-tactical-border/50 hover:border-tactical-border'}`}>
              <div className="flex items-start justify-between">
                <p className="text-tactical-bright text-sm font-mono font-semibold">{m.label}</p>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border text-${m.color} border-${m.color}/30`} style={{background:`rgba(0,0,0,0.4)`}}>{m.status}</span>
              </div>
              <p className="text-tactical-text/60 text-xs leading-relaxed">{m.desc}</p>
              <p className="text-tactical-text/30 text-xs leading-relaxed">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt.</p>
              <div className="mt-auto pt-2 border-t border-tactical-border/20">
                <button disabled={m.status==='LOCKED'||m.status==='SOON'} className={`w-full py-1.5 rounded text-xs font-mono font-semibold border transition-all ${m.status==='LIVE'||m.status==='AVAILABLE'?`text-${m.color} border-${m.color}/30 hover:bg-black/40`:'text-tactical-muted border-tactical-border/20 cursor-not-allowed'}`}>
                  {m.status === 'LIVE' ? 'ENTER ARENA' : m.status === 'AVAILABLE' ? 'LAUNCH' : m.status === 'SOON' ? 'NOTIFY ME' : 'LOCKED'}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
