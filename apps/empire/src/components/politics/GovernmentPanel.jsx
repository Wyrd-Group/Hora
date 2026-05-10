import React, { useEffect, useState } from 'react';
import { useWorldPoliticsStore } from '../../store/worldPoliticsStore';
import CoupPanel from './CoupPanel';
import TerritoryMap from './TerritoryMap';
import AdCardInline from '../ads/AdCardInline';

const GOV_TYPES = [
  { value: 'democracy', label: 'Democracy', desc: 'Elections every 50 ticks. Stable but slow.' },
  { value: 'autocracy', label: 'Autocracy', desc: 'Fast policy changes. Coups more likely.' },
  { value: 'council', label: 'Council', desc: 'Coalition votes on policies. Resilient.' },
  { value: 'corporation', label: 'Corporate State', desc: 'Max tax efficiency. You ARE the state.' },
];

export default function GovernmentPanel() {
  const selectedCountryId = useWorldPoliticsStore(s => s.selectedCountryId);
  const countries = useWorldPoliticsStore(s => s.countries);
  const governments = useWorldPoliticsStore(s => s.governments);
  const lobbyCampaigns = useWorldPoliticsStore(s => s.lobbyCampaigns);
  const selectCountry = useWorldPoliticsStore(s => s.selectCountry);
  const formGovernment = useWorldPoliticsStore(s => s.formGovernment);
  const loadActiveCampaigns = useWorldPoliticsStore(s => s.loadActiveCampaigns);
  const lobbyFor = useWorldPoliticsStore(s => s.lobbyFor);
  const attemptCoup = useWorldPoliticsStore(s => s.attemptCoup);

  const [govType, setGovType] = useState('democracy');
  const [lobbyAmount, setLobbyAmount] = useState(10000);
  const [coupOpen, setCoupOpen] = useState(false);
  const [showTerritory, setShowTerritory] = useState(false);

  const country = selectedCountryId ? countries[selectedCountryId] : null;
  const activeGov = selectedCountryId
    ? Object.values(governments).find(g => g.country_id === selectedCountryId && g.status === 'active')
    : null;

  useEffect(() => {
    if (selectedCountryId) loadActiveCampaigns(selectedCountryId);
  }, [selectedCountryId, loadActiveCampaigns]);

  if (!country) return null;

  const regs = country.regulations || {};

  return (
    <div className="fixed right-0 top-[40px] bottom-8 w-96 z-[35]
      bg-tactical-bg/95 border-l border-tactical-border backdrop-blur-xl overflow-y-auto">

      {/* Header */}
      <div className="px-4 py-3 border-b border-tactical-border flex items-center justify-between">
        <div>
          <h3 className="text-tactical-text font-mono text-sm font-semibold">{country.name}</h3>
          <span className="text-[10px] uppercase tracking-wider text-tactical-muted font-mono">
            {country.government_type} | {country.status}
          </span>
        </div>
        <button onClick={() => selectCountry(null)}
          className="text-tactical-muted hover:text-tactical-text text-lg">&times;</button>
      </div>

      <div className="p-4 space-y-4">
        {/* Country Stats */}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Approval" value={`${country.approval_rating.toFixed(0)}%`}
            color={country.approval_rating > 50 ? '#10b981' : '#ef4444'} />
          <Stat label="Stability" value={`${(country.stability * 100).toFixed(0)}%`}
            color={country.stability > 0.5 ? '#10b981' : '#f59e0b'} />
          <Stat label="Military" value={country.military_strength} color="#94a3b8" />
          <Stat label="Treasury" value={`${(country.treasury / 1e6).toFixed(1)}M`} color="#00e5ff" />
        </div>

        {/* Regulations */}
        <div>
          <h4 className="text-[10px] uppercase tracking-widest text-tactical-accent mb-2 font-mono">
            Regulations
          </h4>
          <div className="space-y-1 text-[11px]">
            <RegRow label="Corporate Tax" value={`${((regs.corporate_tax_rate || 0.25) * 100).toFixed(0)}%`} />
            <RegRow label="Income Tax" value={`${((regs.income_tax_rate || 0.30) * 100).toFixed(0)}%`} />
            <RegRow label="Labor Laws" value={regs.labor_laws || 'moderate'} />
            <RegRow label="Environment" value={regs.environmental_rules || 'moderate'} />
          </div>
        </div>

        {/* Government */}
        {activeGov ? (
          <div className="bg-black/30 rounded p-3">
            <h4 className="text-[10px] uppercase tracking-widest text-tactical-success mb-1 font-mono">
              Player Government
            </h4>
            <p className="text-tactical-text text-xs">Type: {activeGov.type}</p>
            <p className="text-tactical-text text-xs">Cabinet: {activeGov.cabinet.length} members</p>
            <p className="text-tactical-text text-xs">Treasury: {activeGov.treasury.toLocaleString()}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-widest text-tactical-warning mb-1 font-mono">
              Form Government
            </h4>
            <select value={govType} onChange={e => setGovType(e.target.value)}
              className="w-full bg-black/40 border border-tactical-border rounded px-3 py-1.5
                text-tactical-text text-xs font-mono">
              {GOV_TYPES.map(g => (
                <option key={g.value} value={g.value}>{g.label} — {g.desc}</option>
              ))}
            </select>
            <button onClick={() => formGovernment(country.id, govType)}
              className="w-full py-2 rounded font-mono text-xs uppercase tracking-wider
                bg-tactical-success/20 text-tactical-success border border-tactical-success/40
                hover:bg-tactical-success/30 transition">
              Form Government
            </button>
          </div>
        )}

        {/* Lobbying */}
        {lobbyCampaigns.length > 0 && (
          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-tactical-accent mb-2 font-mono">
              Active Lobbying
            </h4>
            {lobbyCampaigns.map(camp => (
              <div key={camp.id} className="bg-black/30 rounded p-2.5 mb-2">
                <p className="text-tactical-text text-[11px] font-mono mb-1">{camp.regulation_key}</p>
                <div className="flex gap-1 mb-1">
                  <div className="flex-1 bg-tactical-success/20 rounded h-2"
                    style={{ width: `${(camp.for_spending / Math.max(1, camp.for_spending + camp.against_spending)) * 100}%` }} />
                  <div className="flex-1 bg-tactical-alert/20 rounded h-2"
                    style={{ width: `${(camp.against_spending / Math.max(1, camp.for_spending + camp.against_spending)) * 100}%` }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => lobbyFor(camp.id, lobbyAmount, 'for')}
                    className="flex-1 py-1 text-[10px] font-mono rounded bg-tactical-success/20 text-tactical-success hover:bg-tactical-success/30 transition">
                    Support
                  </button>
                  <button onClick={() => lobbyFor(camp.id, lobbyAmount, 'against')}
                    className="flex-1 py-1 text-[10px] font-mono rounded bg-tactical-alert/20 text-tactical-alert hover:bg-tactical-alert/30 transition">
                    Oppose
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Territory View Toggle */}
        <button onClick={() => setShowTerritory(!showTerritory)}
          className="w-full py-2 rounded font-mono text-xs uppercase tracking-wider
            bg-tactical-accent/10 text-tactical-accent border border-tactical-accent/30
            hover:bg-tactical-accent/20 transition">
          {showTerritory ? 'Hide Territory List' : 'View All Countries'}
        </button>

        {showTerritory && <TerritoryMap />}

        <AdCardInline variant="wide" />

        {/* Coup Button */}
        {country.status !== 'failed_state' && (
          <button onClick={() => setCoupOpen(true)}
            className="w-full py-2 rounded font-mono text-xs uppercase tracking-wider
              bg-tactical-alert/10 text-tactical-alert border border-tactical-alert/30
              hover:bg-tactical-alert/20 transition">
            Attempt Regime Change
          </button>
        )}
      </div>

      {coupOpen && selectedCountryId && (
        <CoupPanel countryId={selectedCountryId} onClose={() => setCoupOpen(false)} />
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="bg-black/30 rounded p-2">
      <p className="text-[9px] uppercase tracking-wider text-tactical-muted">{label}</p>
      <p className="font-mono text-sm font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}

function RegRow({ label, value }) {
  return (
    <div className="flex justify-between text-tactical-text/70">
      <span className="text-tactical-muted">{label}</span>
      <span className="font-mono capitalize">{value}</span>
    </div>
  );
}
