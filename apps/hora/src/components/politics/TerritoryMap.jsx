import React, { useMemo } from 'react';
import { useWorldPoliticsStore } from '../../store/worldPoliticsStore';

const STATUS_COLORS = {
  sovereign: '#10b981',
  puppet: '#f59e0b',
  contested: '#ef4444',
  failed_state: '#6b7280',
};

const GOV_TYPE_ICONS = {
  democracy: '\u2696\ufe0f',
  autocracy: '\u{1f451}',
  council: '\u{1f91d}',
  corporation: '\u{1f3e2}',
  monarchy: '\u{1f451}',
  federation: '\u{1f30d}',
  theocracy: '\u26ea',
  communist: '\u2b50',
  military_junta: '\u{1f396}\ufe0f',
};

export default function TerritoryMap() {
  const countries = useWorldPoliticsStore(s => s.countries);
  const governments = useWorldPoliticsStore(s => s.governments);
  const selectCountry = useWorldPoliticsStore(s => s.selectCountry);
  const selectedCountryId = useWorldPoliticsStore(s => s.selectedCountryId);

  const countryList = useMemo(
    () => Object.values(countries).sort((a, b) => b.gdp - a.gdp),
    [countries],
  );

  const playerGovs = useMemo(
    () => Object.values(governments).filter(g => g.status === 'active'),
    [governments],
  );

  if (countryList.length === 0) {
    return (
      <div className="p-4 text-center text-tactical-muted text-xs font-mono">
        Loading countries...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Player Governments */}
      {playerGovs.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-widest text-tactical-accent mb-2 font-mono">
            Player Governments
          </h4>
          <div className="space-y-1">
            {playerGovs.map(gov => {
              const country = countries[gov.country_id];
              if (!country) return null;
              return (
                <button
                  key={gov.id}
                  onClick={() => selectCountry(gov.country_id)}
                  className={`w-full text-left p-2 rounded border transition ${
                    selectedCountryId === gov.country_id
                      ? 'border-tactical-accent bg-tactical-accent/10'
                      : 'border-tactical-border hover:border-tactical-accent/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-tactical-text text-xs font-mono">
                      {GOV_TYPE_ICONS[gov.type] || ''} {country.name}
                    </span>
                    <span className="text-[9px] text-tactical-success font-mono uppercase">
                      {gov.type}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-1 text-[9px] text-tactical-muted font-mono">
                    <span>Cabinet: {Array.isArray(gov.cabinet) ? gov.cabinet.length : 0}</span>
                    <span>Treasury: {gov.treasury.toLocaleString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Country List */}
      <div>
        <h4 className="text-[10px] uppercase tracking-widest text-tactical-muted mb-2 font-mono">
          Countries ({countryList.length})
        </h4>
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {countryList.map(country => (
            <button
              key={country.id}
              onClick={() => selectCountry(country.id)}
              className={`w-full text-left p-2 rounded border transition ${
                selectedCountryId === country.id
                  ? 'border-tactical-accent bg-tactical-accent/10'
                  : 'border-tactical-border hover:border-tactical-accent/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-tactical-text text-xs font-mono">{country.name}</span>
                <span
                  className="text-[9px] font-mono uppercase"
                  style={{ color: STATUS_COLORS[country.status] || '#9CA3AF' }}
                >
                  {country.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex gap-3 mt-1 text-[9px] text-tactical-muted font-mono">
                <span>{country.government_type}</span>
                <span>Approval: {country.approval_rating.toFixed(0)}%</span>
                <span>GDP: {(country.gdp / 1e9).toFixed(0)}B</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
